<?php

namespace App\Application\Service;

use App\Domain\Model\User;
use App\Domain\Repository\UserRepository;

class AuthService
{
    private UserRepository $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function register(string $username, string $password, string $name): void
    {
        if ($this->userRepository->findByUsername($username)) {
            throw new \Exception("Usuário já existe");
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $user = new User($username, $hashedPassword, $name);
        $this->userRepository->save($user);
    }

    public function login(string $username, string $password): ?array
    {
        $user = $this->userRepository->findByUsername($username);

        if (!$user || !password_verify($password, $user->getPassword())) {
            return null;
        }

        // Return user data without password
        return [
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'name' => $user->getName()
        ];
    }
}
