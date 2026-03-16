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

        $existingItem = $this->repository->findByCode($code);
        
        if ($existingItem) {
            $status = $existingItem->getStatus();
            if ($status === CollectedItem::STATUS_ORIGIN) {
                throw new \Exception("Item já escaneado e aguardando envio na origem.");
            } elseif ($status === CollectedItem::STATUS_TRANSIT) {
                // Signal to frontend that it needs to open the receive modal
                throw new \Exception("PRECONDITION_REQUIRED: Item em trânsito. Necessário confirmação de chegada.");
            } elseif ($status === CollectedItem::STATUS_RECEIVED) {
                throw new \Exception("Item já foi recebido no destino final.");
            }
        }

        // New Item
        $item = new CollectedItem($code);
        $this->repository->save($item);

        return $item;
    }
    
    public function receiveItem(string $code, string $observation): CollectedItem
    {
        $item = $this->repository->findByCode($code);
        if (!$item) {
            throw new \InvalidArgumentException("Item não encontrado.");
        }
        
        $item->receiveAtDestination($observation);
        $this->repository->save($item);
        
        return $item;
    }
}
