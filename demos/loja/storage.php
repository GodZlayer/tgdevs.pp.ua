<?php

function storageIsList(array $value): bool
{
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

function storageGetApiHeaders(): array
{
    return [
        'X-Client-ID: ' . DATA_API_CLIENT_ID,
        'X-API-Key: ' . DATA_API_KEY,
        'Accept: application/json',
        'User-Agent: GeloCRM/1.0',
        'Content-Type: application/json',
    ];
}

function storageGetRawApiHeaders(array $extraHeaders = []): array
{
    return array_merge([
        'X-Client-ID: ' . DATA_API_CLIENT_ID,
        'X-API-Key: ' . DATA_API_KEY,
        'User-Agent: GeloCRM/1.0',
    ], $extraHeaders);
}

function storageApiErrorMessage(array $payload): string
{
    foreach (['detail', 'message', 'error', 'raw'] as $key) {
        if (!empty($payload[$key]) && is_string($payload[$key])) {
            if ($key === 'raw') {
                $raw = $payload[$key];
                if (
                    stripos($raw, 'Source IP not allowed for this client') !== false
                    || stripos($raw, '403 Forbidden') !== false
                    || stripos($raw, 'Access to this resource on the server is denied') !== false
                ) {
                    return 'Source IP not allowed for this client. The backend must run from the admin IP 192.168.18.13.';
                }
            }
            return $payload[$key];
        }
    }

    if (!empty($payload['details']['message']) && is_string($payload['details']['message'])) {
        return $payload['details']['message'];
    }

    return 'Unknown Data API error';
}

function storageSchemaCacheFile(): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'gelocrm_schema_'
        . md5(DATA_API_BASE_URL . '|' . DATA_API_DATASOURCE . '|schema-v7')
        . '.cache';
}

function storageHasFreshSchemaCache(): bool
{
    $cacheFile = storageSchemaCacheFile();
    return is_file($cacheFile) && (time() - (int) filemtime($cacheFile) < DATA_API_SCHEMA_CACHE_TTL);
}

function storageTouchSchemaCache(): void
{
    @touch(storageSchemaCacheFile());
}

function storageApiRequest(string $path, string $httpMethod = 'GET', ?array $body = null): array
{
    if (
        DATA_API_BASE_URL === ''
        || DATA_API_CLIENT_ID === ''
        || DATA_API_KEY === ''
        || DATA_API_DATASOURCE === ''
    ) {
        return [
            'status' => 500,
            'data' => ['message' => 'DNL Data API is not configured'],
        ];
    }

    return curlRequest(
        DATA_API_BASE_URL . $path,
        $httpMethod,
        $body,
        storageGetApiHeaders()
    );
}

function storageApiRequestOrFail(string $path, string $httpMethod = 'GET', ?array $body = null): array
{
    $response = storageApiRequest($path, $httpMethod, $body);

    if (!empty($response['error'])) {
        throw new RuntimeException('Data API request failed: ' . $response['error'], 502);
    }

    $status = (int) ($response['status'] ?? 500);
    $payload = $response['data'] ?? [];

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException(
            'Data API request failed: ' . storageApiErrorMessage(is_array($payload) ? $payload : []),
            $status
        );
    }

    if (is_array($payload) && array_key_exists('success', $payload) && $payload['success'] === false) {
        throw new RuntimeException(
            'Data API request failed: ' . storageApiErrorMessage($payload),
            502
        );
    }

    return is_array($payload) ? $payload : [];
}

function storageApiRawRequest(string $path, string $httpMethod = 'GET', ?string $body = null, array $headers = []): array
{
    if (
        DATA_API_BASE_URL === ''
        || DATA_API_CLIENT_ID === ''
        || DATA_API_KEY === ''
    ) {
        return [
            'status' => 500,
            'error' => 'DNL Data API is not configured',
        ];
    }

    if (!function_exists('curl_init')) {
        return ['status' => 500, 'error' => 'PHP cURL extension is not enabled'];
    }

    $responseHeaders = [];
    $ch = curl_init(DATA_API_BASE_URL . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    applyCurlSslOptions($ch);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);

    $requestMethod = strtoupper($httpMethod);
    if ($requestMethod !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $requestMethod);
    }

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, storageGetRawApiHeaders($headers));
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, static function ($curl, $headerLine) use (&$responseHeaders) {
        $length = strlen($headerLine);
        $parts = explode(':', $headerLine, 2);
        if (count($parts) === 2) {
            $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
        }
        return $length;
    });

    $responseBody = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($responseBody === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return [
            'status' => 500,
            'error' => $error,
        ];
    }

    curl_close($ch);

    return [
        'status' => $status,
        'body' => $responseBody,
        'headers' => $responseHeaders,
    ];
}

function storageNormalizeObjectPath(?string $path): string
{
    $path = str_replace('\\', '/', trim((string) ($path ?? '')));
    $path = preg_replace('#/+#', '/', $path);
    $path = ltrim((string) $path, '/');
    return trim((string) $path);
}

function storageBuildDataApiObjectUrl(string $path): string
{
    return rtrim(storagePublicDataApiBaseUrl(), '/') . '/v1/storage/object?path=' . rawurlencode(storageNormalizeObjectPath($path));
}

function storageCurrentPublicBaseUrl(): string
{
    $forwardedHost = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''))[0] ?? '');
    $host = $forwardedHost !== '' ? $forwardedHost : trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '') {
        $forwardedProto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0] ?? ''));
        $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
        $scheme = ($forwardedProto === 'https' || $https === 'on' || $https === '1') ? 'https' : 'http';
        return $scheme . '://' . $host;
    }

    return APP_BASE_URL !== '' ? APP_BASE_URL : API_BASE_URL;
}

function storagePublicDataApiBaseUrl(): string
{
    $configuredPublicUrl = trim((string) (getenv('DATA_API_PUBLIC_BASE_URL') ?: ''));
    if ($configuredPublicUrl !== '') {
        return rtrim($configuredPublicUrl, '/');
    }

    $dataApiBaseUrl = rtrim(DATA_API_BASE_URL, '/');
    $publicHost = strtolower((string) parse_url(storageCurrentPublicBaseUrl(), PHP_URL_HOST));
    $isLumixProductionHost = $publicHost === 'lumixice.com.br' || str_ends_with($publicHost, '.lumixice.com.br');
    if (isLocalAppHost($dataApiBaseUrl) && $isLumixProductionHost) {
        return 'https://db.lumixice.com.br';
    }

    return $dataApiBaseUrl;
}

function storageBuildContentPublicPath(string $path): string
{
    $normalizedPath = storageNormalizeObjectPath($path);
    if ($normalizedPath === '') {
        return '/conteudo';
    }

    $segments = array_map(static fn (string $segment): string => rawurlencode($segment), explode('/', $normalizedPath));
    return '/conteudo/' . implode('/', $segments);
}

function storageBuildObjectPublicUrl(string $path): string
{
    return storageBuildDataApiObjectUrl($path);
}

function storageNormalizePublicUrl(?string $value, ?string $fallbackPath = null): ?string
{
    $raw = trim((string) ($value ?? ''));
    $fallbackPath = storageNormalizeObjectPath($fallbackPath);

    if ($raw === '') {
        return $fallbackPath !== '' ? storageBuildObjectPublicUrl($fallbackPath) : null;
    }

    $parts = parse_url($raw);
    if (!is_array($parts)) {
        return $raw;
    }

    $query = [];
    parse_str((string) ($parts['query'] ?? ''), $query);
    $candidatePath = storageNormalizeObjectPath((string) ($query['path'] ?? $fallbackPath));
    $host = strtolower((string) ($parts['host'] ?? ''));
    $pathName = (string) ($parts['path'] ?? '');
    if (str_starts_with($pathName, '/conteudo/')) {
        $candidatePath = storageNormalizeObjectPath(rawurldecode(substr($pathName, strlen('/conteudo/'))));
    }

    if ($candidatePath !== '') {
        if (str_starts_with($pathName, '/conteudo/')) {
            return storageBuildObjectPublicUrl($candidatePath);
        }

        if ($pathName === '/v1/storage/object') {
            return storageBuildObjectPublicUrl($candidatePath);
        }

        if ($pathName === '/api.php' && (($query['action'] ?? '') === 'storage_download')) {
            return storageBuildObjectPublicUrl($candidatePath);
        }

        if (in_array($host, ['127.0.0.1', 'localhost'], true)) {
            return storageBuildObjectPublicUrl($candidatePath);
        }
    }

    return $raw;
}

function storageSanitizeFileName(string $fileName): string
{
    $fileName = trim($fileName);
    if ($fileName === '') {
        return 'arquivo';
    }

    $extension = pathinfo($fileName, PATHINFO_EXTENSION);
    $baseName = pathinfo($fileName, PATHINFO_FILENAME);
    $baseName = preg_replace('/[^A-Za-z0-9_-]+/', '-', $baseName);
    $baseName = trim((string) $baseName, '-_');

    if ($baseName === '') {
        $baseName = 'arquivo';
    }

    $extension = preg_replace('/[^A-Za-z0-9]+/', '', (string) $extension);
    return $extension !== '' ? $baseName . '.' . strtolower($extension) : $baseName;
}

function storageBuildProductImagePath(string $fileName): string
{
    $safeFileName = storageSanitizeFileName($fileName);
    $prefix = storageNormalizeObjectPath(DATA_API_STORAGE_PRODUCTS_DIR);
    $folder = trim(date('Y/m'));
    $token = date('YmdHis') . '-' . substr(bin2hex(random_bytes(6)), 0, 12);

    return storageNormalizeObjectPath($prefix . '/' . $folder . '/' . $token . '-' . $safeFileName);
}

function storageUploadObject(string $path, string $binaryContent, string $contentType = 'application/octet-stream'): array
{
    $path = storageNormalizeObjectPath($path);
    if ($path === '') {
        throw new RuntimeException('Caminho do storage obrigatorio.', 422);
    }

    $response = storageApiRawRequest(
        '/v1/storage/object?path=' . rawurlencode($path),
        'PUT',
        $binaryContent,
        ['Content-Type: ' . ($contentType !== '' ? $contentType : 'application/octet-stream')]
    );

    $status = (int) ($response['status'] ?? 500);
    if ($status < 200 || $status >= 300) {
        $payload = json_decode((string) ($response['body'] ?? ''), true);
        $message = storageApiErrorMessage(is_array($payload) ? $payload : []);
        throw new RuntimeException('Falha ao enviar arquivo para o storage: ' . $message, $status ?: 502);
    }

    $payload = json_decode((string) ($response['body'] ?? ''), true);
    $result = is_array($payload['result'] ?? null) ? $payload['result'] : [];

    return [
        'name' => (string) (($result['name'] ?? '') ?: basename($path)),
        'path' => (string) (($result['path'] ?? '') ?: $path),
        'content_type' => $contentType,
        'public_url' => storageNormalizePublicUrl((string) ($result['public_url'] ?? ''), (string) (($result['path'] ?? '') ?: $path)),
        'public_url_expires_at' => trim((string) ($result['public_url_expires_at'] ?? '')) ?: null,
    ];
}

function storageDownloadObject(string $path): array
{
    $path = storageNormalizeObjectPath($path);
    if ($path === '') {
        throw new RuntimeException('Caminho do storage obrigatorio.', 422);
    }

    $response = storageApiRawRequest(
        '/v1/storage/object?path=' . rawurlencode($path),
        'GET',
        null,
        ['Accept: */*']
    );

    $status = (int) ($response['status'] ?? 500);
    if ($status < 200 || $status >= 300) {
        $payload = json_decode((string) ($response['body'] ?? ''), true);
        $message = storageApiErrorMessage(is_array($payload) ? $payload : []);
        throw new RuntimeException('Falha ao baixar arquivo do storage: ' . $message, $status ?: 502);
    }

    return [
        'path' => $path,
        'body' => (string) ($response['body'] ?? ''),
        'content_type' => (string) (($response['headers']['content-type'] ?? '') ?: 'application/octet-stream'),
        'content_length' => (int) (($response['headers']['content-length'] ?? 0) ?: strlen((string) ($response['body'] ?? ''))),
    ];
}

