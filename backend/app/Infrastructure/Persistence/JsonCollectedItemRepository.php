<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Model\CollectedItem;
use App\Domain\Repository\CollectedItemRepository;

class JsonCollectedItemRepository implements CollectedItemRepository
{
    private string $filePath;

    public function __construct()
    {
        $this->filePath = __DIR__ . '/../../../data/items.json';
        if (!file_exists(dirname($this->filePath))) {
            mkdir(dirname($this->filePath), 0777, true);
        }
        if (!file_exists($this->filePath)) {
            file_put_contents($this->filePath, json_encode([]));
        }
    }

    private function withLock(callable $callback)
    {
        $fp = fopen($this->filePath, 'c+');
        if (!$fp) {
            throw new \RuntimeException("Could not open file for locking.");
        }

        if (flock($fp, LOCK_EX)) {
            try {
                fseek($fp, 0, SEEK_END);
                $filesize = ftell($fp);
                rewind($fp);

                $content = '';
                if ($filesize > 0) {
                    $content = fread($fp, $filesize);
                }

                $data = json_decode($content, true) ?: [];

                $items = [];
                foreach ($data as $row) {
                    $items[] = new CollectedItem(
                        $row['code'],
                        (int) $row['id'],
                        isset($row['created_at']) ? new \DateTimeImmutable($row['created_at']) : null
                    );
                }

                $updatedItems = $callback($items);

                $outData = array_map(fn(CollectedItem $item) => $item->toArray(), $updatedItems);
                
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($outData, JSON_PRETTY_PRINT));
                fflush($fp);
                
                return $updatedItems;

            } finally {
                flock($fp, LOCK_UN);
                fclose($fp);
            }
        } else {
            fclose($fp);
            throw new \RuntimeException("Could not acquire file lock.");
        }
    }

    public function save(CollectedItem $item): void
    {
        $this->withLock(function (array $items) use ($item) {
            foreach ($items as $k => $existingItem) {
                if ($existingItem->getId() === $item->getId() || $existingItem->getCode() === $item->getCode()) {
                    $items[$k] = $item;
                    return $items;
                }
            }

            if ($item->getId() === null || $item->getId() <= 0) {
                $maxId = 0;
                foreach ($items as $existingItem) {
                    if ($existingItem->getId() > $maxId) {
                        $maxId = $existingItem->getId();
                    }
                }
                $reflection = new \ReflectionClass($item);
                $idProperty = $reflection->getProperty('id');
                $idProperty->setAccessible(true);
                $idProperty->setValue($item, $maxId + 1);
            }

            $items[] = $item;
            return $items;
        });
    }

    public function findAll(): array
    {
        return $this->withLock(function ($items) {
            usort($items, fn($a, $b) => $b->getCreatedAt() <=> $a->getCreatedAt());
            return $items;
        });
    }

    public function deleteById(int $id): void
    {
        $this->withLock(function ($items) use ($id) {
            return array_values(array_filter($items, fn($item) => $item->getId() !== $id));
        });
    }

    public function clearAll(): void
    {
        $this->withLock(fn() => []);
    }

    public function findByCode(string $code): ?CollectedItem
    {
        $items = $this->findAll();
        foreach ($items as $item) {
            if ($item->getCode() === $code) {
                return $item;
            }
        }
        return null;
    }

    public function existsByCode(string $code): bool
    {
        return $this->findByCode($code) !== null;
    }

    // Métodos para compatibilidade com interface (se existirem)
    public function findActiveVisually(): array { return $this->findAll(); }
    public function clearActive(): void { $this->clearAll(); }
    public function findByStatus(int $status): array { return []; }
    public function incrementScanCount(string $code): void {}
    public function archiveAll(): void {}
}
