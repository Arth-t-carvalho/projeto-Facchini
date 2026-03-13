<?php

// Simple Router
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME'];

// Extrai o caminho relativo
$path = str_replace($scriptName, '', $requestUri);

// Fallback para quando o path está vazio ou termina em barra
if (empty($path)) {
    $path = '/';
}
$path = rtrim($path, '/');
if (empty($path))
    $path = '/';

// Setup DI (Manual for this structure)
$repository = new JsonCollectedItemRepository();
$emailSender = new PHPMailerEmailSender();
$collectService = new CollectItemService($repository);
$reportService = new ReportService($repository, $emailSender);
$controller = new CollectController($repository, $collectService, $reportService);

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

if ($method === 'OPTIONS') {
    exit;
}

// Routes
try {
    if ($path === '/items' && $method === 'GET') {
        $controller->listItems();
    } elseif ($path === '/items' && $method === 'POST') {
        $controller->collectItem();
    } elseif ($path === '/items' && $method === 'DELETE') {
        $controller->clearAll();
    } elseif (preg_match('#^/items/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        $controller->deleteItem((int) $matches[1]);
    } elseif ($path === '/report' && $method === 'POST') {
        $controller->sendReport();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada (' . $path . ')']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Interal Server Error: ' . $e->getMessage()]);
}
