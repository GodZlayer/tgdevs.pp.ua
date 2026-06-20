(() => {
  const now = new Date().toISOString();
  const demoRoot = new URL('.', document.currentScript?.src || location.href).href;
  const asset = (path) => new URL(path, demoRoot).href;
  const products = [
    { id: 1, name: 'Copo 300ml', category: 'Acai', price: 18.9, stock_quantity: 42, img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 },
    { id: 2, name: 'Barca familia', category: 'Combos', price: 64.9, stock_quantity: 12, img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 1 },
    { id: 3, name: 'Milkshake especial', category: 'Bebidas', price: 22.5, stock_quantity: 25, img: asset('logo/quadrada.png'), age_restricted: 0, store_enabled: 1, ifood_enabled: 0 }
  ];
  const orders = [
    { id: 501, customer_name: 'Cliente Demo', customer_phone: '11999990000', status: 'preparing', payment_status: 'paid', print_status: 'pending', delivery_mode: 'delivery', delivery_status: 'waiting_courier', total: 83.8, delivery_fee: 8, created_at: now, items: [{ product_id: 1, name: 'Copo 300ml', quantity: 1, price: 18.9 }, { product_id: 2, name: 'Barca familia', quantity: 1, price: 64.9 }] },
    { id: 502, customer_name: 'Retirada Balcao', customer_phone: '11888880000', status: 'completed', payment_status: 'paid', print_status: 'printed', delivery_mode: 'pickup', delivery_status: 'completed', total: 22.5, delivery_fee: 0, created_at: now }
  ];
  const settings = { ordering_enabled: true, opening_time: '08:00', closing_time: '22:00', is_open_now: true, courier_rule_mode: 'items_count', private_dispatch_enabled: false };
  const snapshot = {
    products,
    product_categories: [{ id: 1, name: 'Acai', products_count: 1 }, { id: 2, name: 'Combos', products_count: 1 }, { id: 3, name: 'Bebidas', products_count: 1 }],
    promotions: [{ id: 1, kind: 'special_price', title: 'Combo demo', min_subtotal: 50, special_price: 54.9, trigger_keywords: 'combo' }],
    orders,
    queues: { to_print: 1, preparing: 1, in_route: 0, completed: 1, attention: 0 },
    stats: { revenue: 2940, total_orders: 18, products_count: products.length, uber_costs: 410, cancelled_count: 1, awaiting_payment_count: 0, print_pending_count: 1, infinitepay_total: 1860 },
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
