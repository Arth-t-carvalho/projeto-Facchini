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

    public function sendReport(): void
    {
        $items = $this->repository->findAll();

        if (empty($items)) {
            throw new \Exception("Nenhum item recolhido para enviar.");
        }

        $body = "Relatório de Coleta de Dados - Fachini Logística\n\n";
        $body .= "Data: " . date('d/m/Y H:i:s') . "\n";
        $body .= "Total de volumes: " . count($items) . "\n\n";
        $body .= "===================================\n";
        $body .= "CÓDIGO\t\t\tDATA/HORA\n";
        $body .= "===================================\n";

        foreach ($items as $item) {
            $body .= $item->getCode() . "\t\t" . $item->getTimestamp()->format('d/m/Y H:i:s') . "\n";
        }
// aqui e a parte que vc escolhe o gmail do caba para mandar 
        $this->emailSender->send(
            'arthur.t.carvalho@aluno.senai.br',
            'Coleta de Dados - ' . date('d/m/Y'),
            $body
        );

        $this->repository->deleteAll();
    }
}
