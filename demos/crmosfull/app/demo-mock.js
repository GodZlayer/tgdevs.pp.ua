(() => {
  const now = new Date().toISOString();
  const user = { id: 1, name: 'Santo Demo', email: 'demo@tgdevs.pp.ua', role: 'ADMIN', avatarColor: '#10233f', avatarInitial: 'S' };
  const company = { id: 1, name: 'Brasil Express', shortName: 'Brasil Express', logoUrl: 'be1.png' };
  const store = { id: 1, name: 'Loja Principal', shortName: 'Matriz' };
  const profiles = [user, { id: 2, name: 'Atendimento', email: 'atendimento@demo.local', role: 'USER', avatarColor: '#1f7a64', avatarInitial: 'A' }];
  const catalog = [
    { id: 1, sku: 'TELA-15', name: 'Tela notebook 15.6', category: 'Pecas', stock_quantity: 8, available_stock: 8, sale_price: 389.9, price: 389.9, cost_price: 240, store_enabled: true, ifood_enabled: false },
    { id: 2, sku: 'SSD-480', name: 'SSD 480GB', category: 'Pecas', stock_quantity: 14, available_stock: 14, sale_price: 219.9, price: 219.9, cost_price: 150, store_enabled: true, ifood_enabled: false },
    { id: 3, sku: 'LIMP-01', name: 'Limpeza preventiva', category: 'Servicos', stock_quantity: 99, available_stock: 99, sale_price: 120, price: 120, cost_price: 0, store_enabled: true, ifood_enabled: false }
  ];
  const clients = [
    { id: 1, name: 'Maxine Atelier', phone: '(11) 98888-0101', email: 'contato@maxine.pp.ua', document: '00.000.000/0001-01', notes: 'Cliente recorrente', created_at: now },
    { id: 2, name: 'Cosmedamiao Festas', phone: '(85) 97777-0202', email: 'eventos@cosmedamiaofestas.com.br', document: '00.000.000/0001-02', notes: 'Pedido com prioridade', created_at: now }
  ];
  const orders = [
    { id: 101, code: 'BE-2026-06-19-01', client_name: 'Maxine Atelier', client_id: 1, status: 'EM_ANDAMENTO', approval_status: 'APROVADA', total_amount: 729.8, subtotal_amount: 729.8, service_amount: 120, created_at: now, updated_at: now, technician_name: 'Santo', items: [{ id: 1, name: 'SSD 480GB', quantity: 1, unit_price: 219.9, line_total: 219.9 }], services: [{ id: 1, name: 'Limpeza preventiva', quantity: 1, unit_price: 120, line_total: 120 }], payments: [{ id: 1, payment_method: 'Pix', amount: 729.8 }], notes: 'Demo navegavel sem gravacao real.' },
    { id: 102, code: 'BE-2026-06-19-02', client_name: 'Cosmedamiao Festas', client_id: 2, status: 'AGUARDANDO_CLIENTE', approval_status: 'AGUARDANDO_APROVACAO', total_amount: 389.9, subtotal_amount: 389.9, service_amount: 0, created_at: now, updated_at: now, technician_name: 'Atendimento' }
  ];
  const financeEntries = [
    { id: 1, date: '2026-06-19', description: 'Recebimento OS BE-2026-06-19-01', type: 'income', amount: 729.8, category: 'Servicos' },
    { id: 2, date: '2026-06-19', description: 'Compra estoque SSD', type: 'expense', amount: 450, category: 'Compras' }
  ];
  const webstoreSettings = { id: 1, storeName: 'Brasil Express', headline: 'Assistencia tecnica com atendimento claro', about: 'Demo da webstore usando o front real.', whatsapp: '5599999999999', showProducts: true, showServices: true, hideOutOfStock: false, status: { isOpen: true, label: 'Aberto agora' } };
  const session = { user, company, store, profiles, meta: { navGroup: 'finance', navSection: 'financeiro' } };
  const ok = (payload) => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  function endpoint(input) {
    const raw = String(input instanceof Request ? input.url : input);
    if (raw.startsWith('api://')) return raw.replace('api://', '/api/');
    try { return new URL(raw, location.href).pathname + new URL(raw, location.href).search; } catch { return raw; }
  }
  function payload(path, options = {}) {
    if (path.includes('/api/login') || path.includes('/api/meta') || path.includes('/api/me') || path.includes('/api/profile/select')) return session;
    if (path.includes('/api/profiles')) return { data: profiles, user, company, store };
    if (path.includes('/api/logout')) return { ok: true };
    if (path.includes('/api/clients')) return path.match(/\/api\/clients\/\d+/) ? { data: { ...clients[0], orders } } : { data: clients };
    if (path.includes('/api/catalog')) return path.match(/\/api\/catalog\/\d+/) ? { data: catalog[0] } : { data: catalog, categories: ['Pecas', 'Servicos'] };
    if (path.includes('/api/services')) return { data: catalog.filter((item) => item.category === 'Servicos') };
    if (path.includes('/api/orders') && path.includes('/timeline')) return { data: [{ id: 1, label: 'Criada', created_at: now }, { id: 2, label: 'Tecnico acionado', created_at: now }] };
    if (path.match(/\/api\/orders\/\d+/)) return { data: orders[0] };
    if (path.includes('/api/orders')) return { data: orders };
    if (path.includes('/api/calendar')) return { data: [{ id: 1, title: 'Retorno Maxine', starts_at: now, status: 'CONFIRMADO' }] };
    if (path.includes('/api/tasks')) return { data: [{ id: 1, title: 'Conferir OS prioritarias', status: 'PENDENTE' }] };
    if (path.includes('/api/reports') || path.includes('/api/dashboard')) return { data: { revenue: 18420, expenses: 7350, profit: 11070 }, metrics: [{ label: 'Receita', value: 18420 }, { label: 'OS', value: 31 }], orders, entries: financeEntries };
    if (path.includes('/api/finance') || path.includes('/api/cash') || path.includes('/api/purchases')) return { data: financeEntries, entries: financeEntries, categories: ['Servicos', 'Compras'], accounts: [{ id: 1, name: 'Caixa principal', balance: 11070 }] };
    if (path.includes('/api/notifications')) return { data: [{ id: 1, title: 'Demo ativa', body: 'Nenhuma acao sera enviada ao servidor.', read: false, created_at: now }] };
    if (path.includes('/api/admin/users')) return { data: profiles };
    if (path.includes('/api/admin/webstore-settings')) return { data: webstoreSettings, status: { isOpen: true, label: 'Aberto agora' } };
    if (path.includes('/api/webstore/settings')) return { data: webstoreSettings, status: { isOpen: true, label: 'Aberto agora' } };
    if (path.includes('/api/webstore/catalog')) return { data: catalog, products: catalog };
    if (path.includes('/api/webstore/services')) return { data: catalog.filter((item) => item.category === 'Servicos') };
    if (path.includes('/api/webstore/best-sellers')) return { data: catalog.slice(0, 2) };
    if (path.includes('/api/webstore/orders') || path.includes('/api/webstore/customers')) return { ok: true, data: { id: 9001, status: 'DEMO' } };
    if (options.method && options.method !== 'GET') return { ok: true, success: true, data: {} };
    return { data: [], ok: true, success: true };
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const path = endpoint(input);
    if (path.includes('/api/') || String(input).startsWith('api://')) return Promise.resolve(ok(payload(path, options)));
    return originalFetch(input, options).catch(() => ok({ data: [], ok: true }));
  };
  window.addEventListener('submit', (event) => {
    const form = event.target;
    if (form && form.matches('form')) setTimeout(() => console.info('[TGDevs demo] formulario simulado'), 0);
  }, true);
})();