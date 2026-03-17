<?php

namespace App\Infrastructure\Email;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class PHPMailerEmailSender implements EmailSender
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $fromEmail;
    private string $fromName;

    public function __construct()
    {
        // Settings should ideally come from environment variables
        $this->host = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $this->port = (int)(getenv('SMTP_PORT') ?: 587);
        $this->username = getenv('SMTP_USER') ?: '';
        $this->password = getenv('SMTP_PASS') ?: '';
        $this->fromEmail = getenv('MAIL_FROM') ?: '';
        $this->fromName = getenv('MAIL_NAME') ?: 'Fachini Data Collection';
    }

    public function send(string $to, string $subject, string $body): void
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = $this->host;
            $mail->SMTPAuth = true;
            $mail->Username = $this->username;
            $mail->Password = $this->password;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $this->port;

            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($to);

            $mail->isHTML(false);
            $mail->Subject = $subject;
            $mail->Body = $body;

            $mail->send();
        }
        catch (Exception $e) {
            throw new \Exception("Falha ao enviar e-mail. Verifique as configurações de SMTP no arquivo .env. Detalhe: {$mail->ErrorInfo}");
        }
    }
}
