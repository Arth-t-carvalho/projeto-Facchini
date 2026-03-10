<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Model\User;
use App\Domain\Repository\UserRepository;

class MySQLUserRepository implements UserRepository
{
    private \mysqli $mysqli;

    public function __construct()
    {
        $this->mysqli = Database::getConnection();
    }

    public function save(User $user): void
    {
        $sql = "INSERT INTO users (username, password, name, created_at) VALUES (?, ?, ?, ?)";
        $stmt = $this->mysqli->prepare($sql);

        if (!$stmt) {
            throw new \Exception("Erro ao preparar query: " . $this->mysqli->error);
        }

        $username = $user->getUsername();
        $password = $user->getPassword();
        $name = $user->getName();
        $createdAt = $user->getCreatedAt()->format('Y-m-d H:i:s');

        $stmt->bind_param("ssss", $username, $password, $name, $createdAt);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new \Exception("Erro ao salvar usuário: " . $error);
        }

        $stmt->close();
    }

    public function findByUsername(string $username): ?User
    {
        $sql = "SELECT * FROM users WHERE username = ?";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        if (!$row)
            return null;

        return new User(
            $row['username'],
            $row['password'],
            $row['name'],
            (int) $row['id'],
            new \DateTimeImmutable($row['created_at'])
        );
    }

    public function findById(int $id): ?User
    {
        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $this->mysqli->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        if (!$row)
            return null;

        return new User(
            $row['username'],
            $row['password'],
            $row['name'],
            (int) $row['id'],
            new \DateTimeImmutable($row['created_at'])
        );
    }
}
