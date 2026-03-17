<?php

namespace App\Presentation\Controller;

use App\Application\Service\CollectItemService;
use App\Domain\Repository\CollectedItemRepository;

class CollectController
{
    private CollectedItemRepository $repository;
    private CollectItemService $collectService;

    public function __construct(
        CollectedItemRepository $repository,
        CollectItemService $collectService
    ) {
        $this->repository = $repository;
        $this->collectService = $collectService;
    }

    public function listItems(): void
    {
        $items = $this->repository->findAll();
        $this->jsonResponse(array_map(fn($item) => $item->toArray(), $items));
    }

    public function collectItem(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $code = trim($data['code'] ?? '');

        try {
            $item = $this->collectService->execute($code);
            $this->jsonResponse($item->toArray(), 201);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 409);
        }
    }

    public function clearAll(): void
    {
        $this->repository->clearAll();
        $this->jsonResponse(['success' => 'Lista limpa com sucesso.']);
    }

    public function deleteItem(int $id): void
    {
        $this->repository->deleteById($id);
        $this->jsonResponse(['success' => 'Item removido.']);
    }

    private function jsonResponse(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
