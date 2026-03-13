<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Infrastructure\Persistence\JsonCollectedItemRepository;
use App\Infrastructure\Email\PHPMailerEmailSender;
use App\Application\Service\CollectItemService;
use App\Application\Service\ReportService;
use App\Presentation\Controller\CollectController;

// Simple .env Loader
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

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
