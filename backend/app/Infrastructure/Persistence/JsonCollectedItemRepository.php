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

    private function loadItems(): array
    {
        $content = file_get_contents($this->filePath);
        $data = json_decode($content, true) ?: [];
        
        $items = [];
        foreach ($data as $row) {
            $items[] = new CollectedItem(
                $row['code'],
                (int) $row['id'],
                new \DateTimeImmutable($row['timestamp']),
                (int) ($row['scan_count'] ?? 1),
                $row['status'] ?? 'pending'
            );
        }
        return $items;
    }

    private function saveItems(array $items): void
    {
        $data = array_map(function (CollectedItem $item) {
            return [
                'id' => $item->getId(),
                'code' => $item->getCode(),
                'timestamp' => $item->getTimestamp()->format('Y-m-d H:i:s'),
                'scan_count' => $item->getScanCount(),
                'status' => $item->getStatus(),
            ];
        }, $items);
        file_put_contents($this->filePath, json_encode($data, JSON_PRETTY_PRINT));
    }

    public function save(CollectedItem $item): void
    {
        $items = $this->loadItems();
        
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
        $this->saveItems($items);
    }

    public function findAll(): array
    {
        $items = $this->loadItems();
        usort($items, fn($a, $b) => $b->getTimestamp() <=> $a->getTimestamp());
        return $items;
    }

    public function findByStatus(string $status): array
    {
        $items = array_filter($this->loadItems(), fn($item) => $item->getStatus() === $status);
        usort($items, fn($a, $b) => $b->getTimestamp() <=> $a->getTimestamp());
        return array_values($items);
    }

    public function archiveAll(): void
    {
        $items = $this->loadItems();
        foreach ($items as $item) {
            if ($item->getStatus() === 'pending') {
                $reflection = new \ReflectionClass($item);
                $statusProperty = $reflection->getProperty('status');
                $statusProperty->setAccessible(true);
                $statusProperty->setValue($item, 'archived');
            }
        }
        $this->saveItems($items);
    }

    public function deleteById(int $id): void
    {
        $items = $this->loadItems();
        foreach ($items as $item) {
            if ($item->getId() === $id) {
                $reflection = new \ReflectionClass($item);
                $statusProperty = $reflection->getProperty('status');
                $statusProperty->setAccessible(true);
                $statusProperty->setValue($item, 'archived');
            }
        }
        $this->saveItems($items);
    }

    public function existsByCode(string $code): bool
    {
        foreach ($this->loadItems() as $item) {
            if ($item->getCode() === $code && $item->getStatus() === 'pending') {
                return true;
            }
        }
        return false;
    }

    public function incrementScanCount(string $code): void
    {
        $items = $this->loadItems();
        foreach ($items as $item) {
            if ($item->getCode() === $code && $item->getStatus() === 'pending') {
                $reflection = new \ReflectionClass($item);
                
                $scanCountProperty = $reflection->getProperty('scanCount');
                $scanCountProperty->setAccessible(true);
                $scanCountProperty->setValue($item, $item->getScanCount() + 1);

                $timestampProperty = $reflection->getProperty('timestamp');
                $timestampProperty->setAccessible(true);
                $timestampProperty->setValue($item, new \DateTimeImmutable());
            }
        }
        $this->saveItems($items);
    }

    public function findByCode(string $code): ?CollectedItem
    {
        foreach ($this->loadItems() as $item) {
            if ($item->getCode() === $code && $item->getStatus() === 'pending') {
                return $item;
            }
        }
        return null;
    }
}
