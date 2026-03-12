<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Model\User;
use App\Domain\Repository\UserRepository;

class JsonUserRepository implements UserRepository
{
    private string $filePath;

    public function __construct()
    {
        $this->filePath = __DIR__ . '/../../../data/users.json';
        if (!file_exists(dirname($this->filePath))) {
            mkdir(dirname($this->filePath), 0777, true);
        }
        if (!file_exists($this->filePath)) {
            // Criar um usuário admin padrão se o arquivo não existir
            $adminUser = [
                'id' => 1,
                'username' => 'admin',
                'password' => password_hash('admin123', PASSWORD_BCRYPT),
                'name' => 'Administrador',
                'created_at' => date('Y-m-d H:i:s')
            ];
            file_put_contents($this->filePath, json_encode([$adminUser], JSON_PRETTY_PRINT));
        }
    }

    private function loadUsers(): array
    {
        $content = file_get_contents($this->filePath);
        $data = json_decode($content, true) ?: [];
        
        $users = [];
        foreach ($data as $row) {
            $users[] = new User(
                $row['username'],
                $row['password'],
                $row['name'],
                (int) $row['id'],
                new \DateTimeImmutable($row['created_at'])
            );
        }
        return $users;
    }

    private function saveUsers(array $users): void
    {
        $data = array_map(function (User $user) {
            return [
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'password' => $user->getPassword(),
                'name' => $user->getName(),
                'created_at' => $user->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }, $users);
        file_put_contents($this->filePath, json_encode($data, JSON_PRETTY_PRINT));
    }

    public function save(User $user): void
    {
        $users = $this->loadUsers();
        
        // Simular ID auto-incremento
        if ($user->getId() === null || $user->getId() <= 0) {
            $maxId = 0;
            foreach ($users as $existingUser) {
                if ($existingUser->getId() > $maxId) {
                    $maxId = $existingUser->getId();
                }
            }
            $reflection = new \ReflectionClass($user);
            $idProperty = $reflection->getProperty('id');
            $idProperty->setAccessible(true);
            $idProperty->setValue($user, $maxId + 1);
        }

        $users[] = $user;
        $this->saveUsers($users);
    }

    public function findByUsername(string $username): ?User
    {
        foreach ($this->loadUsers() as $user) {
            if ($user->getUsername() === $username) {
                return $user;
            }
        }
        return null;
    }

    public function findById(int $id): ?User
    {
        foreach ($this->loadUsers() as $user) {
            if ($user->getId() === $id) {
                return $user;
            }
        }
        return null;
    }
}
