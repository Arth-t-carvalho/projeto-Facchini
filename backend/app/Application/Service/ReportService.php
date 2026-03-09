<?php

namespace App\Application\Service;

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

    public function sendReport(string $email): void
    {
        $items = $this->repository->findByStatus('pending');

        if (empty($items)) {
            throw new \Exception("Nenhum item recolhido para enviar.");
        }

        $body = "Relatório de Coleta de Dados - Facchini Logística\n\n";
        $body .= "Data: " . date('d/m/Y H:i:s') . "\n";
        $body .= "Total de volumes: " . count($items) . "\n\n";
        $body .= "===================================\n";
        $body .= "CÓDIGO\t\t\tDATA/HORA\n";
        $body .= "===================================\n";

        foreach ($items as $item) {
            $body .= $item->getCode() . "\t\t" . $item->getTimestamp()->format('d/m/Y H:i:s') . "\n";
        }

        // ABAIXO O SISTEMA ENVIA PARA O GMAIL VINCULADO À FILIAL SELECIONADA
        $this->emailSender->send(
            $email,
            'Coleta de Dados - ' . date('d/m/Y'),
            $body
        );

        $this->repository->archiveAll();
    }
}
