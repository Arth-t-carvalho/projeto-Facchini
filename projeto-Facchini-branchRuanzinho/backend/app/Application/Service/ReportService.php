<?php

namespace App\Application\Service;

use App\Domain\Model\CollectedItem;
use App\Domain\Repository\CollectedItemRepository;
use App\Infrastructure\Email\EmailSender;

class ReportService
{
    private CollectedItemRepository $repository;
    private EmailSender $emailSender;

    public function __construct(CollectedItemRepository $repository, EmailSender $emailSender)
    {
        $this->repository = $repository;
        $this->emailSender = $emailSender;
    }

    public function dispatchAndSendReport(string $destination, string $email): void
    {
        $items = $this->repository->findByStatus(CollectedItem::STATUS_ORIGIN);

        if (empty($items)) {
            throw new \Exception("Nenhum item na origem para despachar.");
        }

        $dispatched = [];
        // Transiciona os itens de Origem (1) para Trânsito (2)
        foreach ($items as $item) {
            $item->transitTo($destination);
            $this->repository->save($item); // Save individually since the lock is per-call now (can optimize later if needed, but array size is usually small)
            $dispatched[] = $item;
        }

        $body = "Relatório de Despacho de Carga - Facchini Logística\n\n";
        $body .= "Data de Envio: " . date('d/m/Y H:i:s') . "\n";
        $body .= "Destino: " . $destination . "\n";
        $body .= "Total de volumes: " . count($dispatched) . "\n\n";
        $body .= "===================================\n";
        $body .= "CÓDIGO\t\t\tDATA/HORA ORIGEM\n";
        $body .= "===================================\n";

        foreach ($dispatched as $item) {
            $body .= $item->getCode() . "\t\t" . $item->getCreatedAt()->format('d/m/Y H:i:s') . "\n";
        }

        // Envia para o GMAIL vinculado à filial selecionada
        $this->emailSender->send(
            $email,
            'Despacho de Carga (' . $destination . ') - ' . date('d/m/Y'),
            $body
        );
    }
}
