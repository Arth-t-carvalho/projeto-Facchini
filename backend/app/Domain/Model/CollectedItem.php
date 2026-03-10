<?php

namespace App\Domain\Model;

class CollectedItem
{
    private ?int $id;
    private string $code;
    private \DateTimeImmutable $timestamp;
    private int $scanCount;
    private string $status;

    public function __construct(string $code, ?int $id = null, ?\DateTimeImmutable $timestamp = null, int $scanCount = 1, string $status = 'pending')
    {
        $this->id = $id;
        $this->code = $code;
        $this->timestamp = $timestamp ?? new \DateTimeImmutable();
        $this->scanCount = $scanCount;
        $this->status = $status;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function getTimestamp(): \DateTimeImmutable
    {
        return $this->timestamp;
    }

    public function getScanCount(): int
    {
        return $this->scanCount;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'timestamp' => $this->timestamp->format('Y-m-d H:i:s'),
            'scan_count' => $this->scanCount,
            'status' => $this->status,
        ];
    }
}
