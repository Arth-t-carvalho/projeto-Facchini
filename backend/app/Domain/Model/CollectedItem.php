<?php

namespace App\Domain\Model;

class CollectedItem
{
    private ?int $id;
    private string $code;
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $code,
        ?int $id = null,
        ?\DateTimeImmutable $createdAt = null
    ) {
        $this->id = $id;
        $this->code = $code;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCode(): string { return $this->code; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'created_at' => $this->createdAt->format('Y-m-d H:i:s')
        ];
    }
}
