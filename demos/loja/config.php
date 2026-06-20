<?php
function loadProjectEnvFile(): void
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    $paths = [
        __DIR__ . DIRECTORY_SEPARATOR . '.env',
        dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env',
    ];

    foreach ($paths as $path) {
        if (!is_file($path) || !is_readable($path)) {
            continue;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!is_array($lines)) {
            continue;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
                continue;
            }

            [$name, $value] = explode('=', $trimmed, 2);
            $name = trim($name);
            $value = trim($value);

            if ($name === '') {
                continue;
            }

            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"'))
                || (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            // Project .env values should win over inherited process env so local
            // payment/account changes do not keep using stale machine settings.
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }

        break;
    }
}

loadProjectEnvFile();

date_default_timezone_set('America/Sao_Paulo');

function detectRequestBaseUrl(): string
{
    $forwardedHost = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''))[0] ?? '');
    $host = $forwardedHost !== '' ? $forwardedHost : trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        return 'http://localhost:5173';
    }

    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
    $forwardedProto = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
    $scheme = ($https === 'on' || $https === '1' || $forwardedProto === 'https') ? 'https' : 'http';

    return $scheme . '://' . $host;
}

function envFlag(string $name, ?bool $default = null): bool
{
    $value = getenv($name);
    if ($value === false || trim((string) $value) === '') {
        return (bool) $default;
    }

    $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    return $parsed ?? (bool) $default;
}

function isLocalUrlHost(string $url): bool
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function defaultDataApiBaseUrl(): string
{
    return isLocalUrlHost(detectRequestBaseUrl())
        ? 'http://localhost:3077'
        : 'https://db.lumixice.com.br';
}

// DNL Data API storage
define('DATA_API_BASE_URL', rtrim(getenv('DATA_API_BASE_URL') ?: defaultDataApiBaseUrl(), '/'));
define('DATA_API_CLIENT_ID', getenv('DATA_API_CLIENT_ID') ?: 'gelocrm_admin');
define('DATA_API_KEY', getenv('DATA_API_KEY') ?: 'pFRRVFgTcXfombzK47puFD7aiCG9RuZ5odOi4lh7soQ');
define('DATA_API_DATASOURCE', getenv('DATA_API_DATASOURCE') ?: 'gelocrm_mysql');
define('DATA_API_TABLES_QUERY', getenv('DATA_API_TABLES_QUERY') ?: 'gelocrm_tables');
define('DATA_API_STORAGE_PRODUCTS_DIR', trim(getenv('DATA_API_STORAGE_PRODUCTS_DIR') ?: 'products', '/'));
define(
    'DATA_API_AUTO_BOOTSTRAP',
    filter_var(getenv('DATA_API_AUTO_BOOTSTRAP') ?: '1', FILTER_VALIDATE_BOOLEAN)
);
define('DATA_API_SCHEMA_CACHE_TTL', max(60, (int) (getenv('DATA_API_SCHEMA_CACHE_TTL') ?: 3600)));
define('GEOCODE_CACHE_TTL', max(300, (int) (getenv('GEOCODE_CACHE_TTL') ?: 604800)));
define('ADMIN_EVENTS_ENABLED', envFlag('ADMIN_EVENTS_ENABLED', envFlag('VITE_ADMIN_EVENTS_ENABLED', true)));

// Uber Direct API Credentials
define('UBER_CLIENT_ID', getenv('UBER_CLIENT_ID') ?: 'VIIspMeo4BaZMU0UCHtyIWlaukF6ZmAI');
define('UBER_CLIENT_SECRET', getenv('UBER_CLIENT_SECRET') ?: 'O8DZ46TQa42jMKiVzxqsaI-v5OruceWGEp2l0t9j');
define('UBER_CUSTOMER_ID', getenv('UBER_CUSTOMER_ID') ?: '73e1cbd2-6eb8-512b-8b6d-861b68bbd421');
define(
    'ENTREGA_TESTE',
    envFlag(
        'ENTREGA_TESTE',
        strtolower(trim((string) (getenv('UBER_ENV') ?: 'sandbox'))) !== 'production'
    )
);
define('UBER_ENV', ENTREGA_TESTE ? 'sandbox' : 'production');

