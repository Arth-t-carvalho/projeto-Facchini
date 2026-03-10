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
            $pass = $_ENV['DB_PASS'] ?? '';
            $dbname = $_ENV['DB_NAME'] ?? 'projeto_facchini';
            $port = $_ENV['DB_PORT'] ?? '3308';

            // Tenta conectar com a senha configurada
            self::$connection = @new \mysqli($host, $user, $pass, $dbname, $port);

            if (self::$connection->connect_error) {
                // Fallback: tenta com senha vazia (padrão XAMPP Windows)
                self::$connection = @new \mysqli($host, $user, '');
                if (self::$connection->connect_error) {
                    throw new \Exception("Conexão falhou: " . self::$connection->connect_error);
                }
            }

            self::$connection->set_charset("utf8mb4");

            // Cria o banco de dados automaticamente se não existir
            self::$connection->query("CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            self::$connection->select_db($dbname);

            // Executa o schema SQL para criar as tabelas (se o arquivo existir)
            $sqlFile = __DIR__ . '/../../../../database/database.sql';
            if (file_exists($sqlFile)) {
                $schema = file_get_contents($sqlFile);

                // Remove comentários SQL (-- ...) para evitar problemas
                $schema = preg_replace('/--.*$/m', '', $schema);

                // Separa as queries por ponto e vírgula e executa uma a uma
                $queries = array_filter(array_map('trim', explode(';', $schema)));
                foreach ($queries as $query) {
                    if (!empty($query)) {
                        self::$connection->query($query);
                    }
                }
            }

            // Migração: garante que colunas necessárias existam em collected_items
            self::ensureColumn($dbname, 'collected_items', 'scan_count', 'INT DEFAULT 1');
            self::ensureColumn($dbname, 'collected_items', 'status', "VARCHAR(20) DEFAULT 'pending'");
        }

        return self::$connection;
    }

    /**
     * Verifica se uma coluna existe na tabela e a adiciona caso não exista.
     */
    private static function ensureColumn(string $dbname, string $table, string $column, string $definition): void
    {
        $check = self::$connection->query(
            "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = '$table' AND COLUMN_NAME = '$column'"
        );

        if ($check) {
            $row = $check->fetch_assoc();
            if ((int) $row['cnt'] === 0) {
                self::$connection->query("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
            }
        }
    }
}
