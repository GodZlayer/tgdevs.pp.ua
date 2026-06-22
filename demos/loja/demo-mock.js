(() => {
  const now = new Date().toISOString();
  const demoRoot = new URL('.', document.currentScript?.src || location.href).href;
  const asset = (path) => new URL(path, demoRoot).href;
  const customers = [
    { id: 1, name: 'Marina Alves', phone: '31999042766', address: 'Av. Francisco Sa, 787', tags: ['VIP', 'Festa'], revenue: 842.4 },
    { id: 2, name: 'Bar do Renato', phone: '31988441020', address: 'Rua Sapucai, 22', tags: ['Recorrente', 'B2B'], revenue: 1680.7 },
    { id: 3, name: 'Condominio Vista Azul', phone: '31977184430', address: 'Rua dos Timbiras, 1400', tags: ['Contrato'], revenue: 2295 },
    { id: 4, name: 'Cliente Balcao', phone: '31900000000', address: 'Retirada na loja', tags: ['PDV'], revenue: 37.8 },
    { id: 5, name: 'Luiza Campos', phone: '31991204411', address: 'Rua Curitiba, 510', tags: ['iFood'], revenue: 324.8 }
  ];
  const products = [
    { id: 101, name: 'Gelo Cubo 5kg', category: 'Gelos', price: 18.9, stock_quantity: 86, min_stock: 35, location: 'Freezer A1', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 },
    { id: 102, name: 'Gelo Escama 10kg', category: 'Gelos', price: 32.5, stock_quantity: 18, min_stock: 22, location: 'Freezer B2', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 0 },
    { id: 103, name: 'Carvao Premium 4kg', category: 'Churrasco', price: 24.9, stock_quantity: 11, min_stock: 16, location: 'Prateleira C1', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 },
    { id: 104, name: 'Energetico 2L', category: 'Bebidas', price: 15.9, stock_quantity: 36, min_stock: 20, location: 'Geladeira D2', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 0 },
    { id: 105, name: 'Agua Mineral 12un', category: 'Bebidas', price: 22, stock_quantity: 9, min_stock: 14, location: 'Deposito E1', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 },
    { id: 106, name: 'Kit Festa Rapida', category: 'Combos', price: 89.9, stock_quantity: 7, min_stock: 8, location: 'Combo virtual', img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 }
  ];
  const orders = [
    { id: 2048, customer_id: 1, customer_name: 'Marina Alves', customer_phone: '31999042766', status: 'preparing', payment_status: 'paid', print_status: 'pending', delivery_mode: 'uber_flash', delivery_status: 'waiting_courier', total: 134.7, delivery_fee: 13.5, created_at: now, items: [{ product_id: 101, name: 'Gelo Cubo 5kg', quantity: 3, price: 18.9 }, { product_id: 104, name: 'Energetico 2L', quantity: 2, price: 15.9 }, { product_id: 106, name: 'Kit Festa Rapida', quantity: 1, price: 89.9 }] },
    { id: 2047, customer_id: 2, customer_name: 'Bar do Renato', customer_phone: '31988441020', status: 'pending_payment', payment_status: 'pending', print_status: 'pending', delivery_mode: 'private', delivery_status: 'paused', total: 162.5, delivery_fee: 9, created_at: now, items: [{ product_id: 102, name: 'Gelo Escama 10kg', quantity: 5, price: 32.5 }] },
    { id: 2046, customer_id: 5, customer_name: 'Luiza Campos', customer_phone: '31991204411', status: 'preparing', payment_status: 'paid', print_status: 'printed', delivery_mode: 'ifood', delivery_status: 'waiting_accept', total: 64.8, delivery_fee: 0, created_at: now, items: [{ product_id: 101, name: 'Gelo Cubo 5kg', quantity: 2, price: 18.9 }, { product_id: 105, name: 'Agua Mineral 12un', quantity: 1, price: 22 }] },
    { id: 2045, customer_id: 3, customer_name: 'Condominio Vista Azul', customer_phone: '31977184430', status: 'ready', payment_status: 'invoiced', print_status: 'printed', delivery_mode: 'private', delivery_status: 'courier_assigned', total: 295, delivery_fee: 18, created_at: now, items: [{ product_id: 101, name: 'Gelo Cubo 5kg', quantity: 10, price: 18.9 }, { product_id: 103, name: 'Carvao Premium 4kg', quantity: 4, price: 24.9 }, { product_id: 105, name: 'Agua Mineral 12un', quantity: 1, price: 22 }] },
    { id: 2044, customer_id: 4, customer_name: 'Cliente Balcao', customer_phone: '31900000000', status: 'completed', payment_status: 'paid', print_status: 'printed', delivery_mode: 'pickup', delivery_status: 'completed', total: 37.8, delivery_fee: 0, created_at: now, items: [{ product_id: 101, name: 'Gelo Cubo 5kg', quantity: 2, price: 18.9 }] }
  ];
  const movements = [
    { id: 1, type: 'income', source: 'InfinitePay', order_id: 2048, amount: 134.7, status: 'paid' },
    { id: 2, type: 'income', source: 'iFood', order_id: 2046, amount: 64.8, status: 'reconcile' },
    { id: 3, type: 'income', source: 'Dinheiro', order_id: 2044, amount: 37.8, status: 'cash' },
    { id: 4, type: 'cost', source: 'Uber Flash', order_id: 2048, amount: -13.5, status: 'forecast' },
    { id: 5, type: 'cost', source: 'Motoboy privado', order_id: 2045, amount: -18, status: 'forecast' }
  ];
  const tasks = [
    { id: 1, title: 'Repor agua 12un no deposito', link: 'produto:105', status: 'pending' },
    { id: 2, title: 'Confirmar Pix do Bar do Renato', link: 'pedido:2047', status: 'late' },
    { id: 3, title: 'Enviar comprovante ao condominio', link: 'pedido:2045', status: 'pending' }
  ];
  const settings = { ordering_enabled: true, opening_time: '08:00', closing_time: '22:00', is_open_now: true, courier_rule_mode: 'items_count', private_dispatch_enabled: true };
  const snapshot = {
    products,
    customers,
    product_categories: [{ id: 1, name: 'Gelos', products_count: 2 }, { id: 2, name: 'Churrasco', products_count: 1 }, { id: 3, name: 'Bebidas', products_count: 2 }, { id: 4, name: 'Combos', products_count: 1 }],
    promotions: [{ id: 1, kind: 'special_price', title: 'Kit Festa Rapida', min_subtotal: 80, special_price: 79.9, trigger_keywords: 'combo,festa,gelo' }],
    orders,
    movements,
    tasks,
    queues: { to_print: 2, preparing: 2, in_route: 1, completed: 1, attention: 4 },
    stats: { revenue: 5320, total_orders: 47, products_count: products.length, uber_costs: 642, cancelled_count: 2, awaiting_payment_count: 1, print_pending_count: 2, infinitepay_total: 3180 },
    logistics: orders,
    store_meta: { name: 'Lumix Ice' },
    integrations: { storage_driver: 'demo' },
    store_settings: settings,
    ifood: { configured: true, merchant_id: 'DEMO-MERCHANT', sync_enabled: true, catalog: { items: products, count: products.length }, orders, events: [{ id: 1, type: 'ORDER_CREATED', created_at: now }] }
  };
  const ok = (payload) => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  function actionOf(input) {
    const raw = String(input instanceof Request ? input.url : input);
    const url = new URL(raw, location.href);
    return url.searchParams.get('action') || '';
  }
  function payload(action) {
    if (action === 'admin_session') return { authenticated: true, display_name: 'Administrador Demo', username: 'demo' };
    if (action === 'admin_login') return { session: { authenticated: true, display_name: 'Administrador Demo', username: 'demo' } };
    if (action === 'admin_logout') return { ok: true };
    if (action === 'get_admin_snapshot') return snapshot;
    if (action === 'get_storefront_snapshot') return snapshot;
    if (action === 'get_store_settings') return settings;
    if (action === 'get_products') return products;
    if (action === 'get_customers') return customers;
    if (action === 'get_movements' || action === 'get_finance_movements') return movements;
    if (action === 'get_tasks') return tasks;
    if (action === 'get_active_promotions') return snapshot.promotions;
    if (action === 'get_customer' || action === 'customer_session') return { session: { authenticated: true, name: 'Cliente Demo', phone: '11999990000' }, customer: { id: 1, name: 'Cliente Demo', phone: '11999990000' } };
    if (action === 'customer_login' || action === 'customer_register') return { session: { authenticated: true, name: 'Cliente Demo', phone: '11999990000' } };
    if (action === 'save_order') return { success: true, order: { ...orders[0], id: Math.floor(Math.random() * 1000) + 9000, status: 'preparing' } };
    if (action === 'get_uber_quote') return { success: true, quote: { fee: 12.5, eta_minutes: 24, courier_type: 'moto' } };
    if (action === 'create_infinitepay_checkout') return { success: true, checkout_url: '#pagamento-demo', payment_id: 'demo-payment' };
    if (action === 'check_infinitepay_payment') return { success: true, status: 'paid' };
    if (action === 'verify_customer_age' || action === 'recover_age_verification') return { success: true, verified: true };
    if (action === 'list_product_images') return { images: [asset('logo/quadrada.png'), asset('logo/horizontal.png')], items: [{ url: asset('logo/quadrada.png'), public_url: asset('logo/quadrada.png'), path: 'logo/quadrada.png', name: 'quadrada.png' }, { url: asset('logo/horizontal.png'), public_url: asset('logo/horizontal.png'), path: 'logo/horizontal.png', name: 'horizontal.png' }] };
    if (action === 'sync_ifood_catalog') return { success: true, ifood_catalog: { phase: 'done', sent: products.length, total: products.length } };
    return { success: true, ok: true, data: snapshot };
  }
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = (input, options = {}) => {
    const raw = String(input instanceof Request ? input.url : input);
    if (raw.includes('api.php')) return Promise.resolve(ok(payload(actionOf(input))));
    if (raw.includes('/api/')) return Promise.resolve(ok({ success: true, data: snapshot }));
    return originalFetch ? originalFetch(input, options).catch(() => ok({ success: true })) : Promise.resolve(ok({ success: true }));
  };
  window.alert = (message) => {
    const toast = document.createElement('div');
    toast.textContent = String(message || 'Acao simulada na demo.');
    toast.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#101820;color:white;padding:12px 14px;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.25);max-width:320px;font:14px system-ui';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  };
})();
