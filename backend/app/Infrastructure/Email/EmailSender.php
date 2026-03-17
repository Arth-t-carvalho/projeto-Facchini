<?php

namespace App\Infrastructure\Email;

interface EmailSender
{
    public function send(string $to, string $subject, string $body): void;
}
