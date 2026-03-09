<?php

namespace App\Infrastructure\Persistence;

class Database
{
    private static ?\mysqli $connection = null;

    public static function getConnection(): \mysqli
    {
        if (self::$connection === null) {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $user = $_ENV['DB_USER'] ?? 'root';
            $pass = $_ENV['DB_PASS'] ?? 'mysql'; // Para XAMPP normalmente vazio ou 'mysql'
            $dbname = $_ENV['DB_NAME'] ?? 'projeto_facchini';

            // Primeiro conecta sem banco de dados para poder criá-lo
            self::$connection = new \mysqli($host, $user, $pass);

            if (self::$connection->connect_error) {
                // Se falhar a senha 'mysql', tenta com senha vazia (padrão XAMPP Windows puro)
                self::$connection = @new \mysqli($host, $user, '');
                if (self::$connection->connect_error) {
                    throw new \Exception("Conexão falhou: " . self::$connection->connect_error);
                }
            }

            self::$connection->set_charset("utf8mb4");

            // Cria o banco de dados automaticamente se não existir usando o nome padrão
            self::$connection->query("CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            self::$connection->select_db($dbname);

            // Usa o arquivo database.sql de exemplo para criar as tabelas automaticamente
            $sqlFile = __DIR__ . '/../../../../database/database.sql';
            if (file_exists($sqlFile)) {
                $schema = file_get_contents($sqlFile);
                if (self::$connection->multi_query($schema)) {
                    do {
                        if ($result = self::$connection->store_result()) {
                            $result->free();
                        }
                    } while (self::$connection->more_results() && self::$connection->next_result());
                }
            }
        }

        return self::$connection;
    }

}