// Store fixed address (Departure)
define('STORE_ADDRESS', getenv('STORE_ADDRESS') ?: 'Av. Amazonas, 2819 - Gutierrez, Belo Horizonte - MG, 30411-001');
define('STORE_NAME', getenv('STORE_NAME') ?: 'Lumix Ice');
define('STORE_PHONE', getenv('STORE_PHONE') ?: '5531997491178');
define('GOOGLE_DRIVE_CLIENT_ID', getenv('GOOGLE_DRIVE_CLIENT_ID') ?: '');
define('ADMIN_PANEL_USERNAME', getenv('ADMIN_PANEL_USERNAME') ?: 'demo@demo');
define('ADMIN_PANEL_PASSWORD', getenv('ADMIN_PANEL_PASSWORD') ?: 'demo123');
define('ADMIN_PANEL_PASSWORD_HASH', getenv('ADMIN_PANEL_PASSWORD_HASH') ?: '');
define('ADMIN_PANEL_DISPLAY_NAME', getenv('ADMIN_PANEL_DISPLAY_NAME') ?: 'Administrador');
define(
    'UBER_SANDBOX_AUTO_COURIER',
    envFlag('UBER_SANDBOX_AUTO_COURIER', ENTREGA_TESTE)
);

// Public app URLs used by external payment redirects/webhooks.
define('APP_BASE_URL', rtrim(getenv('APP_BASE_URL') ?: detectRequestBaseUrl(), '/'));
define('API_BASE_URL', rtrim(getenv('API_BASE_URL') ?: APP_BASE_URL, '/'));

function resolveHttpCaInfoPath(?string $value): string
{
    $candidate = trim((string) ($value ?? ''));
    if ($candidate === '') {
        return '';
    }

    if (is_file($candidate)) {
        return $candidate;
    }

    $relativeCandidates = [
        __DIR__ . DIRECTORY_SEPARATOR . $candidate,
        dirname(__DIR__) . DIRECTORY_SEPARATOR . $candidate,
    ];

    foreach ($relativeCandidates as $path) {
        if (is_file($path)) {
            return $path;
        }
    }

    return $candidate;
}

define('HTTP_CAINFO', resolveHttpCaInfoPath(getenv('HTTP_CAINFO') ?: ''));

function isLocalAppHost(string $url): bool
{
    return isLocalUrlHost($url);
}

$httpVerifySslEnv = getenv('HTTP_VERIFY_SSL');
$defaultHttpVerifySsl = !isLocalAppHost(APP_BASE_URL) && !isLocalAppHost(API_BASE_URL);
define(
    'HTTP_VERIFY_SSL',
    $httpVerifySslEnv === false
        ? $defaultHttpVerifySsl
        : filter_var($httpVerifySslEnv, FILTER_VALIDATE_BOOLEAN)
);

function applyCurlSslOptions($ch): void
{
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, HTTP_VERIFY_SSL);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, HTTP_VERIFY_SSL ? 2 : 0);

    if (!HTTP_VERIFY_SSL) {
        return;
    }

    if (HTTP_CAINFO !== '' && is_file(HTTP_CAINFO)) {
        curl_setopt($ch, CURLOPT_CAINFO, HTTP_CAINFO);
        return;
    }

    if (defined('CURLOPT_SSL_OPTIONS') && defined('CURLSSLOPT_NATIVE_CA')) {
        curl_setopt($ch, CURLOPT_SSL_OPTIONS, CURLSSLOPT_NATIVE_CA);
    }
}

// InfinitePay Checkout configuration.
define('INFINITEPAY_HANDLE', getenv('INFINITEPAY_HANDLE') ?: 'charles-araujo-9i3');
define('PAGAMENTO_TESTE', envFlag('PAGAMENTO_TESTE', false));
define('INFINITEPAY_MOCK', PAGAMENTO_TESTE);
define('INFINITEPAY_MOCK_DEFAULT_STATUS', strtolower(trim(getenv('INFINITEPAY_MOCK_DEFAULT_STATUS') ?: 'paid')));
define('INFINITEPAY_CHECKOUT_URL', 'https://api.infinitepay.io/invoices/public/checkout/links');
define('INFINITEPAY_PAYMENT_CHECK_URL', 'https://api.infinitepay.io/invoices/public/checkout/payment_check');
define('INFINITEPAY_REDIRECT_URL', getenv('INFINITEPAY_REDIRECT_URL') ?: APP_BASE_URL . '/');
define('INFINITEPAY_WEBHOOK_URL', getenv('INFINITEPAY_WEBHOOK_URL') ?: API_BASE_URL . '/api.php?action=infinitepay_webhook');
define('MOBILE_STOREFRONT_RETURN_PATH', getenv('MOBILE_STOREFRONT_RETURN_PATH') ?: '/mobile/front-vendas-demo/checkout-return');
define('MOBILE_PANEL_OPEN_PATH', getenv('MOBILE_PANEL_OPEN_PATH') ?: '/mobile/front-vendas-painel-demo/open');
define('AGE_VERIFICATION_TOKEN_SECRET', getenv('AGE_VERIFICATION_TOKEN_SECRET') ?: 'gelocrm-age-token-secret');

