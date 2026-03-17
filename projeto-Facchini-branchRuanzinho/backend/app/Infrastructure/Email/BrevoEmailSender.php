<?php

namespace App\Infrastructure\Email;

class BrevoEmailSender implements EmailSender
{
    private string $apiKey;
    private string $fromEmail;
    private string $fromName;

    public function __construct()
    {
        $this->apiKey = $_ENV['BREVO_API_KEY'] ?? '';
        $this->fromEmail = $_ENV['MAIL_FROM'] ?? 'no-reply@facchini.com.br';
        $this->fromName = $_ENV['MAIL_NAME'] ?? 'Facchini Data Collection';
    }

    public function send(string $to, string $subject, string $body): void
    {
        if (empty($this->apiKey)) {
            throw new \Exception("Brevo API Key não configurada no arquivo .env");
        }

        $url = 'https://api.brevo.com/v3/smtp/email';

        $data = [
            'sender' => [
                'name' => $this->fromName,
                'email' => $this->fromEmail
            ],
            'to' => [
                [
                    'email' => $to
                ]
            ],
            'subject' => $subject,
            'htmlContent' => nl2br($body)
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'api-key: ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            $errorData = json_decode($response, true);
            $errorMessage = $errorData['message'] ?? 'Erro desconhecido na API do Brevo';
            throw new \Exception("Falha ao enviar e-mail via Brevo API: $errorMessage (Code: $httpCode)");
        }
    }
}
