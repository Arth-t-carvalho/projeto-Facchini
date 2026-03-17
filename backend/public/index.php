<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Infrastructure\Persistence\JsonCollectedItemRepository;
use App\Application\Service\CollectItemService;
use App\Presentation\Controller\CollectController;

// Router simples
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME'];

$path = str_replace($scriptName, '', $requestUri);
if (empty($path)) $path = '/';
$path = rtrim($path, '/');
if (empty($path)) $path = '/';

// DIs
$repository = new JsonCollectedItemRepository();
$collectService = new CollectItemService($repository);
$controller = new CollectController($repository, $collectService);

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

if ($method === 'OPTIONS') exit;

try {
    if ($path === '/items' && $method === 'GET') {
        $controller->listItems();
    } elseif ($path === '/items' && $method === 'POST') {
        $controller->collectItem();
    } elseif ($path === '/items' && $method === 'DELETE') {
        $controller->clearAll();
    } elseif (preg_match('#^/items/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        $controller->deleteItem((int)$matches[1]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
