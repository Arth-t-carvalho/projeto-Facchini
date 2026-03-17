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

        $type = null;
        if ($this->isBarcode($code)) {
            $type = 'barcode';
        } elseif ($this->isQRCode($code)) {
            $type = 'qr';
        } else {
            throw new \InvalidArgumentException("Formato de código não reconhecido (deve ser QR Code ou Código de Barras EAN-13/ITF-14).");
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
        $item = new CollectedItem($code, $type);
        $this->repository->save($item);

        return $item;
    }

    private function isBarcode(string $code): bool
    {
        return (bool) preg_match('/^\d{13,14}$/', $code);
    }

    private function isQRCode(string $code): bool
    {
        // URL pattern
        if (preg_match('/^https?:\/\/\S+$/i', $code)) {
            return true;
        }
        // Basic JSON pattern
        $trimmed = trim($code);
        if ((str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) || 
            (str_starts_with($trimmed, '[') && str_ends_with($trimmed, ']'))) {
            return true;
        }
        return false;
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
