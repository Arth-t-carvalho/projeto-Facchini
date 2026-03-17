<?php

namespace App\Domain\Repository;

use App\Domain\Model\CollectedItem;

interface CollectedItemRepository
{
    public function save(CollectedItem $item): void;
    public function findAll(): array;
    public function findByStatus(int $status): array;
    public function deleteById(int $id): void;
    public function existsByCode(string $code): bool;
    public function incrementScanCount(string $code): void;
    public function findByCode(string $code): ?CollectedItem;
    public function archiveAll(): void;
    
    // New methods
    public function findActiveVisually(): array;
    public function clearActive(): void;
}
