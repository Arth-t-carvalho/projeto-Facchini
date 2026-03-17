<?php

namespace App\Application\Service;

use App\Domain\Model\CollectedItem;
use App\Domain\Repository\CollectedItemRepository;

class CollectItemService
{
    private CollectedItemRepository $repository;

    public function __construct(CollectedItemRepository $repository)
    {
        $this->repository = $repository;
    }

    public function execute(string $code): CollectedItem
    {
        if (empty($code)) {
            throw new \InvalidArgumentException("Código inválido.");
        }

        if ($this->repository->existsByCode($code)) {
            throw new \Exception("Este código já foi registrado.");
        }

        $item = new CollectedItem($code);
        $this->repository->save($item);

        return $item;
    }
}