function storageListObjects(string $path = ''): array
{
    $normalizedPath = storageNormalizeObjectPath($path);
    $endpoint = '/v1/storage/list';
    if ($normalizedPath !== '') {
        $endpoint .= '?path=' . rawurlencode($normalizedPath);
    }

    $payload = storageApiRequestOrFail($endpoint, 'GET');
    $items = [];

    foreach (($payload['items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $itemPath = storageNormalizeObjectPath((string) ($item['path'] ?? ''));
        $publicUrl = storageNormalizePublicUrl((string) ($item['public_url'] ?? ''), $itemPath);
        $items[] = [
            'name' => (string) ($item['name'] ?? basename($itemPath)),
            'path' => $itemPath,
            'type' => (string) ($item['type'] ?? 'file'),
            'modified_at' => $item['modified_at'] ?? null,
            'size' => isset($item['size']) ? (int) $item['size'] : null,
            'mime_type' => (string) ($item['mime_type'] ?? ''),
            'public_url' => $publicUrl ?: ($itemPath !== '' ? storageBuildObjectPublicUrl($itemPath) : null),
            'public_url_expires_at' => $item['public_url_expires_at'] ?? null,
        ];
    }

    return $items;
}

function storageListProductImages(int $limit = 36): array
{
    storageEnsureReady();

    $root = storageNormalizeObjectPath(DATA_API_STORAGE_PRODUCTS_DIR);
    if ($root === '') {
        return [];
    }

    $queue = [$root];
    $visited = [];
    $files = [];
    $iterations = 0;

    while (!empty($queue) && $iterations < 100) {
        $iterations += 1;
        $currentPath = array_shift($queue);
        if (!is_string($currentPath) || $currentPath === '' || isset($visited[$currentPath])) {
            continue;
        }

        $visited[$currentPath] = true;
        $items = storageListObjects($currentPath);

        foreach ($items as $item) {
            $type = (string) ($item['type'] ?? 'file');
            if ($type === 'directory') {
                $queue[] = (string) ($item['path'] ?? '');
                continue;
            }

            $mimeType = strtolower((string) ($item['mime_type'] ?? ''));
            $name = strtolower((string) ($item['name'] ?? ''));
            $isImage = strpos($mimeType, 'image/') === 0
                || preg_match('/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/', $name);

            if (!$isImage) {
                continue;
            }

            $files[] = $item;
        }
    }

    usort($files, static function (array $a, array $b): int {
        $aTime = strtotime((string) ($a['modified_at'] ?? '')) ?: 0;
        $bTime = strtotime((string) ($b['modified_at'] ?? '')) ?: 0;
        return $bTime <=> $aTime;
    });

    return array_slice($files, 0, max(1, $limit));
}

function storageNamedQuery(string $queryName, ?array $body = null): array
{
    $payload = storageApiRequestOrFail('/v1/query/' . rawurlencode($queryName), 'POST', $body ?? []);
    return storageExtractRows($payload);
}

function storageExtractRows($payload): array
{
    if (!is_array($payload)) {
        return [];
    }

    if (storageIsList($payload)) {
        return $payload;
    }

    if (
        isset($payload['columns'], $payload['rows'])
        && is_array($payload['columns'])
        && is_array($payload['rows'])
        && storageIsList($payload['rows'])
    ) {
        $mapped = [];
        foreach ($payload['rows'] as $row) {
            if (is_array($row) && storageIsList($row)) {
                $mapped[] = array_combine($payload['columns'], $row);
            } elseif (is_array($row)) {
                $mapped[] = $row;
            }
        }
        return $mapped;
    }

    foreach (['rows', 'data', 'result', 'results', 'items'] as $key) {
        if (array_key_exists($key, $payload)) {
            $rows = storageExtractRows($payload[$key]);
            if ($rows !== [] || $payload[$key] === []) {
                return $rows;
            }
        }
    }

    return [];
}

function storageSelectRows(string $sql): array
{
    $payload = storageApiRequestOrFail('/v1/sql/select', 'POST', [
        'datasource' => DATA_API_DATASOURCE,
        'sql' => $sql,
    ]);

    return storageExtractRows($payload);
}

function storageSelectRow(string $sql): ?array
{
    $rows = storageSelectRows($sql);
    if (empty($rows)) {
        return null;
    }

    return is_array($rows[0]) ? $rows[0] : null;
}

function storageExec(string $sql): array
{
    return storageApiRequestOrFail('/v1/sql/exec', 'POST', [
        'datasource' => DATA_API_DATASOURCE,
        'sql' => $sql,
    ]);
}

function storageSqlNumber($value, int $scale = 2): string
{
    return number_format((float) $value, $scale, '.', '');
}

function storageSqlValue($value): string
{
    if ($value === null) {
        return 'NULL';
    }

    if (is_bool($value)) {
        return $value ? '1' : '0';
    }

    if (is_int($value)) {
        return (string) $value;
    }

    if (is_float($value)) {
        return storageSqlNumber($value, 6);
    }

    $stringValue = (string) $value;
    $stringValue = str_replace(
        ["\\", "\0", "\n", "\r", "\x1a", "'"],
        ["\\\\", "\\0", "\\n", "\\r", "\\Z", "''"],
        $stringValue
    );

    return "'" . $stringValue . "'";
}

function storageListKnownTables(): array
{
    if (DATA_API_TABLES_QUERY === '') {
        return [];
    }

    $rows = storageNamedQuery(DATA_API_TABLES_QUERY, []);
    $tables = [];

    foreach ($rows as $row) {
        if (!is_array($row) || empty($row)) {
            continue;
        }

        $value = reset($row);
        if (is_string($value) && $value !== '') {
            $tables[] = $value;
        }
    }

    return array_values(array_unique($tables));
}

function storageIsMissingColumnError(\Throwable $e): bool
{
    $message = strtolower($e->getMessage());
    return strpos($message, 'no such column') !== false
        || strpos($message, 'unknown column') !== false
        || strpos($message, 'does not exist') !== false
        || strpos($message, 'has no column named') !== false;
}

function storageHasColumn(string $table, string $column): bool
{
    $safeTable = preg_replace('/[^A-Za-z0-9_]+/', '', $table);
    $safeColumn = preg_replace('/[^A-Za-z0-9_]+/', '', $column);

    try {
        storageSelectRows("SELECT {$safeColumn} FROM {$safeTable} LIMIT 1");
        return true;
    } catch (\Throwable $e) {
        if (storageIsMissingColumnError($e)) {
            return false;
        }

        throw $e;
    }
}

function storageEnsureColumn(string $table, string $column, string $definition): void
{
    $safeTable = preg_replace('/[^A-Za-z0-9_]+/', '', $table);
    $safeColumn = preg_replace('/[^A-Za-z0-9_]+/', '', $column);
    if ($safeTable === '' || $safeColumn === '') {
        throw new RuntimeException('Invalid schema identifier.', 500);
    }

    if (storageHasColumn($safeTable, $safeColumn)) {
        return;
    }

    storageExec("ALTER TABLE {$safeTable} ADD COLUMN {$safeColumn} " . trim($definition));
}

function storageEnsureSchema(): void
{
    static $schemaEnsured = false;

    if ($schemaEnsured || !DATA_API_AUTO_BOOTSTRAP) {
        return;
    }

    if (storageHasFreshSchemaCache()) {
        $schemaEnsured = true;
        return;
    }

    try {
        storageListKnownTables();
    } catch (\Throwable $e) {
        // If the named query is unavailable, fall back to bootstrap attempts below.
    }

    storageExec("
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            img TEXT NULL,
            category VARCHAR(100) NULL,
            barcode VARCHAR(80) NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            min_stock_alert INT NOT NULL DEFAULT 0,
            reserved_stock INT NOT NULL DEFAULT 0,
            store_enabled TINYINT(1) NOT NULL DEFAULT 1,
            ifood_enabled TINYINT(1) NOT NULL DEFAULT 0,
            ifood_price DECIMAL(10,2) NULL,
            ifood_external_code VARCHAR(80) NULL,
            uber_item_weight_grams INT NOT NULL DEFAULT 1000,
            uber_item_length_cm INT NOT NULL DEFAULT 20,
            uber_item_height_cm INT NOT NULL DEFAULT 20,
            uber_item_depth_cm INT NOT NULL DEFAULT 20,
            age_restricted TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS product_flavors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            name VARCHAR(120) NOT NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            min_stock_alert INT NOT NULL DEFAULT 0,
            reserved_stock INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_product_flavor_name (product_id, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS product_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_product_category_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS stock_movements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            flavor_id INT NULL,
            movement_type VARCHAR(40) NOT NULL,
            quantity INT NOT NULL,
            previous_quantity INT NOT NULL DEFAULT 0,
            new_quantity INT NOT NULL DEFAULT 0,
            channel VARCHAR(40) NOT NULL DEFAULT 'manual',
            note TEXT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_stock_movements_product (product_id),
            KEY idx_stock_movements_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS ifood_events (
            id VARCHAR(120) PRIMARY KEY,
            event_code VARCHAR(40) NULL,
            full_code VARCHAR(120) NULL,
            order_id VARCHAR(120) NULL,
            merchant_id VARCHAR(120) NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            acked_at TIMESTAMP NULL DEFAULT NULL,
            processed_at TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS ifood_orders (
            ifood_order_id VARCHAR(120) PRIMARY KEY,
            display_id VARCHAR(80) NULL,
            merchant_id VARCHAR(120) NULL,
            status VARCHAR(80) NULL,
            order_type VARCHAR(40) NULL,
            sales_channel VARCHAR(80) NULL,
            customer_name VARCHAR(255) NULL,
            total DECIMAL(10,2) NOT NULL DEFAULT 0,
            payment_status VARCHAR(80) NULL,
            local_order_id INT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) NOT NULL,
            name VARCHAR(255) NULL,
            address TEXT NULL,
            password_hash VARCHAR(255) NULL,
            cpf VARCHAR(20) NULL,
            cpf_hash CHAR(64) NULL,
            cpf_last4 VARCHAR(4) NULL,
            birth_date DATE NULL,
            age_verification_status VARCHAR(40) NOT NULL DEFAULT 'unverified',
            age_verified_at DATETIME NULL,
            age_verification_method VARCHAR(60) NULL,
            age_verification_document_type VARCHAR(40) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_customer_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_phone VARCHAR(20) NULL,
            address TEXT NULL,
            address_line TEXT NULL,
            address_number VARCHAR(40) NULL,
            address_complement VARCHAR(255) NULL,
            customer_cep VARCHAR(20) NULL,
            delivery_mode VARCHAR(30) NOT NULL DEFAULT 'uber',
            delivery_region VARCHAR(80) NULL,
            delivery_region_key VARCHAR(80) NULL,
            items JSON NULL,
            total DECIMAL(10,2) NOT NULL DEFAULT 0,
            delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
            payment_method VARCHAR(50) NULL,
            payment_provider VARCHAR(50) NULL,
            payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            uber_estimate_id VARCHAR(120) NULL,
            uber_quote_expires_at DATETIME NULL,
            uber_dropoff_eta DATETIME NULL,
            delivery_status VARCHAR(50) NOT NULL DEFAULT 'not_requested',
            uber_delivery_id VARCHAR(120) NULL,
            uber_order_id VARCHAR(120) NULL,
            uber_tracking_url TEXT NULL,
            uber_courier_name VARCHAR(120) NULL,
            uber_courier_phone VARCHAR(40) NULL,
            uber_courier_pin VARCHAR(40) NULL,
            uber_courier_vehicle VARCHAR(120) NULL,
            uber_courier_plate VARCHAR(40) NULL,
            uber_error_message TEXT NULL,
            dispatched_at TIMESTAMP NULL DEFAULT NULL,
            external_order_nsu VARCHAR(120) NULL,
            infinitepay_slug VARCHAR(120) NULL,
            infinitepay_transaction_nsu VARCHAR(120) NULL,
            payment_receipt_url TEXT NULL,
            print_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            printed_at TIMESTAMP NULL DEFAULT NULL,
            requires_age_verification TINYINT(1) NOT NULL DEFAULT 0,
            age_verified_at_order DATETIME NULL,
            customer_cpf_last4 VARCHAR(4) NULL,
            ifood_order_id VARCHAR(120) NULL,
            ifood_display_id VARCHAR(40) NULL,
            ifood_delivery_by VARCHAR(40) NULL,
            ifood_pickup_code VARCHAR(40) NULL,
            ifood_delivery_localizer VARCHAR(40) NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_external_order_nsu (external_order_nsu)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS age_verification_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_phone VARCHAR(20) NOT NULL,
            cpf_hash CHAR(64) NULL,
            document_type VARCHAR(40) NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            failure_code VARCHAR(80) NULL,
            confidence DECIMAL(6,4) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_age_verification_phone (customer_phone),
            KEY idx_age_verification_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS promotions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kind VARCHAR(40) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            min_subtotal DECIMAL(10,2) NULL,
            target_product_id INT NULL,
            target_product_name VARCHAR(255) NULL,
            reward_product_id INT NULL,
            reward_product_name VARCHAR(255) NULL,
            reward_quantity INT NOT NULL DEFAULT 1,
            special_price DECIMAL(10,2) NULL,
            trigger_keywords TEXT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_promotions_active (is_active, sort_order),
            KEY idx_promotions_kind (kind)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageEnsureColumn('products', 'age_restricted', 'TINYINT(1) NOT NULL DEFAULT 0');
    storageEnsureColumn('products', 'barcode', 'VARCHAR(80) NULL');
    storageEnsureColumn('products', 'min_stock_alert', 'INT NOT NULL DEFAULT 0');
    storageEnsureColumn('products', 'reserved_stock', 'INT NOT NULL DEFAULT 0');
    storageEnsureColumn('products', 'ifood_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
    storageEnsureColumn('products', 'store_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
    storageEnsureColumn('products', 'ifood_price', 'DECIMAL(10,2) NULL');
    storageEnsureColumn('products', 'ifood_external_code', 'VARCHAR(80) NULL');
    storageEnsureColumn('products', 'uber_item_weight_grams', 'INT NOT NULL DEFAULT 1000');
    storageEnsureColumn('products', 'uber_item_length_cm', 'INT NOT NULL DEFAULT 20');
    storageEnsureColumn('products', 'uber_item_height_cm', 'INT NOT NULL DEFAULT 20');
    storageEnsureColumn('products', 'uber_item_depth_cm', 'INT NOT NULL DEFAULT 20');

    storageExec("
        INSERT INTO product_categories (name)
        SELECT source.category_name
        FROM (
            SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'Geral') AS category_name
            FROM products
        ) source
        WHERE NOT EXISTS (
            SELECT 1
            FROM product_categories current_category
            WHERE LOWER(current_category.name) = LOWER(source.category_name)
        )
    ");
    storageExec("
        INSERT INTO product_categories (name)
        SELECT 'Geral'
        WHERE NOT EXISTS (
            SELECT 1
            FROM product_categories
            WHERE LOWER(name) = LOWER('Geral')
        )
    ");

    storageEnsureColumn('customers', 'password_hash', 'VARCHAR(255) NULL');
    storageEnsureColumn('customers', 'cpf', 'VARCHAR(20) NULL');
    storageEnsureColumn('customers', 'cpf_hash', 'CHAR(64) NULL');
    storageEnsureColumn('customers', 'cpf_last4', 'VARCHAR(4) NULL');
    storageEnsureColumn('customers', 'birth_date', 'DATE NULL');
    storageEnsureColumn('customers', 'age_verification_status', "VARCHAR(40) NOT NULL DEFAULT 'unverified'");
    storageEnsureColumn('customers', 'age_verified_at', 'DATETIME NULL');
    storageEnsureColumn('customers', 'age_verification_method', 'VARCHAR(60) NULL');
    storageEnsureColumn('customers', 'age_verification_document_type', 'VARCHAR(40) NULL');

    storageEnsureColumn('orders', 'print_status', "VARCHAR(50) NOT NULL DEFAULT 'pending'");
    storageEnsureColumn('orders', 'printed_at', 'TIMESTAMP NULL DEFAULT NULL');
    storageEnsureColumn('orders', 'requires_age_verification', 'TINYINT(1) NOT NULL DEFAULT 0');
    storageEnsureColumn('orders', 'age_verified_at_order', 'DATETIME NULL');
    storageEnsureColumn('orders', 'customer_cpf_last4', 'VARCHAR(4) NULL');
    storageEnsureColumn('orders', 'ifood_order_id', 'VARCHAR(120) NULL');
    storageEnsureColumn('orders', 'ifood_display_id', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'ifood_delivery_by', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'ifood_pickup_code', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'ifood_delivery_localizer', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'address_line', 'TEXT NULL');
    storageEnsureColumn('orders', 'address_number', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'address_complement', 'VARCHAR(255) NULL');
    storageEnsureColumn('orders', 'customer_cep', 'VARCHAR(20) NULL');
    storageEnsureColumn('orders', 'delivery_mode', "VARCHAR(30) NOT NULL DEFAULT 'uber'");
    storageEnsureColumn('orders', 'delivery_region', 'VARCHAR(80) NULL');
    storageEnsureColumn('orders', 'delivery_region_key', 'VARCHAR(80) NULL');
    storageEnsureColumn('orders', 'uber_quote_expires_at', 'DATETIME NULL');
    storageEnsureColumn('orders', 'uber_dropoff_eta', 'DATETIME NULL');
    storageEnsureColumn('orders', 'delivery_status', "VARCHAR(50) NOT NULL DEFAULT 'not_requested'");
    storageEnsureColumn('orders', 'uber_delivery_id', 'VARCHAR(120) NULL');
    storageEnsureColumn('orders', 'uber_order_id', 'VARCHAR(120) NULL');
    storageEnsureColumn('orders', 'uber_tracking_url', 'TEXT NULL');
    storageEnsureColumn('orders', 'uber_courier_name', 'VARCHAR(120) NULL');
    storageEnsureColumn('orders', 'uber_courier_phone', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'uber_courier_pin', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'uber_courier_vehicle', 'VARCHAR(120) NULL');
    storageEnsureColumn('orders', 'uber_courier_plate', 'VARCHAR(40) NULL');
    storageEnsureColumn('orders', 'uber_error_message', 'TEXT NULL');
    storageEnsureColumn('orders', 'dispatched_at', 'TIMESTAMP NULL DEFAULT NULL');

    storageExec("
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_phone VARCHAR(20) NOT NULL,
            label VARCHAR(80) NULL,
            cep VARCHAR(20) NULL,
            address TEXT NOT NULL,
            number VARCHAR(40) NULL,
            complement VARCHAR(255) NULL,
            full_address TEXT NOT NULL,
            is_default TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_customer_addresses_phone (customer_phone),
            KEY idx_customer_addresses_default (customer_phone, is_default)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS store_settings (
            id TINYINT PRIMARY KEY,
            ordering_enabled TINYINT(1) NOT NULL DEFAULT 1,
            opening_time TIME NOT NULL DEFAULT '08:00:00',
            closing_time TIME NOT NULL DEFAULT '22:00:00',
            courier_rule_mode VARCHAR(30) NOT NULL DEFAULT 'items_count',
            courier_items_threshold INT NOT NULL DEFAULT 8,
            courier_type_until_threshold VARCHAR(20) NOT NULL DEFAULT 'moto',
            courier_type_above_threshold VARCHAR(20) NOT NULL DEFAULT 'carro',
            uber_test_courier_type VARCHAR(20) NOT NULL DEFAULT 'auto',
            private_dispatch_enabled TINYINT(1) NOT NULL DEFAULT 0,
            private_dispatch_regions_json TEXT NULL,
            site_weekly_hours_json TEXT NULL,
            ifood_weekly_hours_json TEXT NULL,
            cover_image_url TEXT NULL,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageExec("
        CREATE TABLE IF NOT EXISTS ifood_auth_settings (
            id TINYINT PRIMARY KEY,
            merchant_id VARCHAR(120) NULL,
            sync_enabled TINYINT(1) NOT NULL DEFAULT 0,
            catalog_sync_path VARCHAR(255) NULL,
            synced_categories TEXT NULL,
            price_markup_percent DECIMAL(10,2) NOT NULL DEFAULT 28,
            access_token TEXT NULL,
            refresh_token TEXT NULL,
            access_token_expires_at DATETIME NULL,
            pending_user_code VARCHAR(40) NULL,
            pending_authorization_code_verifier TEXT NULL,
            pending_verification_url TEXT NULL,
            pending_expires_at DATETIME NULL,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    storageEnsureColumn('store_settings', 'courier_rule_mode', "VARCHAR(30) NOT NULL DEFAULT 'items_count'");
    storageEnsureColumn('store_settings', 'courier_items_threshold', 'INT NOT NULL DEFAULT 8');
    storageEnsureColumn('store_settings', 'courier_type_until_threshold', "VARCHAR(20) NOT NULL DEFAULT 'moto'");
    storageEnsureColumn('store_settings', 'courier_type_above_threshold', "VARCHAR(20) NOT NULL DEFAULT 'carro'");
    storageEnsureColumn('store_settings', 'courier_motorcycle_max_weight_kg', 'DECIMAL(10,2) NOT NULL DEFAULT 20');
    storageEnsureColumn('store_settings', 'courier_motorcycle_max_size_cm', 'DECIMAL(10,2) NOT NULL DEFAULT 120');
    storageEnsureColumn('store_settings', 'courier_car_max_weight_kg', 'DECIMAL(10,2) NOT NULL DEFAULT 80');
    storageEnsureColumn('store_settings', 'courier_car_max_size_cm', 'DECIMAL(10,2) NOT NULL DEFAULT 260');
    storageEnsureColumn('store_settings', 'uber_test_courier_type', "VARCHAR(20) NOT NULL DEFAULT 'auto'");
    storageEnsureColumn('store_settings', 'private_dispatch_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
    storageEnsureColumn('store_settings', 'private_dispatch_regions_json', 'TEXT NULL');
    storageEnsureColumn('store_settings', 'site_weekly_hours_json', 'TEXT NULL');
    storageEnsureColumn('store_settings', 'ifood_weekly_hours_json', 'TEXT NULL');
    storageEnsureColumn('store_settings', 'cover_image_url', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'merchant_id', 'VARCHAR(120) NULL');
    storageEnsureColumn('ifood_auth_settings', 'sync_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
    storageEnsureColumn('ifood_auth_settings', 'catalog_sync_path', 'VARCHAR(255) NULL');
    storageEnsureColumn('ifood_auth_settings', 'synced_categories', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'price_markup_percent', 'DECIMAL(10,2) NOT NULL DEFAULT 28');
    storageEnsureColumn('ifood_auth_settings', 'access_token', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'refresh_token', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'access_token_expires_at', 'DATETIME NULL');
    storageEnsureColumn('ifood_auth_settings', 'pending_user_code', 'VARCHAR(40) NULL');
    storageEnsureColumn('ifood_auth_settings', 'pending_authorization_code_verifier', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'pending_verification_url', 'TEXT NULL');
    storageEnsureColumn('ifood_auth_settings', 'pending_expires_at', 'DATETIME NULL');
    storageEnsureColumn('product_flavors', 'min_stock_alert', 'INT NOT NULL DEFAULT 0');
    storageEnsureColumn('product_flavors', 'reserved_stock', 'INT NOT NULL DEFAULT 0');
    storageEnsureColumn('ifood_orders', 'payment_status', 'VARCHAR(80) NULL');
    storageEnsureColumn('ifood_orders', 'local_order_id', 'INT NULL');
    storageExec("
        INSERT INTO store_settings (
            id,
            ordering_enabled,
            opening_time,
            closing_time,
            courier_rule_mode,
            courier_items_threshold,
            courier_type_until_threshold,
            courier_type_above_threshold,
            courier_motorcycle_max_weight_kg,
            courier_motorcycle_max_size_cm,
            courier_car_max_weight_kg,
            courier_car_max_size_cm,
            uber_test_courier_type,
            private_dispatch_enabled,
            private_dispatch_regions_json
        )
        VALUES (1, 1, '08:00:00', '22:00:00', 'items_count', 8, 'moto', 'carro', 20, 120, 80, 260, 'auto', 0, " . storageSqlValue(json_encode(storageDefaultPrivateDispatchRegions(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ")
        ON DUPLICATE KEY UPDATE id = id
    ");
    storageTouchSchemaCache();
    $schemaEnsured = true;
}

function storageEnsureReady(): void
{
    storageEnsureSchema();
}

function storageEnsureCustomerPasswordSchema(): void
{
    storageEnsureSchema();

    static $passwordSchemaEnsured = false;
    if ($passwordSchemaEnsured) {
        return;
    }

    storageEnsureColumn('customers', 'password_hash', 'VARCHAR(255) NULL');

    storageTouchSchemaCache();
    $passwordSchemaEnsured = true;
}

function storageNormalizeTime(string $value, string $fallback): string
{
    $value = trim($value);
    if (preg_match('/^\d{2}:\d{2}$/', $value)) {
        return $value . ':00';
    }

    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
        return $value;
    }

    return $fallback;
}

function storageDisplayTimeValue($value, string $fallback = '08:00'): string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return $fallback;
    }

    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
        return substr($value, 0, 5);
    }

    if (preg_match('/^\d{2}:\d{2}$/', $value)) {
        return $value;
    }

    if (preg_match('/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/', $value, $matches)) {
        $hours = str_pad((string) ((int) ($matches[1] ?? 0)), 2, '0', STR_PAD_LEFT);
        $minutes = str_pad((string) ((int) ($matches[2] ?? 0)), 2, '0', STR_PAD_LEFT);
        return $hours . ':' . $minutes;
    }

    return $fallback;
}

function storageDefaultWeeklyHours(): array
{
    return [
        ['day' => 'monday', 'label' => 'Segunda', 'ifood_day' => 'MONDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'tuesday', 'label' => 'Terca', 'ifood_day' => 'TUESDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'wednesday', 'label' => 'Quarta', 'ifood_day' => 'WEDNESDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'thursday', 'label' => 'Quinta', 'ifood_day' => 'THURSDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'friday', 'label' => 'Sexta', 'ifood_day' => 'FRIDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'saturday', 'label' => 'Sabado', 'ifood_day' => 'SATURDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
        ['day' => 'sunday', 'label' => 'Domingo', 'ifood_day' => 'SUNDAY', 'enabled' => true, 'opening_time' => '08:00', 'closing_time' => '22:00'],
    ];
}

function storageNormalizeWeeklyHours($value): array
{
    if (is_string($value) && trim($value) !== '') {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            $value = $decoded;
        }
    }

    $items = is_array($value) ? $value : [];
    $byDay = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $day = strtolower(trim((string) ($item['day'] ?? $item['key'] ?? '')));
        if ($day !== '') {
            $byDay[$day] = $item;
        }
    }

    $normalized = [];
    foreach (storageDefaultWeeklyHours() as $day) {
        $item = $byDay[$day['day']] ?? [];
        $normalized[] = [
            'day' => $day['day'],
            'label' => $day['label'],
            'ifood_day' => $day['ifood_day'],
            'enabled' => filter_var($item['enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
            'opening_time' => storageDisplayTimeValue($item['opening_time'] ?? $item['open'] ?? '08:00', '08:00'),
            'closing_time' => storageDisplayTimeValue($item['closing_time'] ?? $item['close'] ?? '22:00', '22:00'),
        ];
    }

    return $normalized;
}

function storageWeeklyHoursFirstEnabled(array $hours): array
{
    foreach ($hours as $day) {
        if (($day['enabled'] ?? false) === true) {
            return $day;
        }
    }

    return storageDefaultWeeklyHours()[0];
}

function storageDefaultPrivateDispatchRegions(): array
{
    return [
        ['key' => 'barreiro', 'label' => 'Barreiro', 'fee' => 10.0],
        ['key' => 'centro_sul', 'label' => 'Centro-Sul', 'fee' => 10.0],
        ['key' => 'leste', 'label' => 'Leste', 'fee' => 10.0],
        ['key' => 'nordeste', 'label' => 'Nordeste', 'fee' => 10.0],
        ['key' => 'noroeste', 'label' => 'Noroeste', 'fee' => 10.0],
        ['key' => 'norte', 'label' => 'Norte', 'fee' => 10.0],
        ['key' => 'oeste', 'label' => 'Oeste', 'fee' => 10.0],
        ['key' => 'pampulha', 'label' => 'Pampulha', 'fee' => 10.0],
        ['key' => 'venda_nova', 'label' => 'Venda Nova', 'fee' => 10.0],
    ];
}

function storageNormalizePrivateDispatchRegions($value): array
{
    $defaults = storageDefaultPrivateDispatchRegions();
    $defaultMap = [];
    foreach ($defaults as $region) {
        $defaultMap[(string) $region['key']] = $region;
    }

    if (is_string($value) && trim($value) !== '') {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            $value = $decoded;
        }
    }

    $items = is_array($value) ? $value : [];
    $normalized = [];

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $key = strtolower(trim((string) ($item['key'] ?? '')));
        if ($key === '' || !isset($defaultMap[$key])) {
            continue;
        }

        $defaultRegion = $defaultMap[$key];
        $label = trim((string) ($item['label'] ?? $defaultRegion['label']));
        if ($label === '') {
            $label = $defaultRegion['label'];
        }

        $fee = round(max(0, (float) ($item['fee'] ?? $defaultRegion['fee'])), 2);
        $normalized[] = [
            'key' => $key,
            'label' => $label,
            'fee' => $fee,
        ];
    }

    if (empty($normalized)) {
        return $defaults;
    }

    $result = [];
    foreach ($defaults as $region) {
        $match = null;
        foreach ($normalized as $item) {
            if ((string) $item['key'] === (string) $region['key']) {
                $match = $item;
                break;
            }
        }
        $result[] = $match ?: $region;
    }

    return array_values($result);
}

function storageCatalogFoldText(?string $value): string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return '';
    }

    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($converted !== false && is_string($converted) && $converted !== '') {
            $value = $converted;
        }
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value);
    $value = trim((string) preg_replace('/\s+/', ' ', (string) $value));

    return $value;
}

function storageCatalogCompactKey(?string $value): string
{
    return str_replace(' ', '', storageCatalogFoldText($value));
}

function storageCatalogTokenize(?string $value): array
{
    $folded = storageCatalogFoldText($value);
    if ($folded === '') {
        return [];
    }

    $tokens = array_filter(explode(' ', $folded), static function ($token) {
        return is_string($token) && strlen($token) >= 2;
    });

    return array_values(array_unique($tokens));
}

function storageCatalogSignificantTokens(?string $value): array
{
    $stopwords = ['a', 'as', 'o', 'os', 'e', 'de', 'da', 'das', 'do', 'dos', 'para'];

    return array_values(array_filter(
        storageCatalogTokenize($value),
        static fn (string $token): bool => !in_array($token, $stopwords, true)
    ));
}

function storageCatalogCategoryMatchesSelection(string $productCategory, array $selectedCategories): bool
{
    $productKey = storageCatalogCompactKey($productCategory);
    $productTokens = storageCatalogSignificantTokens($productCategory);
    if ($productKey === '' && empty($productTokens)) {
        return false;
    }

    foreach ($selectedCategories as $selectedCategory) {
        $selectedCategory = trim((string) $selectedCategory);
        if ($selectedCategory === '') {
            continue;
        }

        if ($productKey !== '' && $productKey === storageCatalogCompactKey($selectedCategory)) {
            return true;
        }

        $selectedTokens = storageCatalogSignificantTokens($selectedCategory);
        if (!empty($selectedTokens) && !empty(array_intersect($productTokens, $selectedTokens))) {
            return true;
        }
    }

    return false;
}

function storageGetStoreSettings(): array
{
    storageEnsureReady();

    $settings = storageSelectRow("
        SELECT
            ordering_enabled,
            opening_time,
            closing_time,
            courier_rule_mode,
            courier_items_threshold,
            courier_type_until_threshold,
            courier_type_above_threshold,
            uber_test_courier_type,
            private_dispatch_enabled,
            private_dispatch_regions_json,
            site_weekly_hours_json,
            ifood_weekly_hours_json,
            cover_image_url,
            updated_at
        FROM store_settings
        WHERE id = 1
        LIMIT 1
    ") ?: [];

    $courierRuleMode = strtolower(trim((string) ($settings['courier_rule_mode'] ?? 'items_count')));
    if (!in_array($courierRuleMode, ['items_count', 'none'], true)) {
        $courierRuleMode = 'items_count';
    }

    $courierTypeUntilThreshold = strtolower(trim((string) ($settings['courier_type_until_threshold'] ?? 'moto')));
    if (!in_array($courierTypeUntilThreshold, ['moto', 'carro'], true)) {
        $courierTypeUntilThreshold = 'moto';
    }

    $courierTypeAboveThreshold = strtolower(trim((string) ($settings['courier_type_above_threshold'] ?? 'carro')));
    if (!in_array($courierTypeAboveThreshold, ['moto', 'carro'], true)) {
        $courierTypeAboveThreshold = 'carro';
    }
    $uberTestCourierType = strtolower(trim((string) ($settings['uber_test_courier_type'] ?? 'auto')));
    if (!in_array($uberTestCourierType, ['auto', 'moto', 'carro'], true)) {
        $uberTestCourierType = 'auto';
    }

    $privateDispatchRegions = storageNormalizePrivateDispatchRegions($settings['private_dispatch_regions_json'] ?? null);
    $siteWeeklyHours = storageNormalizeWeeklyHours($settings['site_weekly_hours_json'] ?? null);
    $ifoodWeeklyHours = storageNormalizeWeeklyHours($settings['ifood_weekly_hours_json'] ?? null);
    $sitePrimaryHours = storageWeeklyHoursFirstEnabled($siteWeeklyHours);

    return [
        'ordering_enabled' => (bool) ($settings['ordering_enabled'] ?? true),
        'opening_time' => $sitePrimaryHours['opening_time'],
        'closing_time' => $sitePrimaryHours['closing_time'],
        'site_weekly_hours' => $siteWeeklyHours,
        'ifood_weekly_hours' => $ifoodWeeklyHours,
        'courier_rule_mode' => $courierRuleMode,
        'courier_items_threshold' => max(1, (int) ($settings['courier_items_threshold'] ?? 8)),
        'courier_type_until_threshold' => $courierTypeUntilThreshold,
        'courier_type_above_threshold' => $courierTypeAboveThreshold,
        'courier_motorcycle_max_weight_kg' => (float) ($settings['courier_motorcycle_max_weight_kg'] ?? 20),
        'courier_motorcycle_max_size_cm' => (float) ($settings['courier_motorcycle_max_size_cm'] ?? 120),
        'courier_car_max_weight_kg' => (float) ($settings['courier_car_max_weight_kg'] ?? 80),
        'courier_car_max_size_cm' => (float) ($settings['courier_car_max_size_cm'] ?? 260),
        'uber_test_courier_type' => $uberTestCourierType,
        'private_dispatch_enabled' => (bool) ($settings['private_dispatch_enabled'] ?? false),
        'private_dispatch_regions' => $privateDispatchRegions,
        'cover_image_url' => storageNormalizePublicUrl((string) ($settings['cover_image_url'] ?? '')) ?: '',
        'updated_at' => $settings['updated_at'] ?? null,
    ];
}

function storageUpdateStoreSettings(array $data): array
{
    storageEnsureReady();

    $orderingEnabled = filter_var($data['ordering_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $siteWeeklyHours = storageNormalizeWeeklyHours($data['site_weekly_hours'] ?? null);
    $ifoodWeeklyHours = storageNormalizeWeeklyHours($data['ifood_weekly_hours'] ?? null);
    $sitePrimaryHours = storageWeeklyHoursFirstEnabled($siteWeeklyHours);
    $openingTime = storageNormalizeTime((string) ($sitePrimaryHours['opening_time'] ?? '08:00'), '08:00:00');
    $closingTime = storageNormalizeTime((string) ($sitePrimaryHours['closing_time'] ?? '22:00'), '22:00:00');
    $courierRuleMode = strtolower(trim((string) ($data['courier_rule_mode'] ?? 'items_count')));
    if (!in_array($courierRuleMode, ['items_count', 'none'], true)) {
        $courierRuleMode = 'items_count';
    }
    $courierItemsThreshold = max(1, (int) ($data['courier_items_threshold'] ?? 8));
    $courierTypeUntilThreshold = strtolower(trim((string) ($data['courier_type_until_threshold'] ?? 'moto')));
    if (!in_array($courierTypeUntilThreshold, ['moto', 'carro'], true)) {
        $courierTypeUntilThreshold = 'moto';
    }
    $courierTypeAboveThreshold = strtolower(trim((string) ($data['courier_type_above_threshold'] ?? 'carro')));
    if (!in_array($courierTypeAboveThreshold, ['moto', 'carro'], true)) {
        $courierTypeAboveThreshold = 'carro';
    }
    $courierMotorcycleMaxWeightKg = round(max(0, (float) ($data['courier_motorcycle_max_weight_kg'] ?? 20)), 2);
    $courierMotorcycleMaxSizeCm = round(max(0, (float) ($data['courier_motorcycle_max_size_cm'] ?? 120)), 2);
    $courierCarMaxWeightKg = round(max(0, (float) ($data['courier_car_max_weight_kg'] ?? 80)), 2);
    $courierCarMaxSizeCm = round(max(0, (float) ($data['courier_car_max_size_cm'] ?? 260)), 2);
    $uberTestCourierType = strtolower(trim((string) ($data['uber_test_courier_type'] ?? 'auto')));
    if (!in_array($uberTestCourierType, ['auto', 'moto', 'carro'], true)) {
        $uberTestCourierType = 'auto';
    }
    $privateDispatchEnabled = filter_var($data['private_dispatch_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $privateDispatchRegions = storageNormalizePrivateDispatchRegions($data['private_dispatch_regions'] ?? null);
    $coverImageUrl = storageNormalizePublicUrl((string) ($data['cover_image_url'] ?? '')) ?: '';

    storageExec("
        INSERT INTO store_settings (
            id,
            ordering_enabled,
            opening_time,
            closing_time,
            courier_rule_mode,
            courier_items_threshold,
            courier_type_until_threshold,
            courier_type_above_threshold,
            courier_motorcycle_max_weight_kg,
            courier_motorcycle_max_size_cm,
            courier_car_max_weight_kg,
            courier_car_max_size_cm,
            uber_test_courier_type,
            private_dispatch_enabled,
            private_dispatch_regions_json,
            site_weekly_hours_json,
            ifood_weekly_hours_json,
            cover_image_url
        )
        VALUES (
            1,
            " . ($orderingEnabled ? '1' : '0') . ",
            " . storageSqlValue($openingTime) . ",
            " . storageSqlValue($closingTime) . ",
            " . storageSqlValue($courierRuleMode) . ",
            " . $courierItemsThreshold . ",
            " . storageSqlValue($courierTypeUntilThreshold) . ",
            " . storageSqlValue($courierTypeAboveThreshold) . ",
            " . $courierMotorcycleMaxWeightKg . ",
            " . $courierMotorcycleMaxSizeCm . ",
            " . $courierCarMaxWeightKg . ",
            " . $courierCarMaxSizeCm . ",
            " . storageSqlValue($uberTestCourierType) . ",
            " . ($privateDispatchEnabled ? '1' : '0') . ",
            " . storageSqlValue(json_encode($privateDispatchRegions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ",
            " . storageSqlValue(json_encode($siteWeeklyHours, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ",
            " . storageSqlValue(json_encode($ifoodWeeklyHours, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ",
            " . storageSqlValue($coverImageUrl !== '' ? $coverImageUrl : null) . "
        )
        ON DUPLICATE KEY UPDATE
            ordering_enabled = VALUES(ordering_enabled),
            opening_time = VALUES(opening_time),
            closing_time = VALUES(closing_time),
            courier_rule_mode = VALUES(courier_rule_mode),
            courier_items_threshold = VALUES(courier_items_threshold),
            courier_type_until_threshold = VALUES(courier_type_until_threshold),
            courier_type_above_threshold = VALUES(courier_type_above_threshold),
            courier_motorcycle_max_weight_kg = VALUES(courier_motorcycle_max_weight_kg),
            courier_motorcycle_max_size_cm = VALUES(courier_motorcycle_max_size_cm),
            courier_car_max_weight_kg = VALUES(courier_car_max_weight_kg),
            courier_car_max_size_cm = VALUES(courier_car_max_size_cm),
            uber_test_courier_type = VALUES(uber_test_courier_type),
            private_dispatch_enabled = VALUES(private_dispatch_enabled),
            private_dispatch_regions_json = VALUES(private_dispatch_regions_json),
            site_weekly_hours_json = VALUES(site_weekly_hours_json),
            ifood_weekly_hours_json = VALUES(ifood_weekly_hours_json),
            cover_image_url = VALUES(cover_image_url)
    ");

    return storageGetStoreSettings();
}

function storageIsStoreOpenNow(?array $settings = null): bool
{
    $settings = $settings ?: storageGetStoreSettings();
    if (($settings['ordering_enabled'] ?? true) === false) {
        return false;
    }

    $hours = storageNormalizeWeeklyHours($settings['site_weekly_hours'] ?? null);
    $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
    $dayIndex = ((int) $now->format('N')) - 1;
    $today = $hours[$dayIndex] ?? null;
    if (!$today || ($today['enabled'] ?? false) !== true) {
        return false;
    }

    $currentMinutes = ((int) $now->format('H')) * 60 + (int) $now->format('i');
    [$openHour, $openMinute] = array_map('intval', explode(':', (string) ($today['opening_time'] ?? '08:00')));
    [$closeHour, $closeMinute] = array_map('intval', explode(':', (string) ($today['closing_time'] ?? '22:00')));
    $openMinutes = $openHour * 60 + $openMinute;
    $closeMinutes = $closeHour * 60 + $closeMinute;

    if ($closeMinutes <= $openMinutes) {
        return $currentMinutes >= $openMinutes || $currentMinutes < $closeMinutes;
    }

    return $currentMinutes >= $openMinutes && $currentMinutes < $closeMinutes;
}

function storageNormalizeDateTime(?string $value): ?string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return null;
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return null;
    }

    return gmdate('Y-m-d H:i:s', $timestamp);
}

function storageOrderSqlValue(string $field, $value): string
{
    if (is_array($value) && isset($value['raw']) && is_string($value['raw'])) {
        return $value['raw'];
    }

    if (in_array($field, ['total', 'delivery_fee'], true)) {
        return storageSqlNumber($value ?? 0, 2);
    }

    if ($field === 'items' && is_array($value)) {
        return storageSqlValue(json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    if (in_array($field, ['printed_at', 'dispatched_at', 'uber_quote_expires_at', 'uber_dropoff_eta', 'age_verified_at_order'], true)) {
        return storageSqlValue(storageNormalizeDateTime(is_scalar($value) ? (string) $value : null));
    }

    return storageSqlValue($value);
}

function storageGetOrderById(int $id): ?array
{
    storageEnsureReady();
    if ($id <= 0) {
        return null;
    }

    return storageSelectRow("
        SELECT *
        FROM orders
        WHERE id = {$id}
        LIMIT 1
    ");
}

function storageGetOrderDetailsById(int $id): ?array
{
    storageEnsureReady();
    if ($id <= 0) {
        return null;
    }

    return storageSelectRow("
        SELECT o.*, c.name AS customer_name, io.payload AS ifood_payload
        FROM orders o
        LEFT JOIN customers c ON o.customer_phone = c.phone
        LEFT JOIN ifood_orders io ON io.local_order_id = o.id
        WHERE o.id = {$id}
        LIMIT 1
    ");
}

function storageGetCustomerOrderDetailsById(string $phone, int $id): ?array
{
    storageEnsureReady();
    $phone = storageNormalizePhone($phone);
    if ($phone === '' || $id <= 0) {
        return null;
    }

    return storageSelectRow("
        SELECT o.*, c.name AS customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_phone = c.phone
        WHERE o.id = {$id}
          AND o.customer_phone = " . storageSqlValue($phone) . "
        LIMIT 1
    ");
}

function storageUpdateOrderById(int $id, array $updates): ?array
{
    storageEnsureReady();
    if ($id <= 0) {
        return null;
    }

    $allowedFields = [
        'status',
        'payment_status',
        'payment_method',
        'payment_provider',
        'infinitepay_slug',
        'infinitepay_transaction_nsu',
        'payment_receipt_url',
        'delivery_mode',
        'delivery_region',
        'delivery_region_key',
        'print_status',
        'printed_at',
        'delivery_status',
        'uber_estimate_id',
        'uber_quote_expires_at',
        'uber_dropoff_eta',
        'uber_delivery_id',
        'uber_order_id',
        'uber_tracking_url',
        'uber_courier_name',
        'uber_courier_phone',
        'uber_courier_pin',
        'uber_courier_vehicle',
        'uber_courier_plate',
        'uber_error_message',
        'dispatched_at',
        'delivery_fee',
        'total',
        'items',
        'requires_age_verification',
        'age_verified_at_order',
        'customer_cpf_last4',
        'ifood_order_id',
        'ifood_display_id',
        'ifood_delivery_by',
        'ifood_pickup_code',
        'ifood_delivery_localizer',
    ];

    $assignments = [];
    foreach ($updates as $field => $value) {
        if (!in_array($field, $allowedFields, true)) {
            continue;
        }

        $assignments[] = $field . ' = ' . storageOrderSqlValue($field, $value);
    }

    if (empty($assignments)) {
        return storageGetOrderDetailsById($id);
    }

    storageExec("
        UPDATE orders
        SET " . implode(",\n            ", $assignments) . "
        WHERE id = {$id}
    ");

    return storageGetOrderDetailsById($id);
}

function storageUpdateOrderByNsu(string $orderNsu, array $updates): ?array
{
    storageEnsureReady();
    $orderNsu = trim($orderNsu);
    if ($orderNsu === '') {
        return null;
    }

    $order = storageGetOrderByNsu($orderNsu);
    if (!$order) {
        return null;
    }

    return storageUpdateOrderById((int) ($order['id'] ?? 0), $updates);
}

function storageNormalizePhone(?string $phone): string
{
    $phone = preg_replace('/\D+/', '', (string) $phone);
    return is_string($phone) ? trim($phone) : '';
}

function storageNormalizeCpf(?string $cpf): string
{
    $cpf = preg_replace('/\D+/', '', (string) $cpf);
    return is_string($cpf) ? trim($cpf) : '';
}

function storageHashCpf(?string $cpf): ?string
{
    $normalized = storageNormalizeCpf($cpf);
    if ($normalized === '') {
        return null;
    }

    return hash('sha256', $normalized);
}

function storageCpfLast4(?string $cpf): ?string
{
    $normalized = storageNormalizeCpf($cpf);
    if (strlen($normalized) < 4) {
        return null;
    }

    return substr($normalized, -4);
}

function storageNormalizeAgeVerificationStatus(?string $status): string
{
    $normalized = strtolower(trim((string) ($status ?? '')));
    if (in_array($normalized, ['verified', 'rejected', 'pending'], true)) {
        return $normalized;
    }

    return 'unverified';
}

function storageNormalizeAddressPiece(?string $value): string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return '';
    }

    if (function_exists('mb_strtolower')) {
        $value = mb_strtolower($value, 'UTF-8');
    } else {
        $value = strtolower($value);
    }

    $value = preg_replace('/[^\p{L}\p{N}]+/u', '', $value);
    return is_string($value) ? $value : '';
}

function storageBuildCustomerFullAddress(?string $address, ?string $number, ?string $complement = null): string
{
    $address = trim((string) ($address ?? ''));
    $number = trim((string) ($number ?? ''));
    $complement = trim((string) ($complement ?? ''));

    $parts = array_filter([
        $address,
        $number !== '' ? 'No ' . $number : null,
        $complement !== '' ? $complement : null,
    ], static fn ($value) => $value !== null && $value !== '');

    return trim(implode(' - ', $parts));
}

function storageBuildCustomerAddressFingerprint(array $address): string
{
    return implode('|', [
        storageNormalizeAddressPiece($address['cep'] ?? ''),
        storageNormalizeAddressPiece($address['address'] ?? ''),
        storageNormalizeAddressPiece($address['number'] ?? ''),
        storageNormalizeAddressPiece($address['complement'] ?? ''),
    ]);
}

function storageMapCustomerAddressRow(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'customer_phone' => (string) ($row['customer_phone'] ?? ''),
        'label' => (string) ($row['label'] ?? ''),
        'cep' => preg_replace('/\D+/', '', (string) ($row['cep'] ?? '')) ?: '',
        'address' => (string) ($row['address'] ?? ''),
        'number' => (string) ($row['number'] ?? ''),
        'complement' => (string) ($row['complement'] ?? ''),
        'full_address' => (string) ($row['full_address'] ?? ''),
        'is_default' => (bool) ($row['is_default'] ?? false),
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function storageGetCustomerAddresses(string $phone): array
{
    storageEnsureReady();
    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return [];
    }

    $rows = storageSelectRows("
        SELECT *
        FROM customer_addresses
        WHERE customer_phone = " . storageSqlValue($phone) . "
        ORDER BY is_default DESC, updated_at DESC, id DESC
    ");

    return array_map('storageMapCustomerAddressRow', $rows);
}

function storageSyncCustomerPrimaryAddress(string $phone): void
{
    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return;
    }

    $addresses = storageGetCustomerAddresses($phone);
    $primary = $addresses[0]['full_address'] ?? null;

    storageExec("
        UPDATE customers
        SET address = " . storageSqlValue($primary ?: null) . "
        WHERE phone = " . storageSqlValue($phone) . "
    ");
}

function storageEnsureDefaultCustomerAddress(string $phone): void
{
    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return;
    }

    $addresses = storageGetCustomerAddresses($phone);
    if (empty($addresses)) {
        return;
    }

    foreach ($addresses as $address) {
        if (!empty($address['is_default'])) {
            storageSyncCustomerPrimaryAddress($phone);
            return;
        }
    }

    $firstId = (int) ($addresses[0]['id'] ?? 0);
    if ($firstId > 0) {
        storageExec("
            UPDATE customer_addresses
            SET is_default = CASE WHEN id = {$firstId} THEN 1 ELSE 0 END
            WHERE customer_phone = " . storageSqlValue($phone) . "
        ");
    }

    storageSyncCustomerPrimaryAddress($phone);
}

function storageUpsertCustomer(?string $phone, ?string $name, ?string $address = null): void
{
    storageEnsureReady();

    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return;
    }

    $name = trim((string) $name);
    if ($name === '') {
        $name = 'Cliente';
    }

    $address = trim((string) ($address ?? ''));

    storageExec("
        INSERT INTO customers (phone, name, address)
        VALUES (
            " . storageSqlValue($phone) . ",
            " . storageSqlValue($name) . ",
            " . storageSqlValue($address !== '' ? $address : null) . "
        )
        ON DUPLICATE KEY UPDATE
            name = CASE
                WHEN VALUES(name) IS NULL OR VALUES(name) = '' OR VALUES(name) = 'Cliente' THEN customers.name
                ELSE VALUES(name)
            END,
            address = CASE
                WHEN VALUES(address) IS NULL OR VALUES(address) = '' THEN customers.address
                ELSE VALUES(address)
            END
    ");
}

function storageIfoodPriceForProduct(array $product): float
{
    if (isset($product['ifood_price']) && $product['ifood_price'] !== null && (float) $product['ifood_price'] > 0) {
        return round((float) $product['ifood_price'], 2);
    }

    $basePrice = max(0, (float) ($product['price'] ?? 0));
    $settings = storageGetIfoodAuthSettings();
    $minimumMarkupPercent = defined('IFOOD_MIN_MARKUP_PERCENT') ? (float) IFOOD_MIN_MARKUP_PERCENT : 28.0;
    $defaultMarkupPercent = defined('IFOOD_DEFAULT_MARKUP_PERCENT') ? (float) IFOOD_DEFAULT_MARKUP_PERCENT : $minimumMarkupPercent;
    $markupPercent = max($minimumMarkupPercent, (float) ($settings['price_markup_percent'] ?? $defaultMarkupPercent));
    if ($markupPercent <= 0) {
        return round($basePrice, 2);
    }

    return round($basePrice * (1 + ($markupPercent / 100)), 2);
}

function storageGetProducts(bool $includeFlavors = false): array
{
    storageEnsureReady();
    $products = storageSelectRows("SELECT * FROM products ORDER BY id DESC");

    foreach ($products as &$product) {
        $product['img'] = storageNormalizePublicUrl((string) ($product['img'] ?? ''), (string) ($product['img_path'] ?? '')) ?? (string) ($product['img'] ?? '');
        $product['stock_quantity'] = (int) ($product['stock_quantity'] ?? 0);
        $product['reserved_stock'] = max(0, (int) ($product['reserved_stock'] ?? 0));
        $product['min_stock_alert'] = max(0, (int) ($product['min_stock_alert'] ?? 0));
        $product['available_stock'] = max(0, $product['stock_quantity'] - $product['reserved_stock']);
        $product['low_stock'] = $product['available_stock'] <= $product['min_stock_alert'];
        $product['category'] = trim((string) ($product['category'] ?? 'Geral')) ?: 'Geral';
        $product['barcode'] = trim((string) ($product['barcode'] ?? ''));
        $product['store_enabled'] = (bool) ($product['store_enabled'] ?? true);
        $product['ifood_enabled'] = (bool) ($product['ifood_enabled'] ?? false);
        $product['ifood_price'] = $product['ifood_price'] !== null ? (float) $product['ifood_price'] : null;
        $product['ifood_effective_price'] = storageIfoodPriceForProduct($product);
        $product['ifood_external_code'] = trim((string) ($product['ifood_external_code'] ?? ''));
    }
    unset($product);

    if ($includeFlavors && !empty($products)) {
        $flavorsByProductId = storageGetProductFlavorsMap(array_map(
            static fn (array $product): int => (int) ($product['id'] ?? 0),
            $products
        ));

        foreach ($products as &$product) {
            $product['flavors'] = $flavorsByProductId[(int) ($product['id'] ?? 0)] ?? [];
        }
        unset($product);
    }

    return $products;
}

function storageGetProductsSortedByName(): array
{
    $products = storageGetProducts();
    usort($products, static function (array $left, array $right): int {
        return strcasecmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
    });
    return $products;
}

function storageSaveProduct(array $data): void
{
    storageEnsureReady();

    $id = (int) ($data['id'] ?? 0);
    $name = trim((string) ($data['name'] ?? ''));
    $price = storageSqlNumber($data['price'] ?? 0, 2);
    $img = trim((string) ($data['img'] ?? ''));
    $category = storageEnsureProductCategory((string) ($data['category'] ?? 'Geral'));
    $barcode = preg_replace('/[^0-9A-Za-z._\-]/', '', trim((string) ($data['barcode'] ?? '')));
    $stockQuantity = max(0, (int) ($data['stock_quantity'] ?? 0));
    $minStockAlert = max(0, (int) ($data['min_stock_alert'] ?? 0));
    $reservedStock = max(0, min($stockQuantity, (int) ($data['reserved_stock'] ?? 0)));
    $availableStock = max(0, $stockQuantity - $reservedStock);
    $storeEnabled = filter_var($data['store_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $ifoodEnabled = filter_var($data['ifood_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN) && $availableStock > 0;
    $ifoodPrice = (array_key_exists('ifood_price', $data) && trim((string) $data['ifood_price']) !== '')
        ? storageSqlNumber($data['ifood_price'], 2)
        : 'NULL';
    $ifoodExternalCode = trim((string) ($data['ifood_external_code'] ?? ''));
    $uberItemWeightGrams = max(1, (int) ($data['uber_item_weight_grams'] ?? 1000));
    $uberItemLengthCm = max(1, (int) ($data['uber_item_length_cm'] ?? 20));
    $uberItemHeightCm = max(1, (int) ($data['uber_item_height_cm'] ?? 20));
    $uberItemDepthCm = max(1, (int) ($data['uber_item_depth_cm'] ?? 20));
    $ageRestricted = filter_var($data['age_restricted'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if ($id > 0) {
        storageExec("
            UPDATE products
            SET name = " . storageSqlValue($name) . ",
                price = {$price},
                img = " . storageSqlValue($img !== '' ? $img : null) . ",
                category = " . storageSqlValue($category !== '' ? $category : 'geral') . ",
                barcode = " . storageSqlValue($barcode !== '' ? $barcode : null) . ",
                stock_quantity = {$stockQuantity},
                min_stock_alert = {$minStockAlert},
                reserved_stock = {$reservedStock},
                store_enabled = " . ($storeEnabled ? '1' : '0') . ",
                ifood_enabled = " . ($ifoodEnabled ? '1' : '0') . ",
                ifood_price = {$ifoodPrice},
                ifood_external_code = " . storageSqlValue($ifoodExternalCode !== '' ? $ifoodExternalCode : null) . ",
                uber_item_weight_grams = {$uberItemWeightGrams},
                uber_item_length_cm = {$uberItemLengthCm},
                uber_item_height_cm = {$uberItemHeightCm},
                uber_item_depth_cm = {$uberItemDepthCm},
                age_restricted = " . ($ageRestricted ? '1' : '0') . "
            WHERE id = {$id}
        ");
    } else {
        storageExec("
            INSERT INTO products (
                name,
                price,
                img,
                category,
                barcode,
                stock_quantity,
                min_stock_alert,
                reserved_stock,
                store_enabled,
                ifood_enabled,
                ifood_price,
                ifood_external_code,
                uber_item_weight_grams,
                uber_item_length_cm,
                uber_item_height_cm,
                uber_item_depth_cm,
                age_restricted
            )
            VALUES (
                " . storageSqlValue($name) . ",
                {$price},
                " . storageSqlValue($img !== '' ? $img : null) . ",
                " . storageSqlValue($category !== '' ? $category : 'geral') . ",
                " . storageSqlValue($barcode !== '' ? $barcode : null) . ",
                {$stockQuantity},
                {$minStockAlert},
                {$reservedStock},
                " . ($storeEnabled ? '1' : '0') . ",
                " . ($ifoodEnabled ? '1' : '0') . ",
                {$ifoodPrice},
                " . storageSqlValue($ifoodExternalCode !== '' ? $ifoodExternalCode : null) . ",
                {$uberItemWeightGrams},
                {$uberItemLengthCm},
                {$uberItemHeightCm},
                {$uberItemDepthCm},
                " . ($ageRestricted ? '1' : '0') . "
            )
        ");
        $inserted = storageSelectRow("
            SELECT id
            FROM products
            WHERE name = " . storageSqlValue($name) . "
            ORDER BY id DESC
            LIMIT 1
        ");
        $id = (int) ($inserted['id'] ?? 0);
    }

    if (isset($data['flavors']) && is_array($data['flavors'])) {
        storageExec("DELETE FROM product_flavors WHERE product_id = {$id}");
        foreach ($data['flavors'] as $flavor) {
            $fName = trim((string) ($flavor['name'] ?? ''));
            if ($fName === '') continue;
            $fStock = max(0, (int) ($flavor['stock_quantity'] ?? 0));
            $fMinStock = max(0, (int) ($flavor['min_stock_alert'] ?? 0));
            $fReservedStock = max(0, min($fStock, (int) ($flavor['reserved_stock'] ?? 0)));
            storageExec("
                INSERT INTO product_flavors (product_id, name, stock_quantity, min_stock_alert, reserved_stock)
                VALUES ({$id}, " . storageSqlValue($fName) . ", {$fStock}, {$fMinStock}, {$fReservedStock})
            ");
        }
    }
}

function storageSetProductStoreEnabled(int $id, bool $enabled): void
{
    storageEnsureReady();
    if ($id <= 0) {
        return;
    }

    storageExec("
        UPDATE products
        SET store_enabled = " . ($enabled ? '1' : '0') . "
        WHERE id = {$id}
    ");
}

function storageSetProductIfoodEnabled(int $id, bool $enabled): void
{
    storageEnsureReady();
    if ($id <= 0) {
        return;
    }

    storageExec("
        UPDATE products
        SET ifood_enabled = " . ($enabled ? '1' : '0') . "
        WHERE id = {$id}
    ");
}

function storageProductCategoryName(string $name): string
{
    $name = trim($name);
    return $name !== '' ? $name : 'Geral';
}

function storageNormalizeIfoodCategoryList($categories): array
{
    if (is_string($categories)) {
        $decoded = json_decode($categories, true);
        $categories = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($categories)) {
        return [];
    }

    $names = [];
    foreach ($categories as $category) {
        $name = storageProductCategoryName((string) $category);
        $key = storageCatalogCompactKey($name);
        if ($key !== '') {
            $names[$key] = $name;
        }
    }

    uasort($names, static fn (string $left, string $right): int => strcasecmp($left, $right));
    return array_values($names);
}

function storageEnsureProductCategory(string $name): string
{
    storageEnsureReady();
    $name = storageProductCategoryName($name);
    storageExec("
        INSERT INTO product_categories (name)
        SELECT " . storageSqlValue($name) . "
        WHERE NOT EXISTS (
            SELECT 1
            FROM product_categories
            WHERE LOWER(name) = LOWER(" . storageSqlValue($name) . ")
        )
    ");
    return $name;
}

function storageGetProductCategories(): array
{
    storageEnsureReady();
    $rows = storageSelectRows("
        SELECT
            c.id,
            c.name,
            COUNT(p.id) AS products_count
        FROM product_categories c
        LEFT JOIN products p
            ON LOWER(TRIM(COALESCE(p.category, 'Geral'))) = LOWER(TRIM(c.name))
        GROUP BY c.id, c.name
        ORDER BY c.name ASC
    ");

    return array_map(static fn (array $row): array => [
        'id' => (int) ($row['id'] ?? 0),
        'name' => storageProductCategoryName((string) ($row['name'] ?? '')),
        'products_count' => (int) ($row['products_count'] ?? 0),
    ], $rows);
}

function storageSaveProductCategory(array $data): array
{
    storageEnsureReady();
    $id = (int) ($data['id'] ?? 0);
    $name = storageProductCategoryName((string) ($data['name'] ?? ''));
    if ($name === '') {
        throw new RuntimeException('Informe o nome da categoria.', 422);
    }

    if ($id > 0) {
        $category = storageSelectRow("SELECT id, name FROM product_categories WHERE id = {$id} LIMIT 1");
        if (!$category) {
            throw new RuntimeException('Categoria nao encontrada.', 404);
        }
        $oldName = storageProductCategoryName((string) ($category['name'] ?? ''));
        storageExec("
            UPDATE product_categories
            SET name = " . storageSqlValue($name) . "
            WHERE id = {$id}
        ");
        storageExec("
            UPDATE products
            SET category = " . storageSqlValue($name) . "
            WHERE LOWER(TRIM(COALESCE(category, 'Geral'))) = LOWER(" . storageSqlValue($oldName) . ")
        ");
    } else {
        storageExec("
            INSERT INTO product_categories (name)
            VALUES (" . storageSqlValue($name) . ")
        ");
    }

    $saved = storageSelectRow("
        SELECT id, name
        FROM product_categories
        WHERE LOWER(name) = LOWER(" . storageSqlValue($name) . ")
        LIMIT 1
    ");
    if (!$saved) {
        throw new RuntimeException('Categoria nao foi salva.', 500);
    }

    return [
        'id' => (int) ($saved['id'] ?? 0),
        'name' => storageProductCategoryName((string) ($saved['name'] ?? '')),
    ];
}

function storageDeleteProductCategory(int $id): void
{
    storageEnsureReady();
    $category = storageSelectRow("SELECT id, name FROM product_categories WHERE id = {$id} LIMIT 1");
    if (!$category) {
        throw new RuntimeException('Categoria nao encontrada.', 404);
    }

    $name = storageProductCategoryName((string) ($category['name'] ?? ''));
    $usage = storageSelectRow("
        SELECT COUNT(*) AS total
        FROM products
        WHERE LOWER(TRIM(COALESCE(category, 'Geral'))) = LOWER(" . storageSqlValue($name) . ")
    ");
    if ((int) ($usage['total'] ?? 0) > 0) {
        throw new RuntimeException('Mova os produtos desta categoria antes de exclui-la.', 409);
    }

    storageExec("DELETE FROM product_categories WHERE id = {$id}");
}

function storageMapPromotionRow(array $row): array
{
    $keywords = trim((string) ($row['trigger_keywords'] ?? ''));

    return [
        'id' => (int) ($row['id'] ?? 0),
        'kind' => (string) ($row['kind'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'is_active' => (bool) ($row['is_active'] ?? true),
        'min_subtotal' => $row['min_subtotal'] !== null ? (float) $row['min_subtotal'] : null,
        'target_product_id' => $row['target_product_id'] !== null ? (int) $row['target_product_id'] : null,
        'target_product_name' => (string) ($row['target_product_name'] ?? ''),
        'reward_product_id' => $row['reward_product_id'] !== null ? (int) $row['reward_product_id'] : null,
        'reward_product_name' => (string) ($row['reward_product_name'] ?? ''),
        'reward_quantity' => max(1, (int) ($row['reward_quantity'] ?? 1)),
        'special_price' => isset($row['special_price']) ? (float)$row['special_price'] : null,
        'trigger_keywords' => $row['trigger_keywords'] ?? null,
        'message_color' => $row['message_color'] ?? null,
        'price_color' => $row['price_color'] ?? null,
        'is_active' => (bool)($row['is_active'] ?? true),
        'trigger_terms' => $keywords !== ''
            ? array_values(array_filter(array_map('trim', explode(',', $keywords))))
            : [],
        'sort_order' => (int) ($row['sort_order'] ?? 0),
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function storageGetPromotions(bool $onlyActive = false): array
{
    storageEnsureReady();

    $where = $onlyActive ? 'WHERE is_active = 1' : '';
    $rows = storageSelectRows("
        SELECT *
        FROM promotions
        {$where}
        ORDER BY sort_order ASC, id ASC
    ");

    return array_map('storageMapPromotionRow', $rows);
}

function storageFindProductByCatalogName(string $query, ?array $products = null, bool $allowFuzzy = true): ?array
{
    $queryFolded = storageCatalogFoldText($query);
    $queryCompact = storageCatalogCompactKey($query);
    if ($queryFolded === '' || $queryCompact === '') {
        return null;
    }

    $products = is_array($products) ? $products : storageGetProducts();
    $bestMatch = null;
    $bestScore = 0;
    $queryTokens = storageCatalogTokenize($queryFolded);

    foreach ($products as $product) {
        $productName = (string) ($product['name'] ?? '');
        $productCompact = storageCatalogCompactKey($productName);
        if ($productCompact === '') {
            continue;
        }

        if ($productCompact === $queryCompact) {
            return $product;
        }

        if (!$allowFuzzy) {
            continue;
        }

        $score = 0;
        if (str_contains($productCompact, $queryCompact) || str_contains($queryCompact, $productCompact)) {
            $score += 800 - abs(strlen($productCompact) - strlen($queryCompact));
        }

        $productTokens = storageCatalogTokenize($productName);
        if (!empty($queryTokens) && !empty($productTokens)) {
            $overlap = count(array_intersect($queryTokens, $productTokens));
            if ($overlap > 0) {
                $score += ($overlap * 100);
            }
        }

        if ($score > $bestScore) {
            $bestScore = $score;
            $bestMatch = $product;
        }
    }

    return $bestScore >= 180 ? $bestMatch : null;
}

function storageSavePromotion(array $data): void
{
    storageEnsureReady();

    $id = (int) ($data['id'] ?? 0);
    $kind = trim((string) ($data['kind'] ?? ''));
    $title = trim((string) ($data['title'] ?? ''));
    $description = trim((string) ($data['description'] ?? ''));
    $isActive = filter_var($data['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $minSubtotal = array_key_exists('min_subtotal', $data) && $data['min_subtotal'] !== null && $data['min_subtotal'] !== ''
        ? storageSqlNumber($data['min_subtotal'], 2)
        : 'NULL';
    $targetProductId = array_key_exists('target_product_id', $data) && $data['target_product_id'] !== null && $data['target_product_id'] !== ''
        ? (int) $data['target_product_id']
        : 'NULL';
    $targetProductName = trim((string) ($data['target_product_name'] ?? ''));
    $rewardProductId = array_key_exists('reward_product_id', $data) && $data['reward_product_id'] !== null && $data['reward_product_id'] !== ''
        ? (int) $data['reward_product_id']
        : 'NULL';
    $rewardProductName = trim((string) ($data['reward_product_name'] ?? ''));
    $rewardQuantity = max(1, (int) ($data['reward_quantity'] ?? 1));
    $specialPrice = array_key_exists('special_price', $data) && $data['special_price'] !== null && $data['special_price'] !== ''
        ? storageSqlNumber($data['special_price'], 2)
        : 'NULL';
    $triggerKeywords = trim((string) ($data['trigger_keywords'] ?? ''));
    $messageColor = trim((string) ($data['message_color'] ?? '#ffffff'));
    $priceColor = trim((string) ($data['price_color'] ?? '#ffc107'));
    $sortOrder = (int) ($data['sort_order'] ?? 0);

    if ($kind === '' || $title === '') {
        throw new RuntimeException('Kind and Title are required for promotions', 422);
    }

    if ($id > 0) {
        storageExec("
            UPDATE promotions
            SET kind = " . storageSqlValue($kind) . ",
                title = " . storageSqlValue($title) . ",
                description = " . storageSqlValue($description !== '' ? $description : null) . ",
                is_active = " . ($isActive ? '1' : '0') . ",
                min_subtotal = {$minSubtotal},
                target_product_id = {$targetProductId},
                target_product_name = " . storageSqlValue($targetProductName !== '' ? $targetProductName : null) . ",
                reward_product_id = {$rewardProductId},
                reward_product_name = " . storageSqlValue($rewardProductName !== '' ? $rewardProductName : null) . ",
                reward_quantity = {$rewardQuantity},
                special_price = {$specialPrice},
                trigger_keywords = " . storageSqlValue($triggerKeywords !== '' ? $triggerKeywords : null) . ",
                message_color = " . storageSqlValue($messageColor) . ",
                price_color = " . storageSqlValue($priceColor) . ",
                sort_order = {$sortOrder}
            WHERE id = {$id}
        ");
    } else {
        storageExec("
            INSERT INTO promotions (
                kind, title, description, is_active, min_subtotal,
                target_product_id, target_product_name,
                reward_product_id, reward_product_name, reward_quantity,
                special_price, trigger_keywords, message_color, price_color, sort_order
            ) VALUES (
                " . storageSqlValue($kind) . ",
                " . storageSqlValue($title) . ",
                " . storageSqlValue($description !== '' ? $description : null) . ",
                " . ($isActive ? '1' : '0') . ",
                {$minSubtotal},
                {$targetProductId},
                " . storageSqlValue($targetProductName !== '' ? $targetProductName : null) . ",
                {$rewardProductId},
                " . storageSqlValue($rewardProductName !== '' ? $rewardProductName : null) . ",
                {$rewardQuantity},
                {$specialPrice},
                " . storageSqlValue($triggerKeywords !== '' ? $triggerKeywords : null) . ",
                " . storageSqlValue($messageColor) . ",
                " . storageSqlValue($priceColor) . ",
                {$sortOrder}
            )
        ");
    }
}

function storageDeletePromotion(int $id): void
{
    storageEnsureReady();
    storageExec("DELETE FROM promotions WHERE id = {$id}");
}

function storageReplacePromotions(array $promotions): void
{
    storageEnsureReady();
    storageExec("DELETE FROM promotions");

    $sortOrder = 0;
    foreach ($promotions as $promotion) {
        $kind = trim((string) ($promotion['kind'] ?? ''));
        $title = trim((string) ($promotion['title'] ?? ''));
        if ($kind === '' || $title === '') {
            continue;
        }

        $sortOrder += 10;
        $minSubtotal = array_key_exists('min_subtotal', $promotion) && $promotion['min_subtotal'] !== null
            ? storageSqlNumber($promotion['min_subtotal'], 2)
            : 'NULL';
        $specialPrice = array_key_exists('special_price', $promotion) && $promotion['special_price'] !== null
            ? storageSqlNumber($promotion['special_price'], 2)
            : 'NULL';
        $rewardQuantity = max(1, (int) ($promotion['reward_quantity'] ?? 1));
        $isActive = array_key_exists('is_active', $promotion)
            ? filter_var($promotion['is_active'], FILTER_VALIDATE_BOOLEAN)
            : true;
        $triggerKeywords = trim((string) ($promotion['trigger_keywords'] ?? ''));
        if ($triggerKeywords === '' && !empty($promotion['trigger_terms']) && is_array($promotion['trigger_terms'])) {
            $triggerKeywords = implode(',', array_values(array_filter(array_map('trim', $promotion['trigger_terms']))));
        }

        storageExec("
            INSERT INTO promotions (
                kind,
                title,
                description,
                is_active,
                min_subtotal,
                target_product_id,
                target_product_name,
                reward_product_id,
                reward_product_name,
                reward_quantity,
                special_price,
                trigger_keywords,
                sort_order
            ) VALUES (
                " . storageSqlValue($kind) . ",
                " . storageSqlValue($title) . ",
                " . storageSqlValue(trim((string) ($promotion['description'] ?? '')) ?: null) . ",
                " . ($isActive ? '1' : '0') . ",
                {$minSubtotal},
                " . storageSqlValue(isset($promotion['target_product_id']) && $promotion['target_product_id'] !== null ? (int) $promotion['target_product_id'] : null) . ",
                " . storageSqlValue(trim((string) ($promotion['target_product_name'] ?? '')) ?: null) . ",
                " . storageSqlValue(isset($promotion['reward_product_id']) && $promotion['reward_product_id'] !== null ? (int) $promotion['reward_product_id'] : null) . ",
                " . storageSqlValue(trim((string) ($promotion['reward_product_name'] ?? '')) ?: null) . ",
                {$rewardQuantity},
                {$specialPrice},
                " . storageSqlValue($triggerKeywords !== '' ? $triggerKeywords : null) . ",
                {$sortOrder}
            )
        ");
    }
}

function storageBuildAgeRestrictionSnapshot(array $items): array
{
    storageEnsureReady();

    $normalizedItems = normalizeOrderItems($items);
    if (empty($normalizedItems)) {
        return [
            'requires_age_verification' => false,
            'restricted_product_ids' => [],
        ];
    }

    $restrictedProductIds = [];
    foreach ($normalizedItems as $item) {
        $productId = (int) ($item['id'] ?? 0);
        if ($productId <= 0) {
            continue;
        }

        $product = storageGetProductById($productId);
        if (!empty($product['age_restricted'])) {
            $restrictedProductIds[] = $productId;
        }
    }

    return [
        'requires_age_verification' => !empty($restrictedProductIds),
        'restricted_product_ids' => array_values(array_unique($restrictedProductIds)),
    ];
}

function storageDeleteProduct(int $id): void
{
    storageEnsureReady();
    // Foreign key with ON DELETE CASCADE will handle product_flavors
    storageExec("DELETE FROM products WHERE id = {$id}");
}

function storageGetProductFlavors(int $productId): array
{
    storageEnsureReady();
    if ($productId <= 0) {
        return [];
    }
    $rows = storageSelectRows("SELECT * FROM product_flavors WHERE product_id = {$productId} ORDER BY name ASC");
    foreach ($rows as &$row) {
        $row['stock_quantity'] = (int) ($row['stock_quantity'] ?? 0);
        $row['reserved_stock'] = max(0, (int) ($row['reserved_stock'] ?? 0));
        $row['min_stock_alert'] = max(0, (int) ($row['min_stock_alert'] ?? 0));
        $row['available_stock'] = max(0, $row['stock_quantity'] - $row['reserved_stock']);
        $row['low_stock'] = $row['available_stock'] <= $row['min_stock_alert'];
    }
    unset($row);
    return $rows;
}

function storageGetProductFlavorsMap(array $productIds): array
{
    storageEnsureReady();

    $productIds = array_values(array_filter(array_unique(array_map(
        static fn ($value): int => max(0, (int) $value),
        $productIds
    ))));

    if (empty($productIds)) {
        return [];
    }

    $rows = storageSelectRows("
        SELECT *
        FROM product_flavors
        WHERE product_id IN (" . implode(',', $productIds) . ")
        ORDER BY product_id ASC, name ASC
    ");

    $map = [];
    foreach ($rows as $row) {
        $productId = (int) ($row['product_id'] ?? 0);
        if ($productId <= 0) {
            continue;
        }

        $row['stock_quantity'] = (int) ($row['stock_quantity'] ?? 0);
        $row['reserved_stock'] = max(0, (int) ($row['reserved_stock'] ?? 0));
        $row['min_stock_alert'] = max(0, (int) ($row['min_stock_alert'] ?? 0));
        $row['available_stock'] = max(0, $row['stock_quantity'] - $row['reserved_stock']);
        $row['low_stock'] = $row['available_stock'] <= $row['min_stock_alert'];
        $map[$productId] ??= [];
        $map[$productId][] = $row;
    }

    return $map;
}

function storageSaveProductFlavor(array $data): void
{
    storageEnsureReady();
    $id = (int) ($data['id'] ?? 0);
    $productId = (int) ($data['product_id'] ?? 0);
    $name = trim((string) ($data['name'] ?? ''));
    $stockQuantity = max(0, (int) ($data['stock_quantity'] ?? 0));
    $minStockAlert = max(0, (int) ($data['min_stock_alert'] ?? 0));
    $reservedStock = max(0, min($stockQuantity, (int) ($data['reserved_stock'] ?? 0)));

    if ($productId <= 0 || $name === '') {
        throw new RuntimeException('Produto e Nome sao obrigatorios para sabores.', 422);
    }

    if ($id > 0) {
        storageExec("
            UPDATE product_flavors
            SET name = " . storageSqlValue($name) . ",
                stock_quantity = {$stockQuantity},
                min_stock_alert = {$minStockAlert},
                reserved_stock = {$reservedStock}
            WHERE id = {$id} AND product_id = {$productId}
        ");
        return;
    }

    storageExec("
        INSERT INTO product_flavors (product_id, name, stock_quantity, min_stock_alert, reserved_stock)
        VALUES ({$productId}, " . storageSqlValue($name) . ", {$stockQuantity}, {$minStockAlert}, {$reservedStock})
    ");
}

function storageDeleteProductFlavor(int $id): void
{
    storageEnsureReady();
    storageExec("DELETE FROM product_flavors WHERE id = {$id}");
}

function storageGetCustomerByPhone(string $phone): ?array
{
    storageEnsureReady();
    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return null;
    }

    return storageSelectRow("
        SELECT * FROM customers
        WHERE phone = " . storageSqlValue($phone) . "
        LIMIT 1
    ");
}

function storageCustomerHasPassword(?array $customer): bool
{
    return trim((string) ($customer['password_hash'] ?? '')) !== '';
}

function storageHashCustomerPassword(string $password): string
{
    $password = (string) $password;
    if (strlen($password) < 6) {
        throw new RuntimeException('A senha deve ter pelo menos 6 caracteres.', 422);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === '') {
        throw new RuntimeException('Nao foi possivel proteger a senha do cliente.', 500);
    }

    return $hash;
}

function storageRegisterCustomer(string $phone, string $name, string $password): array
{
    storageEnsureCustomerPasswordSchema();

    $phone = storageNormalizePhone($phone);
    $name = trim($name);
    if ($phone === '') {
        throw new RuntimeException('Telefone obrigatorio para criar a conta.', 422);
    }
    if ($name === '') {
        throw new RuntimeException('Nome obrigatorio para criar a conta.', 422);
    }

    $customer = storageGetCustomerByPhone($phone);
    if ($customer && storageCustomerHasPassword($customer)) {
        throw new RuntimeException('Ja existe uma conta com esse telefone. Faca login com sua senha.', 409);
    }

    storageUpsertCustomer($phone, $name, $customer['address'] ?? null);
    storageExec("
        UPDATE customers
        SET name = " . storageSqlValue($name) . ",
            password_hash = " . storageSqlValue(storageHashCustomerPassword($password)) . "
        WHERE phone = " . storageSqlValue($phone) . "
    ");

    return storageGetCustomerContext($phone);
}

function storageAuthenticateCustomer(string $phone, string $password): array
{
    storageEnsureCustomerPasswordSchema();

    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        throw new RuntimeException('Telefone obrigatorio para entrar.', 422);
    }

    $customer = storageGetCustomerByPhone($phone);
    if (!$customer || !storageCustomerHasPassword($customer)) {
        throw new RuntimeException('Conta nao encontrada para esse telefone. Crie sua conta primeiro.', 404);
    }

    if (!password_verify($password, (string) ($customer['password_hash'] ?? ''))) {
        throw new RuntimeException('Telefone ou senha invalidos.', 401);
    }

    return storageGetCustomerContext($phone);
}

function storageUpdateCustomerProfile(string $phone, array $data): array
{
    storageEnsureReady();

    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        throw new RuntimeException('Telefone obrigatorio para atualizar o perfil.', 422);
    }

    $name = trim((string) ($data['name'] ?? ''));
    if ($name === '') {
        throw new RuntimeException('Nome obrigatorio para atualizar o perfil.', 422);
    }

    $current = storageGetCustomerByPhone($phone);
    storageUpsertCustomer($phone, $name, $current['address'] ?? null);

    return storageGetCustomerContext($phone);
}

function storageSaveCustomerAddress(array $data): array
{
    storageEnsureReady();

    $phone = storageNormalizePhone((string) ($data['phone'] ?? ''));
    if ($phone === '') {
        throw new RuntimeException('Telefone obrigatorio para salvar favorito.', 422);
    }

    $customer = storageGetCustomerByPhone($phone);
    if (!$customer) {
        storageUpsertCustomer($phone, $data['customer_name'] ?? 'Cliente');
    }

    $label = trim((string) ($data['label'] ?? ''));
    $cep = preg_replace('/\D+/', '', (string) ($data['cep'] ?? '')) ?: '';
    $address = trim((string) ($data['address'] ?? ''));
    $number = trim((string) ($data['number'] ?? ''));
    $complement = trim((string) ($data['complement'] ?? ''));
    $requestedDefault = filter_var($data['is_default'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $addressId = (int) ($data['id'] ?? 0);

    if ($address === '') {
        throw new RuntimeException('Endereco obrigatorio para salvar favorito.', 422);
    }

    if ($number === '') {
        throw new RuntimeException('Numero obrigatorio para salvar favorito.', 422);
    }

    $addresses = storageGetCustomerAddresses($phone);
    $currentCount = count($addresses);
    $target = null;

    if ($addressId > 0) {
        foreach ($addresses as $item) {
            if ((int) ($item['id'] ?? 0) === $addressId) {
                $target = $item;
                break;
            }
        }

        if (!$target) {
            throw new RuntimeException('Favorito nao encontrado para este telefone.', 404);
        }
    }

    $candidate = [
        'cep' => $cep,
        'address' => $address,
        'number' => $number,
        'complement' => $complement,
    ];
    $fingerprint = storageBuildCustomerAddressFingerprint($candidate);

    foreach ($addresses as $item) {
        if ($target && (int) ($item['id'] ?? 0) === (int) ($target['id'] ?? 0)) {
            continue;
        }

        if (storageBuildCustomerAddressFingerprint($item) === $fingerprint) {
            $target = $item;
            break;
        }
    }

    if (!$target && $currentCount >= 10) {
        throw new RuntimeException('Limite de 10 favoritos por cliente atingido.', 409);
    }

    $isDefault = $requestedDefault || $currentCount === 0 || ($target && !empty($target['is_default']));
    $resolvedLabel = $label;
    if ($resolvedLabel === '' && $target) {
        $resolvedLabel = (string) ($target['label'] ?? '');
    }
    if ($resolvedLabel === '') {
        $resolvedLabel = $isDefault ? 'Principal' : 'Endereco ' . ($currentCount + ($target ? 0 : 1));
    }

    $fullAddress = storageBuildCustomerFullAddress($address, $number, $complement);

    if ($target) {
        $targetId = (int) ($target['id'] ?? 0);
        storageExec("
            UPDATE customer_addresses
            SET label = " . storageSqlValue($resolvedLabel) . ",
                cep = " . storageSqlValue($cep !== '' ? $cep : null) . ",
                address = " . storageSqlValue($address) . ",
                number = " . storageSqlValue($number) . ",
                complement = " . storageSqlValue($complement !== '' ? $complement : null) . ",
                full_address = " . storageSqlValue($fullAddress) . ",
                is_default = " . ($isDefault ? '1' : '0') . "
            WHERE id = {$targetId}
              AND customer_phone = " . storageSqlValue($phone) . "
        ");
        $savedId = $targetId;
    } else {
        storageExec("
            INSERT INTO customer_addresses (
                customer_phone,
                label,
                cep,
                address,
                number,
                complement,
                full_address,
                is_default
            ) VALUES (
                " . storageSqlValue($phone) . ",
                " . storageSqlValue($resolvedLabel) . ",
                " . storageSqlValue($cep !== '' ? $cep : null) . ",
                " . storageSqlValue($address) . ",
                " . storageSqlValue($number) . ",
                " . storageSqlValue($complement !== '' ? $complement : null) . ",
                " . storageSqlValue($fullAddress) . ",
                " . ($isDefault ? '1' : '0') . "
            )
        ");

        $savedRow = storageSelectRow("
            SELECT id
            FROM customer_addresses
            WHERE customer_phone = " . storageSqlValue($phone) . "
            ORDER BY id DESC
            LIMIT 1
        ");
        $savedId = (int) ($savedRow['id'] ?? 0);
    }

    if ($isDefault && $savedId > 0) {
        storageExec("
            UPDATE customer_addresses
            SET is_default = CASE WHEN id = {$savedId} THEN 1 ELSE 0 END
            WHERE customer_phone = " . storageSqlValue($phone) . "
        ");
    }

    storageEnsureDefaultCustomerAddress($phone);

    $saved = storageSelectRow("
        SELECT *
        FROM customer_addresses
        WHERE id = {$savedId}
          AND customer_phone = " . storageSqlValue($phone) . "
        LIMIT 1
    ");

    return $saved ? storageMapCustomerAddressRow($saved) : [];
}

function storageDeleteCustomerAddress(string $phone, int $id): void
{
    storageEnsureReady();
    $phone = storageNormalizePhone($phone);
    if ($phone === '' || $id <= 0) {
        throw new RuntimeException('Telefone e favorito obrigatorios.', 422);
    }

    $address = storageSelectRow("
        SELECT *
        FROM customer_addresses
        WHERE id = {$id}
          AND customer_phone = " . storageSqlValue($phone) . "
        LIMIT 1
    ");

    if (!$address) {
        throw new RuntimeException('Favorito nao encontrado para este telefone.', 404);
    }

    storageExec("
        DELETE FROM customer_addresses
        WHERE id = {$id}
          AND customer_phone = " . storageSqlValue($phone) . "
    ");

    storageEnsureDefaultCustomerAddress($phone);
}

function storageSyncCustomerAddressFromOrder(array $order): void
{
    $phone = storageNormalizePhone((string) ($order['customer_phone'] ?? ''));
    $addressLine = trim((string) ($order['address_line'] ?? ''));
    $number = trim((string) ($order['address_number'] ?? ''));

    if ($phone === '' || $addressLine === '' || $number === '') {
        return;
    }

    $existing = storageGetCustomerAddresses($phone);
    $fingerprint = storageBuildCustomerAddressFingerprint([
        'cep' => $order['customer_cep'] ?? '',
        'address' => $addressLine,
        'number' => $number,
        'complement' => $order['address_complement'] ?? '',
    ]);

    foreach ($existing as $item) {
        if (storageBuildCustomerAddressFingerprint($item) === $fingerprint) {
            storageSaveCustomerAddress([
                'phone' => $phone,
                'id' => $item['id'],
                'label' => $item['label'],
                'cep' => $order['customer_cep'] ?? '',
                'address' => $addressLine,
                'number' => $number,
                'complement' => $order['address_complement'] ?? '',
                'is_default' => $item['is_default'],
            ]);
            return;
        }
    }

    if (count($existing) >= 10) {
        return;
    }

    storageSaveCustomerAddress([
        'phone' => $phone,
        'cep' => $order['customer_cep'] ?? '',
        'address' => $addressLine,
        'number' => $number,
        'complement' => $order['address_complement'] ?? '',
        'is_default' => empty($existing),
    ]);
}

function storageBuildCustomerAgeVerificationSummary(?array $customer): array
{
    return [
        'age_verification_status' => storageNormalizeAgeVerificationStatus($customer['age_verification_status'] ?? null),
        'age_verified_at' => $customer['age_verified_at'] ?? null,
        'cpf' => (string) ($customer['cpf'] ?? ''),
        'cpf_last4' => (string) ($customer['cpf_last4'] ?? ''),
        'birth_date' => (string) ($customer['birth_date'] ?? ''),
        'age_verification_document_type' => (string) ($customer['age_verification_document_type'] ?? ''),
        'age_verification_method' => (string) ($customer['age_verification_method'] ?? ''),
    ];
}

function storageLogAgeVerificationEvent(string $phone, ?string $cpf, ?string $documentType, string $status, ?string $failureCode = null, ?float $confidence = null): void
{
    storageEnsureReady();

    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return;
    }

    $status = storageNormalizeAgeVerificationStatus($status);
    $confidenceSql = $confidence === null ? 'NULL' : storageSqlNumber(max(0, min(1, $confidence)), 4);
    storageExec("
        INSERT INTO age_verification_events (
            customer_phone,
            cpf_hash,
            document_type,
            status,
            failure_code,
            confidence
        ) VALUES (
            " . storageSqlValue($phone) . ",
            " . storageSqlValue(storageHashCpf($cpf)) . ",
            " . storageSqlValue(trim((string) ($documentType ?? '')) ?: null) . ",
            " . storageSqlValue($status) . ",
            " . storageSqlValue(trim((string) ($failureCode ?? '')) ?: null) . ",
            {$confidenceSql}
        )
    ");
}

function storageSaveCustomerAgeVerification(string $phone, string $cpf, string $documentType, ?string $customerName = null, string $method = 'ocr_node', ?string $birthDate = null): array
{
    storageEnsureReady();

    $phone = storageNormalizePhone($phone);
    $cpf = storageNormalizeCpf($cpf);
    $cpfHash = storageHashCpf($cpf);
    $cpfLast4 = storageCpfLast4($cpf);
    $documentType = strtolower(trim($documentType));
    $method = trim($method) !== '' ? trim($method) : 'ocr_node';
    $birthDate = trim((string) ($birthDate ?? ''));
    $normalizedBirthDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate) ? $birthDate : null;

    if ($phone === '' || $cpfHash === null || $cpfLast4 === null) {
        throw new RuntimeException('Telefone e CPF validos sao obrigatorios para gravar a verificacao.', 422);
    }

    storageUpsertCustomer($phone, $customerName ?? 'Cliente');
    storageExec("
        UPDATE customers
        SET cpf = " . storageSqlValue($cpf) . ",
            cpf_hash = " . storageSqlValue($cpfHash) . ",
            cpf_last4 = " . storageSqlValue($cpfLast4) . ",
            birth_date = " . storageSqlValue($normalizedBirthDate) . ",
            age_verification_status = 'verified',
            age_verified_at = CURRENT_TIMESTAMP,
            age_verification_method = " . storageSqlValue($method) . ",
            age_verification_document_type = " . storageSqlValue($documentType !== '' ? $documentType : null) . "
        WHERE phone = " . storageSqlValue($phone) . "
    ");

    $customer = storageGetCustomerByPhone($phone);
    return $customer ? storageBuildCustomerAgeVerificationSummary($customer) : storageBuildCustomerAgeVerificationSummary(null);
}

function storageCustomerHasVerifiedAge(string $phone, string $cpf): ?array
{
    storageEnsureReady();

    $phone = storageNormalizePhone($phone);
    $cpfHash = storageHashCpf($cpf);
    if ($phone === '' || $cpfHash === null) {
        return null;
    }

    $customer = storageSelectRow("
        SELECT *
        FROM customers
        WHERE phone = " . storageSqlValue($phone) . "
          AND cpf_hash = " . storageSqlValue($cpfHash) . "
          AND age_verification_status = 'verified'
        LIMIT 1
    ");

    if (!$customer) {
        return null;
    }

    return storageBuildCustomerAgeVerificationSummary($customer);
}

function storageGetCustomerContext(string $phone): array
{
    $phone = storageNormalizePhone($phone);
    $favorites = storageGetCustomerAddresses($phone);
    $customer = storageGetCustomerByPhone($phone);
    $resolvedName = trim((string) ($customer['name'] ?? ''));
    if ($resolvedName === 'Cliente') {
        $resolvedName = '';
    }
    $defaultAddressId = null;

    foreach ($favorites as $favorite) {
        if (!empty($favorite['is_default'])) {
            $defaultAddressId = (int) ($favorite['id'] ?? 0);
            break;
        }
    }

    return [
        'new' => !$customer,
        'has_password' => storageCustomerHasPassword($customer),
        'phone' => $phone,
        'name' => $resolvedName,
        'favorites' => $favorites,
        'default_address_id' => $defaultAddressId,
        ...storageBuildCustomerAgeVerificationSummary($customer),
    ];
}

function storageGetProductById(int $id): ?array
{
    storageEnsureReady();
    if ($id <= 0) {
        return null;
    }

    $product = storageSelectRow("
        SELECT
            id,
            name,
            price,
            img,
            category,
            barcode,
            stock_quantity,
            min_stock_alert,
            reserved_stock,
            store_enabled,
            ifood_enabled,
            ifood_price,
            ifood_external_code,
            age_restricted,
            uber_item_weight_grams,
            uber_item_length_cm,
            uber_item_height_cm,
            uber_item_depth_cm
        FROM products
        WHERE id = {$id}
        LIMIT 1
    ");

    if (!$product) {
        return null;
    }

    $product['stock_quantity'] = (int) ($product['stock_quantity'] ?? 0);
    $product['reserved_stock'] = max(0, (int) ($product['reserved_stock'] ?? 0));
    $product['min_stock_alert'] = max(0, (int) ($product['min_stock_alert'] ?? 0));
    $product['available_stock'] = max(0, $product['stock_quantity'] - $product['reserved_stock']);
    $product['category'] = trim((string) ($product['category'] ?? 'Geral')) ?: 'Geral';
    $product['barcode'] = trim((string) ($product['barcode'] ?? ''));
    $product['store_enabled'] = (bool) ($product['store_enabled'] ?? true);
    $product['ifood_enabled'] = (bool) ($product['ifood_enabled'] ?? false);
    $product['ifood_price'] = $product['ifood_price'] !== null ? (float) $product['ifood_price'] : null;
    $product['ifood_effective_price'] = storageIfoodPriceForProduct($product);
    $product['ifood_external_code'] = trim((string) ($product['ifood_external_code'] ?? ''));
    $product['age_restricted'] = (bool) ($product['age_restricted'] ?? false);

    return $product;
}

function storageDecrementStockForItems(array $items): void
{
    storageEnsureReady();

    $normalizedItems = normalizeOrderItems($items);
    if (empty($normalizedItems)) {
        return;
    }

    $decremented = [];

    try {
        foreach ($normalizedItems as $item) {
            $productId = (int) ($item['id'] ?? 0);
            $flavorId = (int) ($item['flavor_id'] ?? 0);
            $requested = max(0, (int) ($item['quantity'] ?? 0));

            if ($flavorId > 0) {
                $flavor = storageSelectRow("SELECT * FROM product_flavors WHERE id = {$flavorId} AND product_id = {$productId}");
                if (!$flavor) {
                    throw new RuntimeException("Sabor nao encontrado: {$item['flavor_name']}", 404);
                }
                $available = (int) ($flavor['stock_quantity'] ?? 0);
                $available = max(0, $available - (int) ($flavor['reserved_stock'] ?? 0));
                if ($available < $requested) {
                    throw new RuntimeException("Estoque insuficiente para {$item['name']} ({$item['flavor_name']}). Disponivel: {$available}", 409);
                }

                storageExec("
                    UPDATE product_flavors
                    SET stock_quantity = stock_quantity - {$requested}
                    WHERE id = {$flavorId}
                      AND stock_quantity >= {$requested}
                ");
            } else {
                $product = storageGetProductById($productId);
                if (!$product) {
                    throw new RuntimeException("Produto nao encontrado: {$item['name']}", 404);
                }
                $available = (int) ($product['stock_quantity'] ?? 0);
                $available = max(0, $available - (int) ($product['reserved_stock'] ?? 0));
                if ($available < $requested) {
                    throw new RuntimeException("Estoque insuficiente para {$product['name']}. Disponivel: {$available}", 409);
                }

                storageExec("
                    UPDATE products
                    SET stock_quantity = stock_quantity - {$requested}
                    WHERE id = {$productId}
                      AND stock_quantity >= {$requested}
                ");
            }

            $decremented[] = $item;
        }
        storageDisableIfoodForOutOfStock(array_map(static fn (array $item): int => (int) ($item['id'] ?? 0), $decremented));
    } catch (\Throwable $e) {
        if (!empty($decremented)) {
            storageIncrementStockForItems($decremented);
        }
        throw $e;
    }
}

function storageIncrementStockForItems(array $items): void
{
    storageEnsureReady();

    $normalizedItems = normalizeOrderItems($items);
    foreach ($normalizedItems as $item) {
        $productId = (int) ($item['id'] ?? 0);
        $flavorId = (int) ($item['flavor_id'] ?? 0);
        $quantity = max(0, (int) ($item['quantity'] ?? 0));

        if ($productId <= 0 || $quantity <= 0) {
            continue;
        }

        if ($flavorId > 0) {
            storageExec("
                UPDATE product_flavors
                SET stock_quantity = stock_quantity + {$quantity}
                WHERE id = {$flavorId}
            ");
        } else {
            storageExec("
                UPDATE products
                SET stock_quantity = stock_quantity + {$quantity}
                WHERE id = {$productId}
            ");
        }
    }

    storageDisableIfoodForOutOfStock();
}

function storageBulkIncrementStock(int $amount): void
{
    storageEnsureReady();
    if ($amount === 0) {
        return;
    }

    storageExec("
        UPDATE products
        SET stock_quantity = CASE
            WHEN stock_quantity + {$amount} < 0 THEN 0
            ELSE stock_quantity + {$amount}
        END
    ");

    storageDisableIfoodForOutOfStock();
}

function storageDisableIfoodForOutOfStock(?array $productIds = null): array
{
    storageEnsureReady();
    $whereIds = '';
    if (is_array($productIds) && !empty($productIds)) {
        $ids = array_values(array_unique(array_filter(array_map('intval', $productIds), static fn (int $id): bool => $id > 0)));
        if (!empty($ids)) {
            $whereIds = ' AND id IN (' . implode(',', $ids) . ')';
        }
    }

    return storageExec("
        UPDATE products
        SET ifood_enabled = 0
        WHERE ifood_enabled = 1
          AND (stock_quantity - reserved_stock) <= 0
          {$whereIds}
    ");
}

function storageRecordStockMovement(int $productId, ?int $flavorId, string $type, int $quantity, int $previousQuantity, int $newQuantity, string $channel = 'manual', string $note = ''): void
{
    storageExec("
        INSERT INTO stock_movements (
            product_id,
            flavor_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            channel,
            note
        ) VALUES (
            {$productId},
            " . ($flavorId ? (string) $flavorId : 'NULL') . ",
            " . storageSqlValue($type) . ",
            {$quantity},
            {$previousQuantity},
            {$newQuantity},
            " . storageSqlValue($channel !== '' ? $channel : 'manual') . ",
            " . storageSqlValue($note !== '' ? $note : null) . "
        )
    ");
}

function storageAdjustStock(array $data): array
{
    storageEnsureReady();
    $productId = (int) ($data['product_id'] ?? 0);
    $flavorId = (int) ($data['flavor_id'] ?? 0);
    $quantity = (int) ($data['quantity'] ?? 0);
    $mode = trim((string) ($data['mode'] ?? 'increment'));
    $channel = trim((string) ($data['channel'] ?? 'manual'));
    $note = trim((string) ($data['note'] ?? ''));

    if ($productId <= 0) {
        throw new RuntimeException('Produto obrigatorio.', 422);
    }

    if ($flavorId > 0) {
        $row = storageSelectRow("SELECT * FROM product_flavors WHERE id = {$flavorId} AND product_id = {$productId} LIMIT 1");
        $table = 'product_flavors';
        $where = "id = {$flavorId} AND product_id = {$productId}";
    } else {
        $row = storageSelectRow("SELECT * FROM products WHERE id = {$productId} LIMIT 1");
        $table = 'products';
        $where = "id = {$productId}";
    }

    if (!$row) {
        throw new RuntimeException('Item de estoque nao encontrado.', 404);
    }

    $previous = max(0, (int) ($row['stock_quantity'] ?? 0));
    $next = $mode === 'set' ? max(0, $quantity) : max(0, $previous + $quantity);
    $delta = $next - $previous;

    storageExec("
        UPDATE {$table}
        SET stock_quantity = {$next}
        WHERE {$where}
    ");

    storageRecordStockMovement($productId, $flavorId > 0 ? $flavorId : null, $mode === 'set' ? 'set' : ($delta >= 0 ? 'increment' : 'decrement'), $delta, $previous, $next, $channel, $note);
    storageDisableIfoodForOutOfStock([$productId]);

    return [
        'product_id' => $productId,
        'flavor_id' => $flavorId > 0 ? $flavorId : null,
        'previous_quantity' => $previous,
        'new_quantity' => $next,
        'delta' => $delta,
    ];
}

function storageGetStock(): array
{
    storageEnsureReady();
    $products = storageGetProducts(true);
    $movements = storageSelectRows("
        SELECT sm.*, p.name AS product_name, pf.name AS flavor_name
        FROM stock_movements sm
        LEFT JOIN products p ON p.id = sm.product_id
        LEFT JOIN product_flavors pf ON pf.id = sm.flavor_id
        ORDER BY sm.id DESC
        LIMIT 50
    ");

    $lowStock = array_values(array_filter($products, static function (array $product): bool {
        if (!empty($product['low_stock'])) {
            return true;
        }
        foreach (($product['flavors'] ?? []) as $flavor) {
            if (!empty($flavor['low_stock'])) {
                return true;
            }
        }
        return false;
    }));

    return [
        'products' => $products,
        'low_stock' => $lowStock,
        'movements' => $movements,
    ];
}

function storageGetIfoodAuthSettings(): array
{
    storageEnsureReady();
    $row = storageSelectRow("
        SELECT *
        FROM ifood_auth_settings
        WHERE id = 1
        LIMIT 1
    ") ?: [];

    return [
        'merchant_id' => trim((string) ($row['merchant_id'] ?? '')),
        'sync_enabled' => (bool) ($row['sync_enabled'] ?? false),
        'catalog_sync_path' => trim((string) ($row['catalog_sync_path'] ?? '')),
        'synced_categories' => storageNormalizeIfoodCategoryList($row['synced_categories'] ?? ''),
        'price_markup_percent' => max(
            defined('IFOOD_MIN_MARKUP_PERCENT') ? (float) IFOOD_MIN_MARKUP_PERCENT : 28.0,
            (float) ($row['price_markup_percent'] ?? (defined('IFOOD_DEFAULT_MARKUP_PERCENT') ? IFOOD_DEFAULT_MARKUP_PERCENT : 28))
        ),
        'access_token' => trim((string) ($row['access_token'] ?? '')),
        'refresh_token' => trim((string) ($row['refresh_token'] ?? '')),
        'access_token_expires_at' => trim((string) ($row['access_token_expires_at'] ?? '')),
        'pending_user_code' => trim((string) ($row['pending_user_code'] ?? '')),
        'pending_authorization_code_verifier' => trim((string) ($row['pending_authorization_code_verifier'] ?? '')),
        'pending_verification_url' => trim((string) ($row['pending_verification_url'] ?? '')),
        'pending_expires_at' => trim((string) ($row['pending_expires_at'] ?? '')),
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function storageUpdateIfoodAuthSettings(array $data): array
{
    storageEnsureReady();
    $current = storageGetIfoodAuthSettings();
    $next = [
        'merchant_id' => array_key_exists('merchant_id', $data) ? trim((string) $data['merchant_id']) : $current['merchant_id'],
        'sync_enabled' => array_key_exists('sync_enabled', $data) ? filter_var($data['sync_enabled'], FILTER_VALIDATE_BOOLEAN) : $current['sync_enabled'],
        'catalog_sync_path' => array_key_exists('catalog_sync_path', $data) ? trim((string) $data['catalog_sync_path']) : $current['catalog_sync_path'],
        'synced_categories' => array_key_exists('synced_categories', $data)
            ? storageNormalizeIfoodCategoryList($data['synced_categories'])
            : storageNormalizeIfoodCategoryList($current['synced_categories']),
        'price_markup_percent' => array_key_exists('price_markup_percent', $data)
            ? round(max(defined('IFOOD_MIN_MARKUP_PERCENT') ? (float) IFOOD_MIN_MARKUP_PERCENT : 28.0, (float) $data['price_markup_percent']), 2)
            : (float) $current['price_markup_percent'],
        'access_token' => array_key_exists('access_token', $data) ? trim((string) $data['access_token']) : $current['access_token'],
        'refresh_token' => array_key_exists('refresh_token', $data) ? trim((string) $data['refresh_token']) : $current['refresh_token'],
        'access_token_expires_at' => array_key_exists('access_token_expires_at', $data) ? trim((string) $data['access_token_expires_at']) : $current['access_token_expires_at'],
        'pending_user_code' => array_key_exists('pending_user_code', $data) ? trim((string) $data['pending_user_code']) : $current['pending_user_code'],
        'pending_authorization_code_verifier' => array_key_exists('pending_authorization_code_verifier', $data) ? trim((string) $data['pending_authorization_code_verifier']) : $current['pending_authorization_code_verifier'],
        'pending_verification_url' => array_key_exists('pending_verification_url', $data) ? trim((string) $data['pending_verification_url']) : $current['pending_verification_url'],
        'pending_expires_at' => array_key_exists('pending_expires_at', $data) ? trim((string) $data['pending_expires_at']) : $current['pending_expires_at'],
    ];

    storageExec("
        INSERT INTO ifood_auth_settings (
            id,
            merchant_id,
            sync_enabled,
            catalog_sync_path,
            synced_categories,
            price_markup_percent,
            access_token,
            refresh_token,
            access_token_expires_at,
            pending_user_code,
            pending_authorization_code_verifier,
            pending_verification_url,
            pending_expires_at
        ) VALUES (
            1,
            " . storageSqlValue($next['merchant_id'] !== '' ? $next['merchant_id'] : null) . ",
            " . ($next['sync_enabled'] ? '1' : '0') . ",
            " . storageSqlValue($next['catalog_sync_path'] !== '' ? $next['catalog_sync_path'] : null) . ",
            " . storageSqlValue(json_encode($next['synced_categories'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ",
            " . $next['price_markup_percent'] . ",
            " . storageSqlValue($next['access_token'] !== '' ? $next['access_token'] : null) . ",
            " . storageSqlValue($next['refresh_token'] !== '' ? $next['refresh_token'] : null) . ",
            " . storageSqlValue($next['access_token_expires_at'] !== '' ? $next['access_token_expires_at'] : null) . ",
            " . storageSqlValue($next['pending_user_code'] !== '' ? $next['pending_user_code'] : null) . ",
            " . storageSqlValue($next['pending_authorization_code_verifier'] !== '' ? $next['pending_authorization_code_verifier'] : null) . ",
            " . storageSqlValue($next['pending_verification_url'] !== '' ? $next['pending_verification_url'] : null) . ",
            " . storageSqlValue($next['pending_expires_at'] !== '' ? $next['pending_expires_at'] : null) . "
        )
        ON DUPLICATE KEY UPDATE
            merchant_id = VALUES(merchant_id),
            sync_enabled = VALUES(sync_enabled),
            catalog_sync_path = VALUES(catalog_sync_path),
            synced_categories = VALUES(synced_categories),
            price_markup_percent = VALUES(price_markup_percent),
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            access_token_expires_at = VALUES(access_token_expires_at),
            pending_user_code = VALUES(pending_user_code),
            pending_authorization_code_verifier = VALUES(pending_authorization_code_verifier),
            pending_verification_url = VALUES(pending_verification_url),
            pending_expires_at = VALUES(pending_expires_at)
    ");

    return storageGetIfoodAuthSettings();
}

function storageGetIfoodSyncedCategories(): array
{
    $settings = storageGetIfoodAuthSettings();
    return storageNormalizeIfoodCategoryList($settings['synced_categories'] ?? []);
}

function storageRememberIfoodSyncedCategories(array $categories): array
{
    $current = storageGetIfoodSyncedCategories();
    return storageUpdateIfoodAuthSettings([
        'synced_categories' => array_values(array_merge($current, $categories)),
    ])['synced_categories'] ?? [];
}

function storageProductCategoryIsSyncedForIfood(string $category): bool
{
    $syncedCategories = storageGetIfoodSyncedCategories();
    if (empty($syncedCategories)) {
        return false;
    }

    return storageCatalogCategoryMatchesSelection($category, $syncedCategories);
}

function storageBuildIfoodCatalogPayload(?array $selectedCategories = null): array
{
    storageEnsureReady();
    $allProducts = storageGetProducts(true);
    $products = $allProducts;
    if (is_array($selectedCategories)) {
        $selectedCategories = array_values(array_filter(array_map(
            static fn ($category): string => trim((string) $category),
            $selectedCategories
        ), static fn (string $category): bool => $category !== ''));
        $products = array_values(array_filter($allProducts, static function (array $product) use ($selectedCategories): bool {
            return storageCatalogCategoryMatchesSelection((string) ($product['category'] ?? 'Geral'), $selectedCategories);
        }));
    }
    $authSettings = storageGetIfoodAuthSettings();
    $merchantId = $authSettings['merchant_id'] !== ''
        ? $authSettings['merchant_id']
        : (defined('IFOOD_MERCHANT_ID') ? IFOOD_MERCHANT_ID : '');

    $items = array_map(static function (array $product): array {
        $externalCode = trim((string) ($product['ifood_external_code'] ?? ''));
        if ($externalCode === '') {
            $externalCode = 'gelocrm-product-' . (int) ($product['id'] ?? 0);
        }
        $availableStock = max(0, (int) ($product['available_stock'] ?? 0));
        $isAvailableOnIfood = !empty($product['ifood_enabled']) && $availableStock > 0;

        return [
            'externalCode' => $externalCode,
            'category' => trim((string) ($product['category'] ?? 'Geral')) ?: 'Geral',
            'name' => (string) ($product['name'] ?? ''),
            'description' => (string) ($product['category'] ?? 'Produto Lumix Ice'),
            'price' => [
                'value' => storageIfoodPriceForProduct($product),
            ],
            'inventory' => [
                'quantity' => $availableStock,
            ],
            'status' => $isAvailableOnIfood ? 'AVAILABLE' : 'UNAVAILABLE',
            'ifood_enabled' => !empty($product['ifood_enabled']),
            'imageUrl' => (string) ($product['img'] ?? ''),
            'serving' => 'NOT_APPLICABLE',
        ];
    }, $products);

    return [
        'merchantId' => $merchantId,
        'items' => $items,
        'count' => count($items),
        'selected_categories' => is_array($selectedCategories) ? array_values($selectedCategories) : null,
        'fallback_all_products' => false,
        'generated_at' => gmdate('c'),
    ];
}

function storageSaveIfoodEvent(array $event, bool $acked = false): void
{
    storageEnsureReady();
    $id = trim((string) ($event['id'] ?? ''));
    if ($id === '') {
        return;
    }

    $payload = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    storageExec("
        INSERT INTO ifood_events (
            id,
            event_code,
            full_code,
            order_id,
            merchant_id,
            payload,
            acked_at,
            processed_at
        ) VALUES (
            " . storageSqlValue($id) . ",
            " . storageSqlValue($event['code'] ?? null) . ",
            " . storageSqlValue($event['fullCode'] ?? null) . ",
            " . storageSqlValue($event['orderId'] ?? null) . ",
            " . storageSqlValue($event['merchantId'] ?? null) . ",
            " . storageSqlValue($payload) . ",
            " . ($acked ? 'CURRENT_TIMESTAMP' : 'NULL') . ",
            CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
            event_code = VALUES(event_code),
            full_code = VALUES(full_code),
            order_id = VALUES(order_id),
            merchant_id = VALUES(merchant_id),
            payload = VALUES(payload),
            acked_at = CASE WHEN VALUES(acked_at) IS NULL THEN ifood_events.acked_at ELSE VALUES(acked_at) END,
            processed_at = CURRENT_TIMESTAMP
    ");
}

function storageIfoodEventWasProcessed(string $eventId): bool
{
    storageEnsureReady();
    $eventId = trim($eventId);
    if ($eventId === '') {
        return false;
    }

    $row = storageSelectRow("
        SELECT id
        FROM ifood_events
        WHERE id = " . storageSqlValue($eventId) . "
          AND processed_at IS NOT NULL
        LIMIT 1
    ");

    return is_array($row) && trim((string) ($row['id'] ?? '')) !== '';
}

function storageMarkIfoodEventsAcked(array $events): void
{
    foreach ($events as $event) {
        if (is_array($event)) {
            $event['acked'] = true;
            storageSaveIfoodEvent($event, true);
        }
    }
}

function storageGetIfoodOrderByLocalOrderId(int $localOrderId): ?array
{
    storageEnsureReady();
    if ($localOrderId <= 0) {
        return null;
    }

    return storageSelectRow("
        SELECT *
        FROM ifood_orders
        WHERE local_order_id = {$localOrderId}
        LIMIT 1
    ");
}

function storageGetIfoodOrderByIfoodId(string $ifoodOrderId): ?array
{
    storageEnsureReady();
    $ifoodOrderId = trim($ifoodOrderId);
    if ($ifoodOrderId === '') {
        return null;
    }

    return storageSelectRow("
        SELECT *
        FROM ifood_orders
        WHERE ifood_order_id = " . storageSqlValue($ifoodOrderId) . "
        LIMIT 1
    ");
}

function storageApplyIfoodProgressToLocalOrder(string $ifoodOrderId, string $progress): ?array
{
    storageEnsureReady();
    $ifoodOrderId = trim($ifoodOrderId);
    if ($ifoodOrderId === '') {
        return null;
    }

    $row = storageGetIfoodOrderByIfoodId($ifoodOrderId);
    $localOrderId = (int) ($row['local_order_id'] ?? 0);
    if ($localOrderId <= 0) {
        return null;
    }

    $order = storageGetOrderById($localOrderId);
    if (!$order) {
        return null;
    }

    $progress = strtoupper(trim($progress));
    $updates = [];

    if (str_contains($progress, 'CANCEL') || in_array($progress, ['CAN', 'CAR'], true)) {
        $updates = [
            'status' => 'cancelled',
            'delivery_status' => 'failed',
        ];
    } elseif (in_array($progress, ['PLC', 'PLACED'], true)) {
        if (($order['print_status'] ?? 'pending') !== 'printed' && ($order['status'] ?? '') !== 'cancelled') {
            $updates = [
                'status' => 'pending',
                'delivery_status' => 'created',
            ];
        }
    } elseif (in_array($progress, ['CONFIRM', 'CONFIRMED', 'CFM', 'START_PREPARATION', 'STARTPREPARATION', 'PREPARATION_STARTED', 'PREPARING'], true)) {
        if (($order['status'] ?? '') !== 'cancelled') {
            $updates = [
                'status' => 'preparing',
                'print_status' => 'printed',
                'printed_at' => ($order['printed_at'] ?? null) ?: ['raw' => 'CURRENT_TIMESTAMP'],
                'delivery_status' => 'created',
            ];
        }
    } elseif (in_array($progress, ['READY_TO_PICKUP', 'READYTOPICKUP', 'RTP', 'READY'], true)) {
        if (($order['status'] ?? '') !== 'cancelled') {
            $updates = [
                'status' => 'shipped',
                'delivery_status' => 'created',
            ];
        }
    } elseif (in_array($progress, ['DISPATCH', 'DISPATCHED', 'DSP'], true)) {
        if (($order['status'] ?? '') !== 'cancelled') {
            $updates = [
                'status' => 'shipped',
                'delivery_status' => 'in_transit',
                'dispatched_at' => ($order['dispatched_at'] ?? null) ?: ['raw' => 'CURRENT_TIMESTAMP'],
            ];
        }
    } elseif (in_array($progress, ['CONCLUDED', 'COMPLETED', 'DELIVERED'], true)) {
        if (($order['status'] ?? '') !== 'cancelled') {
            $updates = [
                'status' => 'delivered',
                'delivery_status' => 'delivered',
            ];
        }
    }

    if (empty($updates)) {
        return storageGetOrderDetailsById($localOrderId);
    }

    return storageUpdateOrderById($localOrderId, $updates);
}

function storageApplyIfoodEventToLocalOrder(array $event): ?array
{
    $orderId = trim((string) ($event['orderId'] ?? ''));
    if ($orderId === '') {
        return null;
    }

    $progress = trim((string) ($event['fullCode'] ?? '')) ?: trim((string) ($event['code'] ?? ''));
    return storageApplyIfoodProgressToLocalOrder($orderId, $progress);
}

function storageIfoodLocalMetadata(array $order): array
{
    $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
    $phone = is_array($customer['phone'] ?? null) ? $customer['phone'] : [];
    $delivery = is_array($order['delivery'] ?? null) ? $order['delivery'] : [];

    return [
        'ifood_order_id' => trim((string) ($order['id'] ?? '')),
        'ifood_display_id' => trim((string) ($order['displayId'] ?? '')),
        'ifood_delivery_by' => strtoupper(trim((string) ($delivery['deliveredBy'] ?? ''))),
        'ifood_pickup_code' => preg_replace('/\D+/', '', (string) ($delivery['pickupCode'] ?? '')),
        'ifood_delivery_localizer' => preg_replace('/\D+/', '', (string) ($phone['localizer'] ?? '')),
    ];
}

function storageSyncIfoodMetadataToLocalOrder(int $localOrderId, array $order): void
{
    if ($localOrderId <= 0) {
        return;
    }

    storageUpdateOrderById($localOrderId, storageIfoodLocalMetadata($order));
}

function storageIfoodOrderItemsFromLocalRow(array $row): array
{
    $items = $row['items'] ?? [];
    if (is_array($items)) {
        return $items;
    }

    $decoded = json_decode((string) $items, true);
    return is_array($decoded) ? $decoded : [];
}

function storageIfoodStockDeltaItems(array $fromItems, array $toItems): array
{
    $from = [];
    $to = [];
    foreach (normalizeOrderItems($fromItems) as $item) {
        $key = (int) ($item['id'] ?? 0) . ':' . (int) ($item['flavor_id'] ?? 0);
        $from[$key] = [
            ...$item,
            'quantity' => (int) (($from[$key]['quantity'] ?? 0) + (int) ($item['quantity'] ?? 0)),
        ];
    }
    foreach (normalizeOrderItems($toItems) as $item) {
        $key = (int) ($item['id'] ?? 0) . ':' . (int) ($item['flavor_id'] ?? 0);
        $to[$key] = [
            ...$item,
            'quantity' => (int) (($to[$key]['quantity'] ?? 0) + (int) ($item['quantity'] ?? 0)),
        ];
    }

    $increment = [];
    $decrement = [];
    foreach (array_unique([...array_keys($from), ...array_keys($to)]) as $key) {
        $previous = (int) ($from[$key]['quantity'] ?? 0);
        $next = (int) ($to[$key]['quantity'] ?? 0);
        if ($previous > $next && isset($from[$key])) {
            $increment[] = [...$from[$key], 'quantity' => $previous - $next];
        } elseif ($next > $previous && isset($to[$key])) {
            $decrement[] = [...$to[$key], 'quantity' => $next - $previous];
        }
    }

    return ['increment' => $increment, 'decrement' => $decrement];
}

function storageSyncIfoodItemsToLocalOrder(int $localOrderId, array $order): void
{
    if ($localOrderId <= 0) {
        return;
    }

    $localOrder = storageGetOrderById($localOrderId);
    $items = storageBuildLocalItemsFromIfoodOrder($order);
    if (!$localOrder || empty($items)) {
        return;
    }

    $currentItems = storageIfoodOrderItemsFromLocalRow($localOrder);
    $delta = storageIfoodStockDeltaItems($currentItems, $items);
    try {
        if (!empty($delta['increment'])) {
            storageIncrementStockForItems($delta['increment']);
        }
        if (!empty($delta['decrement'])) {
            storageDecrementStockForItems($delta['decrement']);
        }
    } catch (\Throwable $ignored) {
        // The iFood order remains authoritative even if local stock has drifted.
    }

    $total = is_array($order['total'] ?? null) ? $order['total'] : [];
    storageUpdateOrderById($localOrderId, [
        'items' => $items,
        'total' => $total['orderAmount'] ?? $total['subTotal'] ?? ($localOrder['total'] ?? 0),
        'delivery_fee' => $total['deliveryFee'] ?? ($localOrder['delivery_fee'] ?? 0),
    ]);
}

function storageUpsertIfoodOrder(array $order): void
{
    storageEnsureReady();
    $id = trim((string) ($order['id'] ?? ''));
    if ($id === '') {
        return;
    }

    $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
    $merchant = is_array($order['merchant'] ?? null) ? $order['merchant'] : [];
    $total = is_array($order['total'] ?? null) ? $order['total'] : [];
    $payments = is_array($order['payments'] ?? null) ? $order['payments'] : [];
    $cash = is_array($payments['cash'] ?? null) ? $payments['cash'] : [];
    $paymentStatus = '';
    if (isset($payments['prepaid'])) {
        $paymentStatus = !empty($payments['prepaid']) ? 'prepaid' : 'pending';
    }
    $existing = storageSelectRow("
        SELECT local_order_id
        FROM ifood_orders
        WHERE ifood_order_id = " . storageSqlValue($id) . "
        LIMIT 1
    ");
    $localOrderId = isset($existing['local_order_id']) && (int) $existing['local_order_id'] > 0
        ? (int) $existing['local_order_id']
        : null;

    storageExec("
        INSERT INTO ifood_orders (
            ifood_order_id,
            display_id,
            merchant_id,
            status,
            order_type,
            sales_channel,
            customer_name,
            total,
            payment_status,
            local_order_id,
            payload,
            updated_at
        ) VALUES (
            " . storageSqlValue($id) . ",
            " . storageSqlValue($order['displayId'] ?? null) . ",
            " . storageSqlValue($merchant['id'] ?? $order['merchantId'] ?? null) . ",
            " . storageSqlValue($order['status'] ?? null) . ",
            " . storageSqlValue($order['orderType'] ?? null) . ",
            " . storageSqlValue($order['salesChannel'] ?? null) . ",
            " . storageSqlValue($customer['name'] ?? null) . ",
            " . storageSqlNumber($total['orderAmount'] ?? $total['subTotal'] ?? 0, 2) . ",
            " . storageSqlValue($paymentStatus !== '' ? $paymentStatus : null) . ",
            " . ($localOrderId ? (string) $localOrderId : 'NULL') . ",
            " . storageSqlValue(json_encode($order, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . ",
            CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
            display_id = VALUES(display_id),
            merchant_id = VALUES(merchant_id),
            status = VALUES(status),
            order_type = VALUES(order_type),
            sales_channel = VALUES(sales_channel),
            customer_name = VALUES(customer_name),
            total = VALUES(total),
            payment_status = VALUES(payment_status),
            local_order_id = CASE WHEN ifood_orders.local_order_id IS NULL THEN VALUES(local_order_id) ELSE ifood_orders.local_order_id END,
            payload = VALUES(payload),
            updated_at = CURRENT_TIMESTAMP
    ");

    $localOrderId = storageEnsureLocalOrderForIfoodOrder($order);
    if ($localOrderId !== null) {
        storageSyncIfoodMetadataToLocalOrder($localOrderId, $order);
        storageSyncIfoodItemsToLocalOrder($localOrderId, $order);
    }

    $status = trim((string) ($order['status'] ?? ''));
    if ($status !== '') {
        storageApplyIfoodProgressToLocalOrder($id, $status);
    }
}

function storageNormalizeIfoodPaymentMethod(array $order): string
{
    $payments = is_array($order['payments'] ?? null) ? $order['payments'] : [];
    $methods = is_array($payments['methods'] ?? null) ? $payments['methods'] : [];
    $firstMethod = is_array($methods[0] ?? null) ? $methods[0] : [];
    $method = strtoupper(trim((string) ($firstMethod['method'] ?? $firstMethod['type'] ?? $firstMethod['brand'] ?? '')));
    $card = is_array($firstMethod['card'] ?? null) ? $firstMethod['card'] : [];
    $cardType = strtoupper(trim((string) ($card['type'] ?? $firstMethod['cardType'] ?? '')));

    if (str_contains($method, 'PIX')) {
        return 'pix';
    }
    if (str_contains($method, 'DEBIT') || str_contains($cardType, 'DEBIT')) {
        return 'debit_card';
    }
    if (str_contains($method, 'CREDIT') || str_contains($cardType, 'CREDIT')) {
        return 'credit_card';
    }
    if (str_contains($method, 'CASH') || str_contains($method, 'MONEY')) {
        return 'cash';
    }

    return 'ifood';
}

function storageFindProductByIfoodItem(array $item, array $products): ?array
{
    $externalCode = trim((string) ($item['externalCode'] ?? $item['external_code'] ?? $item['code'] ?? ''));
    if ($externalCode !== '') {
        foreach ($products as $product) {
            $productCode = trim((string) ($product['ifood_external_code'] ?? ''));
            $defaultCode = 'gelocrm-product-' . (int) ($product['id'] ?? 0);
            if ($externalCode === $productCode || $externalCode === $defaultCode || $externalCode === (string) ($product['id'] ?? '')) {
                return $product;
            }
        }
    }

    return storageFindProductByCatalogName((string) ($item['name'] ?? ''), $products, true);
}

function storageBuildLocalItemsFromIfoodOrder(array $order): array
{
    $ifoodItems = is_array($order['items'] ?? null) ? $order['items'] : [];
    if (empty($ifoodItems)) {
        return [];
    }

    $products = storageGetProducts(true);
    $items = [];

    foreach ($ifoodItems as $ifoodItem) {
        if (!is_array($ifoodItem)) {
            continue;
        }

        $product = storageFindProductByIfoodItem($ifoodItem, $products);
        if (!$product) {
            $fallbackPrice = $ifoodItem['unitPrice']['value']
                ?? $ifoodItem['unitPrice']
                ?? $ifoodItem['price']['value']
                ?? $ifoodItem['price']
                ?? $ifoodItem['totalPrice']
                ?? 0;
            $items[] = [
                'id' => 0,
                'name' => (string) ($ifoodItem['name'] ?? 'Item iFood'),
                'quantity' => max(1, (int) round((float) ($ifoodItem['quantity'] ?? 1))),
                'price' => round((float) $fallbackPrice, 2),
                'observation' => storageIfoodItemObservation($ifoodItem),
            ];
            continue;
        }

        $quantity = max(1, (int) round((float) ($ifoodItem['quantity'] ?? 1)));
        $unitPrice = $ifoodItem['unitPrice']['value']
            ?? $ifoodItem['unitPrice']
            ?? $ifoodItem['price']['value']
            ?? $ifoodItem['price']
            ?? storageIfoodPriceForProduct($product);

        $items[] = [
            'id' => (int) ($product['id'] ?? 0),
            'name' => (string) ($product['name'] ?? ($ifoodItem['name'] ?? 'Item iFood')),
            'quantity' => $quantity,
            'price' => round((float) $unitPrice, 2),
            'observation' => storageIfoodItemObservation($ifoodItem),
        ];
    }

    return $items;
}

function storageEnsureLocalOrderForIfoodOrder(array $order): ?int
{
    $ifoodOrderId = trim((string) ($order['id'] ?? ''));
    if ($ifoodOrderId === '') {
        return null;
    }

    $ifoodRow = storageSelectRow("
        SELECT local_order_id
        FROM ifood_orders
        WHERE ifood_order_id = " . storageSqlValue($ifoodOrderId) . "
        LIMIT 1
    ");
    if ($ifoodRow && (int) ($ifoodRow['local_order_id'] ?? 0) > 0) {
        return (int) $ifoodRow['local_order_id'];
    }

    $status = strtoupper(trim((string) ($order['status'] ?? '')));
    if (str_contains($status, 'CANCEL')) {
        return null;
    }

    $items = storageBuildLocalItemsFromIfoodOrder($order);
    if (empty($items)) {
        return null;
    }

    $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
    $phone = is_array($customer['phone'] ?? null) ? $customer['phone'] : [];
    $merchant = is_array($order['merchant'] ?? null) ? $order['merchant'] : [];
    $total = is_array($order['total'] ?? null) ? $order['total'] : [];
    $delivery = is_array($order['delivery'] ?? null) ? $order['delivery'] : [];
    $deliveryAddress = is_array($delivery['deliveryAddress'] ?? null) ? $delivery['deliveryAddress'] : [];
    $addressParts = array_filter([
        $deliveryAddress['streetName'] ?? null,
        $deliveryAddress['streetNumber'] ?? null,
        $deliveryAddress['neighborhood'] ?? null,
        $deliveryAddress['city'] ?? null,
    ]);

    $localOrder = storageSaveOrder([
        'phone' => preg_replace('/\D+/', '', (string) ($customer['phone']['number'] ?? $customer['phone'] ?? '')),
        'customer_name' => (string) ($customer['name'] ?? 'Cliente iFood'),
        'address' => implode(', ', $addressParts),
        'address_line' => (string) ($deliveryAddress['streetName'] ?? ''),
        'address_number' => (string) ($deliveryAddress['streetNumber'] ?? ''),
        'address_complement' => (string) ($deliveryAddress['complement'] ?? ''),
        'cep' => preg_replace('/\D+/', '', (string) ($deliveryAddress['postalCode'] ?? '')) ?: null,
        'delivery_mode' => 'ifood',
        'items' => $items,
        'total' => $total['orderAmount'] ?? $total['subTotal'] ?? 0,
        'delivery_fee' => $total['deliveryFee'] ?? 0,
        'payment_method' => storageNormalizeIfoodPaymentMethod($order),
        'payment_provider' => 'ifood',
        'payment_status' => 'paid',
        'delivery_status' => 'created',
        'external_order_nsu' => 'ifood-' . $ifoodOrderId,
        ...storageIfoodLocalMetadata($order),
        'status' => 'pending',
    ]);

    $localOrderId = (int) ($localOrder['id'] ?? 0);
    if ($localOrderId > 0) {
        storageExec("
            UPDATE ifood_orders
            SET local_order_id = {$localOrderId},
                merchant_id = " . storageSqlValue($merchant['id'] ?? $order['merchantId'] ?? null) . "
            WHERE ifood_order_id = " . storageSqlValue($ifoodOrderId) . "
        ");
    }

    return $localOrderId > 0 ? $localOrderId : null;
}

function storageGetIfoodDashboard(): array
{
    storageEnsureReady();
    $authSettings = storageGetIfoodAuthSettings();
    $orders = storageSelectRows("
        SELECT *
        FROM ifood_orders
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 50
    ");
    $events = storageSelectRows("
        SELECT id, event_code, full_code, order_id, merchant_id, payload, created_at, acked_at, processed_at
        FROM ifood_events
        ORDER BY processed_at DESC, created_at DESC
        LIMIT 80
    ");

    $merchantId = $authSettings['merchant_id'] !== '' ? $authSettings['merchant_id'] : (defined('IFOOD_MERCHANT_ID') ? IFOOD_MERCHANT_ID : '');
    $hasAppCredentials = defined('IFOOD_CLIENT_ID') && IFOOD_CLIENT_ID !== '' && defined('IFOOD_CLIENT_SECRET') && IFOOD_CLIENT_SECRET !== '';
    $hasAuthorization = $authSettings['access_token'] !== '' || $authSettings['refresh_token'] !== '';

    return [
        'configured' => $hasAppCredentials && ($hasAuthorization || $merchantId !== ''),
        'app_configured' => $hasAppCredentials,
        'authorized' => $hasAuthorization,
        'merchant_linked' => $merchantId !== '',
        'merchant_id' => $merchantId,
        'sync_enabled' => $authSettings['sync_enabled'] || (defined('IFOOD_SYNC_ENABLED') && IFOOD_SYNC_ENABLED),
        'catalog_sync_path' => $authSettings['catalog_sync_path'],
        'synced_categories' => storageGetIfoodSyncedCategories(),
        'price_markup_percent' => (float) ($authSettings['price_markup_percent'] ?? 0),
        'auth' => [
            'has_access_token' => $authSettings['access_token'] !== '',
            'has_refresh_token' => $authSettings['refresh_token'] !== '',
            'access_token_expires_at' => $authSettings['access_token_expires_at'],
            'pending_user_code' => $authSettings['pending_user_code'],
            'pending_verification_url' => $authSettings['pending_verification_url'],
            'pending_expires_at' => $authSettings['pending_expires_at'],
        ],
        'catalog' => storageBuildIfoodCatalogPayload(),
        'orders' => $orders,
        'events' => $events,
    ];
}

function storageGetOrderByNsu(string $orderNsu): ?array
{
    storageEnsureReady();
    $orderNsu = trim($orderNsu);
    if ($orderNsu === '') {
        return null;
    }

    return storageSelectRow("
        SELECT *
        FROM orders
        WHERE external_order_nsu = " . storageSqlValue($orderNsu) . "
        LIMIT 1
    ");
}

function storageDeleteOrderByNsu(string $orderNsu): void
{
    storageEnsureReady();
    storageExec("
        DELETE FROM orders
        WHERE external_order_nsu = " . storageSqlValue($orderNsu) . "
    ");
}

function storageInsertOrder(array $order): int
{
    storageEnsureReady();

    $itemsJson = json_encode($order['items'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    storageExec("
        INSERT INTO orders (
            customer_phone,
            address,
            address_line,
            address_number,
            address_complement,
            customer_cep,
            delivery_mode,
            delivery_region,
            delivery_region_key,
            items,
            total,
            delivery_fee,
            payment_method,
            payment_provider,
            payment_status,
            uber_estimate_id,
            uber_quote_expires_at,
            uber_dropoff_eta,
            delivery_status,
            uber_delivery_id,
            uber_order_id,
            uber_tracking_url,
            uber_error_message,
            dispatched_at,
            external_order_nsu,
            print_status,
            requires_age_verification,
            age_verified_at_order,
            customer_cpf_last4,
            ifood_order_id,
            ifood_display_id,
            ifood_delivery_by,
            ifood_pickup_code,
            ifood_delivery_localizer,
            status
        ) VALUES (
            " . storageSqlValue($order['customer_phone'] ?? null) . ",
            " . storageSqlValue($order['address'] ?? null) . ",
            " . storageSqlValue($order['address_line'] ?? null) . ",
            " . storageSqlValue($order['address_number'] ?? null) . ",
            " . storageSqlValue($order['address_complement'] ?? null) . ",
            " . storageSqlValue($order['customer_cep'] ?? null) . ",
            " . storageSqlValue($order['delivery_mode'] ?? 'uber') . ",
            " . storageSqlValue($order['delivery_region'] ?? null) . ",
            " . storageSqlValue($order['delivery_region_key'] ?? null) . ",
            " . storageSqlValue($itemsJson) . ",
            " . storageSqlNumber($order['total'] ?? 0, 2) . ",
            " . storageSqlNumber($order['delivery_fee'] ?? 0, 2) . ",
            " . storageSqlValue($order['payment_method'] ?? null) . ",
            " . storageSqlValue($order['payment_provider'] ?? null) . ",
            " . storageSqlValue($order['payment_status'] ?? 'pending') . ",
            " . storageSqlValue($order['uber_estimate_id'] ?? null) . ",
            " . storageSqlValue(storageNormalizeDateTime($order['uber_quote_expires_at'] ?? null)) . ",
            " . storageSqlValue(storageNormalizeDateTime($order['uber_dropoff_eta'] ?? null)) . ",
            " . storageSqlValue($order['delivery_status'] ?? 'not_requested') . ",
            " . storageSqlValue($order['uber_delivery_id'] ?? null) . ",
            " . storageSqlValue($order['uber_order_id'] ?? null) . ",
            " . storageSqlValue($order['uber_tracking_url'] ?? null) . ",
            " . storageSqlValue($order['uber_error_message'] ?? null) . ",
            " . storageSqlValue(storageNormalizeDateTime($order['dispatched_at'] ?? null)) . ",
            " . storageSqlValue($order['external_order_nsu'] ?? null) . ",
            " . storageSqlValue($order['print_status'] ?? 'pending') . ",
            " . storageSqlValue(!empty($order['requires_age_verification']) ? 1 : 0) . ",
            " . storageSqlValue(storageNormalizeDateTime($order['age_verified_at_order'] ?? null)) . ",
            " . storageSqlValue($order['customer_cpf_last4'] ?? null) . ",
            " . storageSqlValue($order['ifood_order_id'] ?? null) . ",
            " . storageSqlValue($order['ifood_display_id'] ?? null) . ",
            " . storageSqlValue($order['ifood_delivery_by'] ?? null) . ",
            " . storageSqlValue($order['ifood_pickup_code'] ?? null) . ",
            " . storageSqlValue($order['ifood_delivery_localizer'] ?? null) . ",
            " . storageSqlValue($order['status'] ?? 'pending') . "
        )
    ");

    $insertedOrder = storageGetOrderByNsu((string) ($order['external_order_nsu'] ?? ''));
    if (!$insertedOrder) {
        throw new RuntimeException('Order insert could not be confirmed', 500);
    }

    return (int) ($insertedOrder['id'] ?? 0);
}

function storageCreateInfinitePayOrder(array $data, string $orderNsu): int
{
    storageEnsureReady();
    $ageVerifiedSummary = storageCustomerHasVerifiedAge((string) ($data['phone'] ?? ''), (string) ($data['cpf'] ?? '')) ?: [];
    if (!empty($data['age_verified_at_order'])) {
        $ageVerifiedSummary['age_verified_at'] = $data['age_verified_at_order'];
    }
    if (!empty($data['customer_cpf_last4'])) {
        $ageVerifiedSummary['cpf_last4'] = $data['customer_cpf_last4'];
    }
    $ageSnapshot = storageBuildAgeRestrictionSnapshot($data['items'] ?? []);

    storageUpsertCustomer(
        $data['phone'] ?? '',
        $data['customer_name'] ?? 'Cliente',
        $data['address'] ?? ''
    );

    return storageInsertOrder([
        'customer_phone' => storageNormalizePhone((string) ($data['phone'] ?? '')),
        'address' => $data['address'] ?? '',
        'address_line' => $data['address_line'] ?? '',
        'address_number' => $data['address_number'] ?? '',
        'address_complement' => $data['address_complement'] ?? '',
        'customer_cep' => preg_replace('/\D+/', '', (string) ($data['cep'] ?? '')) ?: null,
        'delivery_mode' => $data['delivery_mode'] ?? 'uber',
        'delivery_region' => $data['delivery_region'] ?? null,
        'delivery_region_key' => $data['delivery_region_key'] ?? null,
        'items' => $data['items'] ?? [],
        'total' => $data['total'] ?? 0,
        'delivery_fee' => $data['delivery_fee'] ?? 0,
        'payment_method' => normalizeCaptureMethod((string) ($data['payment_method'] ?? 'pix')),
        'payment_provider' => 'infinitepay',
        'payment_status' => 'pending',
        'uber_estimate_id' => $data['estimate_id'] ?? null,
        'uber_quote_expires_at' => $data['quote_expires_at'] ?? null,
        'uber_dropoff_eta' => $data['dropoff_eta'] ?? null,
        'delivery_status' => 'not_requested',
        'external_order_nsu' => $orderNsu,
        'print_status' => 'pending',
        'requires_age_verification' => !empty($ageSnapshot['requires_age_verification']),
        'age_verified_at_order' => $ageVerifiedSummary['age_verified_at'] ?? null,
        'customer_cpf_last4' => $ageVerifiedSummary['cpf_last4'] ?? null,
        'status' => 'awaiting_payment',
    ]);
}

function storagePersistInfinitePayResult(string $orderNsu, array $paymentData): bool
{
    storageEnsureReady();

    $order = storageGetOrderByNsu($orderNsu);
    if (!$order) {
        return false;
    }

    $slug = $paymentData['slug'] ?? $paymentData['invoice_slug'] ?? null;
    $transactionNsu = $paymentData['transaction_nsu'] ?? null;
    $captureMethod = $paymentData['capture_method'] ?? null;
    $receiptUrl = $paymentData['receipt_url'] ?? null;
    $paid = (bool) ($paymentData['paid'] ?? true);
    $rawPaymentStatus = strtolower(trim((string) ($paymentData['status'] ?? ($paid ? 'paid' : 'pending'))));
    $paymentStatus = $paid
        ? 'paid'
        : ($rawPaymentStatus === 'refused' ? 'refused' : 'pending');
    $orderStatus = $paid ? 'pending' : 'awaiting_payment';
    $printStatus = $paid
        ? (($order['print_status'] ?? '') === 'printed' ? 'printed' : 'pending')
        : (($order['print_status'] ?? '') !== '' ? $order['print_status'] : 'pending');
    $stockAdjusted = false;

    try {
        if ($paid && ($order['payment_status'] ?? '') !== 'paid') {
            $items = json_decode((string) ($order['items'] ?? '[]'), true);
            storageDecrementStockForItems(is_array($items) ? $items : []);
            $stockAdjusted = true;
        }

        storageUpdateOrderByNsu($orderNsu, [
            'status' => $orderStatus,
            'payment_status' => $paymentStatus,
            'payment_method' => normalizeCaptureMethod($captureMethod),
            'payment_provider' => 'infinitepay',
            'infinitepay_slug' => $slug,
            'infinitepay_transaction_nsu' => $transactionNsu,
            'payment_receipt_url' => $receiptUrl,
            'print_status' => $printStatus,
        ]);

        if ($paid && ($order['payment_status'] ?? '') !== 'paid') {
            storageSyncCustomerAddressFromOrder($order);
        }
    } catch (\Throwable $e) {
        if ($stockAdjusted) {
            $items = json_decode((string) ($order['items'] ?? '[]'), true);
            storageIncrementStockForItems(is_array($items) ? $items : []);
        }
        throw $e;
    }

    return true;
}

function storageSaveOrder(array $data): array
{
    storageEnsureReady();

    $requestedNsu = trim((string) ($data['external_order_nsu'] ?? ''));
    if ($requestedNsu !== '') {
        $existingOrder = storageGetOrderByNsu($requestedNsu);
        if ($existingOrder) {
            return [
                'id' => (int) ($existingOrder['id'] ?? 0),
                'order_nsu' => $requestedNsu,
            ];
        }
    }

    $orderNsu = $requestedNsu !== '' ? $requestedNsu : generateOrderNsu();
    $items = $data['items'] ?? [];
    $stockAdjusted = false;
    $ageVerifiedSummary = storageCustomerHasVerifiedAge((string) ($data['phone'] ?? ''), (string) ($data['cpf'] ?? '')) ?: [];
    if (!empty($data['age_verified_at_order'])) {
        $ageVerifiedSummary['age_verified_at'] = $data['age_verified_at_order'];
    }
    if (!empty($data['customer_cpf_last4'])) {
        $ageVerifiedSummary['cpf_last4'] = $data['customer_cpf_last4'];
    }
    $ageSnapshot = storageBuildAgeRestrictionSnapshot($items);

    storageUpsertCustomer(
        $data['phone'] ?? '',
        $data['customer_name'] ?? 'Cliente',
        $data['address'] ?? ''
    );

    try {
        storageDecrementStockForItems($items);
        $stockAdjusted = true;

        $orderId = storageInsertOrder([
            'customer_phone' => storageNormalizePhone((string) ($data['phone'] ?? '')),
            'address' => $data['address'] ?? '',
            'address_line' => $data['address_line'] ?? '',
            'address_number' => $data['address_number'] ?? '',
            'address_complement' => $data['address_complement'] ?? '',
            'customer_cep' => preg_replace('/\D+/', '', (string) ($data['cep'] ?? '')) ?: null,
            'delivery_mode' => $data['delivery_mode'] ?? 'uber',
            'delivery_region' => $data['delivery_region'] ?? null,
            'delivery_region_key' => $data['delivery_region_key'] ?? null,
            'items' => $items,
            'total' => $data['total'] ?? 0,
            'delivery_fee' => $data['delivery_fee'] ?? 0,
            'payment_method' => $data['payment_method'] ?? 'card',
            'payment_provider' => $data['payment_provider'] ?? null,
            'payment_status' => $data['payment_status'] ?? 'pending',
            'uber_estimate_id' => $data['estimate_id'] ?? null,
            'uber_quote_expires_at' => $data['quote_expires_at'] ?? null,
            'uber_dropoff_eta' => $data['dropoff_eta'] ?? null,
            'delivery_status' => $data['delivery_status'] ?? 'not_requested',
            'uber_delivery_id' => $data['uber_delivery_id'] ?? null,
            'uber_order_id' => $data['uber_order_id'] ?? null,
            'uber_tracking_url' => $data['uber_tracking_url'] ?? null,
            'uber_error_message' => $data['uber_error_message'] ?? null,
            'dispatched_at' => $data['dispatched_at'] ?? null,
            'external_order_nsu' => $orderNsu,
            'print_status' => $data['print_status'] ?? 'pending',
            'requires_age_verification' => !empty($ageSnapshot['requires_age_verification']),
            'age_verified_at_order' => $ageVerifiedSummary['age_verified_at'] ?? null,
            'customer_cpf_last4' => $ageVerifiedSummary['cpf_last4'] ?? null,
            'status' => $data['status'] ?? 'pending',
        ]);

        $paidOrder = (($data['payment_status'] ?? 'pending') === 'paid');
        if ($paidOrder) {
            $savedOrder = storageSelectRow("
                SELECT *
                FROM orders
                WHERE id = {$orderId}
                LIMIT 1
            ");
            if ($savedOrder) {
                storageSyncCustomerAddressFromOrder($savedOrder);
            }
        }

        return [
            'id' => $orderId,
            'order_nsu' => $orderNsu,
        ];
    } catch (\Throwable $e) {
        if ($stockAdjusted) {
            storageIncrementStockForItems($items);
        }
        throw $e;
    }
}

function storageMapOrderRow(array $row): array
{
    $row['customer_name'] = trim((string) ($row['customer_name'] ?? '')) !== ''
        ? (string) $row['customer_name']
        : 'Cliente';
    $row['delivery_status'] = (string) ($row['delivery_status'] ?? 'not_requested');
    $row['delivery_mode'] = (string) ($row['delivery_mode'] ?? 'uber');
    $row['delivery_region'] = (string) ($row['delivery_region'] ?? '');
    $row['delivery_region_key'] = (string) ($row['delivery_region_key'] ?? '');
    $row['print_status'] = (string) ($row['print_status'] ?? 'pending');
    $row['payment_status'] = (string) ($row['payment_status'] ?? 'pending');
    $row['status'] = (string) ($row['status'] ?? 'pending');
    $row['uber_error_message'] = (string) ($row['uber_error_message'] ?? '');
    $row['uber_courier_name'] = (string) ($row['uber_courier_name'] ?? '');
    $row['uber_courier_phone'] = (string) ($row['uber_courier_phone'] ?? '');
    $row['uber_courier_pin'] = (string) ($row['uber_courier_pin'] ?? '');
    $row['uber_courier_vehicle'] = (string) ($row['uber_courier_vehicle'] ?? '');
    $row['uber_courier_plate'] = (string) ($row['uber_courier_plate'] ?? '');
    $row['requires_age_verification'] = !empty($row['requires_age_verification']);
    $row['customer_cpf_last4'] = (string) ($row['customer_cpf_last4'] ?? '');
    $row['ifood_order_id'] = (string) ($row['ifood_order_id'] ?? '');
    $row['ifood_display_id'] = (string) ($row['ifood_display_id'] ?? '');
    $row['ifood_delivery_by'] = (string) ($row['ifood_delivery_by'] ?? '');
    $row['ifood_pickup_code'] = (string) ($row['ifood_pickup_code'] ?? '');
    $row['ifood_delivery_localizer'] = (string) ($row['ifood_delivery_localizer'] ?? '');
    $row['items_count'] = 0;
    $row['items_preview'] = '';

    $rawItems = $row['items'] ?? [];
    $items = is_array($rawItems) ? $rawItems : json_decode((string) $rawItems, true);
    if (is_array($items)) {
        $previewParts = [];
        foreach ($items as $item) {
            $quantity = max(0, (int) ($item['quantity'] ?? 0));
            $name = trim((string) ($item['name'] ?? 'Item'));
            if ($quantity <= 0 || $name === '') {
                continue;
            }
            $row['items_count'] += $quantity;
            $previewParts[] = $quantity . 'x ' . $name;
        }
        $row['items_preview'] = implode(', ', array_slice($previewParts, 0, 3));
    }

    $ifoodPayload = json_decode((string) ($row['ifood_payload'] ?? ''), true);
    if (is_array($ifoodPayload)) {
        $row['ifood_details'] = storageIfoodOrderDisplayDetails($ifoodPayload);
    }
    unset($row['ifood_payload']);

    return $row;
}

function storageIfoodScalar($value): string
{
    if (is_scalar($value) || $value === null) {
        return trim((string) $value);
    }
    return '';
}

function storageIfoodMoneyValue($value): float
{
    if (is_array($value)) {
        $value = $value['value'] ?? $value['amount'] ?? 0;
    }
    return round((float) $value, 2);
}

function storageIfoodItemObservation(array $item): string
{
    foreach (['observations', 'observation', 'note', 'comments'] as $key) {
        $value = storageIfoodScalar($item[$key] ?? '');
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

function storageIfoodOrderDisplayDetails(array $order): array
{
    $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
    $delivery = is_array($order['delivery'] ?? null) ? $order['delivery'] : [];
    $payments = is_array($order['payments'] ?? null) ? $order['payments'] : [];
    $paymentMethods = is_array($payments['methods'] ?? null) ? $payments['methods'] : [];
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $benefits = is_array($order['benefits'] ?? null) ? $order['benefits'] : [];

    $methodSummaries = [];
    foreach ($paymentMethods as $method) {
        if (!is_array($method)) {
            continue;
        }
        $card = is_array($method['card'] ?? null) ? $method['card'] : [];
        $methodSummaries[] = trim(implode(' ', array_filter([
            storageIfoodScalar($method['method'] ?? $method['type'] ?? 'Pagamento'),
            storageIfoodScalar($method['brand'] ?? $card['brand'] ?? ''),
        ])));
    }

    $itemObservations = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $observation = storageIfoodItemObservation($item);
        if ($observation !== '') {
            $itemObservations[] = trim(storageIfoodScalar($item['name'] ?? 'Item') . ': ' . $observation);
        }
    }

    $benefitSummaries = [];
    foreach ($benefits as $benefit) {
        if (!is_array($benefit)) {
            continue;
        }
        $sponsors = [];
        $sponsorshipValues = is_array($benefit['sponsorshipValues'] ?? null) ? $benefit['sponsorshipValues'] : [];
        foreach ($sponsorshipValues as $sponsor) {
            if (is_array($sponsor)) {
                $label = storageIfoodScalar($sponsor['name'] ?? $sponsor['responsible'] ?? $sponsor['sponsor'] ?? '');
                if ($label !== '') {
                    $sponsors[] = $label;
                }
            }
        }
        $amount = storageIfoodMoneyValue($benefit['value'] ?? $benefit['amount'] ?? 0);
        $benefitSummaries[] = trim((storageIfoodScalar($benefit['target'] ?? $benefit['type'] ?? 'Cupom')) . ' ' . moneyFormatForStorage($amount) . (!empty($sponsors) ? ' resp. ' . implode(', ', array_unique($sponsors)) : ''));
    }

    return [
        'order_type' => storageIfoodScalar($order['orderType'] ?? ''),
        'order_timing' => storageIfoodScalar($order['orderTiming'] ?? ''),
        'delivered_by' => storageIfoodScalar($delivery['deliveredBy'] ?? ''),
        'document' => storageIfoodScalar($customer['documentNumber'] ?? $customer['document'] ?? $order['documentNumber'] ?? ''),
        'pickup_code' => preg_replace('/\D+/', '', storageIfoodScalar($delivery['pickupCode'] ?? '')),
        'delivery_localizer' => preg_replace('/\D+/', '', storageIfoodScalar((is_array($customer['phone'] ?? null) ? $customer['phone']['localizer'] ?? '' : ''))),
        'delivery_observations' => storageIfoodScalar($delivery['observations'] ?? $delivery['observation'] ?? $delivery['instructions'] ?? ''),
        'payment_methods' => array_values(array_filter($methodSummaries)),
        'cash_change_for' => storageIfoodMoneyValue($cash['changeFor'] ?? $payments['changeFor'] ?? 0),
        'benefits' => array_values(array_filter($benefitSummaries)),
        'item_observations' => array_values(array_filter($itemObservations)),
    ];
}

function moneyFormatForStorage(float $value): string
{
    return 'R$ ' . number_format($value, 2, ',', '.');
}

function storageClassifyOperationalBucket(array $order): string
{
    $paymentStatus = (string) ($order['payment_status'] ?? 'pending');
    $status = (string) ($order['status'] ?? 'pending');
    $printStatus = (string) ($order['print_status'] ?? 'pending');
    $deliveryStatus = (string) ($order['delivery_status'] ?? 'not_requested');

    if ($paymentStatus !== 'paid' || $status === 'awaiting_payment') {
        return 'hidden';
    }

    if (strtolower(trim((string) ($order['delivery_mode'] ?? 'uber'))) === 'pdv') {
        return 'completed';
    }

    if ($status === 'cancelled') {
        return 'attention';
    }

    if ($deliveryStatus === 'failed') {
        return 'attention';
    }

    if ($printStatus !== 'printed') {
        return 'to_print';
    }

    if ($status === 'delivered' || $deliveryStatus === 'delivered') {
        return 'completed';
    }

    if ($status === 'shipped' || $deliveryStatus === 'in_transit') {
        return 'in_route';
    }

    return 'preparing';
}

function storageBuildOperationalQueues(array $orders): array
{
    $queues = [
        'to_print' => 0,
        'preparing' => 0,
        'in_route' => 0,
        'completed' => 0,
        'attention' => 0,
    ];

    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }

        $bucket = storageClassifyOperationalBucket($order);
        if (array_key_exists($bucket, $queues)) {
            $queues[$bucket] += 1;
        }
    }

    return $queues;
}

function storageGetStats(): array
{
    storageEnsureReady();

    $stats = storageSelectRow("
        SELECT
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') THEN 1 ELSE 0 END), 0) AS total_orders,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND COALESCE(delivery_mode, 'uber') = 'uber' THEN delivery_fee ELSE 0 END), 0) AS uber_costs,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND COALESCE(delivery_mode, 'uber') = 'private' THEN delivery_fee ELSE 0 END), 0) AS private_delivery_costs,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND payment_provider = 'ifood' THEN ifood_additional_fee ELSE 0 END), 0) AS ifood_fixed_fee_total,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND payment_provider = 'ifood' AND ifood_delivery_by_resolved = 'IFOOD' THEN ifood_delivery_fee ELSE 0 END), 0) AS ifood_delivery_fee_total,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND payment_provider = 'ifood' THEN ifood_additional_fee ELSE 0 END), 0)
                + COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'awaiting_payment') AND payment_provider = 'ifood' AND ifood_delivery_by_resolved = 'IFOOD' THEN ifood_delivery_fee ELSE 0 END), 0) AS ifood_fee_total,
            COALESCE(SUM(CASE WHEN payment_method = 'pix' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pix_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'infinitepay' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS infinitepay_total,
            COALESCE(SUM(CASE WHEN payment_method IN ('card', 'credit_card') AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS credit_card_total,
            COALESCE(SUM(CASE WHEN payment_method = 'debit_card' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS debit_card_total,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS cash_total,
            COALESCE(SUM(CASE WHEN payment_method IN ('card', 'credit_card', 'debit_card') AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS card_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'pdv' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pdv_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'pdv' AND payment_method = 'pix' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pdv_pix_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'pdv' AND payment_method = 'debit_card' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pdv_debit_card_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'pdv' AND payment_method IN ('card', 'credit_card') AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pdv_credit_card_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'pdv' AND payment_method = 'cash' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS pdv_cash_total,
            COALESCE(SUM(CASE WHEN payment_provider = 'ifood' AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS ifood_total,
            COALESCE(SUM(CASE WHEN COALESCE(payment_provider, '') NOT IN ('pdv', 'ifood') AND status NOT IN ('cancelled', 'awaiting_payment') THEN total ELSE 0 END), 0) AS site_app_total,
            COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_count,
            COALESCE(SUM(CASE WHEN status = 'awaiting_payment' THEN 1 ELSE 0 END), 0) AS awaiting_payment_count,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' AND status != 'cancelled' AND (print_status IS NULL OR print_status != 'printed') THEN 1 ELSE 0 END), 0) AS print_pending_count
        FROM (
            SELECT
                o.*,
                COALESCE(NULLIF(io.payload::jsonb->'total'->>'additionalFees', '')::numeric, 0) AS ifood_additional_fee,
                COALESCE(NULLIF(io.payload::jsonb->'total'->>'deliveryFee', '')::numeric, o.delivery_fee, 0) AS ifood_delivery_fee,
                UPPER(COALESCE(NULLIF(o.ifood_delivery_by, ''), io.payload::jsonb->'delivery'->>'deliveredBy', '')) AS ifood_delivery_by_resolved
            FROM orders o
            LEFT JOIN ifood_orders io ON io.local_order_id = o.id
        ) orders
    ") ?: [];

    $productRow = storageSelectRow("SELECT COUNT(*) AS prod_count FROM products") ?: [];
    $stats['products_count'] = (int) ($productRow['prod_count'] ?? 0);

    return $stats;
}

function storageGetLogistics(): array
{
    storageEnsureReady();
    $rows = storageSelectRows("
        SELECT id, status, address, delivery_fee, uber_estimate_id, delivery_status, uber_delivery_id, uber_order_id, uber_tracking_url, uber_courier_name, uber_courier_phone, uber_courier_pin, uber_courier_vehicle, uber_courier_plate, uber_error_message, dispatched_at, created_at
        FROM orders
        WHERE uber_estimate_id IS NOT NULL OR uber_delivery_id IS NOT NULL
        ORDER BY id DESC
        LIMIT 10
    ");

    return array_map('storageMapOrderRow', $rows);
}

function storageGetOrders(): array
{
    storageEnsureReady();
    $rows = storageSelectRows("
        SELECT o.*, c.name AS customer_name, io.payload AS ifood_payload
        FROM orders o
        LEFT JOIN customers c ON o.customer_phone = c.phone
        LEFT JOIN ifood_orders io ON io.local_order_id = o.id
        WHERE o.payment_status = 'paid'
        ORDER BY o.id DESC
    ");

    return array_map('storageMapOrderRow', $rows);
}

function storageUpdateOrderStatus(int $id, string $status): void
{
    storageEnsureReady();
    $status = trim($status) !== '' ? trim($status) : 'pending';
    $order = storageGetOrderById($id);
    if (!$order) {
        throw new RuntimeException('Pedido nao encontrado.', 404);
    }

    $updates = ['status' => $status];

    if ($status === 'shipped') {
        $updates['delivery_status'] = 'in_transit';
    } elseif ($status === 'delivered') {
        $updates['delivery_status'] = 'delivered';
    } elseif ($status === 'pending' && ($order['print_status'] ?? 'pending') !== 'printed') {
        $updates['delivery_status'] = 'not_requested';
    }

    storageUpdateOrderById($id, $updates);
}

function storageMarkOrderPrinted(int $id): ?array
{
    storageEnsureReady();
    $order = storageGetOrderById($id);
    if (!$order) {
        throw new RuntimeException('Pedido nao encontrado.', 404);
    }

    if (($order['payment_status'] ?? 'pending') !== 'paid') {
        throw new RuntimeException('A impressao so pode ser feita em pedidos com pagamento aprovado.', 409);
    }

    if (($order['print_status'] ?? '') === 'printed') {
        return storageGetOrderDetailsById($id);
    }

    $deliveryMode = strtolower(trim((string) ($order['delivery_mode'] ?? 'uber')));
    $nextDeliveryStatus = $deliveryMode === 'ifood'
        ? 'created'
        : (($deliveryMode === 'pdv') ? 'delivered' : 'not_requested');

    return storageUpdateOrderById($id, [
        'status' => ($order['status'] ?? '') === 'cancelled' ? 'cancelled' : 'preparing',
        'print_status' => 'printed',
        'printed_at' => ['raw' => 'CURRENT_TIMESTAMP'],
        'delivery_status' => $nextDeliveryStatus,
        'dispatched_at' => $deliveryMode === 'ifood' ? ($order['dispatched_at'] ?? null) : null,
    ]);
}

function storageGetCustomerOrders(string $phone): array
{
    storageEnsureReady();
    $phone = storageNormalizePhone($phone);
    if ($phone === '') {
        return [];
    }

    $rows = storageSelectRows("
        SELECT *
        FROM orders
        WHERE customer_phone = " . storageSqlValue($phone) . "
        ORDER BY id DESC
    ");

    return array_map('storageMapOrderRow', $rows);
}

function storageDeleteCustomerData(string $phone): void
{
    storageEnsureReady();
    $sqlPhone = storageSqlValue(storageNormalizePhone($phone));
    
    // 1. Remover endereços
    storageExec("DELETE FROM customer_addresses WHERE customer_phone = $sqlPhone");
    
    // 2. Remover eventos de verificação
    storageExec("DELETE FROM age_verification_events WHERE customer_phone = $sqlPhone");
    
    // 3. Anonimizar pedidos (desvincular o telefone mas manter o histórico financeiro/contábil)
    storageExec("UPDATE orders SET customer_phone = NULL WHERE customer_phone = $sqlPhone");
    
    // 4. Remover o cliente
    storageExec("DELETE FROM customers WHERE phone = $sqlPhone");
}