define('WHATSAPP_FLOAT_PHONE', preg_replace('/\D+/', '', getenv('WHATSAPP_FLOAT_PHONE') ?: STORE_PHONE));
define('IFOOD_CLIENT_ID', getenv('IFOOD_CLIENT_ID') ?: '');
define('IFOOD_CLIENT_SECRET', getenv('IFOOD_CLIENT_SECRET') ?: '');
define('IFOOD_MERCHANT_ID', getenv('IFOOD_MERCHANT_ID') ?: '');
define('IFOOD_AUTH_GRANT_TYPE', getenv('IFOOD_AUTH_GRANT_TYPE') ?: 'client_credentials');
define('IFOOD_AUTHORIZATION_CODE', getenv('IFOOD_AUTHORIZATION_CODE') ?: '');
define('IFOOD_AUTHORIZATION_CODE_VERIFIER', getenv('IFOOD_AUTHORIZATION_CODE_VERIFIER') ?: '');
define('IFOOD_REFRESH_TOKEN', getenv('IFOOD_REFRESH_TOKEN') ?: '');
define('IFOOD_API_BASE_URL', rtrim(getenv('IFOOD_API_BASE_URL') ?: 'https://merchant-api.ifood.com.br', '/'));
define('IFOOD_CATALOG_SYNC_PATH', getenv('IFOOD_CATALOG_SYNC_PATH') ?: '');
define('IFOOD_SYNC_ENABLED', envFlag('IFOOD_SYNC_ENABLED', false));
define('IFOOD_EVENTS_WORKER_ENABLED', envFlag('IFOOD_EVENTS_WORKER_ENABLED', true));
define('IFOOD_EVENTS_POLL_INTERVAL_SECONDS', max(30, (int) (getenv('IFOOD_EVENTS_POLL_INTERVAL_SECONDS') ?: 30)));
define('IFOOD_MIN_MARKUP_PERCENT', max(28, (float) (getenv('IFOOD_MIN_MARKUP_PERCENT') ?: 28)));
define('IFOOD_DEFAULT_MARKUP_PERCENT', max(IFOOD_MIN_MARKUP_PERCENT, (float) (getenv('IFOOD_DEFAULT_MARKUP_PERCENT') ?: IFOOD_MIN_MARKUP_PERCENT)));

function trimTrailingSlash(string $value): string
{
    return rtrim(trim($value), '/');
}

function normalizeOriginUrl(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $parts = parse_url($value);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return trimTrailingSlash($value);
    }

    $origin = strtolower($parts['scheme']) . '://' . strtolower($parts['host']);
    if (!empty($parts['port'])) {
        $origin .= ':' . (int) $parts['port'];
    }

    return $origin;
}

function parseCsvEnvList(string $value): array
{
    $items = preg_split('/[\s,]+/', trim($value)) ?: [];
    return array_values(array_filter(array_map('trim', $items), static fn ($item) => $item !== ''));
}

function buildPublicAppUrl(string $path): string
{
    return trimTrailingSlash(APP_BASE_URL) . '/' . ltrim($path, '/');
}

function getAllowedApiOrigins(): array
{
    static $origins = null;
    if (is_array($origins)) {
        return $origins;
    }

    $defaults = [
        APP_BASE_URL,
        API_BASE_URL,
        'https://lumixice.com.br',
        'https://php.lumixice.com.br',
        'https://age.lumixice.com.br',
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
        'http://127.0.0.1',
        'https://127.0.0.1',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
    ];

    $configured = parseCsvEnvList((string) (getenv('API_ALLOWED_ORIGINS') ?: ''));
    $origins = array_values(array_unique(array_filter(array_map('normalizeOriginUrl', array_merge($defaults, $configured)))));

    return $origins;
}

function getAllowedInfinitePayRedirectUrls(): array
{
    static $redirects = null;
    if (is_array($redirects)) {
        return $redirects;
    }

    $configured = parseCsvEnvList((string) (getenv('INFINITEPAY_ALLOWED_REDIRECT_URLS') ?: ''));
    $defaults = [
        INFINITEPAY_REDIRECT_URL,
        buildPublicAppUrl(MOBILE_STOREFRONT_RETURN_PATH),
    ];

    $redirects = array_values(array_unique(array_filter(array_map('trimTrailingSlash', array_merge($defaults, $configured)))));
    return $redirects;
}

function sanitizeInfinitePayRedirectUrl(?string $value): string
{
    $candidate = trimTrailingSlash((string) ($value ?? ''));
    if ($candidate === '') {
        return trimTrailingSlash(INFINITEPAY_REDIRECT_URL);
    }

    foreach (getAllowedInfinitePayRedirectUrls() as $allowedUrl) {
        if ($candidate === trimTrailingSlash($allowedUrl)) {
            return trimTrailingSlash($allowedUrl);
        }
    }

    return trimTrailingSlash(INFINITEPAY_REDIRECT_URL);
}
