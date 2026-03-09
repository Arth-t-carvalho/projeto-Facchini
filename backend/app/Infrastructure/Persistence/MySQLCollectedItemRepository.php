<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Model\CollectedItem;
use App\Domain\Repository\CollectedItemRepository;

class MySQLCollectedItemRepository implements CollectedItemRepository
{
    private \mysqli $mysqli;

    public function __construct()
    {
        $this->mysqli = Database::getConnection();
    }

    public function save(CollectedItem $item): void
    {
        $sql = "INSERT INTO collected_items (code, timestamp, scan_count, status) VALUES (?, ?, ?, ?)";
        $stmt = $this->mysqli->prepare($sql);

        $code = $item->getCode();
        $timestamp = $item->getTimestamp()->format('Y-m-d H:i:s');
        $scanCount = $item->getScanCount();
        $status = $item->getStatus();

        $stmt->bind_param("ssis", $code, $timestamp, $scanCount, $status);
        $stmt->execute();
        $stmt->close();
    }

    public function findAll(): array
    {
        $sql = "SELECT * FROM collected_items ORDER BY timestamp DESC";
        $result = $this->mysqli->query($sql);

        $items = [];
        while ($row = $result->fetch_assoc()) {
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

    public function findByStatus(string $status): array
    {
        $sql = "SELECT * FROM collected_items WHERE status = ? ORDER BY timestamp DESC";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("s", $status);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = new CollectedItem(
                $row['code'],
                (int) $row['id'],
                new \DateTimeImmutable($row['timestamp']),
                (int) ($row['scan_count'] ?? 1),
                $row['status'] ?? 'pending'
            );
        }
        $stmt->close();

        return $items;
    }

    public function archiveAll(): void
    {
        $sql = "UPDATE collected_items SET status = 'archived' WHERE status = 'pending'";
        $this->mysqli->query($sql);
    }

    public function deleteById(int $id): void
    {
        $sql = "DELETE FROM collected_items WHERE id = ?";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $stmt->close();
    }

    public function existsByCode(string $code): bool
    {
        $sql = "SELECT COUNT(*) as count FROM collected_items WHERE code = ? AND status = 'pending'";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        return (int) $row['count'] > 0;
    }

    public function incrementScanCount(string $code): void
    {
        $sql = "UPDATE collected_items SET scan_count = scan_count + 1, timestamp = ? WHERE code = ? AND status = 'pending'";
        $stmt = $this->mysqli->prepare($sql);

        $timestamp = (new \DateTimeImmutable())->format('Y-m-d H:i:s');
        $stmt->bind_param("ss", $timestamp, $code);
        $stmt->execute();
        $stmt->close();
    }

    public function findByCode(string $code): ?CollectedItem
    {
        $sql = "SELECT * FROM collected_items WHERE code = ? AND status = 'pending'";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        if (!$row)
            return null;

        return new CollectedItem(
            $row['code'],
            (int) $row['id'],
            new \DateTimeImmutable($row['timestamp']),
            (int) ($row['scan_count'] ?? 1),
            $row['status'] ?? 'pending'
        );
    }
}
