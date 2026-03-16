<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Model\LogisticsStatus;
use App\Domain\Repository\LogisticsStatusRepository;

class JsonLogisticsStatusRepository implements LogisticsStatusRepository
{
    private string $filePath;

    public function __construct()
    {
        $this->filePath = __DIR__ . '/../../../data/logistics_status.json';
        if (!file_exists(dirname($this->filePath))) {
            mkdir(dirname($this->filePath), 0777, true);
        }
        if (!file_exists($this->filePath)) {
            file_put_contents($this->filePath, json_encode([]));
        }
    }

    public function findLatest(): ?LogisticsStatus
    {
        $items = $this->loadItems();
        if (empty($items)) {
            return null;
        }

        $row = end($items);
        return new LogisticsStatus(
            new \DateTimeImmutable($row['start_time']),
            new \DateTimeImmutable($row['deadline']),
            (int) $row['id'],
            $row['exit_time'] ? new \DateTimeImmutable($row['exit_time']) : null,
            $row['arrival_time'] ? new \DateTimeImmutable($row['arrival_time']) : null
        );
    }

    public function save(LogisticsStatus $status): void
    {
        $items = $this->loadItems();
        
        $reflection = new \ReflectionClass($status);
        $idProperty = $reflection->getProperty('id');
        $idProperty->setAccessible(true);
        
        $newId = count($items) > 0 ? max(array_column($items, 'id')) + 1 : 1;
        $idProperty->setValue($status, $newId);

        $items[] = $status->toArray();
        $this->saveItems($items);
    }

    public function update(LogisticsStatus $status): void
    {
        $items = $this->loadItems();
        $updated = false;

        foreach ($items as &$item) {
            if ($item['id'] === $status->getId()) {
                $item = $status->toArray();
                $updated = true;
                break;
            }
        }

        if ($updated) {
            $this->saveItems($items);
        }
    }

    private function loadItems(): array
    {
        $content = file_get_contents($this->filePath);
        return json_decode($content, true) ?: [];
    }

    private function saveItems(array $items): void
    {
        file_put_contents($this->filePath, json_encode($items, JSON_PRETTY_PRINT));
    }
}
