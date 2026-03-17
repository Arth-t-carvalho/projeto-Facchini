<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Infrastructure\Persistence\Database;

try {
    $conn = Database::getConnection();
    echo "--- USERS ---\n";
    $result = $conn->query("SELECT * FROM users");
    while ($row = $result->fetch_assoc()) {
        print_r($row);
    }

    echo "--- ITEMS ---\n";
    $result = $conn->query("SELECT * FROM collected_items");
    while ($row = $result->fetch_assoc()) {
        print_r($row);
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
