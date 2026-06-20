<?php
require_once 'config.php';
define('API_DEBUG_MODE', envFlag('API_DEBUG_MODE', false));


function sendApiCorsHeaders(): void
{
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
    header('Content-Type: application/json');

    $origin = normalizeOriginUrl((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    
    // Log para depuracao de Origin no servidor (ajuda a descobrir se o app envia algo diferente)
    if (defined('API_DEBUG_MODE') && API_DEBUG_MODE) {
        @file_put_contents(__DIR__ . '/debug_api.log', "[" . date('Y-m-d H:i:s') . "] Method: " . $_SERVER['REQUEST_METHOD'] . " | Action: " . ($_GET['action'] ?? 'none') . " | Origin: " . $origin . "\n", FILE_APPEND);
    }

    if ($origin !== '' && in_array($origin, getAllowedApiOrigins(), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    } else if ($origin === '') {
        // Para chamadas que nao enviam Origin (como browsers antigos ou scripts diretos)
        // mas em dispositivos moveis o Origin e obrigatorio se o dominio for diferente
    }
}


function configureApiSessionCookie(): void
{
    $cookieSecure = !isLocalAppHost(API_BASE_URL);
    $sameSite = $cookieSecure ? 'None' : 'Lax';

    session_name('gelocrm_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $cookieSecure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);
}

sendApiCorsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    configureApiSessionCookie();
    session_start();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

function adminSessionPayload(): array
{
    $authenticated = !empty($_SESSION['gelocrm_admin_authenticated']);

    return [
        'authenticated' => $authenticated,
        'username' => $authenticated ? (string) ($_SESSION['gelocrm_admin_username'] ?? ADMIN_PANEL_USERNAME) : null,
        'display_name' => $authenticated ? (string) ($_SESSION['gelocrm_admin_display_name'] ?? ADMIN_PANEL_DISPLAY_NAME) : null,
    ];
}

function isAdminAuthenticated(): bool
{
    return !empty($_SESSION['gelocrm_admin_authenticated']);
}

function customerSessionPayload(): array
{
    $phone = storageNormalizePhone((string) ($_SESSION['gelocrm_customer_phone'] ?? ''));
    return [
        'authenticated' => $phone !== '',
        'phone' => $phone !== '' ? $phone : null,
    ];
}

function isCustomerAuthenticated(?string $phone = null): bool
{
    $sessionPhone = storageNormalizePhone((string) ($_SESSION['gelocrm_customer_phone'] ?? ''));
    if ($sessionPhone === '') {
        return false;
    }

    if ($phone === null) {
        return true;
    }

    return hash_equals($sessionPhone, storageNormalizePhone($phone));
}

function requireCustomerAuth(?string $phone = null): string
{
    $sessionPhone = storageNormalizePhone((string) ($_SESSION['gelocrm_customer_phone'] ?? ''));
    if ($sessionPhone === '' || ($phone !== null && !hash_equals($sessionPhone, storageNormalizePhone($phone)))) {
        jsonResponse([
            'error' => 'Unauthorized',
            'details' => ['message' => 'Faca login com sua senha para acessar sua conta.'],
        ], 401);
    }

    return $sessionPhone;
}

function adminPasswordMatches(string $password): bool
{
    if (ADMIN_PANEL_PASSWORD_HASH !== '') {
        return password_verify($password, ADMIN_PANEL_PASSWORD_HASH);
    }

    return hash_equals((string) ADMIN_PANEL_PASSWORD, $password);
}

function requireAdminAuth(): void
{
    if (!isAdminAuthenticated()) {
        jsonResponse([
            'error' => 'Unauthorized',
            'details' => ['message' => 'Faca login no painel para continuar.'],
        ], 401);
    }
}

function actionRequiresAdminAuth(string $action): bool
{
    return in_array($action, [
        'save_product',
        'toggle_product_store',
        'toggle_product_ifood',
        'bulk_product_action',
        'delete_product',
        'get_product_categories',
        'save_product_category',
        'delete_product_category',
        'upload_product_image',
        'list_product_images',
        'get_stats',
        'get_admin_snapshot',
        'admin_events',
        'update_store_settings',
        'get_logistics',
        'get_orders',
        'update_order_status',
        'mark_order_printed',
        'dispatch_order',
        'retry_uber_dispatch',
        'get_stock',
        'import_catalog_text',
        'import_catalog_zip',
        'export_catalog_text',
        'export_catalog_zip',
        'bulk_increment_stock',
        'adjust_stock',
        'get_promotions',
        'save_promotion',
        'delete_promotion',
        'save_product_flavor',
        'delete_product_flavor',
        'get_product_flavors',
        'get_ifood_catalog',
        'get_ifood_remote_catalog_status',
        'get_ifood_sync_progress',
        'sync_ifood_catalog',
        'get_ifood_dashboard',
        'ifood_authorization_start',
        'ifood_authorization_finish',
        'ifood_save_settings',
        'ifood_discovery',
        'ifood_merchants',
        'ifood_merchant_details',
        'ifood_merchant_status',
        'ifood_opening_hours',
        'ifood_interruptions',
        'ifood_create_interruption',
        'ifood_delete_interruption',
        'ifood_poll_events',
        'ifood_order_details',
        'ifood_order_cancellation_reasons',
        'ifood_order_tracking',
        'ifood_order_action',
        'ifood_dispute_action',
    ], true);
}

function jsonResponse(array $payload, int $status = 200): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function sseResponseHeaders(): void
{
    header_remove('Content-Type');
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
}

function sseSend(string $event, array $payload, ?string $id = null): void
{
    if ($id !== null && $id !== '') {
        echo 'id: ' . str_replace(["\r", "\n"], '', $id) . "\n";
    }
    echo 'event: ' . str_replace(["\r", "\n"], '', $event) . "\n";
    echo 'data: ' . json_encode($payload) . "\n\n";
    @ob_flush();
    flush();
}

function apiAdminRealtimeState(): array
{
    $orders = storageGetOrders();
    $products = storageGetProducts();
    $stats = storageGetStats();

    $latestOrderId = 0;
    $pendingPrintIds = [];
    foreach ($orders as $order) {
        $orderId = (int) ($order['id'] ?? 0);
        $latestOrderId = max($latestOrderId, $orderId);
        if (($order['payment_status'] ?? '') === 'paid' && ($order['print_status'] ?? '') !== 'printed' && ($order['status'] ?? '') !== 'cancelled') {
            $pendingPrintIds[] = $orderId;
        }
    }

    $productSignature = array_map(static fn (array $product): array => [
        (int) ($product['id'] ?? 0),
        (string) ($product['category'] ?? ''),
        (string) ($product['barcode'] ?? ''),
        (bool) ($product['store_enabled'] ?? true),
        (bool) ($product['ifood_enabled'] ?? false),
        (int) ($product['stock_quantity'] ?? 0),
        (int) ($product['reserved_stock'] ?? 0),
    ], $products);

    $storeSettings = storageGetStoreSettings();

    return [
        'generated_at' => gmdate('c'),
        'signature' => sha1(json_encode([
            'latest_order_id' => $latestOrderId,
            'pending_print_ids' => $pendingPrintIds,
            'products' => $productSignature,
            'stats' => $stats,
        ])),
        'latest_order_id' => $latestOrderId,
        'pending_print_count' => count($pendingPrintIds),
        'pending_print_ids' => $pendingPrintIds,
        'orders_count' => count($orders),
        'products_count' => count($products),
        'store_is_open_now' => storageIsStoreOpenNow($storeSettings),
    ];
}

function streamAdminEvents(): void
{
    if (!isAdminAuthenticated()) {
        jsonResponse([
            'error' => 'Unauthorized',
            'details' => ['message' => 'Faca login no painel para continuar.'],
        ], 401);
    }

    if (!ADMIN_EVENTS_ENABLED) {
        http_response_code(204);
        exit;
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    @set_time_limit(0);
    ignore_user_abort(true);
    sseResponseHeaders();

    $lastSignature = '';
    $startedAt = time();
    $maxRuntimeSeconds = 55;

    for ($tick = 0; time() - $startedAt < $maxRuntimeSeconds; $tick += 1) {
        if (connection_aborted()) {
            break;
        }

        try {
            $state = apiAdminRealtimeState();
            if ($lastSignature === '' || $state['signature'] !== $lastSignature) {
                $lastSignature = $state['signature'];
                sseSend('admin.snapshot.changed', $state, $state['signature']);
            } elseif ($tick % 5 === 0) {
                sseSend('admin.heartbeat', [
                    'generated_at' => gmdate('c'),
                    'signature' => $lastSignature,
                ]);
            }
        } catch (\Throwable $e) {
            sseSend('admin.error', [
                'message' => $e->getMessage(),
            ]);
        }

        sleep(3);
    }

    sseSend('admin.reconnect', ['retry' => true, 'generated_at' => gmdate('c')]);
    exit;
}

function apiCacheDirectory(): string
{
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'api-cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }

    return $dir;
}

function apiCacheTagFile(string $tag): string
{
    $safeTag = preg_replace('/[^a-z0-9_-]/i', '-', strtolower(trim($tag))) ?: 'default';
    return apiCacheDirectory() . DIRECTORY_SEPARATOR . 'tag-' . $safeTag . '.version';
}

function apiCacheTagVersion(string $tag): int
{
    $file = apiCacheTagFile($tag);
    if (!is_file($file)) {
        @file_put_contents($file, (string) time());
    }

    $version = (int) trim((string) @file_get_contents($file));
    if ($version <= 0) {
        $version = time();
        @file_put_contents($file, (string) $version);
    }

    return $version;
}

function apiInvalidateCacheTags(array $tags): void
{
    $version = (string) (int) round(microtime(true) * 1000000);
    foreach ($tags as $tag) {
        @file_put_contents(apiCacheTagFile((string) $tag), $version);
    }
}

function apiCacheFile(string $key): string
{
    return apiCacheDirectory() . DIRECTORY_SEPARATOR . sha1($key) . '.json';
}

function apiReadCachedPayload(string $namespace, array $tags, int $ttlSeconds): ?array
{
    if ($ttlSeconds <= 0) {
        return null;
    }

    $keyParts = [$namespace];
    foreach ($tags as $tag) {
        $keyParts[] = (string) $tag . ':' . apiCacheTagVersion((string) $tag);
    }

    $cacheFile = apiCacheFile(implode('|', $keyParts));
    if (!is_file($cacheFile)) {
        return null;
    }

    if ((time() - (int) @filemtime($cacheFile)) > $ttlSeconds) {
        return null;
    }

    $payload = json_decode((string) @file_get_contents($cacheFile), true);
    return is_array($payload) ? $payload : null;
}

function apiWriteCachedPayload(string $namespace, array $tags, array $payload): void
{
    $keyParts = [$namespace];
    foreach ($tags as $tag) {
        $keyParts[] = (string) $tag . ':' . apiCacheTagVersion((string) $tag);
    }

    @file_put_contents(apiCacheFile(implode('|', $keyParts)), json_encode($payload));
}

function jsonCachedResponse(string $namespace, array $tags, int $ttlSeconds, callable $resolver): void
{
    $cached = apiReadCachedPayload($namespace, $tags, $ttlSeconds);
    if (is_array($cached)) {
        jsonResponse($cached);
    }

    $payload = $resolver();
    apiWriteCachedPayload($namespace, $tags, $payload);
    jsonResponse($payload);
}

function binaryResponse(string $content, string $contentType = 'application/octet-stream', ?string $downloadName = null): void
{
    header_remove('Content-Type');
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . strlen($content));
    if ($downloadName) {
        header('Content-Disposition: inline; filename="' . addslashes($downloadName) . '"');
    }
    echo $content;
    exit;
}

function readJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function exceptionStatus(\Throwable $e, int $fallback = 500): int
{
    $status = (int) $e->getCode();
    return $status >= 400 && $status <= 599 ? $status : $fallback;
}

function jsonException(string $error, \Throwable $e, int $fallback = 500): void
{
    jsonResponse([
        'error' => $error,
        'details' => ['message' => $e->getMessage()],
    ], exceptionStatus($e, $fallback));
}

function curlRequest(string $url, string $httpMethod = 'GET', $body = null, array $headers = [], bool $formEncoded = false): array
{
    if (!function_exists('curl_init')) {
        return ['status' => 500, 'error' => 'PHP cURL extension is not enabled'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    applyCurlSslOptions($ch);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    $requestMethod = strtoupper($httpMethod);
    if ($requestMethod !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $requestMethod);
    }

    if ($body !== null) {
        if ($formEncoded) {
            $payload = is_array($body) ? http_build_query($body) : (string) $body;
        } else {
            $payload = is_array($body) ? json_encode($body) : (string) $body;
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'status' => 500,
            'error' => $error,
        ];
    }

    curl_close($ch);

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        $decoded = ['raw' => $response];
    }

    return [
        'status' => $status,
        'data' => $decoded,
    ];
}

function curlBinaryRequest(string $url): array
{
    if (!function_exists('curl_init')) {
        return ['status' => 500, 'error' => 'PHP cURL extension is not enabled'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    applyCurlSslOptions($ch);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: image/png,image/jpeg,image/jpg,*/*;q=0.8',
    ]);

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['status' => 500, 'error' => $error];
    }
    curl_close($ch);

    return [
        'status' => $status,
        'body' => substr((string) $response, $headerSize),
        'content_type' => $contentType,
    ];
}

function ifoodTokenRequestWithBody(array $tokenBody): array
{
    $response = ifoodRequestWithBackoff('auth', static fn (): array => curlRequest(
        IFOOD_API_BASE_URL . '/authentication/v1.0/oauth/token',
        'POST',
        $tokenBody,
        ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
        true
    ));

    $status = (int) ($response['status'] ?? 500);
    $payload = is_array($response['data'] ?? null) ? $response['data'] : [];
    $token = (string) ($payload['accessToken'] ?? $payload['access_token'] ?? '');
    if ($status < 200 || $status >= 300 || $token === '') {
        throw new RuntimeException('Falha ao autenticar no iFood: ' . (string) ($payload['message'] ?? $payload['raw'] ?? 'sem detalhes'), $status ?: 502);
    }

    $expiresIn = max(60, (int) ($payload['expiresIn'] ?? $payload['expires_in'] ?? 3600));
    storageUpdateIfoodAuthSettings([
        'access_token' => $token,
        'refresh_token' => (string) ($payload['refreshToken'] ?? $payload['refresh_token'] ?? storageGetIfoodAuthSettings()['refresh_token'] ?? ''),
        'access_token_expires_at' => gmdate('Y-m-d H:i:s', time() + $expiresIn - 60),
    ]);

    return $payload;
}

function ifoodRateLimitBucket(string $path, string $method = 'GET'): string
{
    $normalizedPath = strtolower(ltrim($path, '/'));
    $normalizedMethod = strtoupper($method);

    if (str_contains($normalizedPath, 'catalog/')) {
        return $normalizedMethod === 'GET' ? 'catalog_read' : 'catalog_write';
    }

    if (str_contains($normalizedPath, 'order/') || str_contains($normalizedPath, 'events/')) {
        return $normalizedMethod === 'GET' ? 'order_read' : 'order_write';
    }

    if (str_contains($normalizedPath, 'merchant/')) {
        return $normalizedMethod === 'GET' ? 'merchant_read' : 'merchant_write';
    }

    return 'ifood_general';
}

function ifoodRateLimitIntervalMs(string $bucket): int
{
    return match ($bucket) {
        'auth' => 3200,
        'catalog_write' => 900,
        'merchant_write' => 500,
        'order_write' => 250,
        'catalog_read', 'merchant_read' => 200,
        default => 150,
    };
}

function ifoodRateLimitFile(string $bucket): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'gelocrm_ifood_rate_' . preg_replace('/[^a-z0-9_\-]/i', '_', $bucket) . '.lock';
}

function ifoodSleepMs(int $milliseconds): void
{
    if ($milliseconds > 0) {
        usleep($milliseconds * 1000);
    }
}

function ifoodRunRateLimited(string $bucket, callable $request): array
{
    $file = ifoodRateLimitFile($bucket);
    $handle = @fopen($file, 'c+');
    if (!$handle) {
        return $request();
    }

    try {
        flock($handle, LOCK_EX);
        rewind($handle);
        $lastRun = (float) trim((string) stream_get_contents($handle));
        $now = microtime(true);
        $elapsedMs = $lastRun > 0 ? (int) (($now - $lastRun) * 1000) : PHP_INT_MAX;
        $waitMs = ifoodRateLimitIntervalMs($bucket) - $elapsedMs;
        if ($waitMs > 0) {
            ifoodSleepMs($waitMs);
        }

        $response = $request();

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, (string) microtime(true));
        fflush($handle);

        return $response;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function ifoodShouldRetryResponse(array $response): bool
{
    $status = (int) ($response['status'] ?? 500);
    if ($status === 429 || in_array($status, [408, 500, 502, 503, 504], true)) {
        return true;
    }

    return !empty($response['error']);
}

function ifoodRequestWithBackoff(string $bucket, callable $request, int $maxAttempts = 4): array
{
    $lastResponse = ['status' => 500, 'error' => 'iFood request not executed'];

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt += 1) {
        $lastResponse = ifoodRunRateLimited($bucket, $request);
        if (!ifoodShouldRetryResponse($lastResponse) || $attempt >= $maxAttempts) {
            return $lastResponse;
        }

        $status = (int) ($lastResponse['status'] ?? 500);
        $baseDelayMs = $status === 429 ? 1200 : 500;
        $delayMs = min(8000, $baseDelayMs * (2 ** ($attempt - 1))) + random_int(100, 450);
        ifoodSleepMs($delayMs);
    }

    return $lastResponse;
}

function ifoodTokenRequest(): string
{
    if (IFOOD_CLIENT_ID === '' || IFOOD_CLIENT_SECRET === '') {
        throw new RuntimeException('Credenciais do iFood nao configuradas.', 422);
    }

    $settings = storageGetIfoodAuthSettings();
    if ($settings['access_token'] !== '' && $settings['access_token_expires_at'] !== '' && strtotime($settings['access_token_expires_at'] . ' UTC') > time() + 60) {
        return $settings['access_token'];
    }

    $grantType = strtolower(trim(IFOOD_AUTH_GRANT_TYPE ?: 'client_credentials'));
    if ($grantType === 'authorization_code' && IFOOD_AUTHORIZATION_CODE === '' && IFOOD_AUTHORIZATION_CODE_VERIFIER === '') {
        $grantType = ($settings['refresh_token'] !== '' || IFOOD_REFRESH_TOKEN !== '') ? 'refresh_token' : 'client_credentials';
    }
    $tokenBody = [
        'grantType' => $grantType,
        'clientId' => IFOOD_CLIENT_ID,
        'clientSecret' => IFOOD_CLIENT_SECRET,
    ];

    if ($grantType === 'authorization_code') {
        if (IFOOD_AUTHORIZATION_CODE === '' || IFOOD_AUTHORIZATION_CODE_VERIFIER === '') {
            throw new RuntimeException('IFOOD_AUTHORIZATION_CODE e IFOOD_AUTHORIZATION_CODE_VERIFIER sao obrigatorios para o fluxo authorization_code.', 422);
        }
        $tokenBody['authorizationCode'] = IFOOD_AUTHORIZATION_CODE;
        $tokenBody['authorizationCodeVerifier'] = IFOOD_AUTHORIZATION_CODE_VERIFIER;
    } elseif ($grantType === 'refresh_token') {
        $refreshToken = $settings['refresh_token'] !== '' ? $settings['refresh_token'] : IFOOD_REFRESH_TOKEN;
        if ($refreshToken === '') {
            throw new RuntimeException('IFOOD_REFRESH_TOKEN e obrigatorio para o fluxo refresh_token.', 422);
        }
        $tokenBody['refreshToken'] = $refreshToken;
    } elseif ($grantType !== 'client_credentials') {
        throw new RuntimeException('IFOOD_AUTH_GRANT_TYPE invalido.', 422);
    }

    $payload = ifoodTokenRequestWithBody($tokenBody);
    return (string) ($payload['accessToken'] ?? $payload['access_token'] ?? '');
}

function ifoodApiRequest(string $path, string $method = 'GET', ?array $body = null, array $extraHeaders = []): array
{
    $token = ifoodTokenRequest();
    $headers = array_merge([
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
    ], $extraHeaders);

    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }

    $bucket = ifoodRateLimitBucket($path, $method);
    $response = ifoodRequestWithBackoff($bucket, static fn (): array => curlRequest(
        IFOOD_API_BASE_URL . '/' . ltrim($path, '/'),
        $method,
        $body,
        $headers
    ));

    $status = (int) ($response['status'] ?? 500);
    if ($status === 204) {
        return ['status' => 204, 'data' => null];
    }

    if ($status < 200 || $status >= 300) {
        $payload = is_array($response['data'] ?? null) ? $response['data'] : [];
        throw new RuntimeException(ifoodApiErrorMessage($status, $payload), $status ?: 502);
    }

    return [
        'status' => $status,
        'data' => $response['data'] ?? null,
    ];
}

function ifoodApiErrorMessage(int $status, array $payload): string
{
    $parts = [];
    foreach (['message', 'description', 'error', 'code', 'raw'] as $key) {
        $value = $payload[$key] ?? '';
        if (is_array($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $value = trim((string) $value);
        if ($value !== '' && !in_array($value, $parts, true)) {
            $parts[] = $value;
        }
    }

    $details = $payload['details'] ?? null;
    if (is_array($details)) {
        foreach ($details as $detail) {
            if (is_array($detail)) {
                $detail = json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if (is_scalar($detail) && trim((string) $detail) !== '') {
                $parts[] = trim((string) $detail);
            }
        }
    }

    $suffix = empty($parts) ? 'sem detalhes retornados' : implode(' | ', $parts);
    return 'iFood API HTTP ' . $status . ': ' . $suffix;
}

function ifoodSyncProgressId($value): string
{
    $id = preg_replace('/[^A-Za-z0-9_-]/', '', trim((string) $value));
    return strlen($id) >= 8 && strlen($id) <= 96 ? $id : '';
}

function ifoodSyncProgressPath(string $progressId): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'gelocrm-ifood-sync-' . $progressId . '.json';
}

function ifoodWriteSyncProgress(string $progressId, array $progress): void
{
    if ($progressId === '') {
        return;
    }

    @file_put_contents(
        ifoodSyncProgressPath($progressId),
        json_encode([
            ...$progress,
            'updated_at' => gmdate('c'),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function ifoodReadSyncProgress(string $progressId): ?array
{
    if ($progressId === '') {
        return null;
    }

    $raw = @file_get_contents(ifoodSyncProgressPath($progressId));
    $progress = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    return is_array($progress) ? $progress : null;
}

function ifoodEmitSyncProgress(?callable $onProgress, array $progress): void
{
    if ($onProgress !== null) {
        $onProgress($progress);
    }
}

function ifoodMerchantId(): string
{
    $settings = storageGetIfoodAuthSettings();
    $merchantId = $settings['merchant_id'] !== '' ? $settings['merchant_id'] : trim((string) IFOOD_MERCHANT_ID);
    if ($merchantId === '') {
        $response = ifoodApiRequest('merchant/v1.0/merchants');
        $merchants = is_array($response['data'] ?? null) ? $response['data'] : [];
        if (count($merchants) === 1 && is_array($merchants[0] ?? null)) {
            $merchantId = trim((string) ($merchants[0]['id'] ?? $merchants[0]['merchantId'] ?? ''));
            if ($merchantId !== '') {
                storageUpdateIfoodAuthSettings(['merchant_id' => $merchantId]);
            }
        }
    }

    if ($merchantId === '') {
        throw new RuntimeException('IFOOD_MERCHANT_ID nao configurado. Use o endpoint ifood_discovery para listar as lojas vinculadas ao token.', 422);
    }
    return $merchantId;
}

function ifoodDiscovery(): array
{
    $token = ifoodTokenRequest();
    $response = ifoodApiRequest('merchant/v1.0/merchants');
    $merchants = is_array($response['data'] ?? null) ? $response['data'] : [];
    $merchantIds = array_values(array_filter(array_map(static function ($merchant): string {
        return is_array($merchant) ? trim((string) ($merchant['id'] ?? $merchant['merchantId'] ?? '')) : '';
    }, $merchants)));

    return [
        'token_status' => $token !== '' ? 'ok' : 'missing',
        'token_preview' => $token !== '' ? substr($token, 0, 8) . '...' . substr($token, -6) : '',
        'configured_merchant_id' => IFOOD_MERCHANT_ID,
        'saved_merchant_id' => storageGetIfoodAuthSettings()['merchant_id'] ?? '',
        'merchant_ids' => $merchantIds,
        'merchants' => $merchants,
    ];
}

function ifoodCreateUserCode(): array
{
    if (IFOOD_CLIENT_ID === '') {
        throw new RuntimeException('IFOOD_CLIENT_ID nao configurado.', 422);
    }

    $response = curlRequest(
        IFOOD_API_BASE_URL . '/authentication/v1.0/oauth/userCode',
        'POST',
        ['clientId' => IFOOD_CLIENT_ID],
        ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
        true
    );

    $status = (int) ($response['status'] ?? 500);
    $payload = is_array($response['data'] ?? null) ? $response['data'] : [];
    $userCode = trim((string) ($payload['userCode'] ?? ''));
    $verifier = trim((string) ($payload['authorizationCodeVerifier'] ?? ''));
    if ($status < 200 || $status >= 300 || $userCode === '' || $verifier === '') {
        throw new RuntimeException('Falha ao gerar codigo iFood: ' . (string) ($payload['message'] ?? $payload['raw'] ?? 'sem detalhes'), $status ?: 502);
    }

    $expiresIn = max(60, (int) ($payload['expiresIn'] ?? 600));
    storageUpdateIfoodAuthSettings([
        'pending_user_code' => $userCode,
        'pending_authorization_code_verifier' => $verifier,
        'pending_verification_url' => (string) ($payload['verificationUrlComplete'] ?? $payload['verificationUrl'] ?? ''),
        'pending_expires_at' => gmdate('Y-m-d H:i:s', time() + $expiresIn),
    ]);

    return [
        'userCode' => $userCode,
        'verificationUrl' => $payload['verificationUrl'] ?? '',
        'verificationUrlComplete' => $payload['verificationUrlComplete'] ?? '',
        'expiresIn' => $expiresIn,
    ];
}

function ifoodFinishAuthorization(string $authorizationCode): array
{
    $authorizationCode = trim($authorizationCode);
    if ($authorizationCode === '') {
        throw new RuntimeException('Informe o authorizationCode recebido no portal iFood.', 422);
    }

    $settings = storageGetIfoodAuthSettings();
    $verifier = $settings['pending_authorization_code_verifier'];
    if ($verifier === '') {
        $verifier = IFOOD_AUTHORIZATION_CODE_VERIFIER;
    }
    if ($verifier === '') {
        throw new RuntimeException('Gere um codigo iFood antes de finalizar a autorizacao.', 422);
    }

    $payload = ifoodTokenRequestWithBody([
        'grantType' => 'authorization_code',
        'clientId' => IFOOD_CLIENT_ID,
        'clientSecret' => IFOOD_CLIENT_SECRET,
        'authorizationCode' => $authorizationCode,
        'authorizationCodeVerifier' => $verifier,
    ]);

    storageUpdateIfoodAuthSettings([
        'sync_enabled' => true,
        'pending_user_code' => '',
        'pending_authorization_code_verifier' => '',
        'pending_verification_url' => '',
        'pending_expires_at' => '',
    ]);

    $discovery = ifoodDiscovery();
    $merchantIds = $discovery['merchant_ids'] ?? [];
    if (is_array($merchantIds) && count($merchantIds) === 1) {
        storageUpdateIfoodAuthSettings(['merchant_id' => (string) $merchantIds[0]]);
    }

    return [
        'token_status' => 'ok',
        'token_preview' => substr((string) ($payload['accessToken'] ?? $payload['access_token'] ?? ''), 0, 8) . '...',
        'discovery' => ifoodDiscovery(),
    ];
}

function ifoodBuildOpeningHoursPayload(array $weeklyHours, string $merchantId): array
{
    $shifts = [];
    foreach ($weeklyHours as $day) {
        if (!is_array($day) || ($day['enabled'] ?? false) !== true) {
            continue;
        }

        $start = storageNormalizeTime((string) ($day['opening_time'] ?? '08:00'), '08:00:00');
        $end = storageNormalizeTime((string) ($day['closing_time'] ?? '22:00'), '22:00:00');
        [$startHour, $startMinute] = array_map('intval', explode(':', substr($start, 0, 5)));
        [$endHour, $endMinute] = array_map('intval', explode(':', substr($end, 0, 5)));
        $startMinutes = $startHour * 60 + $startMinute;
        $endMinutes = $endHour * 60 + $endMinute;
        $duration = $endMinutes - $startMinutes;
        if ($duration <= 0) {
            $duration += 24 * 60;
        }

        $dayOfWeek = strtoupper(trim((string) ($day['ifood_day'] ?? '')));
        if ($dayOfWeek === '') {
            $dayOfWeek = match ((string) ($day['day'] ?? '')) {
                'monday' => 'MONDAY',
                'tuesday' => 'TUESDAY',
                'wednesday' => 'WEDNESDAY',
                'thursday' => 'THURSDAY',
                'friday' => 'FRIDAY',
                'saturday' => 'SATURDAY',
                'sunday' => 'SUNDAY',
                default => '',
            };
        }

        if ($dayOfWeek === '') {
            continue;
        }

        $shifts[] = [
            'dayOfWeek' => $dayOfWeek,
            'start' => $start,
            'duration' => $duration,
        ];
    }

    return [
        'storeId' => $merchantId,
        'shifts' => $shifts,
    ];
}

function ifoodSyncOpeningHours(array $weeklyHours): array
{
    $settings = storageGetIfoodAuthSettings();
    if ((!IFOOD_SYNC_ENABLED && !$settings['sync_enabled']) || IFOOD_CLIENT_ID === '' || IFOOD_CLIENT_SECRET === '') {
        return ['status' => 'skipped'];
    }

    $merchantId = ifoodMerchantId();
    $payload = ifoodBuildOpeningHoursPayload($weeklyHours, $merchantId);
    if (empty($payload['shifts'])) {
        return ['status' => 'skipped', 'message' => 'Nenhum horario iFood ativo para envio.'];
    }

    $response = ifoodApiRequest(
        'merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/opening-hours',
        'PUT',
        $payload
    );

    return [
        'status' => 'success',
        'merchant_id' => $merchantId,
        'response_status' => $response['status'] ?? null,
    ];
}

function ifoodSyncCatalog(array $payload, bool $forceRealSync = false): array
{
    $settings = storageGetIfoodAuthSettings();
    $syncEnabled = IFOOD_SYNC_ENABLED || $settings['sync_enabled'];
    if (!$forceRealSync && !$syncEnabled) {
        return [
            'status' => 'dry_run',
            'message' => 'IFOOD_SYNC_ENABLED esta desativado. Configure as credenciais e habilite para enviar ao iFood.',
            'payload' => $payload,
        ];
    }

    $catalogSyncPath = $settings['catalog_sync_path'] !== '' ? $settings['catalog_sync_path'] : IFOOD_CATALOG_SYNC_PATH;
    if ($catalogSyncPath === '') {
        return ifoodSyncCatalogV2($payload);
    }

    $token = ifoodTokenRequest();
    $merchantId = ifoodMerchantId();
    $path = str_replace('{merchantId}', rawurlencode($merchantId), $catalogSyncPath);
    $response = curlRequest(
        IFOOD_API_BASE_URL . '/' . ltrim($path, '/'),
        'PUT',
        ['products' => $payload['items'] ?? []],
        [
            'Accept: application/json',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ]
    );

    $status = (int) ($response['status'] ?? 500);
    if ($status < 200 || $status >= 300) {
        $data = is_array($response['data'] ?? null) ? $response['data'] : [];
        throw new RuntimeException('Falha ao sincronizar catalogo iFood: ' . (string) ($data['message'] ?? $data['raw'] ?? 'sem detalhes'), $status ?: 502);
    }

    return [
        'status' => 'success',
        'http_status' => $status,
        'response' => $response['data'] ?? null,
    ];
}

function ifoodStoragePathFromImageUrl(string $imageUrl): string
{
    $parts = parse_url(trim($imageUrl));
    if (!is_array($parts)) {
        return '';
    }

    parse_str((string) ($parts['query'] ?? ''), $query);
    if (($query['action'] ?? '') === 'storage_download' && !empty($query['path'])) {
        return storageNormalizeObjectPath((string) $query['path']);
    }

    if (($parts['path'] ?? '') === '/v1/storage/object' && !empty($query['path'])) {
        return storageNormalizeObjectPath((string) $query['path']);
    }

    $pathName = (string) ($parts['path'] ?? '');
    if (str_starts_with($pathName, '/conteudo/')) {
        return storageNormalizeObjectPath(rawurldecode(substr($pathName, strlen('/conteudo/'))));
    }

    return '';
}

function ifoodImageMimeType(string $mimeType, string $path = ''): string
{
    $mimeType = strtolower(trim(explode(';', $mimeType)[0] ?? ''));
    if (in_array($mimeType, ['image/jpeg', 'image/jpg', 'image/png'], true)) {
        return $mimeType === 'image/jpg' ? 'image/jpeg' : $mimeType;
    }

    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (in_array($extension, ['jpg', 'jpeg'], true)) {
        return 'image/jpeg';
    }
    if ($extension === 'png') {
        return 'image/png';
    }

    return '';
}

function ifoodReadImageForUpload(string $imageUrl): ?array
{
    $imageUrl = trim($imageUrl);
    if ($imageUrl === '') {
        return null;
    }

    $path = ifoodStoragePathFromImageUrl($imageUrl);
    if ($path !== '') {
        $object = storageDownloadObject($path);
        $mimeType = ifoodImageMimeType((string) ($object['content_type'] ?? ''), $path);
        if ($mimeType === '') {
            return null;
        }
        return [
            'body' => (string) ($object['body'] ?? ''),
            'mime_type' => $mimeType,
        ];
    }

    if (!preg_match('#^https?://#i', $imageUrl)) {
        return null;
    }

    $response = curlBinaryRequest($imageUrl);
    $status = (int) ($response['status'] ?? 500);
    if ($status < 200 || $status >= 300) {
        return null;
    }
    $mimeType = ifoodImageMimeType((string) ($response['content_type'] ?? ''), $imageUrl);
    if ($mimeType === '') {
        return null;
    }

    return [
        'body' => (string) ($response['body'] ?? ''),
        'mime_type' => $mimeType,
    ];
}

function ifoodUploadCatalogImage(string $merchantId, string $imageUrl): string
{
    $image = ifoodReadImageForUpload($imageUrl);
    if ($image === null || ($image['body'] ?? '') === '') {
        return '';
    }

    $binary = (string) $image['body'];
    if (strlen($binary) > 5 * 1024 * 1024) {
        return '';
    }

    $response = ifoodApiRequest(
        'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/image/upload/',
        'POST',
        [
            'image' => 'data:' . (string) $image['mime_type'] . ';base64,' . base64_encode($binary),
        ]
    );
    $data = $response['data'] ?? null;
    if (is_string($data)) {
        return trim($data);
    }
    if (is_array($data)) {
        return trim((string) ($data['imagePath'] ?? $data['path'] ?? $data['url'] ?? ''));
    }

    return '';
}

function apiSyncIfoodCatalogAfterInventoryChange(): array
{
    try {
        $payload = storageBuildIfoodCatalogPayload();
        return [
            'items_count' => (int) ($payload['count'] ?? 0),
            'sync' => ifoodSyncCatalogStockOnly($payload),
        ];
    } catch (\Throwable $e) {
        return [
            'items_count' => 0,
            'sync' => [
                'status' => 'error',
                'message' => $e->getMessage(),
            ],
        ];
    }
}

function ifoodSyncCatalogStockOnly(array $payload): array
{
    $settings = storageGetIfoodAuthSettings();
    $syncEnabled = IFOOD_SYNC_ENABLED || $settings['sync_enabled'];
    if (!$syncEnabled) {
        return [
            'status' => 'dry_run',
            'message' => 'Sincronizacao ativa desativada. Estoque nao enviado ao iFood.',
            'payload' => $payload,
        ];
    }

    $merchantId = ifoodMerchantId();
    $stockSynced = 0;
    $statusSynced = 0;
    $skipped = 0;
    $errors = [];
    $statusUpdates = [];

    foreach (($payload['items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $externalCode = trim((string) ($item['externalCode'] ?? ''));
        if ($externalCode === '') {
            $skipped++;
            continue;
        }

        $productId = ifoodStableUuid('product-' . $externalCode);
        $quantity = max(0, (int) ($item['inventory']['quantity'] ?? 0));
        $requestedStatus = strtoupper(trim((string) ($item['status'] ?? '')));
        $statusUpdates[] = [
            'externalCode' => $externalCode,
            'status' => $requestedStatus === 'AVAILABLE' && $quantity > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
            'resources' => ['ITEM'],
        ];
        try {
            ifoodApiRequest(
                'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/inventory',
                'POST',
                [
                    'productId' => $productId,
                    'amount' => $quantity,
                ]
            );
            $stockSynced++;
        } catch (\Throwable $e) {
            $errors[] = [
                'externalCode' => $externalCode,
                'message' => $e->getMessage(),
            ];
        }
    }

    if (!empty($statusUpdates)) {
        try {
            ifoodApiRequest(
                'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/products/status',
                'PATCH',
                $statusUpdates
            );
            $statusSynced = count($statusUpdates);
        } catch (\Throwable $e) {
            $errors[] = [
                'externalCode' => '*status_batch',
                'message' => $e->getMessage(),
            ];
        }
    }

    return [
        'status' => empty($errors) ? 'success' : 'partial_error',
        'mode' => 'stock_only',
        'merchant_id' => $merchantId,
        'stocks_synced' => $stockSynced,
        'statuses_synced' => $statusSynced,
        'skipped' => $skipped,
        'errors' => $errors,
    ];
}

function ifoodProductExternalCode(array $product): string
{
    $externalCode = trim((string) ($product['ifood_external_code'] ?? ''));
    return $externalCode !== '' ? $externalCode : 'gelocrm-product-' . (int) ($product['id'] ?? 0);
}

function ifoodSyncProductStatesOrFail(array $products): array
{
    $externalCodes = array_values(array_unique(array_filter(array_map(
        static fn (array $product): string => ifoodProductExternalCode($product),
        $products
    ))));
    if (empty($externalCodes)) {
        return [
            'items_count' => 0,
            'sync' => [
                'status' => 'success',
                'mode' => 'stock_only',
                'stocks_synced' => 0,
                'statuses_synced' => 0,
            ],
        ];
    }

    $externalCodeSet = array_fill_keys($externalCodes, true);
    $payload = storageBuildIfoodCatalogPayload();
    $payload['items'] = array_values(array_filter(
        is_array($payload['items'] ?? null) ? $payload['items'] : [],
        static fn (array $item): bool => isset($externalCodeSet[trim((string) ($item['externalCode'] ?? ''))])
    ));
    $payload['count'] = count($payload['items']);

    if ($payload['count'] <= 0) {
        throw new RuntimeException('Produto nao encontrado no payload do iFood. Envie o cardapio uma vez antes de alterar o status.', 409);
    }

    $sync = ifoodSyncCatalogStockOnly($payload);
    $syncStatus = (string) ($sync['status'] ?? '');
    if ($syncStatus === 'dry_run') {
        throw new RuntimeException((string) ($sync['message'] ?? 'Sincronizacao iFood desativada. Ative a sincronizacao para alterar o portal iFood.'), 409);
    }
    if (!in_array($syncStatus, ['success'], true)) {
        $errors = array_values(array_filter(array_map(
            static fn ($error): string => is_array($error) ? trim((string) ($error['message'] ?? '')) : '',
            is_array($sync['errors'] ?? null) ? $sync['errors'] : []
        )));
        throw new RuntimeException(
            'iFood nao confirmou a alteracao no portal.' . (!empty($errors) ? ' ' . implode(' | ', $errors) : ''),
            502
        );
    }

    return [
        'items_count' => $payload['count'],
        'sync' => $sync,
    ];
}

function ifoodSyncCatalogFastState(array $payload): array
{
    $settings = storageGetIfoodAuthSettings();
    $syncEnabled = IFOOD_SYNC_ENABLED || $settings['sync_enabled'];
    if (!$syncEnabled) {
        return [
            'status' => 'dry_run',
            'message' => 'IFOOD_SYNC_ENABLED esta desativado. Configure as credenciais e habilite para enviar ao iFood.',
            'payload' => $payload,
        ];
    }

    $merchantId = ifoodMerchantId();
    $priceUpdates = [];
    $statusUpdates = [];
    foreach (($payload['items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }
        $externalCode = trim((string) ($item['externalCode'] ?? ''));
        if ($externalCode === '') {
            continue;
        }
        $price = round((float) ($item['price']['value'] ?? $item['price'] ?? 0), 2);
        $quantity = max(0, (int) ($item['inventory']['quantity'] ?? 0));
        $requestedStatus = strtoupper(trim((string) ($item['status'] ?? '')));
        $status = $requestedStatus === 'AVAILABLE' && $quantity > 0 ? 'AVAILABLE' : 'UNAVAILABLE';

        $priceUpdates[] = [
            'externalCode' => $externalCode,
            'price' => ['value' => $price],
            'resources' => ['ITEM'],
        ];
        $statusUpdates[] = [
            'externalCode' => $externalCode,
            'status' => $status,
            'resources' => ['ITEM'],
        ];
    }

    $priceBatch = null;
    if (!empty($priceUpdates)) {
        $priceBatch = ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/products/price',
            'PATCH',
            $priceUpdates
        )['data'] ?? null;
    }

    $statusBatch = null;
    if (!empty($statusUpdates)) {
        $statusBatch = ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/products/status',
            'PATCH',
            $statusUpdates
        )['data'] ?? null;
    }

    return [
        'status' => 'success',
        'mode' => 'catalog_v2_fast_state',
        'merchant_id' => $merchantId,
        'prices_synced' => count($priceUpdates),
        'statuses_synced' => count($statusUpdates),
        'price_batch' => $priceBatch,
        'status_batch' => $statusBatch,
    ];
}

function ifoodStableUuid(string $value): string
{
    $hash = md5('gelocrm-ifood-' . $value);
    return substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-4' . substr($hash, 13, 3) . '-a' . substr($hash, 17, 3) . '-' . substr($hash, 20, 12);
}

function ifoodCatalogItemsForCreation(array $items): array
{
    return array_values(array_filter($items, static function ($item): bool {
        return is_array($item)
            && trim((string) ($item['externalCode'] ?? '')) !== ''
            && trim((string) ($item['name'] ?? '')) !== '';
    }));
}

function ifoodCatalogList(array $data): array
{
    if (isset($data['id']) || isset($data['catalogId'])) {
        return [$data];
    }
    if (is_array($data['catalogs'] ?? null)) {
        return $data['catalogs'];
    }
    return array_values(array_filter($data, static fn ($item) => is_array($item)));
}

function ifoodCategoryList(array $data): array
{
    if (is_array($data['categories'] ?? null)) {
        return $data['categories'];
    }
    return array_values(array_filter($data, static fn ($item) => is_array($item)));
}

function ifoodCountRemoteCategoryItems(array $category): int
{
    foreach (['items', 'itens', 'products', 'produtos'] as $key) {
        if (is_array($category[$key] ?? null)) {
            return count($category[$key]);
        }
    }

    return 0;
}

function ifoodRemoteCatalogStatus(): array
{
    $merchantId = ifoodMerchantId();
    $catalogsResponse = ifoodApiRequest('catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/catalogs');
    $catalogs = ifoodCatalogList(is_array($catalogsResponse['data'] ?? null) ? $catalogsResponse['data'] : []);
    $catalogId = ifoodFindCatalogId($catalogs);

    $categoriesResponse = ifoodApiRequest('catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/catalogs/' . rawurlencode($catalogId) . '/categories?includeItems=true');
    $categories = ifoodCategoryList(is_array($categoriesResponse['data'] ?? null) ? $categoriesResponse['data'] : []);
    $itemsCount = 0;
    $categorySummaries = [];

    foreach ($categories as $category) {
        if (!is_array($category)) {
            continue;
        }
        $count = ifoodCountRemoteCategoryItems($category);
        $itemsCount += $count;
        $categorySummaries[] = [
            'id' => ifoodScalarString($category['id'] ?? $category['categoryId'] ?? ''),
            'name' => ifoodScalarString($category['name'] ?? ''),
            'items_count' => $count,
            'status' => ifoodScalarString($category['status'] ?? ''),
        ];
    }

    return [
        'merchant_id' => $merchantId,
        'catalog_id' => $catalogId,
        'catalogs_count' => count($catalogs),
        'categories_count' => count($categorySummaries),
        'items_count' => $itemsCount,
        'categories' => $categorySummaries,
    ];
}

function ifoodScalarString($value): string
{
    if (is_scalar($value) || $value === null) {
        return trim((string) $value);
    }
    return '';
}

function ifoodFindCatalogId(array $catalogs): string
{
    foreach ($catalogs as $catalog) {
        if (!is_array($catalog)) {
            continue;
        }
        $context = strtoupper(ifoodScalarString($catalog['context'] ?? $catalog['type'] ?? ''));
        $id = ifoodScalarString($catalog['catalogId'] ?? $catalog['id'] ?? '');
        if ($id !== '' && ($context === '' || str_contains($context, 'DEFAULT'))) {
            return $id;
        }
    }

    foreach ($catalogs as $catalog) {
        if (is_array($catalog)) {
            $id = ifoodScalarString($catalog['catalogId'] ?? $catalog['id'] ?? '');
            if ($id !== '') {
                return $id;
            }
        }
    }

    throw new RuntimeException('Nenhum catalogo iFood retornado para esta loja.', 422);
}

function ifoodBatchIdFromResponse($batch): string
{
    if (!is_array($batch)) {
        return '';
    }

    return trim((string) ($batch['batchId'] ?? $batch['id'] ?? ''));
}

function ifoodWaitForBatch(string $merchantId, $batch, int $maxAttempts = 6, int $sleepMs = 800): ?array
{
    $batchId = ifoodBatchIdFromResponse($batch);
    if ($batchId === '') {
        return null;
    }

    $lastResult = null;
    for ($attempt = 1; $attempt <= $maxAttempts; $attempt += 1) {
        if ($attempt > 1 && $sleepMs > 0) {
            usleep($sleepMs * 1000);
        }

        $response = ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/batch/' . rawurlencode($batchId)
        );
        $lastResult = is_array($response['data'] ?? null) ? $response['data'] : null;
        $status = strtoupper(trim((string) ($lastResult['batchStatus'] ?? $lastResult['status'] ?? '')));
        if (in_array($status, ['COMPLETED', 'CONCLUDED', 'FINISHED', 'FAILED', 'ERROR'], true)) {
            return $lastResult;
        }
    }

    return $lastResult;
}

function ifoodNormalizeCategoryName(string $name): string
{
    return strtolower(trim($name));
}

function ifoodCatalogCategoryName(array $item): string
{
    $name = trim((string) ($item['category'] ?? ''));
    return $name !== '' ? $name : 'Geral';
}

function ifoodCategoriesByName(array $categories): array
{
    $byName = [];
    foreach ($categories as $category) {
        if (!is_array($category)) {
            continue;
        }
        $name = ifoodNormalizeCategoryName(ifoodScalarString($category['name'] ?? ''));
        $id = ifoodScalarString($category['id'] ?? $category['categoryId'] ?? '');
        if ($name !== '' && $id !== '') {
            $byName[$name] = $id;
        }
    }

    return $byName;
}

function ifoodCreateCatalogCategory(string $merchantId, string $catalogId, string $name, int $sequence): string
{
    $created = ifoodApiRequest(
        'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/catalogs/' . rawurlencode($catalogId) . '/categories',
        'POST',
        [
            'name' => $name,
            'status' => 'AVAILABLE',
            'template' => 'DEFAULT',
            'sequence' => $sequence,
        ]
    );
    $createdData = is_array($created['data'] ?? null) ? $created['data'] : [];
    $categoryId = ifoodScalarString($createdData['id'] ?? $createdData['categoryId'] ?? '');
    if ($categoryId === '') {
        throw new RuntimeException('iFood criou a categoria ' . $name . ' sem retornar o id para uso nos itens.', 502);
    }

    return $categoryId;
}

function ifoodSyncCatalogV2(array $payload, bool $waitForBatch = false, ?callable $onProgress = null): array
{
    $payload['items'] = ifoodCatalogItemsForCreation(is_array($payload['items'] ?? null) ? $payload['items'] : []);
    if (empty($payload['items'])) {
        throw new RuntimeException('Nenhum produto valido encontrado nas categorias selecionadas para criar itens no iFood.', 422);
    }
    $totalItems = count($payload['items']);
    ifoodEmitSyncProgress($onProgress, [
        'phase' => 'catalog',
        'message' => 'Consultando o catalogo remoto do iFood.',
        'processed_items' => 0,
        'total_items' => $totalItems,
    ]);

    $merchantId = ifoodMerchantId();
    $catalogsResponse = ifoodApiRequest('catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/catalogs');
    $catalogId = ifoodFindCatalogId(ifoodCatalogList(is_array($catalogsResponse['data'] ?? null) ? $catalogsResponse['data'] : []));

    $categoriesResponse = ifoodApiRequest('catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/catalogs/' . rawurlencode($catalogId) . '/categories?includeItems=true');
    $categories = ifoodCategoryList(is_array($categoriesResponse['data'] ?? null) ? $categoriesResponse['data'] : []);
    $remoteCategoriesByName = ifoodCategoriesByName($categories);
    $createdCategoryIds = [];

    $synced = 0;
    $imagesUploaded = 0;
    $priceUpdates = [];
    $statusUpdates = [];
    foreach (($payload['items'] ?? []) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $externalCode = trim((string) ($item['externalCode'] ?? ''));
        if ($externalCode === '') {
            continue;
        }
        $categoryName = ifoodCatalogCategoryName($item);
        $categoryId = $remoteCategoriesByName[ifoodNormalizeCategoryName($categoryName)] ?? '';
        $itemName = trim((string) ($item['name'] ?? ''));
        ifoodEmitSyncProgress($onProgress, [
            'phase' => 'item',
            'message' => 'Preparando item para o iFood.',
            'category' => $categoryName,
            'item' => $itemName,
            'processed_items' => $synced,
            'current_item' => $synced + 1,
            'total_items' => $totalItems,
        ]);
        if ($categoryId === '') {
            ifoodEmitSyncProgress($onProgress, [
                'phase' => 'category',
                'message' => 'Criando categoria no iFood.',
                'category' => $categoryName,
                'item' => $itemName,
                'processed_items' => $synced,
                'current_item' => $synced + 1,
                'total_items' => $totalItems,
            ]);
            $categoryId = ifoodCreateCatalogCategory($merchantId, $catalogId, $categoryName, $index);
            $remoteCategoriesByName[ifoodNormalizeCategoryName($categoryName)] = $categoryId;
            $createdCategoryIds[$categoryName] = $categoryId;
        }
        $itemId = ifoodStableUuid('item-' . $externalCode);
        $productId = ifoodStableUuid('product-' . $externalCode);
        $price = round((float) ($item['price']['value'] ?? $item['price'] ?? 0), 2);
        $quantity = max(0, (int) ($item['inventory']['quantity'] ?? 0));
        $requestedStatus = strtoupper(trim((string) ($item['status'] ?? '')));
        $status = $requestedStatus === 'AVAILABLE' && $quantity > 0 ? 'AVAILABLE' : 'UNAVAILABLE';
        $priceUpdates[] = [
            'externalCode' => $externalCode,
            'price' => ['value' => $price],
            'resources' => ['ITEM'],
        ];
        $statusUpdates[] = [
            'externalCode' => $externalCode,
            'status' => $status,
            'resources' => ['ITEM'],
        ];
        $imagePath = '';
        $imageUrl = trim((string) ($item['imageUrl'] ?? ''));
        if ($imageUrl !== '') {
            try {
                $imagePath = ifoodUploadCatalogImage($merchantId, $imageUrl);
                if ($imagePath !== '') {
                    $imagesUploaded += 1;
                }
            } catch (\Throwable $ignored) {
                $imagePath = '';
            }
        }
        $productPayload = [
            'id' => $productId,
            'externalCode' => $externalCode,
            'name' => (string) ($item['name'] ?? ''),
            'description' => (string) ($item['description'] ?? ''),
            'serving' => $item['serving'] ?? 'NOT_APPLICABLE',
        ];
        if ($imagePath !== '') {
            $productPayload['imagePath'] = $imagePath;
        }

        ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/items',
            'PUT',
            [
                'item' => [
                    'id' => $itemId,
                    'type' => 'DEFAULT',
                    'categoryId' => $categoryId,
                    'status' => $status,
                    'price' => ['value' => $price],
                    'externalCode' => $externalCode,
                    'index' => $index,
                    'productId' => $productId,
                ],
                'products' => [$productPayload],
                'optionGroups' => [],
                'options' => [],
            ]
        );

        try {
            ifoodApiRequest(
                'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/inventory',
                'POST',
                [
                    'productId' => $productId,
                    'amount' => $quantity,
                ]
            );
        } catch (\Throwable $ignored) {
        }
        $synced += 1;
        ifoodEmitSyncProgress($onProgress, [
            'phase' => 'item',
            'message' => 'Item enviado ao iFood.',
            'category' => $categoryName,
            'item' => $itemName,
            'processed_items' => $synced,
            'current_item' => $synced,
            'total_items' => $totalItems,
        ]);
    }

    $priceBatch = null;
    $priceBatchResult = null;
    if (!empty($priceUpdates)) {
        ifoodEmitSyncProgress($onProgress, [
            'phase' => 'prices',
            'message' => 'Atualizando precos no iFood.',
            'processed_items' => $synced,
            'total_items' => $totalItems,
        ]);
        $priceBatch = ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/products/price',
            'PATCH',
            $priceUpdates
        )['data'] ?? null;
        $priceBatchResult = $waitForBatch ? ifoodWaitForBatch($merchantId, $priceBatch) : null;
    }

    $statusBatch = null;
    $statusBatchResult = null;
    if (!empty($statusUpdates)) {
        ifoodEmitSyncProgress($onProgress, [
            'phase' => 'status',
            'message' => 'Atualizando status dos itens no iFood.',
            'processed_items' => $synced,
            'total_items' => $totalItems,
        ]);
        $statusBatch = ifoodApiRequest(
            'catalog/v2.0/merchants/' . rawurlencode($merchantId) . '/products/status',
            'PATCH',
            $statusUpdates
        )['data'] ?? null;
        $statusBatchResult = $waitForBatch ? ifoodWaitForBatch($merchantId, $statusBatch) : null;
    }

    return [
        'status' => 'success',
        'mode' => 'catalog_v2',
        'merchant_id' => $merchantId,
        'catalog_id' => $catalogId,
        'created_categories' => $createdCategoryIds,
        'items_synced' => $synced,
        'prices_synced' => count($priceUpdates),
        'statuses_synced' => count($statusUpdates),
        'price_batch' => $priceBatch,
        'price_batch_result' => $priceBatchResult,
        'status_batch' => $statusBatch,
        'status_batch_result' => $statusBatchResult,
        'images_uploaded' => $imagesUploaded,
    ];
}

function ifoodPollEvents(): array
{
    $merchantId = ifoodMerchantId();
    $response = ifoodApiRequest(
        'events/v1.0/events:polling?categories=ALL',
        'GET',
        null,
        ['x-polling-merchants: ' . $merchantId]
    );

    $events = $response['status'] === 204 ? [] : (is_array($response['data']) ? $response['data'] : []);
    usort($events, static fn (array $a, array $b): int => strcmp((string) ($a['createdAt'] ?? ''), (string) ($b['createdAt'] ?? '')));

    foreach ($events as $event) {
        if (is_array($event)) {
            $eventId = trim((string) ($event['id'] ?? ''));
            $alreadyProcessed = $eventId !== '' && storageIfoodEventWasProcessed($eventId);
            storageSaveIfoodEvent($event, false);
            if ($alreadyProcessed) {
                continue;
            }
            storageApplyIfoodEventToLocalOrder($event);
            $orderId = trim((string) ($event['orderId'] ?? ''));
            if ($orderId !== '') {
                try {
                    $order = ifoodApiRequest('order/v1.0/orders/' . rawurlencode($orderId));
                    if (is_array($order['data'] ?? null)) {
                        storageUpsertIfoodOrder($order['data']);
                        ifoodAutoConfirmOrderIfRequired($order['data'], $event);
                    }
                } catch (\Throwable $ignored) {
                }
            }
        }
    }

    if (!empty($events)) {
        foreach (array_chunk($events, 2000) as $eventChunk) {
            ifoodApiRequest('events/v1.0/events/acknowledgment', 'POST', $eventChunk);
            storageMarkIfoodEventsAcked($eventChunk);
        }
    }

    return [
        'events_count' => count($events),
        'events' => $events,
    ];
}

function ifoodAutoConfirmOrderIfRequired(array $order, array $event = []): void
{
    $orderId = trim((string) ($order['id'] ?? $event['orderId'] ?? ''));
    if ($orderId === '') {
        return;
    }

    $code = strtoupper(trim((string) ($event['fullCode'] ?? $event['code'] ?? $order['status'] ?? '')));
    $status = strtoupper(trim((string) ($order['status'] ?? '')));
    $shouldConfirm = in_array($code, ['PLC', 'PLACED'], true)
        || in_array($status, ['PLACED', 'CREATED'], true)
        || str_contains($code, 'PLACED');
    if (!$shouldConfirm) {
        return;
    }

    try {
        ifoodOrderActionAndSyncLocal($orderId, 'confirm');
    } catch (\Throwable $e) {
        $message = strtolower($e->getMessage());
        if (!str_contains($message, 'already') && !str_contains($message, 'ja ') && !str_contains($message, 'j\u00e1') && !str_contains($message, 'invalid status')) {
            throw $e;
        }
    }
}

function ifoodOrderAction(string $orderId, string $action, array $body = []): array
{
    $allowed = [
        'confirm' => ['path' => 'confirm', 'method' => 'POST', 'body' => []],
        'start_preparation' => ['path' => 'startPreparation', 'method' => 'POST', 'body' => []],
        'ready_to_pickup' => ['path' => 'readyToPickup', 'method' => 'PUT', 'body' => []],
        'dispatch' => ['path' => 'dispatch', 'method' => 'PUT', 'body' => ['deliveredBy' => 'MERCHANT']],
        'request_cancellation' => ['path' => 'requestCancellation', 'method' => 'POST', 'body' => ifoodCancellationRequestBody($body)],
        'validate_pickup_code' => ['path' => 'validatePickupCode', 'method' => 'POST', 'body' => ifoodOrderCodeBody($body, 'coleta')],
    ];
    if (!isset($allowed[$action])) {
        throw new RuntimeException('Acao iFood invalida.', 422);
    }

    $requestBody = $allowed[$action]['body'];
    $response = ifoodApiRequest(
        'order/v1.0/orders/' . rawurlencode($orderId) . '/' . $allowed[$action]['path'],
        $allowed[$action]['method'],
        $requestBody
    );
    if ($action === 'validate_pickup_code' && is_array($response['data'] ?? null) && ($response['data']['valid'] ?? null) !== true) {
        throw new RuntimeException('iFood recusou o codigo de coleta.', 409);
    }

    try {
        $order = ifoodApiRequest('order/v1.0/orders/' . rawurlencode($orderId));
        if (is_array($order['data'] ?? null)) {
            storageUpsertIfoodOrder($order['data']);
        }
    } catch (\Throwable $ignored) {
    }

    return $response;
}

function ifoodCancellationRequestBody(array $body): array
{
    $reason = trim((string) ($body['reason'] ?? ''));
    if ($reason === '') {
        throw new RuntimeException('Selecione um motivo de cancelamento valido do iFood.', 422);
    }

    return ['reason' => $reason];
}

function ifoodOrderCodeBody(array $body, string $label): array
{
    $code = preg_replace('/\D+/', '', (string) ($body['code'] ?? ''));
    if ($code === '') {
        throw new RuntimeException('Informe o codigo de ' . $label . ' do iFood.', 422);
    }

    return ['code' => $code];
}

function ifoodOrderCancellationReasons(string $orderId): array
{
    $orderId = trim($orderId);
    if ($orderId === '') {
        throw new RuntimeException('Pedido iFood ausente para consultar cancelamento.', 422);
    }

    return ifoodApiRequest('order/v1.0/orders/' . rawurlencode($orderId) . '/cancellationReasons');
}

function ifoodOrderTracking(string $orderId): array
{
    $orderId = trim($orderId);
    if ($orderId === '') {
        throw new RuntimeException('Pedido iFood ausente para consultar tracking.', 422);
    }

    return ifoodApiRequest('order/v1.0/orders/' . rawurlencode($orderId) . '/tracking');
}

function ifoodDisputeAction(string $disputeId, string $action, array $body = []): array
{
    $allowed = [
        'accept' => 'accept',
        'reject' => 'reject',
        'alternative' => 'alternative',
    ];
    if (!isset($allowed[$action])) {
        throw new RuntimeException('Acao de negociacao iFood invalida.', 422);
    }

    $disputeId = trim($disputeId);
    if ($disputeId === '') {
        throw new RuntimeException('Disputa iFood ausente.', 422);
    }

    if ($action !== 'alternative' && trim((string) ($body['reason'] ?? '')) === '') {
        throw new RuntimeException('Informe o motivo da resposta para a disputa iFood.', 422);
    }

    return ifoodApiRequest(
        'order/v1.0/disputes/' . rawurlencode($disputeId) . '/' . $allowed[$action],
        'POST',
        $body
    );
}

function ifoodActionProgressCode(string $action): string
{
    return match ($action) {
        'confirm' => 'CONFIRMED',
        'start_preparation' => 'START_PREPARATION',
        'ready_to_pickup' => 'READY_TO_PICKUP',
        'dispatch' => 'DISPATCHED',
        default => strtoupper($action),
    };
}

function ifoodOrderActionAndSyncLocal(string $orderId, string $action, array $body = []): array
{
    $response = ifoodOrderAction($orderId, $action, $body);
    storageApplyIfoodProgressToLocalOrder($orderId, ifoodActionProgressCode($action));

    return $response;
}

function ifoodOrderIdForLocalOrder(int $localOrderId): string
{
    $row = storageGetIfoodOrderByLocalOrderId($localOrderId);
    return trim((string) ($row['ifood_order_id'] ?? ''));
}

function ifoodPayloadForLocalOrder(int $localOrderId): array
{
    $row = storageGetIfoodOrderByLocalOrderId($localOrderId);
    $payload = json_decode((string) ($row['payload'] ?? ''), true);
    return is_array($payload) ? $payload : [];
}

function ifoodDeliveredByForLocalOrder(int $localOrderId): string
{
    $payload = ifoodPayloadForLocalOrder($localOrderId);
    $delivery = is_array($payload['delivery'] ?? null) ? $payload['delivery'] : [];
    return strtoupper(trim((string) ($delivery['deliveredBy'] ?? '')));
}

function ifoodDeliveryConfirmationCodeForLocalOrder(int $localOrderId): string
{
    $payload = ifoodPayloadForLocalOrder($localOrderId);
    $customer = is_array($payload['customer'] ?? null) ? $payload['customer'] : [];
    $phone = is_array($customer['phone'] ?? null) ? $customer['phone'] : [];
    return preg_replace('/\D+/', '', (string) ($phone['localizer'] ?? ''));
}

function ifoodConfirmMerchantDeliveryForLocalOrder(int $localOrderId): array
{
    $ifoodOrderId = ifoodOrderIdForLocalOrder($localOrderId);
    if ($ifoodOrderId === '') {
        throw new RuntimeException('Pedido iFood local sem vinculo com pedido remoto.', 409);
    }

    $code = ifoodDeliveryConfirmationCodeForLocalOrder($localOrderId);
    if ($code === '') {
        throw new RuntimeException('Pedido iFood sem localizador para confirmar entrega propria.', 409);
    }

    $response = ifoodApiRequest(
        'order/v1.0/orders/' . rawurlencode($ifoodOrderId) . '/verifyDeliveryCode',
        'POST',
        ['code' => $code]
    );

    $data = $response['data'] ?? null;
    if (is_array($data) && array_key_exists('valid', $data) && $data['valid'] !== true) {
        throw new RuntimeException('iFood recusou o codigo de entrega propria.', 409);
    }

    storageApplyIfoodProgressToLocalOrder($ifoodOrderId, 'DELIVERED');

    return [
        'ifood_order_id' => $ifoodOrderId,
        'code' => $code,
        'response' => $data,
        'order' => storageGetOrderDetailsById($localOrderId),
    ];
}

function ifoodAdvancePrintedLocalOrder(array $order): array
{
    $orderId = (int) ($order['id'] ?? 0);
    $ifoodOrderId = ifoodOrderIdForLocalOrder($orderId);
    if ($ifoodOrderId === '') {
        throw new RuntimeException('Pedido iFood local sem vinculo com pedido remoto.', 409);
    }

    $results = [];
    foreach (['confirm', 'start_preparation'] as $action) {
        try {
            $results[$action] = ifoodOrderActionAndSyncLocal($ifoodOrderId, $action)['data'] ?? null;
        } catch (\Throwable $e) {
            $message = strtolower($e->getMessage());
            if (!str_contains($message, 'already') && !str_contains($message, 'ja ') && !str_contains($message, 'j\u00e1') && !str_contains($message, 'invalid status')) {
                throw $e;
            }
            $results[$action] = ['ignored' => true, 'message' => $e->getMessage()];
        }
    }

    return [
        'ifood_order_id' => $ifoodOrderId,
        'actions' => $results,
        'order' => storageGetOrderDetailsById($orderId),
    ];
}

function ifoodTryAdvancePrintedLocalOrder(array $order): array
{
    try {
        return [
            'status' => 'success',
            ...ifoodAdvancePrintedLocalOrder($order),
        ];
    } catch (\Throwable $e) {
        return [
            'status' => 'warning',
            'message' => $e->getMessage(),
            'ifood_order_id' => ifoodOrderIdForLocalOrder((int) ($order['id'] ?? 0)),
            'order' => storageGetOrderDetailsById((int) ($order['id'] ?? 0)),
        ];
    }
}

function sanitizeExternalImageProxyUrl(string $value): ?string
{
    $value = trim($value);
    if ($value === '' || strlen($value) > 2048 || preg_match('/[\r\n]/', $value)) {
        return null;
    }

    $parts = parse_url($value);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return null;
    }

    $scheme = strtolower((string) $parts['scheme']);
    if (!in_array($scheme, ['http', 'https'], true)) {
        return null;
    }

    $host = strtolower((string) $parts['host']);
    if ($host === '' || in_array($host, ['localhost', '127.0.0.1', '::1'], true) || str_ends_with($host, '.local')) {
        return null;
    }

    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $isPublicIp = filter_var(
            $host,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
        if ($isPublicIp === false) {
            return null;
        }
    }

    return $value;
}

function externalImageProxyFallback(string $message = 'Imagem indisponivel'): void
{
    $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="{$safeMessage}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#081d35"/>
      <stop offset="100%" stop-color="#153c63"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="28" fill="url(#bg)"/>
  <circle cx="178" cy="126" r="36" fill="rgba(255,255,255,0.18)"/>
  <path d="M82 286l118-116 72 74 68-54 128 96H82z" fill="rgba(255,255,255,0.14)"/>
  <text x="320" y="318" text-anchor="middle" fill="#e9f6ff" font-family="Arial, sans-serif" font-size="26">{$safeMessage}</text>
</svg>
SVG;

    header('Cache-Control: no-store, max-age=0');
    binaryResponse($svg, 'image/svg+xml; charset=utf-8', 'image-unavailable.svg');
}

function proxyExternalImageResponse(string $url): void
{
    if (!function_exists('curl_init')) {
        externalImageProxyFallback('Imagem externa indisponivel');
    }

    $responseHeaders = [];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 4);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    applyCurlSslOptions($ch);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 GeloCRM/1.0');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer: ' . APP_BASE_URL . '/',
    ]);
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, static function ($curl, $headerLine) use (&$responseHeaders) {
        $trimmed = trim($headerLine);
        if ($trimmed === '' || strpos($trimmed, ':') === false) {
            return strlen($headerLine);
        }

        [$name, $value] = explode(':', $trimmed, 2);
        $responseHeaders[strtolower(trim($name))] = trim($value);
        return strlen($headerLine);
    });

    $binary = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = $binary === false ? curl_error($ch) : '';
    curl_close($ch);

    if ($binary === false || $status < 200 || $status >= 300 || $binary === '') {
        externalImageProxyFallback($error !== '' ? 'Falha ao carregar imagem' : 'Imagem externa indisponivel');
    }

    $contentType = trim(strtolower(explode(';', $contentType)[0] ?? ''));
    if ($contentType === '' && isset($responseHeaders['content-type'])) {
        $contentType = trim(strtolower(explode(';', (string) $responseHeaders['content-type'])[0] ?? ''));
    }

    if ($contentType === '') {
        $path = strtolower((string) parse_url($url, PHP_URL_PATH));
        if (preg_match('/\.avif$/', $path)) {
            $contentType = 'image/avif';
        } elseif (preg_match('/\.webp$/', $path)) {
            $contentType = 'image/webp';
        } elseif (preg_match('/\.png$/', $path)) {
            $contentType = 'image/png';
        } elseif (preg_match('/\.gif$/', $path)) {
            $contentType = 'image/gif';
        } elseif (preg_match('/\.svg$/', $path)) {
            $contentType = 'image/svg+xml';
        } else {
            $contentType = 'image/jpeg';
        }
    }

    if (!str_starts_with($contentType, 'image/')) {
        externalImageProxyFallback('Formato nao suportado');
    }

    header('Cache-Control: public, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    binaryResponse($binary, $contentType);
}

require_once 'storage.php';

function uberTokenCacheFile(): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'gelocrm_uber_token_'
        . md5(UBER_CLIENT_ID . '|' . UBER_ENV)
        . '.json';
}

function getCachedUberToken(): ?array
{
    $cacheFile = uberTokenCacheFile();
    if (!is_file($cacheFile)) {
        return null;
    }

    $payload = json_decode((string) file_get_contents($cacheFile), true);
    if (!is_array($payload) || empty($payload['access_token']) || empty($payload['expires_at'])) {
        return null;
    }

    if ((int) $payload['expires_at'] <= (time() + 300)) {
        return null;
    }

    return ['access_token' => (string) $payload['access_token']];
}

function cacheUberToken(string $accessToken, int $expiresInSeconds): void
{
    @file_put_contents(uberTokenCacheFile(), json_encode([
        'access_token' => $accessToken,
        'expires_at' => time() + max(60, $expiresInSeconds),
    ]));
}

function getUberToken(): array
{
    if (empty(UBER_CLIENT_ID) || empty(UBER_CLIENT_SECRET)) {
        return ['error' => 'Uber credentials missing'];
    }

    $cached = getCachedUberToken();
    if ($cached) {
        return $cached;
    }

    $response = curlRequest(
        'https://auth.uber.com/oauth/v2/token',
        'POST',
        [
            'client_id' => UBER_CLIENT_ID,
            'client_secret' => UBER_CLIENT_SECRET,
            'grant_type' => 'client_credentials',
            'scope' => 'eats.deliveries',
        ],
        ['Content-Type: application/x-www-form-urlencoded'],
        true
    );

    if (!empty($response['error'])) {
        return ['error' => 'Uber auth request failed', 'details' => $response['error']];
    }

    if (($response['status'] ?? 500) < 200 || ($response['status'] ?? 500) >= 300) {
        return [
            'error' => 'Uber auth failed',
            'status' => $response['status'],
            'details' => $response['data'],
        ];
    }

    $token = $response['data']['access_token'] ?? null;
    if (!$token) {
        return ['error' => 'Uber auth returned no access token', 'details' => $response['data']];
    }

    cacheUberToken($token, (int) ($response['data']['expires_in'] ?? 2592000));

    return ['access_token' => $token];
}

function normalizeBrazilianZipCode(?string $zipCode): string
{
    return preg_replace('/\D+/', '', (string) ($zipCode ?? ''));
}

function geocodeCacheFile(string $address): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'gelocrm_geocode_'
        . md5($address)
        . '.json';
}

function getCachedCoordinates(string $address): ?array
{
    $cacheFile = geocodeCacheFile($address);
    if (!is_file($cacheFile) || (time() - (int) filemtime($cacheFile)) >= GEOCODE_CACHE_TTL) {
        return null;
    }

    $payload = json_decode((string) file_get_contents($cacheFile), true);
    if (!is_array($payload)) {
        return null;
    }

    $lat = isset($payload['lat']) ? (float) $payload['lat'] : null;
    $lon = isset($payload['lon']) ? (float) $payload['lon'] : null;

    if ($lat === null || $lon === null) {
        return null;
    }

    return ['lat' => $lat, 'lon' => $lon];
}

function cacheCoordinates(string $address, float $lat, float $lon): void
{
    $cacheFile = geocodeCacheFile($address);
    @file_put_contents($cacheFile, json_encode([
        'lat' => $lat,
        'lon' => $lon,
    ]));
}

function geocodeAddressCoordinates(string $address): ?array
{
    $address = trim($address);
    if ($address === '') {
        return null;
    }

    $cached = getCachedCoordinates($address);
    if ($cached) {
        return $cached;
    }

    $url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=' . rawurlencode($address);
    $response = curlRequest(
        $url,
        'GET',
        null,
        [
            'Accept: application/json',
            'User-Agent: GeloCRM/1.0',
        ]
    );

    if (($response['status'] ?? 500) < 200 || ($response['status'] ?? 500) >= 300) {
        return null;
    }

    $rows = $response['data']['value'] ?? $response['data'];
    if (!is_array($rows) || empty($rows[0]['lat']) || empty($rows[0]['lon'])) {
        return null;
    }

    $coordinates = [
        'lat' => (float) $rows[0]['lat'],
        'lon' => (float) $rows[0]['lon'],
    ];

    cacheCoordinates($address, $coordinates['lat'], $coordinates['lon']);

    return $coordinates;
}

function haversineDistanceKm(array $origin, array $destination): float
{
    $earthRadiusKm = 6371;
    $latFrom = deg2rad((float) $origin['lat']);
    $lonFrom = deg2rad((float) $origin['lon']);
    $latTo = deg2rad((float) $destination['lat']);
    $lonTo = deg2rad((float) $destination['lon']);

    $latDelta = $latTo - $latFrom;
    $lonDelta = $lonTo - $lonFrom;

    $angle = 2 * asin(sqrt(
        pow(sin($latDelta / 2), 2)
        + cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)
    ));

    return $earthRadiusKm * $angle;
}

function getApproximateDistanceKm(string $originAddress, string $destinationAddress): ?float
{
    $origin = geocodeAddressCoordinates($originAddress);
    $destination = geocodeAddressCoordinates($destinationAddress);

    if (!$origin || !$destination) {
        return null;
    }

    return round(haversineDistanceKm($origin, $destination), 1);
}

function buildGeocodeSearchAddress(string $address, string $addressNumber = '', string $addressComplement = '', string $zipCode = ''): string
{
    $address = trim($address);
    $addressNumber = trim($addressNumber);
    $addressComplement = trim($addressComplement);
    $zipCode = normalizeBrazilianZipCode($zipCode);

    if (
        $addressNumber !== ''
        && preg_match('/^(.*?),\s*(.*?)\s*-\s*([^\/]+)\/([A-Za-z]{2})$/u', $address, $matches)
    ) {
        $street = trim($matches[1]);
        $neighborhood = trim($matches[2]);
        $city = trim($matches[3]);
        $state = strtoupper(trim($matches[4]));

        $address = trim(implode(', ', array_filter([
            $street . ', ' . $addressNumber . ' - ' . $neighborhood,
            $city . '/' . $state,
        ])));
    } elseif ($addressNumber !== '' && strpos($address, ',') !== false) {
        $firstComma = strpos($address, ',');
        $street = trim(substr($address, 0, $firstComma));
        $rest = trim(substr($address, $firstComma + 1));
        $address = $street . ', ' . $addressNumber . ($rest !== '' ? ' - ' . $rest : '');
    } elseif ($addressNumber !== '') {
        $address .= ', ' . $addressNumber;
    }

    $parts = [
        $address,
        $addressComplement !== '' ? $addressComplement : null,
        $zipCode !== '' ? $zipCode : null,
    ];

    $search = trim(implode(', ', array_filter($parts)));
    if ($search !== '' && stripos($search, '/MG') === false && stripos($search, 'Belo Horizonte') === false) {
        $search .= ', Belo Horizonte, MG, Brasil';
    }

    return $search;
}

function parseDropoffAddressParts(string $addressLine, ?string $number = null, ?string $complement = null, ?string $zipCode = null): ?string
{
    $addressLine = trim($addressLine);
    if ($addressLine === '') {
        return null;
    }

    if (preg_match('/^(.*?),\s*(.*?)\s*-\s*([^\/]+)\/([A-Za-z]{2})$/u', $addressLine, $matches)) {
        $street = trim($matches[1]);
        $neighborhood = trim($matches[2]);
        $city = trim($matches[3]);
        $state = strtoupper(trim($matches[4]));
        $streetAddress = trim($street . ($number ? ', ' . trim($number) : ''));
        $streetAddress2 = trim($neighborhood . ($complement ? ' - ' . trim($complement) : ''));

        return json_encode([
            'street_address' => array_values(array_filter([$streetAddress, $streetAddress2])),
            'city' => $city,
            'state' => $state,
            'zip_code' => normalizeBrazilianZipCode($zipCode),
            'country' => 'BR',
        ]);
    }

    return null;
}

function parseStoreAddressParts(string $storeAddress): ?string
{
    $storeAddress = trim($storeAddress);
    if ($storeAddress === '') {
        return null;
    }

    if (preg_match('/^(.*?),\s*([^,]+?)\s*-\s*([^,]+),\s*([^,-]+)\s*-\s*([A-Za-z]{2}),\s*(\d{5}-?\d{3})$/u', $storeAddress, $matches)) {
        $street = trim($matches[1]);
        $number = trim($matches[2]);
        $neighborhood = trim($matches[3]);
        $city = trim($matches[4]);
        $state = strtoupper(trim($matches[5]));
        $zipCode = normalizeBrazilianZipCode($matches[6]);

        return json_encode([
            'street_address' => array_values(array_filter([$street . ', ' . $number, $neighborhood])),
            'city' => $city,
            'state' => $state,
            'zip_code' => $zipCode,
            'country' => 'BR',
        ]);
    }

    $parts = array_map('trim', explode(',', $storeAddress));
    if (count($parts) < 4) {
        return null;
    }

    $zipCode = normalizeBrazilianZipCode(array_pop($parts));
    $cityState = array_pop($parts);
    $neighborhood = array_pop($parts);
    $streetAddress = implode(', ', $parts);

    if (preg_match('/^(.*?)\s*-\s*([A-Za-z]{2})$/u', $cityState, $matches)) {
        $city = trim($matches[1]);
        $state = strtoupper(trim($matches[2]));

        return json_encode([
            'street_address' => array_values(array_filter([$streetAddress, $neighborhood])),
            'city' => $city,
            'state' => $state,
            'zip_code' => $zipCode,
            'country' => 'BR',
        ]);
    }

    return null;
}

function formatPhoneForUber(?string $phone): ?string
{
    $digits = preg_replace('/\D+/', '', (string) ($phone ?? ''));
    if ($digits === '') {
        return null;
    }

    if (strpos($digits, '55') !== 0 && (strlen($digits) === 10 || strlen($digits) === 11)) {
        $digits = '55' . $digits;
    }

    if (strlen($digits) < 12 || strlen($digits) > 15) {
        return null;
    }

    return '+' . $digits;
}

function buildUberManifestItems(array $items): array
{
    $manifestItems = [];

    foreach ($items as $item) {
        $name = trim((string) ($item['name'] ?? 'Item'));
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $priceCents = max(0, (int) round(((float) ($item['price'] ?? 0)) * 100));
        if ($name === '') {
            continue;
        }

        $product = storageGetProductById((int) ($item['id'] ?? 0)) ?: [];
        $weight = max(1, (int) ($product['uber_item_weight_grams'] ?? 1000));
        $length = max(1, (int) ($product['uber_item_length_cm'] ?? 20));
        $height = max(1, (int) ($product['uber_item_height_cm'] ?? 20));
        $depth = max(1, (int) ($product['uber_item_depth_cm'] ?? 20));

        $manifestItem = [
            'name' => $name,
            'quantity' => $quantity,
            'size' => 'small',
            'weight' => $weight,
            'dimensions' => [
                'length' => $length,
                'height' => $height,
                'depth' => $depth,
            ],
        ];

        if ($priceCents > 0) {
            $manifestItem['price'] = $priceCents;
        }

        $manifestItems[] = $manifestItem;
    }

    if (empty($manifestItems)) {
        $manifestItems[] = [
            'name' => 'Pedido',
            'quantity' => 1,
            'size' => 'small',
            'weight' => 1000,
            'dimensions' => [
                'length' => 20,
                'height' => 20,
                'depth' => 20,
            ],
        ];
    }

    return $manifestItems;
}

function getUberQuote(string $dropoffAddress, ?string $dropoffGeocodeAddress = null): array
{
    if (empty($dropoffAddress)) {
        return ['status' => 422, 'data' => ['message' => 'Dropoff address is required']];
    }

    if (empty(UBER_CLIENT_ID) || empty(UBER_CLIENT_SECRET) || empty(UBER_CUSTOMER_ID)) {
        return ['status' => 200, 'data' => ['demo' => true]];
    }

    $token = getUberToken();
    if (!empty($token['error'])) {
        return ['status' => 502, 'data' => $token];
    }

    $url = UBER_ENV === 'production'
        ? 'https://api.uber.com/v1/customers/' . UBER_CUSTOMER_ID . '/delivery_quotes'
        : 'https://sandbox-api.uber.com/v1/customers/' . UBER_CUSTOMER_ID . '/delivery_quotes';

    $pickupAddress = STORE_ADDRESS;
    $payload = [
        'pickup_address' => $pickupAddress,
        'dropoff_address' => $dropoffAddress,
    ];

    $pickupCoordinates = geocodeAddressCoordinates(STORE_ADDRESS);
    if ($pickupCoordinates) {
        $payload['pickup_latitude'] = $pickupCoordinates['lat'];
        $payload['pickup_longitude'] = $pickupCoordinates['lon'];
    }

    $dropoffCoordinates = $dropoffGeocodeAddress ? geocodeAddressCoordinates($dropoffGeocodeAddress) : null;
    if ($dropoffCoordinates) {
        $payload['dropoff_latitude'] = $dropoffCoordinates['lat'];
        $payload['dropoff_longitude'] = $dropoffCoordinates['lon'];
    }

    return curlRequest(
        $url,
        'POST',
        $payload,
        [
            'Authorization: Bearer ' . $token['access_token'],
            'Content-Type: application/json',
        ]
    );
}

function fallbackStructuredOrderAddress(array $order): array
{
    $snapshot = trim((string) ($order['address'] ?? ''));
    if ($snapshot === '') {
        return [
            'address_line' => '',
            'address_number' => '',
            'address_complement' => '',
        ];
    }

    if (preg_match('/^(.*?)(?:\s*-\s*N[ºo]?\s*|\s*,\s*|\s+-\s+)(\d+)(?:\s*-\s*(.*))?$/u', $snapshot, $matches)) {
        return [
            'address_line' => trim((string) ($matches[1] ?? '')),
            'address_number' => trim((string) ($matches[2] ?? '')),
            'address_complement' => trim((string) ($matches[3] ?? '')),
        ];
    }

    return [
        'address_line' => $snapshot,
        'address_number' => '',
        'address_complement' => '',
    ];
}

function buildUberOrderDropoffAddresses(array $order): array
{
    $addressLine = trim((string) ($order['address_line'] ?? ''));
    $addressNumber = trim((string) ($order['address_number'] ?? ''));
    $addressComplement = trim((string) ($order['address_complement'] ?? ''));
    $zipCode = trim((string) ($order['customer_cep'] ?? ''));

    if ($addressLine === '' || $addressNumber === '') {
        $fallback = fallbackStructuredOrderAddress($order);
        $addressLine = $addressLine !== '' ? $addressLine : $fallback['address_line'];
        $addressNumber = $addressNumber !== '' ? $addressNumber : $fallback['address_number'];
        $addressComplement = $addressComplement !== '' ? $addressComplement : $fallback['address_complement'];
    }

    if ($addressLine === '' || $addressNumber === '') {
        throw new RuntimeException('Pedido sem endereco estruturado suficiente para criar a entrega Uber.', 422);
    }

    $apiAddress = buildGeocodeSearchAddress($addressLine, $addressNumber, $addressComplement, $zipCode);

    return [
        'api_address' => $apiAddress,
        'geocode_address' => $apiAddress,
    ];
}

function isUberQuoteExpired(?string $expiresAt): bool
{
    $expiresAt = trim((string) ($expiresAt ?? ''));
    if ($expiresAt === '') {
        return true;
    }

    $timestamp = strtotime($expiresAt);
    if ($timestamp === false) {
        return true;
    }

    return $timestamp <= (time() + 60);
}

function buildUberDispatchErrorMessage(array $response, string $fallback = 'Falha ao criar entrega na Uber.'): string
{
    $data = $response['data'] ?? [];
    if (!is_array($data)) {
        return $fallback;
    }

    if (!empty($data['message']) && is_string($data['message'])) {
        return $data['message'];
    }

    if (!empty($data['details']['message']) && is_string($data['details']['message'])) {
        return $data['details']['message'];
    }

    if (!empty($data['details']) && is_array($data['details'])) {
        foreach ($data['details'] as $detail) {
            if (is_string($detail) && trim($detail) !== '') {
                return trim($detail);
            }

            if (is_array($detail) && !empty($detail['message']) && is_string($detail['message'])) {
                return $detail['message'];
            }
        }
    }

    if (!empty($data['raw']) && is_string($data['raw'])) {
        return $data['raw'];
    }

    if (!empty($response['error']) && is_string($response['error'])) {
        return $response['error'];
    }

    if (!empty($data)) {
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($encoded) && $encoded !== '') {
            return $encoded;
        }
    }

    return $fallback;
}

function summarizeUberPayload(array $payload): string
{
    $summary = [
        'quote_id' => trim((string) ($payload['quote_id'] ?? '')) !== '' ? 'ok' : 'missing',
        'pickup_phone_number' => $payload['pickup_phone_number'] ?? 'none',
        'dropoff_phone_number' => $payload['dropoff_phone_number'] ?? 'none',
        'pickup_address_mode' => str_starts_with(trim((string) ($payload['pickup_address'] ?? '')), '{') ? 'structured' : 'text',
        'dropoff_address_mode' => str_starts_with(trim((string) ($payload['dropoff_address'] ?? '')), '{') ? 'structured' : 'text',
        'manifest_items' => is_array($payload['manifest_items'] ?? null) ? count($payload['manifest_items']) : 0,
    ];

    return json_encode($summary, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
}

function pickFirstNonEmptyString(...$candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (!is_scalar($candidate)) {
            continue;
        }

        $value = trim((string) $candidate);
        if ($value !== '') {
            return $value;
        }
    }

    return null;
}

function buildUberCourierVehicleLabel(array $courier): ?string
{
    $parts = array_filter([
        pickFirstNonEmptyString($courier['vehicle_type'] ?? null),
        pickFirstNonEmptyString($courier['vehicle_make'] ?? null),
        pickFirstNonEmptyString($courier['vehicle_model'] ?? null),
        pickFirstNonEmptyString($courier['vehicle_color'] ?? null),
    ], static fn ($value) => is_string($value) && $value !== '');

    if (empty($parts)) {
        return null;
    }

    return implode(' / ', $parts);
}

function extractUberCourierUpdates(array $payload): array
{
    $courier = [];

    if (isset($payload['courier']) && is_array($payload['courier'])) {
        $courier = $payload['courier'];
    } elseif (
        isset($payload['courier_trips'][0]['courier'])
        && is_array($payload['courier_trips'][0]['courier'])
    ) {
        $courier = $payload['courier_trips'][0]['courier'];
    } elseif (
        isset($payload['courier_trips'][0]['delivery_person'])
        && is_array($payload['courier_trips'][0]['delivery_person'])
    ) {
        $courier = $payload['courier_trips'][0]['delivery_person'];
    }

    if (empty($courier)) {
        return [];
    }

    $publicPhoneInfo = [];
    if (isset($courier['public_phone_info']) && is_array($courier['public_phone_info'])) {
        $publicPhoneInfo = $courier['public_phone_info'];
    }

    $updates = [];

    $courierName = pickFirstNonEmptyString($courier['name'] ?? null);
    if ($courierName !== null) {
        $updates['uber_courier_name'] = $courierName;
    }

    $courierPhone = pickFirstNonEmptyString(
        $publicPhoneInfo['phone_number'] ?? null,
        $publicPhoneInfo['formatted_phone_number'] ?? null,
        $courier['phone_number'] ?? null
    );
    if ($courierPhone !== null) {
        $updates['uber_courier_phone'] = $courierPhone;
    }

    $courierPin = pickFirstNonEmptyString(
        $publicPhoneInfo['pin_code'] ?? null,
        $courier['pin_code'] ?? null
    );
    if ($courierPin !== null) {
        $updates['uber_courier_pin'] = $courierPin;
    }

    $courierVehicle = buildUberCourierVehicleLabel($courier);
    if ($courierVehicle !== null) {
        $updates['uber_courier_vehicle'] = $courierVehicle;
    }

    $courierPlate = pickFirstNonEmptyString($courier['vehicle_license_plate'] ?? null);
    if ($courierPlate !== null) {
        $updates['uber_courier_plate'] = $courierPlate;
    }

    return $updates;
}

function refreshUberQuoteForOrder(array $order): array
{
    $addresses = buildUberOrderDropoffAddresses($order);
    $quote = getUberQuote($addresses['api_address'], $addresses['geocode_address']);

    if (($quote['status'] ?? 500) < 200 || ($quote['status'] ?? 500) >= 300) {
        throw new RuntimeException(
            buildUberDispatchErrorMessage($quote, 'Falha ao renovar a cotacao da Uber para este pedido.'),
            $quote['status'] ?? 502
        );
    }

    $data = $quote['data'] ?? [];
    $updatedOrder = storageUpdateOrderById((int) ($order['id'] ?? 0), [
        'uber_estimate_id' => $data['id'] ?? null,
        'delivery_fee' => (UBER_ENV !== 'production') ? 0.01 : (isset($data['fee']) ? ((float) $data['fee']) / 100 : (float) ($order['delivery_fee'] ?? 0)),
        'uber_quote_expires_at' => $data['expires'] ?? null,
        'uber_dropoff_eta' => $data['dropoff_eta'] ?? null,
        'uber_error_message' => null,
    ]);

    return [
        'order' => $updatedOrder ?: storageGetOrderDetailsById((int) ($order['id'] ?? 0)),
        'quote' => $data,
        'addresses' => $addresses,
    ];
}

function buildUberDeliveryPayload(array $order, array $addresses, bool $forceRetry = false): array
{
    $items = json_decode((string) ($order['items'] ?? '[]'), true);
    $pickupAddress = STORE_ADDRESS;
    $externalOrderId = trim((string) ($order['external_order_nsu'] ?? ('pedido-' . ($order['id'] ?? '0'))));
    $pickupPhone = formatPhoneForUber(STORE_PHONE);
    if (!$pickupPhone) {
        throw new RuntimeException('Configure STORE_PHONE com o telefone da loja para despachar na Uber.', 422);
    }

    $payload = [
        'quote_id' => (string) ($order['uber_estimate_id'] ?? ''),
        'pickup_address' => $pickupAddress,
        'pickup_name' => STORE_NAME,
        'pickup_phone_number' => $pickupPhone,
        'dropoff_address' => $addresses['api_address'],
        'dropoff_name' => trim((string) ($order['customer_name'] ?? '')) ?: 'Cliente',
        'manifest_items' => buildUberManifestItems(is_array($items) ? $items : []),
        'external_order_id' => $externalOrderId,
    ];

    $dropoffPhone = formatPhoneForUber((string) ($order['customer_phone'] ?? ''));
    if ($dropoffPhone) {
        $payload['dropoff_phone_number'] = $dropoffPhone;
    }

    $pickupCoordinates = geocodeAddressCoordinates(STORE_ADDRESS);
    if ($pickupCoordinates) {
        $payload['pickup_latitude'] = $pickupCoordinates['lat'];
        $payload['pickup_longitude'] = $pickupCoordinates['lon'];
    }

    $dropoffCoordinates = geocodeAddressCoordinates($addresses['geocode_address']);
    if ($dropoffCoordinates) {
        $payload['dropoff_latitude'] = $dropoffCoordinates['lat'];
        $payload['dropoff_longitude'] = $dropoffCoordinates['lon'];
    }

    if (UBER_SANDBOX_AUTO_COURIER && UBER_ENV !== 'production') {
        $payload['test_specifications'] = [
            'robo_courier_specification' => [
                'mode' => 'auto',
            ],
        ];
    }

    return $payload;
}

function resolveUberTestCourierVehicleOverride(): ?string
{
    if (UBER_ENV === 'production') {
        return null;
    }

    $settings = storageGetStoreSettings();
    $type = strtolower(trim((string) ($settings['uber_test_courier_type'] ?? 'auto')));

    return match ($type) {
        'moto' => 'Moto (teste)',
        'carro' => 'Carro (teste)',
        default => null,
    };
}

function createUberDelivery(array $payload): array
{
    if (empty(UBER_CLIENT_ID) || empty(UBER_CLIENT_SECRET) || empty(UBER_CUSTOMER_ID)) {
        return [
            'status' => 422,
            'data' => ['message' => 'Credenciais da Uber Direct nao configuradas.'],
        ];
    }

    $token = getUberToken();
    if (!empty($token['error'])) {
        return ['status' => 502, 'data' => $token];
    }

    $url = UBER_ENV === 'production'
        ? 'https://api.uber.com/v1/customers/' . UBER_CUSTOMER_ID . '/deliveries'
        : 'https://sandbox-api.uber.com/v1/customers/' . UBER_CUSTOMER_ID . '/deliveries';

    return curlRequest(
        $url,
        'POST',
        $payload,
        [
            'Authorization: Bearer ' . $token['access_token'],
            'Content-Type: application/json',
        ]
    );
}

function mapUberDeliveryToOrderState(?string $uberStatus, bool $printed = true): array
{
    $normalized = strtoupper(trim((string) ($uberStatus ?? '')));

    return match ($normalized) {
        'PICKUP_COMPLETE', 'DROP_OFF', 'DROPOFF', 'EN_ROUTE_TO_DROPOFF', 'ARRIVED_AT_DROPOFF' => [
            'delivery_status' => 'in_transit',
            'order_status' => 'shipped',
        ],
        'DELIVERED', 'COMPLETED' => [
            'delivery_status' => 'delivered',
            'order_status' => 'delivered',
        ],
        'FAILED', 'CANCELLED', 'CANCELED', 'RETURNED' => [
            'delivery_status' => 'failed',
            'order_status' => $printed ? 'preparing' : 'pending',
        ],
        'PICKUP', 'PENDING', 'SCHEDULED', 'ONGOING', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP' => [
            'delivery_status' => 'created',
            'order_status' => $printed ? 'preparing' : 'pending',
        ],
        default => [
            'delivery_status' => $printed ? 'created' : 'not_requested',
            'order_status' => $printed ? 'preparing' : 'pending',
        ],
    };
}

function dispatchUberForOrder(int $orderId, bool $forceRetry = false): array
{
    $order = storageGetOrderDetailsById($orderId);
    if (!$order) {
        throw new RuntimeException('Pedido nao encontrado.', 404);
    }

    if (($order['payment_status'] ?? 'pending') !== 'paid') {
        throw new RuntimeException('A entrega so pode ser criada para pedidos pagos.', 409);
    }

    if (($order['status'] ?? '') === 'cancelled') {
        throw new RuntimeException('Pedido cancelado nao pode ser despachado.', 409);
    }

    if (($order['print_status'] ?? 'pending') !== 'printed') {
        throw new RuntimeException('Imprima o pedido antes de chamar a Uber.', 409);
    }

    if (($order['delivery_mode'] ?? 'uber') !== 'uber') {
        throw new RuntimeException('Esse pedido esta configurado para despacho particular.', 409);
    }

    if (!$forceRetry && !empty($order['uber_delivery_id'])) {
        return $order;
    }

    try {
        $addresses = buildUberOrderDropoffAddresses($order);
        $resolvedOrder = $order;

        if ($forceRetry || empty($order['uber_estimate_id']) || isUberQuoteExpired((string) ($order['uber_quote_expires_at'] ?? ''))) {
            $refreshed = refreshUberQuoteForOrder($order);
            $resolvedOrder = $refreshed['order'] ?: $order;
            $addresses = $refreshed['addresses'];
        }

        if (empty($resolvedOrder['uber_estimate_id'])) {
            throw new RuntimeException('Nao foi possivel obter uma cotacao valida da Uber para este pedido.', 422);
        }

        storageUpdateOrderById($orderId, [
            'delivery_status' => 'dispatching',
            'uber_error_message' => null,
        ]);

        $deliveryPayload = buildUberDeliveryPayload($resolvedOrder, $addresses, $forceRetry);
        $deliveryResponse = createUberDelivery($deliveryPayload);
        if (($deliveryResponse['status'] ?? 500) < 200 || ($deliveryResponse['status'] ?? 500) >= 300) {
            $message = buildUberDispatchErrorMessage($deliveryResponse, 'Falha ao criar entrega na Uber.');
            if (stripos($message, 'The parameters of your request were invalid') !== false) {
                $summary = summarizeUberPayload($deliveryPayload);
                if ($summary !== '') {
                    $message .= ' | payload=' . $summary;
                }
            }
            throw new RuntimeException($message, $deliveryResponse['status'] ?? 502);
        }

        $deliveryData = $deliveryResponse['data'] ?? [];
        $mappedState = mapUberDeliveryToOrderState((string) ($deliveryData['status'] ?? 'pending'), true);
        $courierUpdates = extractUberCourierUpdates(is_array($deliveryData) ? $deliveryData : []);
        $vehicleOverride = resolveUberTestCourierVehicleOverride();
        if ($vehicleOverride !== null && empty($courierUpdates['uber_courier_vehicle'])) {
            $courierUpdates['uber_courier_vehicle'] = $vehicleOverride;
        }

        $updated = storageUpdateOrderById($orderId, array_merge([
            'status' => $mappedState['order_status'],
            'delivery_status' => $mappedState['delivery_status'],
            'uber_delivery_id' => $deliveryData['id'] ?? null,
            'uber_tracking_url' => $deliveryData['tracking_url'] ?? ($deliveryData['order_tracking_url'] ?? null),
            'uber_error_message' => null,
            'dispatched_at' => ['raw' => 'CURRENT_TIMESTAMP'],
            'delivery_fee' => (UBER_ENV !== 'production') ? 0.01 : (isset($deliveryData['fee']) ? ((float) $deliveryData['fee']) / 100 : (float) ($resolvedOrder['delivery_fee'] ?? 0)),
            'uber_dropoff_eta' => $deliveryData['dropoff_eta'] ?? ($resolvedOrder['uber_dropoff_eta'] ?? null),
            'uber_order_id' => $deliveryData['order_id'] ?? ($deliveryData['id'] ?? null),
        ], $courierUpdates));

        return $updated ?: storageGetOrderDetailsById($orderId) ?: $resolvedOrder;
    } catch (\Throwable $e) {
        $message = trim($e->getMessage()) !== '' ? trim($e->getMessage()) : 'Falha ao criar entrega na Uber.';
        storageUpdateOrderById($orderId, [
            'status' => 'preparing',
            'delivery_status' => 'failed',
            'uber_error_message' => $message,
            'uber_tracking_url' => null,
            'uber_delivery_id' => null,
            'uber_order_id' => null,
            'uber_courier_name' => null,
            'uber_courier_phone' => null,
            'uber_courier_pin' => null,
            'uber_courier_vehicle' => null,
            'uber_courier_plate' => null,
        ]);

        throw new RuntimeException($message, exceptionStatus($e, 502), $e);
    }
}

function fetchUberDeliveryStatusByResource(string $resourceHref): array
{
    $resourceHref = trim($resourceHref);
    if ($resourceHref === '') {
        return ['status' => 422, 'data' => ['message' => 'Uber resource href is required']];
    }

    $token = getUberToken();
    if (!empty($token['error'])) {
        return ['status' => 502, 'data' => $token];
    }

    return curlRequest(
        $resourceHref,
        'GET',
        null,
        [
            'Authorization: Bearer ' . $token['access_token'],
            'Content-Type: application/json',
        ]
    );
}

function uberDeliveryPollCacheFile(int $orderId): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'gelocrm_uber_poll_'
        . $orderId
        . '.txt';
}

function shouldPollUberDelivery(array $order, int $ttlSeconds = 8): bool
{
    if (empty($order['uber_delivery_id'])) {
        return false;
    }

    $deliveryStatus = (string) ($order['delivery_status'] ?? 'not_requested');
    if (!in_array($deliveryStatus, ['dispatching', 'created', 'in_transit'], true)) {
        return false;
    }

    $cacheFile = uberDeliveryPollCacheFile((int) ($order['id'] ?? 0));
    if (!is_file($cacheFile)) {
        return true;
    }

    $lastCheck = (int) @file_get_contents($cacheFile);
    return $lastCheck <= (time() - $ttlSeconds);
}

function markUberDeliveryPolled(int $orderId): void
{
    @file_put_contents(uberDeliveryPollCacheFile($orderId), (string) time());
}

function fetchUberDeliveryById(string $deliveryId): array
{
    $deliveryId = trim($deliveryId);
    if ($deliveryId === '') {
        return ['status' => 422, 'data' => ['message' => 'Uber delivery id is required']];
    }

    $token = getUberToken();
    if (!empty($token['error'])) {
        return ['status' => 502, 'data' => $token];
    }

    $baseUrl = UBER_ENV === 'production' ? 'https://api.uber.com' : 'https://sandbox-api.uber.com';
    $url = $baseUrl . '/v1/customers/' . UBER_CUSTOMER_ID . '/deliveries/' . rawurlencode($deliveryId);

    $response = curlRequest(
        $url,
        'GET',
        null,
        [
            'Authorization: Bearer ' . $token['access_token'],
            'Accept: application/json',
        ]
    );

    if (($response['status'] ?? 500) >= 400) {
        @file_put_contents('uber_error.log', "URL: $url | Response: " . print_r($response, true) . PHP_EOL, FILE_APPEND);
    }

    return $response;
}

function syncUberDeliveryForOrder(array $order, bool $force = false): array
{
    $orderId = (int) ($order['id'] ?? 0);
    if ($orderId <= 0 || empty($order['uber_delivery_id'])) {
        return $order;
    }

    if (!$force && !shouldPollUberDelivery($order)) {
        return $order;
    }

    markUberDeliveryPolled($orderId);
    $response = fetchUberDeliveryById((string) $order['uber_delivery_id']);
    if (($response['status'] ?? 500) < 200 || ($response['status'] ?? 500) >= 300) {
        return $order;
    }

    $data = is_array($response['data'] ?? null) ? $response['data'] : [];
    if (empty($data)) {
        return $order;
    }

    $statusCode = (string) ($data['status'] ?? '');
    $mappedState = mapUberDeliveryToOrderState($statusCode, ($order['print_status'] ?? 'pending') === 'printed');
    $courierUpdates = extractUberCourierUpdates($data);

    $updated = storageUpdateOrderById($orderId, array_merge([
        'status' => $mappedState['order_status'],
        'delivery_status' => $mappedState['delivery_status'],
        'uber_delivery_id' => $data['id'] ?? ($order['uber_delivery_id'] ?? null),
        'uber_order_id' => $data['order_id'] ?? ($order['uber_order_id'] ?? null),
        'uber_tracking_url' => $data['tracking_url'] ?? ($data['order_tracking_url'] ?? ($order['uber_tracking_url'] ?? null)),
        'uber_dropoff_eta' => $data['dropoff_eta'] ?? ($order['uber_dropoff_eta'] ?? null),
        'uber_error_message' => null,
    ], $courierUpdates));

    return $updated ?: (storageGetOrderDetailsById($orderId) ?: $order);
}

function syncTrackedUberOrders(array $orders, bool $force = false): array
{
    $synced = [];

    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }

        $synced[] = syncUberDeliveryForOrder($order, $force);
    }

    return $synced;
}

function syncUberWebhookPayload(array $payload): ?array
{
    $meta = isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : [];
    $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];

    $externalOrderId = trim((string) ($meta['external_order_id'] ?? $data['external_id'] ?? ''));
    if ($externalOrderId === '') {
        return null;
    }

    $order = storageGetOrderByNsu($externalOrderId);
    if (!$order) {
        return null;
    }

    $deliveryStatusCode = (string) ($meta['status'] ?? $data['status'] ?? '');
    $uberOrderId = (string) ($meta['order_id'] ?? '');
    $uberDeliveryId = (string) ($payload['delivery_id'] ?? $data['id'] ?? '');
    $trackingUrl = (string) ($data['tracking_url'] ?? '');
    $dropoffEta = pickFirstNonEmptyString($data['dropoff_eta'] ?? null);
    $errorMessage = '';
    $courierUpdates = extractUberCourierUpdates($data);

    $resourceHref = trim((string) ($payload['resource_href'] ?? ''));
    if ($resourceHref !== '') {
        $statusResponse = fetchUberDeliveryStatusByResource($resourceHref);
        if (($statusResponse['status'] ?? 500) >= 200 && ($statusResponse['status'] ?? 500) < 300) {
            $statusData = $statusResponse['data'] ?? [];
            $trackingUrl = (string) ($statusData['order_tracking_url'] ?? $statusData['tracking_url'] ?? $trackingUrl);
            $uberOrderId = (string) ($statusData['order_id'] ?? $uberOrderId);
            $uberDeliveryId = (string) ($statusData['id'] ?? $uberDeliveryId);
            $dropoffEta = pickFirstNonEmptyString($statusData['dropoff_eta'] ?? null, $dropoffEta);
            $courierUpdates = array_merge($courierUpdates, extractUberCourierUpdates(is_array($statusData) ? $statusData : []));

            $tripStatus = $statusData['courier_trips'][0]['status']['status_code'] ?? '';
            if (is_string($tripStatus) && $tripStatus !== '') {
                $deliveryStatusCode = $tripStatus;
            } elseif (!empty($statusData['order_status']) && is_string($statusData['order_status'])) {
                $deliveryStatusCode = $statusData['order_status'];
            }
        }
    }

    if ($deliveryStatusCode === '') {
        $deliveryStatusCode = (string) ($payload['status'] ?? 'pending');
    }

    $mappedState = mapUberDeliveryToOrderState($deliveryStatusCode, ($order['print_status'] ?? 'pending') === 'printed');
    if ($mappedState['delivery_status'] === 'failed') {
        $errorMessage = trim((string) ($data['undeliverable_reason'] ?? $payload['cancellation_reason'] ?? 'Falha reportada pela Uber.'));
    }

    return storageUpdateOrderById((int) ($order['id'] ?? 0), array_merge([
        'status' => $mappedState['order_status'],
        'delivery_status' => $mappedState['delivery_status'],
        'uber_order_id' => $uberOrderId !== '' ? $uberOrderId : null,
        'uber_delivery_id' => $uberDeliveryId !== '' ? $uberDeliveryId : ($order['uber_delivery_id'] ?? null),
        'uber_tracking_url' => $trackingUrl !== '' ? $trackingUrl : ($order['uber_tracking_url'] ?? null),
        'uber_dropoff_eta' => $dropoffEta ?? ($order['uber_dropoff_eta'] ?? null),
        'uber_error_message' => $errorMessage !== '' ? $errorMessage : null,
    ], $courierUpdates));
}

function formatPhoneForInfinitePay(?string $phone): ?string
{
    if (!$phone) {
        return null;
    }

    $digits = preg_replace('/\D+/', '', $phone);
    if ($digits === '') {
        return null;
    }

    if (strpos($digits, '55') !== 0 && (strlen($digits) === 10 || strlen($digits) === 11)) {
        $digits = '55' . $digits;
    }

    return '+' . $digits;
}

function buildInfinitePayItems(array $items, float $deliveryFee): array
{
    $payloadItems = [];

    foreach ($items as $item) {
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $priceCents = (int) round(((float) ($item['price'] ?? 0)) * 100);
        $description = trim((string) ($item['name'] ?? $item['description'] ?? 'Item'));

        if ($priceCents <= 0) {
            continue;
        }

        $payloadItems[] = [
            'quantity' => $quantity,
            'price' => $priceCents,
            'description' => $description,
        ];
    }

    if ($deliveryFee > 0) {
        $payloadItems[] = [
            'quantity' => 1,
            'price' => (int) round($deliveryFee * 100),
            'description' => 'Taxa de entrega',
        ];
    }

    return $payloadItems;
}

function buildInfinitePayPayload(array $data, string $orderNsu, ?string $redirectUrl = null): array
{
    $payload = [
        'handle' => INFINITEPAY_HANDLE,
        'redirect_url' => sanitizeInfinitePayRedirectUrl($redirectUrl ?? ($data['redirect_url'] ?? null)),
        'order_nsu' => $orderNsu,
        'items' => buildInfinitePayItems($data['items'] ?? [], (float) ($data['delivery_fee'] ?? 0)),
    ];

    if (!empty(INFINITEPAY_WEBHOOK_URL) && !isLocalAppHost(INFINITEPAY_WEBHOOK_URL)) {
        $payload['webhook_url'] = INFINITEPAY_WEBHOOK_URL;
    }

    $customer = [];
    if (!empty($data['customer_name'])) {
        $customer['name'] = $data['customer_name'];
    }

    $phone = formatPhoneForInfinitePay($data['phone'] ?? null);
    if ($phone) {
        $customer['phone_number'] = $phone;
    }

    if (!empty($data['customer_email'])) {
        $customer['email'] = $data['customer_email'];
    }

    if (!empty($customer)) {
        $payload['customer'] = $customer;
    }

    $address = [];
    if (!empty($data['cep'])) {
        $address['cep'] = preg_replace('/\D+/', '', (string) $data['cep']);
    }
    if (!empty($data['address_number'])) {
        $address['number'] = (string) $data['address_number'];
    }
    if (!empty($data['address_complement'])) {
        $address['complement'] = (string) $data['address_complement'];
    }

    if (!empty($address)) {
        $payload['address'] = $address;
    }

    if (INFINITEPAY_MOCK && !empty($data['mock_payment_status'])) {
        $payload['_mock_payment_status'] = strtolower(trim((string) $data['mock_payment_status']));
    }

    return $payload;
}

function buildInfinitePayPayloadFromOrder(array $order, ?string $mockPaymentStatus = null, ?string $redirectUrl = null): array
{
    $items = json_decode((string) ($order['items'] ?? '[]'), true);

    $payloadData = [
        'items' => is_array($items) ? $items : [],
        'delivery_fee' => (float) ($order['delivery_fee'] ?? 0),
        'customer_name' => (string) ($order['customer_name'] ?? 'Cliente'),
        'phone' => (string) ($order['customer_phone'] ?? ''),
        'cep' => (string) ($order['customer_cep'] ?? ''),
        'address_number' => (string) ($order['address_number'] ?? ''),
        'address_complement' => (string) ($order['address_complement'] ?? ''),
        'payment_method' => (string) ($order['payment_method'] ?? 'pix'),
    ];

    if (INFINITEPAY_MOCK && $mockPaymentStatus !== null && $mockPaymentStatus !== '') {
        $payloadData['mock_payment_status'] = $mockPaymentStatus;
    }

    return buildInfinitePayPayload($payloadData, (string) ($order['external_order_nsu'] ?? ''), $redirectUrl);
}

function buildInfinitePayMockReturnUrl(
    string $orderNsu,
    string $captureMethod = 'pix',
    string $mockPaymentStatus = 'paid',
    ?string $redirectUrl = null
): string
{
    $slug = 'mock-' . $orderNsu;
    $transactionNsu = 'mock-tx-' . substr(sha1($orderNsu . '|' . $captureMethod), 0, 16);
    $query = http_build_query([
        'order_nsu' => $orderNsu,
        'slug' => $slug,
        'transaction_nsu' => $transactionNsu,
        'mock_infinitepay' => '1',
        'mock_payment_status' => $mockPaymentStatus,
    ]);

    $baseRedirectUrl = sanitizeInfinitePayRedirectUrl($redirectUrl);

    return $baseRedirectUrl . (str_contains($baseRedirectUrl, '?') ? '&' : '?') . $query;
}

function createInfinitePayCheckoutLink(array $payload): array
{
    if (empty(INFINITEPAY_HANDLE)) {
        return [
            'status' => 422,
            'data' => ['message' => 'InfinitePay handle is not configured'],
        ];
    }

    if (empty($payload['items'])) {
        return [
            'status' => 422,
            'data' => ['message' => 'No payable items were provided'],
        ];
    }

    if (INFINITEPAY_MOCK) {
        $order = storageGetOrderByNsu((string) ($payload['order_nsu'] ?? ''));
        $captureMethod = normalizeCaptureMethod((string) ($order['payment_method'] ?? 'pix'));
        $mockPaymentStatus = strtolower(trim((string) ($payload['_mock_payment_status'] ?? INFINITEPAY_MOCK_DEFAULT_STATUS)));
        if (!in_array($mockPaymentStatus, ['paid', 'refused', 'pending'], true)) {
            $mockPaymentStatus = 'paid';
        }

        return [
            'status' => 200,
            'data' => [
                'url' => buildInfinitePayMockReturnUrl(
                    (string) ($payload['order_nsu'] ?? ''),
                    $captureMethod,
                    $mockPaymentStatus,
                    (string) ($payload['redirect_url'] ?? '')
                ),
                'mock' => true,
                'capture_method' => $captureMethod,
                'mock_payment_status' => $mockPaymentStatus,
            ],
        ];
    }

    $resp = curlRequest(
        INFINITEPAY_CHECKOUT_URL,
        'POST',
        $payload,
        ['Content-Type: application/json']
    );

    if ($resp['status'] >= 400) {
        error_log("InfinitePay checkout error: " . ($resp['data']['message'] ?? json_encode($resp['data'])));
        error_log("Payload sent: " . json_encode($payload));
    }

    return $resp;
}

function checkInfinitePayPayment(string $orderNsu, string $slug, string $transactionNsu, string $mockPaymentStatus = INFINITEPAY_MOCK_DEFAULT_STATUS): array
{
    if (empty(INFINITEPAY_HANDLE)) {
        return [
            'status' => 422,
            'data' => ['message' => 'InfinitePay handle is not configured'],
        ];
    }

    if (INFINITEPAY_MOCK) {
        $order = storageGetOrderByNsu($orderNsu);
        $captureMethod = normalizeCaptureMethod((string) ($order['payment_method'] ?? 'pix'));
        $mockPaymentStatus = strtolower(trim($mockPaymentStatus));
        if (!in_array($mockPaymentStatus, ['paid', 'refused', 'pending'], true)) {
            $mockPaymentStatus = 'paid';
        }
        $paid = $mockPaymentStatus === 'paid';
        $message = $mockPaymentStatus === 'refused'
            ? 'Pagamento recusado (mock).'
            : ($mockPaymentStatus === 'pending'
                ? 'Pagamento ainda pendente (mock).'
                : 'Pagamento aprovado (mock).');

        return [
            'status' => 200,
            'data' => [
                'paid' => $paid,
                'status' => $mockPaymentStatus,
                'message' => $message,
                'capture_method' => $captureMethod,
                'invoice_slug' => $slug,
                'transaction_nsu' => $transactionNsu,
                'receipt_url' => $paid ? buildInfinitePayMockReturnUrl($orderNsu, $captureMethod, $mockPaymentStatus) : null,
                'mock' => true,
            ],
        ];
    }

    return curlRequest(
        INFINITEPAY_PAYMENT_CHECK_URL,
        'POST',
        [
            'handle' => INFINITEPAY_HANDLE,
            'order_nsu' => $orderNsu,
            'transaction_nsu' => $transactionNsu,
            'slug' => $slug,
        ],
        ['Content-Type: application/json']
    );
}

function generateOrderNsu(): string
{
    return 'gelo-' . date('YmdHis') . '-' . bin2hex(random_bytes(4));
}

function normalizeCaptureMethod(?string $captureMethod): string
{
    if ($captureMethod === 'credit_card') {
        return 'credit_card';
    }

    if ($captureMethod === 'pix') {
        return 'pix';
    }

    return 'infinitepay';
}

function normalizeOrderItems(array $items): array
{
    $normalized = [];

    foreach ($items as $item) {
        $productId = (int) ($item['id'] ?? 0);
        $flavorId = (int) ($item['flavor_id'] ?? 0);
        $quantity = max(0, (int) ($item['quantity'] ?? 0));

        if ($productId <= 0 || $quantity <= 0) {
            continue;
        }

        $key = 'p' . $productId . 'f' . $flavorId;

        if (!isset($normalized[$key])) {
            $normalized[$key] = [
                'id' => $productId,
                'flavor_id' => $flavorId,
                'name' => (string) ($item['name'] ?? ('Produto #' . $productId)),
                'flavor_name' => (string) ($item['flavor_name'] ?? ''),
                'quantity' => 0,
            ];
        }

        $normalized[$key]['quantity'] += $quantity;
    }

    return array_values($normalized);
}

function parseCatalogMoney(?string $value): ?float
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return null;
    }

    $normalized = str_replace(['R$', 'r$'], '', $value);
    $normalized = preg_replace('/[^0-9,.\-]/', '', (string) $normalized);
    if (!is_string($normalized) || $normalized === '' || $normalized === '-' || $normalized === ',' || $normalized === '.') {
        return null;
    }

    if (str_contains($normalized, ',') && str_contains($normalized, '.')) {
        $normalized = str_replace('.', '', $normalized);
        $normalized = str_replace(',', '.', $normalized);
    } elseif (str_contains($normalized, ',')) {
        $normalized = str_replace(',', '.', $normalized);
    }

    return is_numeric($normalized) ? round((float) $normalized, 2) : null;
}

function formatCatalogMoney(float $value): string
{
    return number_format($value, 2, ',', '.');
}

function normalizeCatalogLineText(string $value): string
{
    $value = trim($value);
    $value = preg_replace('/\s+/u', ' ', $value);
    return is_string($value) ? trim($value) : '';
}

function normalizeCatalogProductName(string $value): string
{
    return normalizeCatalogLineText($value);
}

function guessCatalogAgeRestricted(string $name): bool
{
    $folded = storageCatalogFoldText($name);
    if ($folded === '') {
        return false;
    }

    foreach ([
        'cerveja',
        'whisky',
        'vodka',
        'vinho',
        'licor',
        'tabaco',
        'cigarro',
        'palha',
        'heineken',
        'brahma',
        'original',
        'spaten',
        'amstel',
        'xeque mate',
        'bang bang',
        'red label',
        'ballantines',
    ] as $keyword) {
        if (str_contains($folded, $keyword)) {
            return true;
        }
    }

    return false;
}

function parseCatalogProductLine(string $line): ?array
{
    $line = normalizeCatalogLineText($line);
    if ($line === '') {
        return null;
    }

    if (!preg_match('/^(.*)\s+R\$\s*([0-9][0-9\.,]*)$/u', $line, $matches)) {
        return null;
    }

    $name = normalizeCatalogProductName($matches[1] ?? '');
    $price = parseCatalogMoney($matches[2] ?? null);
    if ($name === '' || $price === null) {
        return null;
    }

    return [
        'name' => $name,
        'price' => $price,
    ];
}

function extractPromotionTriggerTerms(string $line): array
{
    $line = normalizeCatalogLineText($line);
    if ($line === '') {
        return [];
    }

    $subject = $line;
    if (preg_match('/^pedidos?\s+de\s+(.+?)(?:\s+v[ao]o?\s+|\s+dentro\s+|\s+com\s+)/iu', $line, $matches)) {
        $subject = trim((string) ($matches[1] ?? ''));
    }

    $tokens = storageCatalogTokenize($subject);
    $stopwords = ['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'sem', 'uma', 'um', 'vai', 'vao', 'dentro'];

    return array_values(array_filter($tokens, static function ($token) use ($stopwords) {
        return !in_array($token, $stopwords, true);
    }));
}

function buildPromotionTitle(array $promotion): string
{
    $kind = (string) ($promotion['kind'] ?? '');
    $minSubtotal = $promotion['min_subtotal'] ?? null;
    $prefix = $minSubtotal !== null
        ? 'Compras acima de R$ ' . formatCatalogMoney((float) $minSubtotal) . ': '
        : '';

    if ($kind === 'threshold_free_item') {
        return $prefix . 'Ganhe ' . trim((string) ($promotion['reward_product_name'] ?? 'Brinde'));
    }

    if ($kind === 'threshold_special_price') {
        return $prefix . trim((string) ($promotion['target_product_name'] ?? 'Produto')) . ' por R$ ' . formatCatalogMoney((float) ($promotion['special_price'] ?? 0));
    }

    return trim((string) ($promotion['description'] ?? $promotion['title'] ?? 'Promocao'));
}

function parseCatalogImportText(string $text): array
{
    $products = [];
    $promotions = [];
    $currentThreshold = null;
    $lines = preg_split('/\R/u', $text) ?: [];

    foreach ($lines as $rawLine) {
        $line = normalizeCatalogLineText((string) $rawLine);
        if ($line === '') {
            continue;
        }

        $product = parseCatalogProductLine($line);
        if ($product) {
            $products[] = $product;
            continue;
        }

        if (preg_match('/^promoc(?:ao)?\s+compras?\s+acima\s+R\$\s*([0-9][0-9\.,]*)$/iu', $line, $matches)) {
            $currentThreshold = parseCatalogMoney($matches[1] ?? null);
            continue;
        }

        if (preg_match('/^ganhe\s+(.+)$/iu', $line, $matches)) {
            $promotions[] = [
                'kind' => 'threshold_free_item',
                'reward_product_name' => normalizeCatalogProductName($matches[1] ?? ''),
                'reward_quantity' => 1,
                'min_subtotal' => $currentThreshold,
                'description' => $line,
            ];
            continue;
        }

        if (preg_match('/^(.+?)\s+paga\s+R\$\s*([0-9][0-9\.,]*)$/iu', $line, $matches)) {
            $specialPrice = parseCatalogMoney($matches[2] ?? null);
            if ($specialPrice !== null) {
                $promotions[] = [
                    'kind' => 'threshold_special_price',
                    'target_product_name' => normalizeCatalogProductName($matches[1] ?? ''),
                    'special_price' => $specialPrice,
                    'min_subtotal' => $currentThreshold,
                    'description' => $line,
                ];
                continue;
            }
        }

        $promotions[] = [
            'kind' => 'cart_note',
            'description' => $line,
            'min_subtotal' => null,
            'trigger_terms' => extractPromotionTriggerTerms($line),
        ];
    }

    return [
        'products' => $products,
        'promotions' => $promotions,
    ];
}

function exportCatalogText(): string
{
    $payload = buildCatalogExportPayload();

    return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function buildCatalogExportPayload(): array
{
    $exportProducts = array_values(array_filter(storageGetProductsSortedByName(), static fn (array $product): bool => !empty($product['store_enabled'])));
    $payload = [
        'version' => 2,
        'exported_at' => gmdate('c'),
        'products' => array_map(static fn (array $product): array => [
            'name' => normalizeCatalogProductName((string) ($product['name'] ?? 'Produto')),
            'category' => trim((string) ($product['category'] ?? 'Geral')) ?: 'Geral',
            'barcode' => (string) ($product['barcode'] ?? ''),
            'price' => (float) ($product['price'] ?? 0),
            'stock_quantity' => (int) ($product['stock_quantity'] ?? 0),
            'min_stock_alert' => (int) ($product['min_stock_alert'] ?? 0),
            'reserved_stock' => (int) ($product['reserved_stock'] ?? 0),
            'store_enabled' => !empty($product['store_enabled']),
            'ifood_enabled' => !empty($product['ifood_enabled']),
            'ifood_price' => $product['ifood_price'] ?? null,
            'ifood_external_code' => (string) ($product['ifood_external_code'] ?? ''),
            'image_url' => (string) ($product['img'] ?? ''),
            'age_restricted' => !empty($product['age_restricted']),
        ], $exportProducts),
        'promotions' => storageGetPromotions(),
    ];

    return $payload;
}

function catalogExportTextDocument(array $payload): string
{
    $lines = [];
    $lines[] = 'Catalogo Lumix Ice';
    $lines[] = 'Exportado em: ' . (string) ($payload['exported_at'] ?? gmdate('c'));
    $lines[] = '';
    $lines[] = 'PRODUTOS';
    foreach (($payload['products'] ?? []) as $product) {
        if (!is_array($product)) {
            continue;
        }
        $lines[] = sprintf(
            '- %s | categoria: %s | preco: R$ %.2f | estoque: %d | min: %d | reservado: %d | loja: %s | ifood: %s | imagem: %s',
            (string) ($product['name'] ?? ''),
            (string) ($product['category'] ?? 'Geral'),
            (float) ($product['price'] ?? 0),
            (int) ($product['stock_quantity'] ?? 0),
            (int) ($product['min_stock_alert'] ?? 0),
            (int) ($product['reserved_stock'] ?? 0),
            !empty($product['store_enabled']) ? 'ativo' : 'inativo',
            !empty($product['ifood_enabled']) ? 'ativo' : 'inativo',
            (string) ($product['image_file'] ?? $product['image_url'] ?? '')
        );
        if ((string) ($product['barcode'] ?? '') !== '') {
            $lines[] = '  codigo_barras: ' . (string) $product['barcode'];
        }
        if ((string) ($product['ifood_external_code'] ?? '') !== '') {
            $lines[] = '  ifood_external_code: ' . (string) $product['ifood_external_code'];
        }
        if (!empty($product['age_restricted'])) {
            $lines[] = '  restricao: 18+';
        }
    }

    $lines[] = '';
    $lines[] = 'PROMOCOES';
    $promotions = is_array($payload['promotions'] ?? null) ? $payload['promotions'] : [];
    if (empty($promotions)) {
        $lines[] = '- nenhuma promocao cadastrada';
    } else {
        foreach ($promotions as $promotion) {
            if (!is_array($promotion)) {
                continue;
            }
            $lines[] = sprintf(
                '- %s | %s | minimo: %s',
                (string) ($promotion['kind'] ?? 'promocao'),
                (string) ($promotion['title'] ?? $promotion['description'] ?? ''),
                array_key_exists('min_subtotal', $promotion) && $promotion['min_subtotal'] !== null ? 'R$ ' . number_format((float) $promotion['min_subtotal'], 2, ',', '.') : 'sem minimo'
            );
        }
    }

    $lines[] = '';
    $lines[] = 'DADOS COMPLETOS JSON';
    $lines[] = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    return implode("\r\n", $lines) . "\r\n";
}

function catalogSafeExportFileName(string $value, string $fallback = 'arquivo'): string
{
    $value = trim($value);
    if ($value === '') {
        $value = $fallback;
    }
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = preg_replace('/[^A-Za-z0-9._-]+/', '-', $value);
    $value = trim((string) $value, '-_.');
    return $value !== '' ? $value : $fallback;
}

function catalogZipDosTime(): array
{
    $time = getdate();
    $dosTime = (($time['hours'] ?? 0) << 11) | (($time['minutes'] ?? 0) << 5) | (int) floor(($time['seconds'] ?? 0) / 2);
    $dosDate = ((max(1980, (int) ($time['year'] ?? 1980)) - 1980) << 9) | ((int) ($time['mon'] ?? 1) << 5) | (int) ($time['mday'] ?? 1);
    return [$dosTime, $dosDate];
}

function buildSimpleZip(array $files): string
{
    $local = '';
    $central = '';
    $offset = 0;
    $fileCount = 0;
    [$dosTime, $dosDate] = catalogZipDosTime();

    foreach ($files as $file) {
        $name = str_replace('\\', '/', (string) ($file['name'] ?? 'arquivo'));
        $content = (string) ($file['content'] ?? '');
        if ($name === '') {
            continue;
        }
        $crc = crc32($content);
        $size = strlen($content);
        $nameLength = strlen($name);

        $localHeader = pack('VvvvvvVVVvv', 0x04034b50, 20, 0, 0, $dosTime, $dosDate, $crc, $size, $size, $nameLength, 0) . $name;
        $local .= $localHeader . $content;

        $central .= pack(
            'VvvvvvvVVVvvvvvVV',
            0x02014b50,
            20,
            20,
            0,
            0,
            $dosTime,
            $dosDate,
            $crc,
            $size,
            $size,
            $nameLength,
            0,
            0,
            0,
            0,
            0,
            $offset
        ) . $name;

        $offset += strlen($localHeader) + $size;
        $fileCount++;
    }

    $centralOffset = strlen($local);
    $centralSize = strlen($central);
    $end = pack('VvvvvVVv', 0x06054b50, 0, 0, $fileCount, $fileCount, $centralSize, $centralOffset, 0);
    return $local . $central . $end;
}

function catalogImageExtension(string $path, string $contentType, string $body): string
{
    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
        return $extension === 'jpeg' ? 'jpg' : $extension;
    }

    $mime = strtolower(trim(explode(';', $contentType)[0] ?? ''));
    if ($mime === 'image/jpeg' || $mime === 'image/jpg') return 'jpg';
    if ($mime === 'image/png') return 'png';
    if ($mime === 'image/webp') return 'webp';
    if ($mime === 'image/gif') return 'gif';
    if (str_starts_with($body, "\x89PNG")) return 'png';
    if (str_starts_with($body, "\xFF\xD8\xFF")) return 'jpg';
    if (substr($body, 0, 4) === 'RIFF' && substr($body, 8, 4) === 'WEBP') return 'webp';
    if (str_starts_with($body, 'GIF')) return 'gif';
    return 'bin';
}

function exportCatalogZip(): string
{
    $payload = buildCatalogExportPayload();
    $files = [];
    $imageObjectsByPath = [];
    $products = is_array($payload['products'] ?? null) ? $payload['products'] : [];

    foreach ($products as $index => &$product) {
        if (!is_array($product)) {
            continue;
        }
        $imageUrl = (string) ($product['image_url'] ?? '');
        $storagePath = ifoodStoragePathFromImageUrl($imageUrl);
        if ($storagePath === '') {
            continue;
        }

        try {
            if (!isset($imageObjectsByPath[$storagePath])) {
                $imageObjectsByPath[$storagePath] = storageDownloadObject($storagePath);
            }
            $object = $imageObjectsByPath[$storagePath];
            $body = (string) ($object['body'] ?? '');
            if ($body === '') {
                continue;
            }
            $extension = catalogImageExtension($storagePath, (string) ($object['content_type'] ?? ''), $body);
            $safeBase = catalogSafeExportFileName(sprintf('%03d-%s', $index + 1, (string) ($product['name'] ?? 'produto')), 'produto');
            $imageName = 'imagens/' . $safeBase . '.' . $extension;
            $files[] = [
                'name' => $imageName,
                'content' => $body,
            ];
            $product['image_file'] = $imageName;
        } catch (\Throwable $e) {
            $product['image_export_error'] = $e->getMessage();
        }
    }
    unset($product);

    $payload['products'] = $products;
    $files[] = [
        'name' => 'catalogo-lumix-ice.txt',
        'content' => catalogExportTextDocument($payload),
    ];

    return buildSimpleZip($files);
}

function catalogJsonFromImportText(string $text): ?array
{
    $decoded = json_decode(trim($text), true);
    if (is_array($decoded) && is_array($decoded['products'] ?? null)) {
        return $decoded;
    }

    $markerPos = stripos($text, 'DADOS COMPLETOS JSON');
    if ($markerPos !== false) {
        $jsonStart = strpos($text, '{', $markerPos);
        if ($jsonStart !== false) {
            $decoded = json_decode(trim(substr($text, $jsonStart)), true);
            if (is_array($decoded) && is_array($decoded['products'] ?? null)) {
                return $decoded;
            }
        }
    }

    return null;
}

function catalogImportParsedFromText(string $text): array
{
    $decoded = catalogJsonFromImportText($text);
    if (is_array($decoded) && is_array($decoded['products'] ?? null)) {
        return [
            'products' => array_map(static fn (array $product): array => [
                'name' => $product['name'] ?? '',
                'price' => $product['price'] ?? 0,
                'category' => $product['category'] ?? 'Geral',
                'barcode' => $product['barcode'] ?? '',
                'img' => $product['image_url'] ?? $product['img'] ?? '',
                'image_file' => $product['image_file'] ?? '',
                'stock_quantity' => $product['stock_quantity'] ?? 0,
                'min_stock_alert' => $product['min_stock_alert'] ?? 0,
                'reserved_stock' => $product['reserved_stock'] ?? 0,
                'store_enabled' => $product['store_enabled'] ?? true,
                'ifood_enabled' => $product['ifood_enabled'] ?? true,
                'ifood_price' => $product['ifood_price'] ?? null,
                'ifood_external_code' => $product['ifood_external_code'] ?? '',
                'age_restricted' => $product['age_restricted'] ?? null,
            ], $decoded['products']),
            'promotions' => is_array($decoded['promotions'] ?? null) ? $decoded['promotions'] : [],
        ];
    }

    return parseCatalogImportText($text);
}

function catalogNormalizeImportedImageUrl(?string $value): string
{
    $raw = trim((string) ($value ?? ''));
    if ($raw === '') {
        return '';
    }

    $normalized = storageNormalizePublicUrl($raw);
    if (is_string($normalized) && trim($normalized) !== '') {
        return trim($normalized);
    }

    return $raw;
}

function catalogReadZipEntries(string $zipBinary): array
{
    $entries = [];
    $length = strlen($zipBinary);
    $offset = 0;

    while ($offset + 30 <= $length) {
        if (substr($zipBinary, $offset, 4) !== "PK\x03\x04") {
            $next = strpos($zipBinary, "PK\x03\x04", $offset + 1);
            if ($next === false) {
                break;
            }
            $offset = $next;
            continue;
        }

        $header = unpack('vversion/vflags/vmethod/vtime/vdate/Vcrc/Vcompressed_size/Vuncompressed_size/vname_length/vextra_length', substr($zipBinary, $offset + 4, 26));
        if (!is_array($header)) {
            break;
        }

        $flags = (int) ($header['flags'] ?? 0);
        if (($flags & 0x08) !== 0) {
            throw new RuntimeException('ZIP com data descriptor nao suportado. Exporte pelo CRM e importe o mesmo arquivo.', 422);
        }

        $method = (int) ($header['method'] ?? 0);
        $compressedSize = (int) ($header['compressed_size'] ?? 0);
        $nameLength = (int) ($header['name_length'] ?? 0);
        $extraLength = (int) ($header['extra_length'] ?? 0);
        $nameOffset = $offset + 30;
        $contentOffset = $nameOffset + $nameLength + $extraLength;
        if ($nameLength <= 0 || $contentOffset + $compressedSize > $length) {
            throw new RuntimeException('ZIP invalido ou incompleto.', 422);
        }

        $name = str_replace('\\', '/', substr($zipBinary, $nameOffset, $nameLength));
        $compressed = substr($zipBinary, $contentOffset, $compressedSize);
        if (!str_ends_with($name, '/')) {
            if ($method === 0) {
                $entries[$name] = $compressed;
            } elseif ($method === 8) {
                $inflated = @gzinflate($compressed);
                if ($inflated === false) {
                    throw new RuntimeException('Nao foi possivel descompactar o arquivo ' . $name . '.', 422);
                }
                $entries[$name] = $inflated;
            } else {
                throw new RuntimeException('Metodo de compressao ZIP nao suportado para ' . $name . '.', 422);
            }
        }

        $offset = $contentOffset + $compressedSize;
    }

    return $entries;
}

function catalogGuessImageContentType(string $path, string $body): string
{
    return match (catalogImageExtension($path, '', $body)) {
        'jpg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        default => 'application/octet-stream',
    };
}

function catalogFindZipEntry(array $entries, string $path): ?string
{
    $needle = str_replace('\\', '/', trim($path));
    if ($needle === '') {
        return null;
    }
    if (array_key_exists($needle, $entries)) {
        return $needle;
    }

    $needleLower = strtolower($needle);
    foreach ($entries as $entryName => $_) {
        if (strtolower((string) $entryName) === $needleLower) {
            return (string) $entryName;
        }
    }

    $baseLower = strtolower(basename($needle));
    foreach ($entries as $entryName => $_) {
        if (strtolower(basename((string) $entryName)) === $baseLower) {
            return (string) $entryName;
        }
    }

    return null;
}

function catalogTextEntryFromZipEntries(array $entries): string
{
    foreach (['catalogo-lumix-ice.txt', 'catalogo.txt'] as $candidate) {
        $entryName = catalogFindZipEntry($entries, $candidate);
        if ($entryName !== null) {
            return (string) $entries[$entryName];
        }
    }

    foreach ($entries as $entryName => $content) {
        if (strtolower(pathinfo((string) $entryName, PATHINFO_EXTENSION)) === 'txt') {
            return (string) $content;
        }
    }

    throw new RuntimeException('ZIP sem arquivo .txt do catalogo.', 422);
}

function importCatalogTextPayload(string $text): array
{
    $parsed = catalogImportParsedFromText($text);
    $products = $parsed['products'] ?? [];
    $promotions = $parsed['promotions'] ?? [];

    $existingProducts = storageGetProducts();
    $existingByKey = [];
    foreach ($existingProducts as $product) {
        $existingByKey[storageCatalogCompactKey($product['name'] ?? '')] = $product;
    }

    $created = 0;
    $updated = 0;
    foreach ($products as $productData) {
        $name = normalizeCatalogProductName((string) ($productData['name'] ?? ''));
        $price = (float) ($productData['price'] ?? 0);
        $category = trim((string) ($productData['category'] ?? 'Geral')) ?: 'Geral';
        $imageUrl = catalogNormalizeImportedImageUrl((string) ($productData['img'] ?? $productData['image_url'] ?? ''));
        if ($name === '') {
            continue;
        }

        $compactKey = storageCatalogCompactKey($name);
        $existing = $existingByKey[$compactKey] ?? null;
        if ($existing) {
            storageSaveProduct([
                'id' => (int) ($existing['id'] ?? 0),
                'name' => $name,
                'price' => $price,
                'img' => $imageUrl !== '' ? $imageUrl : ($existing['img'] ?? ''),
                'category' => $category,
                'barcode' => $productData['barcode'] ?? $existing['barcode'] ?? '',
                'stock_quantity' => (int) ($productData['stock_quantity'] ?? $existing['stock_quantity'] ?? 0),
                'min_stock_alert' => (int) ($productData['min_stock_alert'] ?? $existing['min_stock_alert'] ?? 0),
                'reserved_stock' => (int) ($productData['reserved_stock'] ?? $existing['reserved_stock'] ?? 0),
                'store_enabled' => false,
                'ifood_enabled' => false,
                'ifood_price' => $productData['ifood_price'] ?? $existing['ifood_price'] ?? null,
                'ifood_external_code' => $productData['ifood_external_code'] ?? $existing['ifood_external_code'] ?? '',
                'age_restricted' => $productData['age_restricted'] ?? !empty($existing['age_restricted']),
            ]);
            $updated += 1;
            continue;
        }

        storageSaveProduct([
            'name' => $name,
            'price' => $price,
            'img' => $imageUrl,
            'category' => $category,
            'barcode' => $productData['barcode'] ?? '',
            'stock_quantity' => (int) ($productData['stock_quantity'] ?? 0),
            'min_stock_alert' => (int) ($productData['min_stock_alert'] ?? 0),
            'reserved_stock' => (int) ($productData['reserved_stock'] ?? 0),
            'store_enabled' => false,
            'ifood_enabled' => false,
            'ifood_price' => $productData['ifood_price'] ?? null,
            'ifood_external_code' => $productData['ifood_external_code'] ?? '',
            'age_restricted' => $productData['age_restricted'] ?? guessCatalogAgeRestricted($name),
        ]);
        $created += 1;
    }

    $freshProducts = storageGetProducts();
    $preparedPromotions = [];
    foreach ($promotions as $promotion) {
        $kind = trim((string) ($promotion['kind'] ?? ''));
        if ($kind === '') {
            continue;
        }

        $prepared = $promotion;

        if (!empty($promotion['target_product_name'])) {
            $targetProduct = storageFindProductByCatalogName((string) $promotion['target_product_name'], $freshProducts, true);
            if ($targetProduct) {
                $prepared['target_product_id'] = (int) ($targetProduct['id'] ?? 0);
                $prepared['target_product_name'] = (string) ($targetProduct['name'] ?? $promotion['target_product_name']);
            }
        }

        if (!empty($promotion['reward_product_name'])) {
            $rewardProduct = storageFindProductByCatalogName((string) $promotion['reward_product_name'], $freshProducts, true);
            if ($rewardProduct) {
                $prepared['reward_product_id'] = (int) ($rewardProduct['id'] ?? 0);
                $prepared['reward_product_name'] = (string) ($rewardProduct['name'] ?? $promotion['reward_product_name']);
            }
        }

        $prepared['title'] = buildPromotionTitle($prepared);
        $preparedPromotions[] = $prepared;
    }

    storageReplacePromotions($preparedPromotions);

    return [
        'created_products' => $created,
        'updated_products' => $updated,
        'promotion_count' => count($preparedPromotions),
        'products' => storageGetProducts(),
        'promotions' => storageGetPromotions(),
    ];
}

function importCatalogZipPayload(string $zipBinary): array
{
    if ($zipBinary === '') {
        throw new RuntimeException('Arquivo ZIP vazio.', 422);
    }

    $entries = catalogReadZipEntries($zipBinary);
    if (empty($entries)) {
        throw new RuntimeException('ZIP sem arquivos validos.', 422);
    }

    $parsed = catalogImportParsedFromText(catalogTextEntryFromZipEntries($entries));
    $uploadedImages = 0;

    foreach ($parsed['products'] as &$product) {
        if (!is_array($product)) {
            continue;
        }
        $imageFile = trim((string) ($product['image_file'] ?? ''));
        if ($imageFile === '') {
            continue;
        }
        $entryName = catalogFindZipEntry($entries, $imageFile);
        if ($entryName === null) {
            continue;
        }
        $body = (string) $entries[$entryName];
        if ($body === '') {
            continue;
        }

        $storagePath = storageBuildProductImagePath(basename($entryName));
        $stored = storageUploadObject($storagePath, $body, catalogGuessImageContentType($entryName, $body));
        $product['img'] = trim((string) ($stored['public_url'] ?? '')) ?: storageBuildObjectPublicUrl((string) $stored['path']);
        $uploadedImages++;
    }
    unset($product);

    $result = importCatalogTextPayload(json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $result['uploaded_images'] = $uploadedImages;
    return $result;
}

function cartItemMatchesPromotion(array $item, array $promotion): bool
{
    $itemId = (int) ($item['id'] ?? 0);
    $targetProductId = (int) ($promotion['target_product_id'] ?? 0);
    if ($targetProductId > 0 && $itemId === $targetProductId) {
        return true;
    }

    $targetName = trim((string) ($promotion['target_product_name'] ?? ''));
    if ($targetName === '') {
        return false;
    }

    $itemKey = storageCatalogCompactKey((string) ($item['name'] ?? ''));
    $targetKey = storageCatalogCompactKey($targetName);
    if ($itemKey === '' || $targetKey === '') {
        return false;
    }

    return $itemKey === $targetKey
        || str_contains($itemKey, $targetKey)
        || str_contains($targetKey, $itemKey);
}

function buildOrderPricingSnapshot(array $items): array
{
    $normalizedItems = normalizeOrderItems($items);
    $emptySnapshot = [
        'items' => [],
        'base_subtotal' => 0.0,
        'subtotal' => 0.0,
        'discount_total' => 0.0,
        'gift_total' => 0.0,
        'applied_promotions' => [],
        'notices' => [],
    ];

    if (empty($normalizedItems)) {
        return $emptySnapshot;
    }

    $productMap = [];
    foreach (storageGetProducts() as $product) {
        $productMap[(int) ($product['id'] ?? 0)] = $product;
    }

    $pricedItems = [];
    foreach ($normalizedItems as $item) {
        $productId = (int) ($item['id'] ?? 0);
        $quantity = max(0, (int) ($item['quantity'] ?? 0));
        $product = $productMap[$productId] ?? null;
        if ($productId <= 0 || $quantity <= 0 || !$product) {
            throw new RuntimeException('Produto invalido no carrinho.', 422);
        }
        if (empty($product['store_enabled'])) {
            throw new RuntimeException('Produto indisponivel na loja.', 409);
        }

        $unitPrice = round((float) ($product['price'] ?? 0), 2);
        $pricedItems[] = [
            'id' => $productId,
            'name' => (string) ($product['name'] ?? ('Produto #' . $productId)),
            'quantity' => $quantity,
            'price' => $unitPrice,
            'base_price' => $unitPrice,
            'img' => (string) ($product['img'] ?? ''),
            'age_restricted' => !empty($product['age_restricted']),
        ];
    }

    $baseSubtotal = 0.0;
    foreach ($pricedItems as $item) {
        $baseSubtotal += (float) $item['base_price'] * (int) $item['quantity'];
    }
    $baseSubtotal = round($baseSubtotal, 2);

    $discountTotal = 0.0;
    $giftTotal = 0.0;
    $appliedPromotions = [];
    $notices = [];
    $activePromotions = storageGetPromotions(true);

    foreach ($activePromotions as $promotion) {
        $minSubtotal = $promotion['min_subtotal'];
        if ($minSubtotal !== null && $baseSubtotal + 0.0001 < (float) $minSubtotal) {
            continue;
        }

        $kind = (string) ($promotion['kind'] ?? '');
        if ($kind === 'threshold_special_price') {
            foreach ($pricedItems as &$pricedItem) {
                if (!cartItemMatchesPromotion($pricedItem, $promotion)) {
                    continue;
                }

                $specialPrice = round((float) ($promotion['special_price'] ?? 0), 2);
                if ($specialPrice <= 0 || $specialPrice >= (float) $pricedItem['price']) {
                    continue;
                }

                $originalPrice = (float) $pricedItem['price'];
                $pricedItem['price'] = $specialPrice;
                $pricedItem['promotion_label'] = (string) ($promotion['title'] ?? '');
                $pricedItem['promotion_kind'] = 'special_price';
                $discountTotal += ($originalPrice - $specialPrice) * (int) $pricedItem['quantity'];

                $appliedPromotions[] = [
                    'id' => (int) ($promotion['id'] ?? 0),
                    'kind' => $kind,
                    'title' => (string) ($promotion['title'] ?? ''),
                ];
            }
            unset($pricedItem);
            continue;
        }

        if ($kind === 'threshold_free_item') {
            $rewardProductId = (int) ($promotion['reward_product_id'] ?? 0);
            $rewardProduct = $rewardProductId > 0 ? ($productMap[$rewardProductId] ?? null) : null;
            if (!$rewardProduct) {
                continue;
            }

            $rewardQuantity = max(1, (int) ($promotion['reward_quantity'] ?? 1));
            $reservedQuantity = 0;
            foreach ($pricedItems as $pricedItem) {
                if ((int) ($pricedItem['id'] ?? 0) === $rewardProductId) {
                    $reservedQuantity += (int) ($pricedItem['quantity'] ?? 0);
                }
            }

            $availableStock = max(0, (int) ($rewardProduct['stock_quantity'] ?? 0));
            if ($availableStock < ($reservedQuantity + $rewardQuantity)) {
                $notices[] = 'Brinde indisponivel no momento: ' . (string) ($rewardProduct['name'] ?? 'Produto');
                continue;
            }

            $unitPrice = round((float) ($rewardProduct['price'] ?? 0), 2);
            $pricedItems[] = [
                'id' => $rewardProductId,
                'name' => (string) ($rewardProduct['name'] ?? 'Brinde') . ' (Brinde)',
                'quantity' => $rewardQuantity,
                'price' => 0.0,
                'base_price' => $unitPrice,
                'img' => (string) ($rewardProduct['img'] ?? ''),
                'age_restricted' => !empty($rewardProduct['age_restricted']),
                'promotion_label' => (string) ($promotion['title'] ?? ''),
                'promotion_kind' => 'free_item',
                'is_reward_item' => true,
            ];
            $giftTotal += $unitPrice * $rewardQuantity;
            $appliedPromotions[] = [
                'id' => (int) ($promotion['id'] ?? 0),
                'kind' => $kind,
                'title' => (string) ($promotion['title'] ?? ''),
            ];
            continue;
        }

        if ($kind === 'cart_note') {
            $terms = !empty($promotion['trigger_terms']) && is_array($promotion['trigger_terms'])
                ? $promotion['trigger_terms']
                : extractPromotionTriggerTerms((string) ($promotion['description'] ?? ''));

            $cartText = storageCatalogFoldText(implode(' ', array_map(static function (array $item): string {
                return (string) ($item['name'] ?? '');
            }, $pricedItems)));

            $matches = empty($terms);
            foreach ($terms as $term) {
                if (!str_contains($cartText, storageCatalogFoldText((string) $term))) {
                    $matches = false;
                    break;
                }
                $matches = true;
            }

            if ($matches) {
                $notices[] = trim((string) ($promotion['description'] ?? $promotion['title'] ?? 'Promocao ativa.'));
                $appliedPromotions[] = [
                    'id' => (int) ($promotion['id'] ?? 0),
                    'kind' => $kind,
                    'title' => (string) ($promotion['title'] ?? ''),
                ];
            }
        }
    }

    $subtotal = 0.0;
    foreach ($pricedItems as $item) {
        $subtotal += ((float) ($item['price'] ?? 0)) * ((int) ($item['quantity'] ?? 0));
    }

    return [
        'items' => $pricedItems,
        'base_subtotal' => round($baseSubtotal, 2),
        'subtotal' => round($subtotal, 2),
        'discount_total' => round($discountTotal, 2),
        'gift_total' => round($giftTotal, 2),
        'applied_promotions' => $appliedPromotions,
        'notices' => array_values(array_unique(array_filter($notices))),
    ];
}

function normalizeBrazilianCpf(?string $value): string
{
    $digits = preg_replace('/\D+/', '', (string) ($value ?? ''));
    return is_string($digits) ? trim($digits) : '';
}

function isValidBrazilianCpf(?string $value): bool
{
    $cpf = normalizeBrazilianCpf($value);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }

    $sum = 0;
    for ($index = 0; $index < 9; $index++) {
        $sum += ((int) $cpf[$index]) * (10 - $index);
    }
    $digit = ($sum * 10) % 11;
    if ($digit === 10) {
        $digit = 0;
    }
    if ($digit !== (int) $cpf[9]) {
        return false;
    }

    $sum = 0;
    for ($index = 0; $index < 10; $index++) {
        $sum += ((int) $cpf[$index]) * (11 - $index);
    }
    $digit = ($sum * 10) % 11;
    if ($digit === 10) {
        $digit = 0;
    }

    return $digit === (int) $cpf[10];
}

function normalizeAgeDocumentType(?string $value): string
{
    $normalized = strtolower(trim((string) ($value ?? '')));
    if (in_array($normalized, ['cnh'], true)) {
        return 'cnh';
    }

    if (in_array($normalized, ['rg', 'cin', 'rg_cin'], true)) {
        return 'rg_cin';
    }

    return '';
}

function calculateAdultAgeFromBirthDate(?string $birthDate): ?int
{
    $birthDate = trim((string) ($birthDate ?? ''));
    if ($birthDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate)) {
        return null;
    }

    try {
        $today = new DateTimeImmutable('today', new DateTimeZone('America/Sao_Paulo'));
        $birth = new DateTimeImmutable($birthDate, new DateTimeZone('America/Sao_Paulo'));
    } catch (\Throwable $e) {
        return null;
    }

    return (int) $birth->diff($today)->y;
}

function isAdultBirthDate(?string $birthDate): bool
{
    $age = calculateAdultAgeFromBirthDate($birthDate);
    return $age !== null && $age >= 18;
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64UrlDecode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return (string) base64_decode(strtr($value, '-_', '+/'));
}

function issueAgeVerificationToken(string $phone, string $cpfHash, ?string $verifiedAt): string
{
    $payload = json_encode([
        'phone' => storageNormalizePhone($phone),
        'cpf_hash' => $cpfHash,
        'verified_at' => trim((string) ($verifiedAt ?? '')),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $encodedPayload = base64UrlEncode((string) $payload);
    $signature = base64UrlEncode(hash_hmac('sha256', $encodedPayload, AGE_VERIFICATION_TOKEN_SECRET, true));
    return $encodedPayload . '.' . $signature;
}

function verifyAgeVerificationToken(?string $token, string $phone): ?array
{
    $token = trim((string) ($token ?? ''));
    if ($token === '' || !str_contains($token, '.')) {
        return null;
    }

    [$encodedPayload, $encodedSignature] = explode('.', $token, 2);
    $expectedSignature = base64UrlEncode(hash_hmac('sha256', $encodedPayload, AGE_VERIFICATION_TOKEN_SECRET, true));
    if (!hash_equals($expectedSignature, $encodedSignature)) {
        return null;
    }

    $decoded = json_decode(base64UrlDecode($encodedPayload), true);
    if (!is_array($decoded)) {
        return null;
    }

    $normalizedPhone = storageNormalizePhone((string) ($decoded['phone'] ?? ''));
    if ($normalizedPhone === '' || $normalizedPhone !== storageNormalizePhone($phone)) {
        return null;
    }

    $customer = storageGetCustomerByPhone($normalizedPhone);
    if (!$customer || ($customer['age_verification_status'] ?? '') !== 'verified') {
        return null;
    }

    $expectedHash = (string) ($customer['cpf_hash'] ?? '');
    $expectedVerifiedAt = trim((string) ($customer['age_verified_at'] ?? ''));
    if ($expectedHash === '' || !hash_equals($expectedHash, (string) ($decoded['cpf_hash'] ?? ''))) {
        return null;
    }

    if ($expectedVerifiedAt !== trim((string) ($decoded['verified_at'] ?? ''))) {
        return null;
    }

    return storageBuildCustomerAgeVerificationSummary($customer);
}




function ageVerifierUnavailablePayload(
    string $documentType,
    string $message = 'Nao foi possivel conectar ao verificador de idade no momento.',
    array $context = []
): array
{
    return [
        'verified' => false,
        'status' => 'error',
        'failure_code' => 'verifier_unavailable',
        'retryable' => true,
        'document_type' => $documentType,
        'message' => $message,
        'verifier_status' => isset($context['status']) ? (int) $context['status'] : null,
        'verifier_base_url' => isset($context['base_url']) ? (string) $context['base_url'] : '',
        'verifier_error' => isset($context['error']) ? (string) $context['error'] : '',
        'verifier_elapsed_ms' => isset($context['elapsed_ms']) ? (int) $context['elapsed_ms'] : null,
    ];
}

function requireVerifiedAdultForRestrictedItems(array $data): array
{
    $snapshot = storageBuildAgeRestrictionSnapshot($data['items'] ?? []);
    $requiresVerification = !empty($snapshot['requires_age_verification']);
    if (!$requiresVerification) {
        return [
            'requires_age_verification' => false,
            'summary' => null,
            'snapshot' => $snapshot,
        ];
    }

    $phone = storageNormalizePhone((string) ($data['phone'] ?? ''));
    if ($phone === '') {
        throw new RuntimeException('Telefone obrigatorio para produtos 18+.', 422);
    }

    if (isCustomerAuthenticated($phone)) {
        $authenticatedCustomer = storageGetCustomerByPhone($phone);
        if ($authenticatedCustomer && ($authenticatedCustomer['age_verification_status'] ?? '') === 'verified') {
            return [
                'requires_age_verification' => true,
                'summary' => storageBuildCustomerAgeVerificationSummary($authenticatedCustomer),
                'snapshot' => $snapshot,
            ];
        }
    }

    $cpf = normalizeBrazilianCpf((string) ($data['cpf'] ?? ''));
    $summary = verifyAgeVerificationToken((string) ($data['age_verification_token'] ?? ''), $phone);
    if (!$summary) {
        if (!isValidBrazilianCpf($cpf)) {
            throw new RuntimeException('Telefone e CPF sao obrigatorios para produtos 18+.', 422);
        }
        $summary = storageCustomerHasVerifiedAge($phone, $cpf);
    } elseif ($cpf !== '') {
        if (!isValidBrazilianCpf($cpf)) {
            throw new RuntimeException('O CPF informado para produtos 18+ e invalido.', 422);
        }

        $cpfSummary = storageCustomerHasVerifiedAge($phone, $cpf);
        if (!$cpfSummary) {
            throw new RuntimeException('O CPF informado nao confere com a verificacao 18+ desta conta.', 422);
        }

        $summary = $cpfSummary;
    }

    if (!$summary) {
        throw new RuntimeException('Verifique sua idade antes de concluir um pedido com produtos 18+.', 422);
    }

    return [
        'requires_age_verification' => true,
        'summary' => $summary,
        'snapshot' => $snapshot,
    ];
}

if (!defined('GEOCRM_API_LIBRARY_ONLY')) {
    if (actionRequiresAdminAuth($action)) {
        requireAdminAuth();
    }

    switch ($action) {
    case 'admin_session':
        jsonResponse(adminSessionPayload());

    case 'admin_login':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Informe login e senha do painel.'],
            ], 422);
        }

        if (!hash_equals((string) ADMIN_PANEL_USERNAME, $username) || !adminPasswordMatches($password)) {
            jsonResponse([
                'error' => 'Authentication failed',
                'details' => ['message' => 'Login ou senha invalidos.'],
            ], 401);
        }

        session_regenerate_id(true);
        $_SESSION['gelocrm_admin_authenticated'] = true;
        $_SESSION['gelocrm_admin_username'] = ADMIN_PANEL_USERNAME;
        $_SESSION['gelocrm_admin_display_name'] = ADMIN_PANEL_DISPLAY_NAME;

        jsonResponse([
            'status' => 'success',
            'session' => adminSessionPayload(),
        ]);

    case 'admin_logout':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'] ?? '/', $params['domain'] ?? '', (bool) ($params['secure'] ?? false), (bool) ($params['httponly'] ?? false));
        }
        session_destroy();

        jsonResponse(['status' => 'success']);

    case 'customer_session':
        jsonResponse(customerSessionPayload());

    case 'customer_register':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        try {
            $context = storageRegisterCustomer(
                (string) ($data['phone'] ?? ''),
                (string) ($data['name'] ?? ''),
                (string) ($data['password'] ?? '')
            );
            $_SESSION['gelocrm_customer_phone'] = storageNormalizePhone((string) ($context['phone'] ?? ''));
            jsonResponse([
                'status' => 'success',
                'session' => customerSessionPayload(),
                'customer' => $context,
            ]);
        } catch (\Throwable $e) {
            jsonException('Customer register error', $e, 422);
        }

    case 'customer_login':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        try {
            $context = storageAuthenticateCustomer(
                (string) ($data['phone'] ?? ''),
                (string) ($data['password'] ?? '')
            );
            $_SESSION['gelocrm_customer_phone'] = storageNormalizePhone((string) ($context['phone'] ?? ''));
            jsonResponse([
                'status' => 'success',
                'session' => customerSessionPayload(),
                'customer' => $context,
            ]);
        } catch (\Throwable $e) {
            jsonException('Customer login error', $e, exceptionStatus($e, 401));
        }

    case 'customer_logout':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        unset($_SESSION['gelocrm_customer_phone']);
        jsonResponse(['status' => 'success', 'session' => customerSessionPayload()]);

    case 'external_image_proxy':
        $url = sanitizeExternalImageProxyUrl((string) ($_GET['url'] ?? ''));
        if ($url === null) {
            externalImageProxyFallback('URL de imagem invalida');
        }

        proxyExternalImageResponse($url);

    case 'get_products':
        try {
            jsonCachedResponse('get_products', ['catalog'], 30, static fn () => array_values(array_filter(
                storageGetProducts(true),
                static fn (array $product): bool => !empty($product['store_enabled']) && (int) ($product['available_stock'] ?? 0) > 0
            )));
        } catch (\Throwable $e) {
            jsonException('Data API error', $e);
        }

    case 'get_active_promotions':
        try {
            jsonCachedResponse('get_active_promotions', ['promotions'], 30, static fn () => storageGetPromotions(true));
        } catch (\Throwable $e) {
            jsonException('Promotion load error', $e);
        }

    case 'get_product_categories':
        try {
            jsonResponse(storageGetProductCategories());
        } catch (\Throwable $e) {
            jsonException('Product categories load error', $e);
        }

    case 'save_product_category':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        try {
            $category = storageSaveProductCategory(readJsonInput());
            apiInvalidateCacheTags(['catalog', 'admin_snapshot', 'ifood']);
            jsonResponse([
                'status' => 'success',
                'category' => $category,
                'product_categories' => storageGetProductCategories(),
            ]);
        } catch (\Throwable $e) {
            jsonException('Product category save error', $e, 422);
        }

    case 'delete_product_category':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing category id'], 422);
        }

        try {
            storageDeleteProductCategory($id);
            apiInvalidateCacheTags(['catalog', 'admin_snapshot', 'ifood']);
            jsonResponse([
                'status' => 'success',
                'product_categories' => storageGetProductCategories(),
            ]);
        } catch (\Throwable $e) {
            jsonException('Product category delete error', $e, 422);
        }

    case 'save_product':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Nome do produto e obrigatorio.'],
            ], 422);
        }

        try {
            storageSaveProduct($data);
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'ifood_catalog' => null,
            ]);
        } catch (\Throwable $e) {
            jsonException('Product save error', $e);
        }

    case 'toggle_product_ifood':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing product id'], 422);
        }

        try {
            $product = storageGetProductById($id);
            if (!$product) {
                jsonResponse(['error' => 'Product not found'], 404);
            }
            $nextEnabled = filter_var($data['ifood_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $availableStock = max(0, (int) ($product['available_stock'] ?? $product['stock_quantity'] ?? 0));
            if ($nextEnabled && $availableStock <= 0) {
                jsonResponse(['error' => 'Produto sem estoque nao pode ficar ativo no iFood.'], 422);
            }
            if ($nextEnabled && !storageProductCategoryIsSyncedForIfood((string) ($product['category'] ?? 'Geral'))) {
                jsonResponse(['error' => 'Categoria ainda nao enviada ao catalogo iFood. Envie esta categoria ao iFood antes de ativar o item.'], 422);
            }
            $previousEnabled = !empty($product['ifood_enabled']);
            storageSetProductIfoodEnabled($id, $nextEnabled);
            $updatedProduct = storageGetProductById($id);
            try {
                $ifoodCatalog = ifoodSyncProductStatesOrFail($updatedProduct ? [$updatedProduct] : []);
            } catch (\Throwable $syncError) {
                storageSetProductIfoodEnabled($id, $previousEnabled);
                apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot', 'ifood']);
                throw $syncError;
            }
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'product' => $updatedProduct,
                'ifood_catalog' => $ifoodCatalog,
            ]);
        } catch (\Throwable $e) {
            jsonException('Product iFood toggle error', $e);
        }

    case 'toggle_product_store':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing product id'], 422);
        }

        try {
            $product = storageGetProductById($id);
            if (!$product) {
                jsonResponse(['error' => 'Product not found'], 404);
            }
            $nextEnabled = filter_var($data['store_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
            storageSetProductStoreEnabled($id, $nextEnabled);
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'product' => storageGetProductById($id),
            ]);
        } catch (\Throwable $e) {
            jsonException('Product store toggle error', $e);
        }

    case 'bulk_product_action':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $ids = array_values(array_unique(array_filter(array_map(
            static fn ($id): int => (int) $id,
            is_array($data['ids'] ?? null) ? $data['ids'] : []
        ), static fn (int $id): bool => $id > 0)));
        $bulkAction = trim((string) ($data['bulk_action'] ?? ''));
        if (empty($ids)) {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Selecione pelo menos um produto.'],
            ], 422);
        }
        if (!in_array($bulkAction, ['store_enabled', 'ifood_enabled', 'category', 'delete'], true)) {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Acao em lote invalida.'],
            ], 422);
        }

        try {
            $updated = 0;
            $deleted = 0;
            $skipped = [];
            $ifoodRollback = [];
            $ifoodChangedProducts = [];
            $ifoodCatalog = null;
            $enabled = filter_var($data['enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $category = trim((string) ($data['category'] ?? ''));
            if ($category === '') {
                $category = 'Geral';
            }
            if ($bulkAction === 'category' && $category === '') {
                jsonResponse([
                    'error' => 'Validation error',
                    'details' => ['message' => 'Informe a categoria para aplicar aos produtos selecionados.'],
                ], 422);
            }

            foreach ($ids as $id) {
                $product = storageGetProductById($id);
                if (!$product) {
                    $skipped[] = ['id' => $id, 'reason' => 'Produto nao encontrado.'];
                    continue;
                }

                if ($bulkAction === 'delete') {
                    storageDeleteProduct($id);
                    $deleted++;
                    continue;
                }

                if ($bulkAction === 'store_enabled') {
                    storageSetProductStoreEnabled($id, $enabled);
                    $updated++;
                    continue;
                }

                if ($bulkAction === 'category') {
                    storageSaveProduct([
                        ...$product,
                        'id' => $id,
                        'category' => $category,
                    ]);
                    $updated++;
                    continue;
                }

                $availableStock = max(0, (int) ($product['available_stock'] ?? $product['stock_quantity'] ?? 0));
                if ($enabled && $availableStock <= 0) {
                    $skipped[] = ['id' => $id, 'reason' => 'Produto sem estoque nao pode ficar ativo no iFood.'];
                    continue;
                }
                if ($enabled && !storageProductCategoryIsSyncedForIfood((string) ($product['category'] ?? 'Geral'))) {
                    $skipped[] = ['id' => $id, 'reason' => 'Categoria ainda nao enviada ao catalogo iFood.'];
                    continue;
                }
                $ifoodRollback[$id] = !empty($product['ifood_enabled']);
                storageSetProductIfoodEnabled($id, $enabled);
                $changedProduct = storageGetProductById($id);
                if ($changedProduct) {
                    $ifoodChangedProducts[] = $changedProduct;
                }
                $updated++;
            }

            if ($bulkAction === 'ifood_enabled' && !empty($ifoodChangedProducts)) {
                try {
                    $ifoodCatalog = ifoodSyncProductStatesOrFail($ifoodChangedProducts);
                } catch (\Throwable $syncError) {
                    foreach ($ifoodRollback as $rollbackId => $previousEnabled) {
                        storageSetProductIfoodEnabled((int) $rollbackId, (bool) $previousEnabled);
                    }
                    apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot', 'ifood']);
                    throw $syncError;
                }
            }

            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            $response = [
                'status' => 'success',
                'updated_products' => $updated,
                'deleted_products' => $deleted,
                'skipped_products' => $skipped,
            ];
            $response['ifood_catalog'] = $ifoodCatalog;
            jsonResponse($response);
        } catch (\Throwable $e) {
            jsonException('Product bulk action error', $e);
        }

    case 'import_catalog_text':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $text = trim((string) ($data['text'] ?? ''));
        if ($text === '') {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Cole a lista do catalogo antes de importar.'],
            ], 422);
        }

        try {
            $result = importCatalogTextPayload($text);
            apiInvalidateCacheTags(['catalog', 'promotions', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                ...$result,
            ]);
        } catch (\Throwable $e) {
            jsonException('Catalog import error', $e);
        }

    case 'import_catalog_zip':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        try {
            $zipBinary = '';
            if (!empty($_FILES['file']) && is_array($_FILES['file'])) {
                $file = $_FILES['file'];
                if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                    jsonResponse([
                        'error' => 'Validation error',
                        'details' => ['message' => 'Falha ao receber o arquivo ZIP.'],
                    ], 422);
                }
                $tmpPath = (string) ($file['tmp_name'] ?? '');
                $zipBinary = is_file($tmpPath) ? (string) file_get_contents($tmpPath) : '';
            } else {
                $zipBinary = (string) file_get_contents('php://input');
            }
            if ($zipBinary === '') {
                jsonResponse([
                    'error' => 'Validation error',
                    'details' => ['message' => 'Selecione o ZIP do catalogo para importar.'],
                ], 422);
            }
            $result = importCatalogZipPayload($zipBinary);
            apiInvalidateCacheTags(['catalog', 'promotions', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                ...$result,
            ]);
        } catch (\Throwable $e) {
            jsonException('Catalog ZIP import error', $e);
        }

    case 'export_catalog_text':
        try {
            $text = exportCatalogText();
            jsonResponse([
                'status' => 'success',
                'text' => $text,
                'products_count' => count(storageGetProducts()),
                'promotions_count' => count(storageGetPromotions()),
            ]);
        } catch (\Throwable $e) {
            jsonException('Catalog export error', $e);
        }

    case 'export_catalog_zip':
        try {
            $zip = exportCatalogZip();
            $downloadName = 'catalogo-lumix-ice-' . date('Ymd-His') . '.zip';
            header_remove('Content-Type');
            header('Content-Type: application/zip');
            header('Content-Length: ' . strlen($zip));
            header('Content-Disposition: attachment; filename="' . addslashes($downloadName) . '"');
            header('Cache-Control: no-store, max-age=0');
            echo $zip;
            exit;
        } catch (\Throwable $e) {
            jsonException('Catalog ZIP export error', $e);
        }

    case 'delete_product':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing product id'], 422);
        }

        try {
            storageDeleteProduct($id);
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('Product delete error', $e);
        }

    case 'get_product_flavors':
        $productId = (int) ($_GET['product_id'] ?? 0);
        try {
            jsonResponse(storageGetProductFlavors($productId));
        } catch (\Throwable $e) {
            jsonException('Flavors load error', $e);
        }

    case 'save_product_flavor':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        try {
            storageSaveProductFlavor($data);
            apiInvalidateCacheTags(['catalog', 'admin_snapshot']);
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('Flavor save error', $e);
        }

    case 'delete_product_flavor':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing flavor id'], 422);
        }

        try {
            storageDeleteProductFlavor($id);
            apiInvalidateCacheTags(['catalog', 'admin_snapshot']);
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('Flavor delete error', $e);
        }

    case 'get_customer':
        $phone = trim((string) ($_GET['phone'] ?? ''));
        try {
            requireCustomerAuth($phone);
            jsonResponse(storageGetCustomerContext($phone));
        } catch (\Throwable $e) {
            jsonException('Customer lookup error', $e);
        }

    case 'upload_product_image':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
            jsonResponse(['error' => 'Imagem obrigatoria'], 422);
        }

        $file = $_FILES['file'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            jsonResponse(['error' => 'Falha no upload da imagem'], 422);
        }

        try {
            $tmpPath = (string) ($file['tmp_name'] ?? '');
            $binary = is_file($tmpPath) ? (string) file_get_contents($tmpPath) : '';
            if ($binary === '') {
                throw new RuntimeException('Arquivo vazio ou indisponivel para upload.', 422);
            }

            $storagePath = storageBuildProductImagePath((string) ($file['name'] ?? 'imagem'));
            $mimeType = trim((string) ($file['type'] ?? 'application/octet-stream')) ?: 'application/octet-stream';
            $stored = storageUploadObject($storagePath, $binary, $mimeType);
            $publicUrl = trim((string) ($stored['public_url'] ?? ''));

            jsonResponse([
                'status' => 'success',
                'path' => $stored['path'],
                'url' => $publicUrl !== '' ? $publicUrl : storageBuildObjectPublicUrl($stored['path']),
                'content_type' => $stored['content_type'],
                'public_url_expires_at' => $stored['public_url_expires_at'] ?? null,
            ]);
        } catch (\Throwable $e) {
            jsonException('Storage upload error', $e);
        }

    case 'list_product_images':
        try {
            $limit = max(1, min(100, (int) ($_GET['limit'] ?? 36)));
            jsonResponse([
                'status' => 'success',
                'items' => storageListProductImages($limit),
            ]);
        } catch (\Throwable $e) {
            jsonException('Storage list error', $e);
        }

    case 'storage_download':
        $path = trim((string) ($_GET['path'] ?? ''));
        if ($path === '') {
            jsonResponse(['error' => 'Missing storage path'], 422);
        }

        try {
            $object = storageDownloadObject($path);
            $fileName = basename((string) ($object['path'] ?? 'arquivo'));
            header('Cache-Control: no-store, max-age=0');
            binaryResponse((string) ($object['body'] ?? ''), (string) ($object['content_type'] ?? 'application/octet-stream'), $fileName);
        } catch (\Throwable $e) {
            jsonException('Storage download error', $e);
        }

    case 'save_customer_profile':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            requireCustomerAuth((string) ($data['phone'] ?? ''));
            $context = storageUpdateCustomerProfile((string) ($data['phone'] ?? ''), $data);
            jsonResponse([
                'status' => 'success',
                'customer' => $context,
            ]);
        } catch (\Throwable $e) {
            jsonException('Customer profile save error', $e);
        }

    case 'save_customer_address':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            requireCustomerAuth((string) ($data['phone'] ?? ''));
            $saved = storageSaveCustomerAddress($data);
            $context = storageGetCustomerContext((string) ($data['phone'] ?? ''));
            jsonResponse([
                'status' => 'success',
                'address' => $saved,
                'favorites' => $context['favorites'],
                'default_address_id' => $context['default_address_id'],
            ]);
        } catch (\Throwable $e) {
            jsonException('Customer address save error', $e);
        }

    case 'delete_customer_address':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $phone = (string) ($data['phone'] ?? '');
            requireCustomerAuth($phone);
            storageDeleteCustomerAddress($phone, (int) ($data['id'] ?? 0));
            $context = storageGetCustomerContext($phone);
            jsonResponse([
                'status' => 'success',
                'favorites' => $context['favorites'],
                'default_address_id' => $context['default_address_id'],
            ]);
        } catch (\Throwable $e) {
            jsonException('Customer address delete error', $e);
        }

    case 'delete_account':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $phone = (string) ($data['phone'] ?? '');
        $password = (string) ($data['password'] ?? '');

        if (empty($phone)) {
            jsonResponse(['error' => 'Telefone obrigatorio'], 422);
        }

        try {
            if (!isCustomerAuthenticated($phone)) {
                storageAuthenticateCustomer($phone, $password);
            }
            storageDeleteCustomerData($phone);
            unset($_SESSION['gelocrm_customer_phone']);
            jsonResponse([
                'status' => 'success',
                'message' => 'Conta e dados excluidos com sucesso.'
            ]);
        } catch (\Throwable $e) {
            jsonException('Account deletion error', $e);
        }


    case 'recover_age_verification':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $phone = storageNormalizePhone((string) ($data['phone'] ?? ''));
        $cpf = normalizeBrazilianCpf((string) ($data['cpf'] ?? ''));

        if ($phone === '' || !isValidBrazilianCpf($cpf)) {
            jsonResponse([
                'verified' => false,
                'status' => 'rejected',
                'failure_code' => 'missing_phone_or_cpf',
                'retryable' => false,
            ], 200);
        }

        try {
            $summary = storageCustomerHasVerifiedAge($phone, $cpf);
            if (!$summary) {
                storageLogAgeVerificationEvent($phone, $cpf, null, 'rejected', 'recovery_mismatch', null);
                jsonResponse([
                    'verified' => false,
                    'status' => 'rejected',
                    'failure_code' => 'recovery_mismatch',
                    'retryable' => false,
                ], 200);
            }

            storageLogAgeVerificationEvent($phone, $cpf, $summary['age_verification_document_type'] ?? null, 'verified', 'recovered', null);
            jsonResponse([
                'verified' => true,
                'status' => 'verified',
                'cpf_last4' => $summary['cpf_last4'] ?? '',
                'verified_at' => $summary['age_verified_at'] ?? null,
                'document_type' => $summary['age_verification_document_type'] ?? '',
                'age_verification_token' => issueAgeVerificationToken(
                    $phone,
                    (string) ((storageGetCustomerByPhone($phone)['cpf_hash'] ?? '') ?: ''),
                    $summary['age_verified_at'] ?? null
                ),
            ], 200);
        } catch (\Throwable $e) {
            jsonException('Age verification recovery error', $e);
        }

    case 'verify_customer_age':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $phone = storageNormalizePhone((string) ($data['phone'] ?? ''));
        $customerName = trim((string) ($data['customer_name'] ?? ''));
        $cpf = normalizeBrazilianCpf((string) ($data['cpf'] ?? ''));
        $birthDate = trim((string) ($data['birth_date'] ?? ''));

        if ($phone === '' || $cpf === '' || $birthDate === '') {
            jsonResponse([
                'verified' => false,
                'status' => 'rejected',
                'failure_code' => 'invalid_request',
                'retryable' => false,
            ], 200);
        }

        if (!isValidBrazilianCpf($cpf)) {
            storageLogAgeVerificationEvent($phone, $cpf, null, 'rejected', 'invalid_cpf', null);
            jsonResponse([
                'verified' => false,
                'status' => 'rejected',
                'failure_code' => 'invalid_cpf',
                'retryable' => false,
            ], 200);
        }

        try {
            if (!isAdultBirthDate($birthDate)) {
                $failureCode = preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate) ? 'underage' : 'invalid_birth_date';
                storageLogAgeVerificationEvent($phone, $cpf, null, 'rejected', $failureCode, null);
                jsonResponse([
                    'verified' => false,
                    'status' => 'rejected',
                    'failure_code' => $failureCode,
                    'retryable' => false,
                ], 200);
            }

            $summary = storageSaveCustomerAgeVerification($phone, $cpf, '', $customerName, 'cpf_birthdate', $birthDate);
            storageLogAgeVerificationEvent($phone, $cpf, null, 'verified', null, null);
            jsonResponse([
                'verified' => true,
                'status' => 'verified',
                'cpf' => $summary['cpf'] ?? '',
                'cpf_last4' => $summary['cpf_last4'] ?? '',
                'birth_date' => $summary['birth_date'] ?? '',
                'verified_at' => $summary['age_verified_at'] ?? null,
                'age_verification_token' => issueAgeVerificationToken(
                    $phone,
                    (string) ((storageGetCustomerByPhone($phone)['cpf_hash'] ?? '') ?: ''),
                    $summary['age_verified_at'] ?? null
                ),
                'retryable' => false,
            ], 200);
        } catch (\Throwable $e) {
            jsonException('Customer age verification error', $e);
        }

    case 'get_uber_quote':
        $requestData = $method === 'POST' ? readJsonInput() : [];
        $address = trim((string) ($requestData['address'] ?? $_GET['address'] ?? ''));
        $addressNumber = trim((string) ($requestData['address_number'] ?? ''));
        $addressComplement = trim((string) ($requestData['address_complement'] ?? ''));
        $zipCode = trim((string) ($requestData['cep'] ?? ''));

        if ($address === '') {
            jsonResponse(['error' => 'Endereco obrigatorio'], 422);
        }

        $dropoffAddress = parseDropoffAddressParts($address, $addressNumber, $addressComplement, $zipCode)
            ?: trim(implode(', ', array_filter([
                $address,
                $addressNumber,
                $zipCode !== '' ? 'CEP ' . normalizeBrazilianZipCode($zipCode) : null,
                'BR',
            ])));
        $dropoffAddressForGeocoding = buildGeocodeSearchAddress($address, $addressNumber, $addressComplement, $zipCode);

        if (empty(UBER_CLIENT_ID) || empty(UBER_CLIENT_SECRET) || empty(UBER_CUSTOMER_ID)) {
            usleep(300000);
            jsonResponse([
                'fee' => (UBER_ENV !== 'production') ? 0.01 : (12.00 + (rand(0, 100) / 10)),
                'currency' => 'BRL',
                'distance' => 3.5,
                'demo' => true,
            ]);
        }

        $quote = getUberQuote($dropoffAddress, $dropoffAddressForGeocoding);
        if (($quote['status'] ?? 500) >= 200 && ($quote['status'] ?? 500) < 300) {
            $data = $quote['data'];
            jsonResponse([
                'provider' => 'uber_direct',
                'fee' => (UBER_ENV !== 'production') ? 0.01 : (isset($data['fee']) ? ((float) $data['fee']) / 100 : 0),
                'currency' => strtoupper((string) ($data['currency_code'] ?? $data['currency'] ?? 'BRL')),
                'estimate_id' => $data['id'] ?? null,
                'distance' => $data['distance'] ?? null,
                'eta_minutes' => (int) ($data['duration'] ?? 0),
                'pickup_eta_minutes' => (int) ($data['pickup_duration'] ?? 0),
                'quote_expires_at' => $data['expires'] ?? null,
                'dropoff_eta' => $data['dropoff_eta'] ?? null,
                'demo' => (bool) ($data['demo'] ?? false),
            ]);
        }

        jsonResponse([
            'error' => 'Uber API error',
            'details' => $quote['data'] ?? ['message' => $quote['error'] ?? 'Unknown Uber error'],
        ], $quote['status'] ?? 502);

    case 'create_infinitepay_checkout':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        try {
            $storeSettings = storageGetStoreSettings();
            if (!storageIsStoreOpenNow($storeSettings)) {
                jsonResponse([
                    'error' => 'Store is closed',
                    'details' => [
                        'message' => 'Loja fora do horario de atendimento.',
                        'store_settings' => $storeSettings,
                    ],
                ], 423);
            }
        } catch (\Throwable $e) {
            jsonException('Store settings error', $e);
        }

        $data = readJsonInput();
        $redirectUrl = sanitizeInfinitePayRedirectUrl((string) ($data['redirect_url'] ?? ''));
        $orderNsu = generateOrderNsu();

        try {
            $pricing = buildOrderPricingSnapshot($data['items'] ?? []);
            if (empty($pricing['items'])) {
                jsonResponse([
                    'error' => 'Validation error',
                    'details' => ['message' => 'Adicione pelo menos um produto antes de finalizar o pedido.'],
                ], 422);
            }

            $deliveryFee = max(0, (float) ($data['delivery_fee'] ?? 0));
            $data['items'] = $pricing['items'];
            $data['subtotal'] = $pricing['subtotal'];
            $data['discount_total'] = $pricing['discount_total'];
            $data['gift_total'] = $pricing['gift_total'];
            $data['promotion_notices'] = $pricing['notices'];
            $data['total'] = round($pricing['subtotal'] + $deliveryFee, 2);
        } catch (\Throwable $e) {
            jsonException('Catalog pricing error', $e, 422);
        }

        try {
            $ageRequirement = requireVerifiedAdultForRestrictedItems($data);
            if (!empty($ageRequirement['requires_age_verification'])) {
                $data['requires_age_verification'] = true;
                $data['age_verified_at_order'] = $ageRequirement['summary']['age_verified_at'] ?? null;
                $data['customer_cpf_last4'] = $ageRequirement['summary']['cpf_last4'] ?? null;
            }
        } catch (\Throwable $e) {
            jsonException('Age verification required', $e, 422);
        }

        try {
            $orderId = storageCreateInfinitePayOrder($data, $orderNsu);
            apiInvalidateCacheTags(['orders', 'logistics', 'stats', 'admin_snapshot']);
        } catch (\Throwable $e) {
            jsonException('Order save error', $e);
        }

        $payload = buildInfinitePayPayload($data, $orderNsu, $redirectUrl);
        $checkout = createInfinitePayCheckoutLink($payload);

        if (($checkout['status'] ?? 500) < 200 || ($checkout['status'] ?? 500) >= 300 || empty($checkout['data']['url'])) {
            try {
                storageDeleteOrderByNsu($orderNsu);
            } catch (\Throwable $ignored) {
            }

            jsonResponse([
                'error' => 'InfinitePay checkout error',
                'details' => $checkout['data'] ?? ['message' => $checkout['error'] ?? 'Unknown checkout error'],
                'payload_debug' => $payload, // DEBUG
            ], $checkout['status'] ?? 502);
        }

        jsonResponse([
            'status' => 'success',
            'order_id' => $orderId,
            'order_nsu' => $orderNsu,
            'checkout_url' => $checkout['data']['url'],
        ]);

    case 'resume_infinitepay_checkout':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $orderId = (int) ($data['id'] ?? 0);
        $phone = trim((string) ($data['phone'] ?? ''));
        $mockPaymentStatus = strtolower(trim((string) ($data['mock_payment_status'] ?? '')));
        $redirectUrl = sanitizeInfinitePayRedirectUrl((string) ($data['redirect_url'] ?? ''));

        if ($orderId <= 0 || $phone === '') {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Pedido e telefone sao obrigatorios para retomar o pagamento.'],
            ], 422);
        }

        try {
            requireCustomerAuth($phone);
            $order = storageGetCustomerOrderDetailsById($phone, $orderId);
            if (!$order) {
                jsonResponse(['error' => 'Order not found'], 404);
            }

            if (($order['payment_status'] ?? 'pending') === 'paid') {
                jsonResponse([
                    'error' => 'Payment already completed',
                    'details' => ['message' => 'Esse pedido ja possui pagamento aprovado.'],
                ], 409);
            }

            if (($order['status'] ?? '') === 'cancelled') {
                jsonResponse([
                    'error' => 'Order cancelled',
                    'details' => ['message' => 'Esse pedido foi cancelado e nao pode ter o pagamento retomado.'],
                ], 409);
            }

            $externalOrderNsu = trim((string) ($order['external_order_nsu'] ?? ''));
            if ($externalOrderNsu === '') {
                jsonResponse([
                    'error' => 'Checkout unavailable',
                    'details' => ['message' => 'Esse pedido nao possui identificador de checkout para retomar o pagamento.'],
                ], 422);
            }

            $payload = buildInfinitePayPayloadFromOrder(
                $order,
                INFINITEPAY_MOCK && in_array($mockPaymentStatus, ['paid', 'refused', 'pending'], true)
                    ? $mockPaymentStatus
                    : null,
                $redirectUrl
            );
            $checkout = createInfinitePayCheckoutLink($payload);

            if (($checkout['status'] ?? 500) < 200 || ($checkout['status'] ?? 500) >= 300 || empty($checkout['data']['url'])) {
                jsonResponse([
                    'error' => 'InfinitePay checkout error',
                    'details' => $checkout['data'] ?? ['message' => $checkout['error'] ?? 'Unknown checkout error'],
                ], $checkout['status'] ?? 502);
            }

            jsonResponse([
                'status' => 'success',
                'order_id' => (int) ($order['id'] ?? 0),
                'order_nsu' => $externalOrderNsu,
                'checkout_url' => $checkout['data']['url'],
            ]);
        } catch (\Throwable $e) {
            jsonException('InfinitePay resume error', $e);
        }

    case 'check_infinitepay_payment':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $orderNsu = trim((string) ($data['order_nsu'] ?? ''));
        $slug = trim((string) ($data['slug'] ?? ''));
        $transactionNsu = trim((string) ($data['transaction_nsu'] ?? ''));
        $mockPaymentStatus = trim((string) ($data['mock_payment_status'] ?? 'paid'));

        if ($orderNsu === '' || $slug === '' || $transactionNsu === '') {
            jsonResponse(['error' => 'Missing InfinitePay return parameters'], 422);
        }

        $paymentCheck = checkInfinitePayPayment($orderNsu, $slug, $transactionNsu, $mockPaymentStatus);
        if (($paymentCheck['status'] ?? 500) < 200 || ($paymentCheck['status'] ?? 500) >= 300) {
            jsonResponse([
                'error' => 'InfinitePay payment check error',
                'details' => $paymentCheck['data'] ?? ['message' => $paymentCheck['error'] ?? 'Unknown payment check error'],
            ], $paymentCheck['status'] ?? 502);
        }

        $paymentData = $paymentCheck['data'];
        $paymentData['slug'] = $slug;
        $paymentData['transaction_nsu'] = $transactionNsu;

        try {
            $persisted = storagePersistInfinitePayResult($orderNsu, $paymentData);
            if (!$persisted) {
                jsonResponse(['error' => 'Order not found'], 404);
            }
            apiInvalidateCacheTags(['catalog', 'orders', 'logistics', 'stats', 'admin_snapshot']);
        } catch (\Throwable $e) {
            jsonException('Payment persistence error', $e);
        }

        jsonResponse([
            'status' => 'success',
            'paid' => (bool) ($paymentData['paid'] ?? false),
            'capture_method' => $paymentData['capture_method'] ?? null,
            'details' => $paymentData,
            'ifood_catalog' => null,
        ]);

    case 'infinitepay_webhook':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $payload = readJsonInput();
        $orderNsu = trim((string) ($payload['order_nsu'] ?? ''));
        if ($orderNsu === '') {
            jsonResponse(['success' => false, 'message' => 'Pedido nao encontrado'], 400);
        }

        try {
            $persisted = storagePersistInfinitePayResult($orderNsu, $payload);
            if (!$persisted) {
                jsonResponse(['success' => false, 'message' => 'Pedido nao encontrado'], 404);
            }
            apiInvalidateCacheTags(['catalog', 'orders', 'logistics', 'stats', 'admin_snapshot']);
        } catch (\Throwable $e) {
            jsonResponse([
                'success' => false,
                'message' => $e->getMessage(),
            ], exceptionStatus($e, 500));
        }

        jsonResponse(['success' => true, 'message' => null, 'ifood_catalog' => null]);

    case 'uber_webhook':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }

        try {
            $updatedOrder = syncUberWebhookPayload(readJsonInput());
            apiInvalidateCacheTags(['orders', 'logistics', 'stats', 'admin_snapshot']);
            jsonResponse([
                'success' => true,
                'order_id' => $updatedOrder['id'] ?? null,
            ]);
        } catch (\Throwable $e) {
            jsonResponse([
                'success' => false,
                'message' => $e->getMessage(),
            ], exceptionStatus($e, 500));
        }

    case 'save_order':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        if (empty($data['customer_name']) && !empty($data['name'])) {
            $data['customer_name'] = $data['name'];
        }

        try {
            $pricing = buildOrderPricingSnapshot($data['items'] ?? []);
            if (empty($pricing['items'])) {
                jsonResponse([
                    'error' => 'Validation error',
                    'details' => ['message' => 'Adicione pelo menos um produto antes de salvar o pedido.'],
                ], 422);
            }

            $deliveryFee = max(0, (float) ($data['delivery_fee'] ?? 0));
            $data['items'] = $pricing['items'];
            $data['total'] = round($pricing['subtotal'] + $deliveryFee, 2);
        } catch (\Throwable $e) {
            jsonException('Catalog pricing error', $e, 422);
        }

        try {
            $result = storageSaveOrder($data);
            apiInvalidateCacheTags(['catalog', 'orders', 'logistics', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'id' => $result['id'] ?? null,
                'order_nsu' => $result['order_nsu'] ?? null,
                'order' => isset($result['id']) ? storageGetOrderDetailsById((int) $result['id']) : null,
                'ifood_catalog' => null,
            ]);
        } catch (\Throwable $e) {
            jsonException('Order save error', $e);
        }

    case 'get_stats':
        try {
            jsonCachedResponse('get_stats', ['stats'], 10, static fn () => storageGetStats());
        } catch (\Throwable $e) {
            jsonException('Stats load error', $e);
        }

    case 'get_admin_snapshot':
        try {
            jsonCachedResponse('get_admin_snapshot', ['catalog', 'promotions', 'orders', 'logistics', 'stats', 'store_settings', 'admin_snapshot', 'ifood'], 5, static function (): array {
                $orders = syncTrackedUberOrders(storageGetOrders());

                return [
                    'products' => storageGetProducts(true),
                    'product_categories' => storageGetProductCategories(),
                    'promotions' => storageGetPromotions(),
                    'orders' => $orders,
                    'queues' => storageBuildOperationalQueues($orders),
                    'stats' => storageGetStats(),
                    'logistics' => storageGetLogistics(),
                    'store_meta' => [
                        'name' => STORE_NAME,
                    ],
                    'integrations' => [
                        'storage_driver' => 'dnl_data_api',
                    ],
                    'store_settings' => storageGetStoreSettings(),
                    'ifood' => storageGetIfoodDashboard(),
                ];
            });
        } catch (\Throwable $e) {
            jsonException('Admin snapshot load error', $e);
        }

    case 'admin_events':
        if ($method !== 'GET') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        streamAdminEvents();

    case 'get_store_settings':
        try {
            jsonCachedResponse('get_store_settings', ['store_settings'], 10, static function (): array {
                $settings = storageGetStoreSettings();

                return [
                    ...$settings,
                    'is_open_now' => storageIsStoreOpenNow($settings),
                ];
            });
        } catch (\Throwable $e) {
            jsonException('Store settings load error', $e);
        }

    case 'get_storefront_snapshot':
        try {
            jsonCachedResponse('get_storefront_snapshot', ['catalog', 'promotions', 'store_settings'], 15, static function (): array {
                $settings = storageGetStoreSettings();

                return [
                    'products' => array_values(array_filter(
                        storageGetProducts(true),
                        static fn (array $product): bool => !empty($product['store_enabled']) && (int) ($product['available_stock'] ?? 0) > 0
                    )),
                    'promotions' => storageGetPromotions(true),
                    'store_settings' => [
                        ...$settings,
                        'is_open_now' => storageIsStoreOpenNow($settings),
                    ],
                ];
            });
        } catch (\Throwable $e) {
            jsonException('Storefront snapshot load error', $e);
        }

    case 'update_store_settings':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $settings = storageUpdateStoreSettings($data);
            $ifoodHoursSync = null;
            try {
                $ifoodHoursSync = ifoodSyncOpeningHours($settings['ifood_weekly_hours'] ?? []);
            } catch (\Throwable $syncError) {
                $ifoodHoursSync = [
                    'status' => 'error',
                    'message' => $syncError->getMessage(),
                ];
            }
            apiInvalidateCacheTags(['store_settings', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'store_settings' => [
                    ...$settings,
                    'is_open_now' => storageIsStoreOpenNow($settings),
                ],
                'ifood_hours_sync' => $ifoodHoursSync,
            ]);
        } catch (\Throwable $e) {
            jsonException('Store settings update error', $e);
        }

    case 'get_logistics':
        try {
            jsonCachedResponse('get_logistics', ['logistics'], 10, static fn () => storageGetLogistics());
        } catch (\Throwable $e) {
            jsonException('Logistics load error', $e);
        }

    case 'get_orders':
        try {
            jsonResponse(syncTrackedUberOrders(storageGetOrders()));
        } catch (\Throwable $e) {
            jsonException('Orders load error', $e);
        }

    case 'update_order_status':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $orderId = (int) ($data['id'] ?? 0);
            $nextStatus = (string) ($data['status'] ?? 'pending');
            $order = storageGetOrderDetailsById($orderId);
            $ifoodAction = null;
            $ifoodResult = null;

            if ($order && strtolower(trim((string) ($order['delivery_mode'] ?? ''))) === 'ifood') {
                $ifoodOrderId = ifoodOrderIdForLocalOrder($orderId);
                if ($ifoodOrderId !== '') {
                    $ifoodPayload = ifoodPayloadForLocalOrder($orderId);
                    $ifoodDelivery = is_array($ifoodPayload['delivery'] ?? null) ? $ifoodPayload['delivery'] : [];
                    $ifoodOrderType = strtoupper(trim((string) ($ifoodPayload['orderType'] ?? '')));
                    $ifoodDeliveredBy = strtoupper(trim((string) ($ifoodDelivery['deliveredBy'] ?? $order['ifood_delivery_by'] ?? '')));
                    $shippedAction = $ifoodOrderType === 'DELIVERY' && $ifoodDeliveredBy === 'MERCHANT'
                        ? 'dispatch'
                        : 'ready_to_pickup';
                    $ifoodAction = match ($nextStatus) {
                        'preparing' => 'start_preparation',
                        'shipped' => $shippedAction,
                        default => null,
                    };
                }
            }

            if ($ifoodAction) {
                $ifoodResult = ifoodOrderActionAndSyncLocal($ifoodOrderId, $ifoodAction);
            } else {
                storageUpdateOrderStatus($orderId, $nextStatus);
            }
            apiInvalidateCacheTags(['catalog', 'orders', 'logistics', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'ifood_action' => $ifoodAction,
                'ifood_result' => $ifoodResult,
                'order' => storageGetOrderDetailsById($orderId),
            ]);
        } catch (\Throwable $e) {
            jsonException('Order status update error', $e);
        }

    case 'mark_order_printed':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $orderId = (int) ($data['id'] ?? 0);
            $order = storageMarkOrderPrinted($orderId);
            $ifoodFlow = null;
            if ($order && strtolower(trim((string) ($order['delivery_mode'] ?? ''))) === 'ifood' && ($order['status'] ?? '') !== 'cancelled') {
                $ifoodFlow = ifoodTryAdvancePrintedLocalOrder($order);
                $order = $ifoodFlow['order'] ?? storageGetOrderDetailsById($orderId);
            }
            apiInvalidateCacheTags(['orders', 'logistics', 'stats', 'admin_snapshot']);

            jsonResponse([
                'status' => 'success',
                'order' => $order,
                'ifood_flow' => $ifoodFlow,
            ]);
        } catch (\Throwable $e) {
            jsonException('Order print update error', $e);
        }

    case 'dispatch_order':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $orderId = (int) ($data['id'] ?? 0);
            $dispatchError = null;

            try {
                $order = dispatchUberForOrder($orderId);
            } catch (\Throwable $dispatchException) {
                $dispatchError = $dispatchException->getMessage();
                $order = storageGetOrderDetailsById($orderId);
            }

            apiInvalidateCacheTags(['orders', 'logistics', 'stats', 'admin_snapshot']);

            jsonResponse([
                'status' => $dispatchError ? 'failed' : 'success',
                'order' => $order,
                'dispatch_error' => $dispatchError,
            ]);
        } catch (\Throwable $e) {
            jsonException('Uber dispatch error', $e);
        }

    case 'retry_uber_dispatch':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();

        try {
            $orderId = (int) ($data['id'] ?? 0);
            $dispatchError = null;

            try {
                $order = dispatchUberForOrder($orderId, true);
            } catch (\Throwable $dispatchException) {
                $dispatchError = $dispatchException->getMessage();
                $order = storageGetOrderDetailsById($orderId);
            }

            apiInvalidateCacheTags(['orders', 'logistics', 'stats', 'admin_snapshot']);

            jsonResponse([
                'status' => $dispatchError ? 'failed' : 'success',
                'order' => $order,
                'dispatch_error' => $dispatchError,
            ]);
        } catch (\Throwable $e) {
            jsonException('Uber dispatch retry error', $e);
        }

    case 'get_customer_orders':
        $phone = preg_replace('/\D+/', '', trim((string) ($_GET['phone'] ?? '')));
        if (!is_string($phone) || strlen($phone) < 10) {
            jsonResponse([]);
        }

        try {
            requireCustomerAuth($phone);
            jsonResponse(syncTrackedUberOrders(storageGetCustomerOrders($phone)));
        } catch (\Throwable $e) {
            jsonException('Customer orders load error', $e);
        }

    case 'get_stock':
        try {
            jsonResponse(storageGetStock());
        } catch (\Throwable $e) {
            jsonException('Stock load error', $e);
        }

    case 'adjust_stock':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        try {
            $result = storageAdjustStock(readJsonInput());
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                ...$result,
                'ifood_catalog' => null,
            ]);
        } catch (\Throwable $e) {
            jsonException('Stock adjustment error', $e);
        }

    case 'bulk_increment_stock':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $amount = (int) ($data['amount'] ?? 0);
        if ($amount === 0) {
            jsonResponse(['error' => 'Validation error', 'details' => ['message' => 'Informe uma quantidade valida.']], 422);
        }

        try {
            storageBulkIncrementStock($amount);
            apiInvalidateCacheTags(['catalog', 'stats', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'ifood_catalog' => null,
            ]);
        } catch (\Throwable $e) {
            jsonException('Bulk increment error', $e);
        }

    case 'get_ifood_catalog':
        try {
            jsonResponse([
                'status' => 'success',
                ...storageBuildIfoodCatalogPayload(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood catalog build error', $e);
        }

    case 'get_ifood_remote_catalog_status':
        try {
            jsonResponse([
                'status' => 'success',
                ...ifoodRemoteCatalogStatus(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood remote catalog status error', $e);
        }

    case 'get_ifood_sync_progress':
        $progressId = ifoodSyncProgressId($_GET['progress_id'] ?? '');
        if ($progressId === '') {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Identificador de progresso iFood invalido.'],
            ], 422);
        }

        $progress = ifoodReadSyncProgress($progressId);
        jsonResponse([
            'status' => 'success',
            'progress' => $progress ?? [
                'phase' => 'waiting',
                'message' => 'Aguardando inicio da sincronizacao.',
                'processed_items' => 0,
                'total_items' => 0,
            ],
        ]);

    case 'sync_ifood_catalog':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        $progressId = ifoodSyncProgressId($data['progress_id'] ?? '');
        $syncMode = trim((string) ($data['mode'] ?? 'catalog'));
        if ($syncMode === 'stock_only') {
            try {
                $payload = storageBuildIfoodCatalogPayload();
                $sync = ifoodSyncCatalogStockOnly($payload);
                jsonResponse([
                    'status' => $sync['status'] ?? 'success',
                    'mode' => 'stock_only',
                    'items_count' => $payload['count'] ?? 0,
                    'sync' => $sync,
                ]);
            } catch (\Throwable $e) {
                jsonException('iFood stock sync error', $e);
            }
        }

        $selectedCategories = is_array($data['selected_categories'] ?? null)
            ? array_values(array_filter(array_map(
                static fn ($category): string => trim((string) $category),
                $data['selected_categories']
            ), static fn (string $category): bool => $category !== ''))
            : [];
        if (empty($selectedCategories)) {
            jsonResponse([
                'error' => 'Validation error',
                'details' => ['message' => 'Selecione pelo menos uma categoria antes de sincronizar o iFood.'],
            ], 422);
        }

        try {
            $payload = storageBuildIfoodCatalogPayload($selectedCategories);
            if ((int) ($payload['count'] ?? 0) <= 0) {
                jsonResponse([
                    'error' => 'Validation error',
                    'details' => ['message' => 'Nenhum produto encontrado nas categorias selecionadas: ' . implode(', ', $selectedCategories) . '.'],
                    'selected_categories' => $selectedCategories,
                ], 422);
            }
            ifoodWriteSyncProgress($progressId, [
                'phase' => 'starting',
                'message' => 'Iniciando envio das categorias selecionadas.',
                'categories' => $selectedCategories,
                'processed_items' => 0,
                'total_items' => (int) ($payload['count'] ?? 0),
            ]);
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }
            $sync = ifoodSyncCatalogV2($payload, true, static function (array $progress) use ($progressId, $selectedCategories): void {
                ifoodWriteSyncProgress($progressId, [
                    ...$progress,
                    'categories' => $selectedCategories,
                ]);
            });
            $syncedCategories = storageRememberIfoodSyncedCategories($selectedCategories);
            ifoodWriteSyncProgress($progressId, [
                'phase' => 'completed',
                'message' => 'Cardapio enviado ao iFood.',
                'categories' => $selectedCategories,
                'processed_items' => (int) ($sync['items_synced'] ?? $payload['count'] ?? 0),
                'total_items' => (int) ($payload['count'] ?? 0),
            ]);
            jsonResponse([
                'status' => $sync['status'] ?? 'success',
                'items_count' => $payload['count'] ?? 0,
                'selected_categories' => $selectedCategories,
                'synced_categories' => $syncedCategories,
                'sync' => $sync,
            ]);
        } catch (\Throwable $e) {
            ifoodWriteSyncProgress($progressId, [
                'phase' => 'error',
                'message' => $e->getMessage(),
                'categories' => $selectedCategories,
            ]);
            jsonException('iFood sync error', $e);
        }

    case 'get_ifood_dashboard':
        try {
            jsonResponse([
                'status' => 'success',
                ...storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood dashboard error', $e);
        }

    case 'ifood_authorization_start':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            jsonResponse([
                'status' => 'success',
                ...ifoodCreateUserCode(),
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood authorization start error', $e);
        }

    case 'ifood_authorization_finish':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            jsonResponse([
                'status' => 'success',
                ...ifoodFinishAuthorization((string) ($data['authorization_code'] ?? '')),
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood authorization finish error', $e);
        }

    case 'ifood_save_settings':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            $settingsPayload = [
                'sync_enabled' => filter_var($data['sync_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'catalog_sync_path' => (string) ($data['catalog_sync_path'] ?? ''),
                'price_markup_percent' => max(defined('IFOOD_MIN_MARKUP_PERCENT') ? (float) IFOOD_MIN_MARKUP_PERCENT : 28.0, (float) ($data['price_markup_percent'] ?? 28)),
            ];
            if (array_key_exists('merchant_id', $data)) {
                $settingsPayload['merchant_id'] = (string) $data['merchant_id'];
            }
            $settings = storageUpdateIfoodAuthSettings($settingsPayload);
            apiInvalidateCacheTags(['ifood', 'admin_snapshot']);
            jsonResponse([
                'status' => 'success',
                'settings' => $settings,
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood settings error', $e);
        }

    case 'ifood_discovery':
        try {
            jsonResponse([
                'status' => 'success',
                ...ifoodDiscovery(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood discovery error', $e);
        }

    case 'ifood_merchants':
        try {
            jsonResponse([
                'status' => 'success',
                'data' => ifoodApiRequest('merchant/v1.0/merchants')['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood merchants error', $e);
        }

    case 'ifood_merchant_details':
        try {
            $merchantId = trim((string) ($_GET['merchant_id'] ?? '')) ?: ifoodMerchantId();
            jsonResponse([
                'status' => 'success',
                'merchant_id' => $merchantId,
                'data' => ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId))['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood merchant details error', $e);
        }

    case 'ifood_merchant_status':
        try {
            $merchantId = trim((string) ($_GET['merchant_id'] ?? '')) ?: ifoodMerchantId();
            jsonResponse([
                'status' => 'success',
                'data' => ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/status')['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood merchant status error', $e);
        }

    case 'ifood_opening_hours':
        try {
            $merchantId = trim((string) ($_GET['merchant_id'] ?? '')) ?: ifoodMerchantId();
            jsonResponse([
                'status' => 'success',
                'merchant_id' => $merchantId,
                'data' => ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/opening-hours')['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood opening hours error', $e);
        }

    case 'ifood_interruptions':
        try {
            $merchantId = trim((string) ($_GET['merchant_id'] ?? '')) ?: ifoodMerchantId();
            jsonResponse([
                'status' => 'success',
                'data' => ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/interruptions')['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood interruptions error', $e);
        }

    case 'ifood_create_interruption':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            $merchantId = trim((string) ($data['merchant_id'] ?? '')) ?: ifoodMerchantId();
            $body = [
                'description' => trim((string) ($data['description'] ?? 'Pausa operacional')),
                'start' => trim((string) ($data['start'] ?? gmdate('c'))),
                'end' => trim((string) ($data['end'] ?? gmdate('c', time() + 1800))),
            ];
            jsonResponse([
                'status' => 'success',
                'data' => ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/interruptions', 'POST', $body)['data'] ?? null,
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood create interruption error', $e);
        }

    case 'ifood_delete_interruption':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            $merchantId = trim((string) ($data['merchant_id'] ?? '')) ?: ifoodMerchantId();
            $interruptionId = trim((string) ($data['interruption_id'] ?? ''));
            if ($interruptionId === '') {
                jsonResponse(['error' => 'Missing interruption id'], 422);
            }
            ifoodApiRequest('merchant/v1.0/merchants/' . rawurlencode($merchantId) . '/interruptions/' . rawurlencode($interruptionId), 'DELETE');
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('iFood delete interruption error', $e);
        }

    case 'ifood_poll_events':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            jsonResponse([
                'status' => 'success',
                ...ifoodPollEvents(),
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood polling error', $e);
        }

    case 'ifood_order_details':
        try {
            $orderId = trim((string) ($_GET['order_id'] ?? ''));
            if ($orderId === '') {
                jsonResponse(['error' => 'Missing order id'], 422);
            }
            $order = ifoodApiRequest('order/v1.0/orders/' . rawurlencode($orderId));
            if (is_array($order['data'] ?? null)) {
                storageUpsertIfoodOrder($order['data']);
            }
            jsonResponse(['status' => 'success', 'data' => $order['data'] ?? null]);
        } catch (\Throwable $e) {
            jsonException('iFood order details error', $e);
        }

    case 'ifood_order_cancellation_reasons':
        try {
            $orderId = trim((string) ($_GET['order_id'] ?? ''));
            if ($orderId === '') {
                jsonResponse(['error' => 'Missing order id'], 422);
            }
            $response = ifoodOrderCancellationReasons($orderId);
            jsonResponse([
                'status' => 'success',
                'data' => $response['data'] ?? null,
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood cancellation reasons error', $e);
        }

    case 'ifood_order_tracking':
        try {
            $orderId = trim((string) ($_GET['order_id'] ?? ''));
            if ($orderId === '') {
                jsonResponse(['error' => 'Missing order id'], 422);
            }
            $response = ifoodOrderTracking($orderId);
            jsonResponse([
                'status' => 'success',
                'data' => $response['data'] ?? null,
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood order tracking error', $e);
        }

    case 'ifood_order_action':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            $orderId = trim((string) ($data['order_id'] ?? ''));
            $orderAction = trim((string) ($data['order_action'] ?? ''));
            if ($orderId === '' || $orderAction === '') {
                jsonResponse(['error' => 'Missing order action fields'], 422);
            }
            $response = ifoodOrderActionAndSyncLocal($orderId, $orderAction, $data['body'] ?? []);
            jsonResponse([
                'status' => 'success',
                'data' => $response['data'] ?? null,
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood order action error', $e);
        }

    case 'ifood_dispute_action':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        try {
            $data = readJsonInput();
            $disputeId = trim((string) ($data['dispute_id'] ?? ''));
            $disputeAction = trim((string) ($data['dispute_action'] ?? ''));
            if ($disputeId === '' || $disputeAction === '') {
                jsonResponse(['error' => 'Missing dispute action fields'], 422);
            }
            $response = ifoodDisputeAction($disputeId, $disputeAction, is_array($data['body'] ?? null) ? $data['body'] : []);
            jsonResponse([
                'status' => 'success',
                'data' => $response['data'] ?? null,
                'dashboard' => storageGetIfoodDashboard(),
            ]);
        } catch (\Throwable $e) {
            jsonException('iFood dispute action error', $e);
        }

    case 'get_promotions':
        try {
            jsonCachedResponse('get_promotions', ['promotions'], 30, static fn () => storageGetPromotions(false));
        } catch (\Throwable $e) {
            jsonException('Promotions load error', $e);
        }

    case 'save_promotion':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $data = readJsonInput();
        try {
            storageSavePromotion($data);
            apiInvalidateCacheTags(['promotions', 'admin_snapshot']);
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('Promotion save error', $e);
        }

    case 'delete_promotion':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['error' => 'Missing promotion id'], 422);
        }

        try {
            storageDeletePromotion($id);
            apiInvalidateCacheTags(['promotions', 'admin_snapshot']);
            jsonResponse(['status' => 'success']);
        } catch (\Throwable $e) {
            jsonException('Promotion delete error', $e);
        }

    default:
        jsonResponse(['error' => 'Invalid action'], 404);
    }
}
