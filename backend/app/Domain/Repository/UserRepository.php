<?php

namespace App\Domain\Repository;

use App\Domain\Model\User;

interface UserRepository
{
    public function save(User $user): void;
    public function findByUsername(string $username): ?User;
    public function findById(int $id): ?User;
}
