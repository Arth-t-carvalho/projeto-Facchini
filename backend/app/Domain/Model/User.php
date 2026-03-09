<?php

namespace App\Domain\Model;

class User
{
    private ?int $id;
    private string $username;
    private string $password;
    private string $name;
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $username,
        string $password,
        string $name,
        ?int $id = null,
        ?\DateTimeImmutable $createdAt = null
    ) {
        $this->username = $username;
        $this->password = $password;
        $this->name = $name;
        $this->id = $id;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
