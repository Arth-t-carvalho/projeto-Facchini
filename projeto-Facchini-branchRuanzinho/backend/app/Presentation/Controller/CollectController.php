<?php

namespace App\Presentation\Controller;

use App\Application\Service\CollectItemService;
use App\Application\Service\ReportService;
use App\Domain\Repository\CollectedItemRepository;

class CollectController
{
    private CollectedItemRepository $repository;
    private CollectItemService $collectService;
    private ReportService $reportService;

    public function __construct(
        CollectedItemRepository $repository,
        CollectItemService $collectService,
        ReportService $reportService
    ) {
        $this->repository = $repository;
        $this->collectService = $collectService;
        $this->reportService = $reportService;
    }

    public function listItems(): void
    {
        $items = $this->repository->findActiveVisually();
        $this->jsonResponse(array_map(fn($item) => $item->toArray(), $items));
    }

    public function listHistory(): void
    {
        $items = $this->repository->findAll(); // Retorna tudo para o histórico
        $this->jsonResponse(array_map(fn($item) => $item->toArray(), $items));
    }

    public function collectItem(): void
    {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            $this->jsonResponse(['error' => 'Corpo da requisição inválido. JSON malformado.'], 400);
            return;
        }

        $code = trim($data['code'] ?? '');
        if (empty($code)) {
            $this->jsonResponse(['error' => 'O código é obrigatório.'], 400);
            return;
        }

        try {
            $item = $this->collectService->execute($code);
            $this->jsonResponse($item->toArray(), 201);
        } catch (\InvalidArgumentException $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            if (strpos($msg, 'PRECONDITION_REQUIRED') !== false) {
                // Return 428 to signal the frontend to show the receive modal
                $safeMsg = str_replace('PRECONDITION_REQUIRED: ', '', $msg);
                $this->jsonResponse(['error' => $safeMsg, 'code' => $code, 'requires_receive' => true], 428);
            } else {
                $this->jsonResponse(['error' => $msg], 409);
            }
        }
    }
    
    public function receiveItem(string $code): void
    {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            $this->jsonResponse(['error' => 'Corpo da requisição inválido. JSON malformado.'], 400);
            return;
        }

        $observation = trim($data['observation'] ?? '');
        
        try {
            $item = $this->collectService->receiveItem($code, $observation);
            $this->jsonResponse($item->toArray(), 200);
        } catch (\InvalidArgumentException $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 404);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 400);
        }
    }

    public function sendReport(): void
    {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            $this->jsonResponse(['error' => 'Corpo da requisição inválido. JSON malformado.'], 400);
            return;
        }

        $destination = trim($data['destination'] ?? 'Destino Não Informado');
        $email = trim($data['email'] ?? 'arthur.t.carvalho@aluno.senai.br');

        try {
            // Updated to dispatch and transition states 1 -> 2
            $this->reportService->dispatchAndSendReport($destination, $email);
            $this->jsonResponse(['success' => 'Itens despachados e relatório enviado com sucesso.']);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    public function clearAll(): void
    {
        $this->repository->clearActive();
        $this->jsonResponse(['success' => 'Os itens ativos foram ocultados da tela principal.']);
    }

    public function deleteItem(int $id): void
    {
        $this->repository->deleteById($id);
        $this->jsonResponse(['success' => 'Item removido com sucesso.']);
    }

    private function jsonResponse(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
