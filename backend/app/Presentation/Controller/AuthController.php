<?php

namespace App\Presentation\Controller;

use App\Application\Service\AuthService;

class AuthController
{
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username e password são obrigatórios']);
            return;
        }

        $user = $this->authService->login($data['username'], $data['password']);

        if ($user) {
            $_SESSION['user'] = $user;
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Credenciais inválidas']);
        }
    }

    public function register(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['username']) || !isset($data['password']) || !isset($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username, password e nome são obrigatórios']);
            return;
        }

        try {
            $this->authService->register($data['username'], $data['password'], $data['name']);
            echo json_encode(['success' => true, 'message' => 'Usuário cadastrado com sucesso']);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function logout(): void
    {
        session_destroy();
        echo json_encode(['success' => true]);
    }

    public function me(): void
    {
        if (isset($_SESSION['user'])) {
            echo json_encode(['authenticated' => true, 'user' => $_SESSION['user']]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
    }
}
