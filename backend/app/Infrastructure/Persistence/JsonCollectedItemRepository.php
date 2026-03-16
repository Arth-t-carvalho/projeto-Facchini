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

    /**
     * Executes a callback within a file lock to guarantee thread-safe read-modify-write.
     */
    private function withLock(callable $callback)
    {
        $fp = fopen($this->filePath, 'c+');
        if (!$fp) {
            throw new \RuntimeException("Could not open file for locking.");
        }

        if (flock($fp, LOCK_EX)) {
            try {
                // Determine file size and read contents
                fseek($fp, 0, SEEK_END);
                $filesize = ftell($fp);
                rewind($fp);

                $content = '';
                if ($filesize > 0) {
                    $content = fread($fp, $filesize);
                }

                $data = json_decode($content, true) ?: [];

                // Reconstruct items
                $items = [];
                foreach ($data as $row) {
                    $items[] = new CollectedItem(
                        $row['code'],
                        (int) $row['id'],
                        (int) ($row['status'] ?? 1),
                        $row['destination'] ?? null,
                        $row['observation'] ?? null,
                        isset($row['created_at']) ? new \DateTimeImmutable($row['created_at']) : null,
                        isset($row['sent_at']) && $row['sent_at'] ? new \DateTimeImmutable($row['sent_at']) : null,
                        isset($row['received_at']) && $row['received_at'] ? new \DateTimeImmutable($row['received_at']) : null,
                        $row['history'] ?? []
                    );
                }

                // Execute the callback passing the current items. MUST return updated items.
                $updatedItems = $callback($items);

                // Write back
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
            
            // Check if it's an update
            foreach ($items as $k => $existingItem) {
                if ($existingItem->getId() === $item->getId() || $existingItem->getCode() === $item->getCode()) {
                    $items[$k] = $item;
                    return $items;
                }
            }

            // Simular ID auto-incremento se for novo (ID null ou 0)
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
            return $items; // Locking just to read safely, no modifications returned
        });
    }

    public function findByStatus(int $status): array
    {
        $items = $this->findAll();
        $filtered = array_filter($items, fn($item) => $item->getStatus() === $status);
        return array_values($filtered);
    }
    
    public function findActiveVisually(): array
    {
        // For the frontend visually, only show Origin(1) and Transit(2). Received(3) are hidden from main screen. Let's return only those.
        $items = $this->findAll();
        $filtered = array_filter($items, fn($item) => $item->getStatus() !== CollectedItem::STATUS_RECEIVED);
        return array_values($filtered);
    }

    public function deleteById(int $id): void
    {
        $this->withLock(function ($items) use ($id) {
            $filtered = [];
            foreach ($items as $item) {
                if ($item->getId() !== $id) {
                    $filtered[] = $item;
                }
            }
            return $filtered;
        });
    }
    
    // Deleta do DB apenas itens em status de origem/transito para satisfazer o botão "Limpar Tudo" que limpa a tela principal
    public function clearActive(): void
    {
        $this->withLock(function ($items) {
            $filtered = [];
            foreach ($items as $item) {
                if ($item->getStatus() === CollectedItem::STATUS_RECEIVED) {
                    // Mantém os que já foram recebidos no JSON para integridade
                    $filtered[] = $item;
                }
            }
            return $filtered; // Remove all status 1 and 2
        });
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
    
    // Keep it for interface compatibility if there is any, although not used often now.
    public function existsByCode(string $code): bool
    {
        return $this->findByCode($code) !== null;
    }
    
    // Deprecated for trace protocol, used previously
    public function incrementScanCount(string $code): void {}
    public function archiveAll(): void {}
}
