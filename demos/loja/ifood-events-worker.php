<?php
define('GEOCRM_API_LIBRARY_ONLY', true);
require_once __DIR__ . '/api.php';

function ifoodWorkerLog(string $message): void
{
    fwrite(STDOUT, '[' . date('c') . '] ' . $message . PHP_EOL);
}

if (!IFOOD_EVENTS_WORKER_ENABLED) {
    ifoodWorkerLog('Worker de eventos iFood desativado por configuracao.');
    exit(0);
}

ifoodWorkerLog('Worker de eventos iFood iniciado. Intervalo: ' . IFOOD_EVENTS_POLL_INTERVAL_SECONDS . 's.');

while (true) {
    try {
        $dashboard = storageGetIfoodDashboard();
        if (empty($dashboard['configured']) || empty($dashboard['merchant_linked'])) {
            ifoodWorkerLog('Aguardando credenciais e merchant iFood vinculados.');
        } else {
            $poll = ifoodPollEvents();
            ifoodWorkerLog('Polling concluido. Eventos recebidos: ' . (int) ($poll['events_count'] ?? 0) . '.');
        }
    } catch (\Throwable $e) {
        ifoodWorkerLog('Falha no polling: ' . $e->getMessage());
    }

    sleep(IFOOD_EVENTS_POLL_INTERVAL_SECONDS);
}
