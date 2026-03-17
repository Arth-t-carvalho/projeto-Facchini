<?php

namespace App\Domain\Model;

class CollectedItem
{
    public const STATUS_ORIGIN = 1;
    public const STATUS_TRANSIT = 2;
    public const STATUS_RECEIVED = 3;

    private ?int $id;
    private string $code;
    private string $type; // 'qr' or 'barcode'
    private int $status;
    private ?string $destination;
    private ?string $observation;
    
    private \DateTimeImmutable $createdAt;
    private ?\DateTimeImmutable $sentAt;
    private ?\DateTimeImmutable $receivedAt;
    
    private array $history;

    public function __construct(
        string $code,
        string $type = 'barcode',
        ?int $id = null,
        int $status = self::STATUS_ORIGIN,
        ?string $destination = null,
        ?string $observation = null,
        ?\DateTimeImmutable $createdAt = null,
        ?\DateTimeImmutable $sentAt = null,
        ?\DateTimeImmutable $receivedAt = null,
        array $history = []
    ) {
        $this->id = $id;
        $this->code = $code;
        $this->type = $type;
        $this->status = $status;
        $this->destination = $destination;
        $this->observation = $observation;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
        $this->sentAt = $sentAt;
        $this->receivedAt = $receivedAt;
        
        $this->history = $history;
        if (empty($this->history)) {
            $this->addHistoryLog(null, $this->status);
        }
    }

    private function addHistoryLog(?int $from, int $to): void
    {
        $this->history[] = [
            'from_status' => $from,
            'to_status' => $to,
            'timestamp' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
            'user' => 'Sistema/App' // Simplificado conforme aprovação do usuário
        ];
    }

    public function transitTo(string $destination): void
    {
        if ($this->status !== self::STATUS_ORIGIN) {
            throw new \LogicException("O item apenas pode ser enviado se estiver na origem.");
        }
        $this->addHistoryLog($this->status, self::STATUS_TRANSIT);
        $this->status = self::STATUS_TRANSIT;
        $this->destination = $destination;
        $this->sentAt = new \DateTimeImmutable();
    }

    public function receiveAtDestination(string $observation): void
    {
        if ($this->status !== self::STATUS_TRANSIT) {
            throw new \LogicException("O item apenas pode ser recebido se estiver em trânsito.");
        }
        $this->addHistoryLog($this->status, self::STATUS_RECEIVED);
        $this->status = self::STATUS_RECEIVED;
        $this->observation = $observation;
        $this->receivedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCode(): string { return $this->code; }
    public function getType(): string { return $this->type; }
    public function getStatus(): int { return $this->status; }
    public function getDestination(): ?string { return $this->destination; }
    public function getObservation(): ?string { return $this->observation; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getSentAt(): ?\DateTimeImmutable { return $this->sentAt; }
    public function getReceivedAt(): ?\DateTimeImmutable { return $this->receivedAt; }
    public function getHistory(): array { return $this->history; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'type' => $this->type,
            'status' => $this->status,
            'destination' => $this->destination,
            'observation' => $this->observation,
            'created_at' => $this->createdAt->format('Y-m-d H:i:s'),
            'sent_at' => $this->sentAt ? $this->sentAt->format('Y-m-d H:i:s') : null,
            'received_at' => $this->receivedAt ? $this->receivedAt->format('Y-m-d H:i:s') : null,
            'history' => $this->history
        ];
    }
}
