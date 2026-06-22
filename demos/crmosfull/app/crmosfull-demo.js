(() => {
  const fallbackSeed = {
    cashOpen: false,
    selectedOrders: [],
    profiles: [
      { id: 1, name: 'Santo Demo', email: 'demo@tgdevs.pp.ua', role: 'Administrador', status: 'Online' },
      { id: 2, name: 'Atendimento', email: 'atendimento@demo.local', role: 'Operador', status: 'Em atendimento' }
    ],
    accounts: [
      { id: 1, code: 'CAIXA', name: 'Caixinha loja', kind: 'Dinheiro', balance: 1840.5, target: 2500, color: '#0f8bff' },
      { id: 2, code: 'MAQ-AM', name: 'Máquina amarela / Pix celular', kind: 'Cartão e Pix', balance: 3860, target: 4200, color: '#f1b84b' },
      { id: 3, code: 'VERM', name: 'C/C Pix PJ e máquina vermelha', kind: 'Banco', balance: 6420.35, target: 6500, color: '#21b983' },
      { id: 4, code: 'OUTROS', name: 'Boletos e despesas', kind: 'Controle', balance: -450, target: 0, color: '#d94b5f' }
    ],
    financeEntries: [
      { id: 1, date: '2026-06-21', account: 'VERM', type: 'income', category: 'Serviços', description: 'Recebimento OS BE-2026-06-21-01', amount: 729.8, orderId: 101 },
      { id: 2, date: '2026-06-21', account: 'CAIXA', type: 'income', category: 'PDV', description: 'Venda balcão - fonte 19V', amount: 149.9, saleId: 501 },
      { id: 3, date: '2026-06-20', account: 'OUTROS', type: 'expense', category: 'Compras', description: 'Reposição SSD 480GB', amount: -450, purchaseId: 701 },
      { id: 4, date: '2026-06-20', account: 'MAQ-AM', type: 'income', category: 'Webstore', description: 'Pedido online BE-WEB-9001', amount: 389.9, webOrderId: 9001 }
    ],
    clients: [
      { id: 1, name: 'Maxine Atelier', phone: '(11) 98888-0101', email: 'contato@maxine.pp.ua', tag: 'VIP', lifetimeValue: 5840.7, openOrders: 1, lastContact: '2026-06-21', notes: 'Cliente recorrente.' },
      { id: 2, name: 'Cosmedamião Festas', phone: '(85) 97777-0202', email: 'eventos@cosmedamiaofestas.com.br', tag: 'Contrato', lifetimeValue: 3190.2, openOrders: 1, lastContact: '2026-06-20', notes: 'Eventos com prioridade.' }
    ],
    orders: [
      { id: 101, code: 'BE-2026-06-21-01', clientId: 1, client: 'Maxine Atelier', equipment: 'Notebook Dell Inspiron', defect: 'Não inicializa após atualização', status: 'Em andamento', approval: 'Aprovada', technician: 'Santo', due: '2026-06-22', total: 729.8, paid: 300, stage: 'Diagnóstico', items: [], services: [], timeline: [] },
      { id: 102, code: 'BE-2026-06-20-02', clientId: 2, client: 'Cosmedamião Festas', equipment: 'Desktop i5 eventos', defect: 'Travamentos', status: 'Aguardando cliente', approval: 'Aguardando aprovação', technician: 'Atendimento', due: '2026-06-24', total: 389.9, paid: 0, stage: 'Orçamento', items: [], services: [], timeline: [] }
    ],
    catalog: [
      { sku: 'SSD-480', name: 'SSD 480GB', category: 'Peças', stock: 14, minStock: 4, cost: 150, price: 219.9, location: 'Gaveta A2', storeEnabled: true },
      { sku: 'FONTE-19V', name: 'Fonte universal 19V', category: 'Peças', stock: 5, minStock: 3, cost: 82, price: 149.9, location: 'Balcão', storeEnabled: true }
    ],
    services: [
      { code: 'LIMP-01', name: 'Limpeza preventiva', type: 'Bancada', basePrice: 120, deadline: '1 dia', active: true }
    ],
    purchases: [],
    sales: [],
    webOrders: [],
    webstore: { status: 'Aberta agora', homepage: 'Ativa', theme: 'Brasil Express', ordersInQueue: 0, gmail: 'CONNECTED' },
    calendar: [],
    tasks: [],
    alerts: [{ id: 1, title: 'Demo ativa', body: 'Todas as ações ficam somente no cache local.', tone: 'green' }]
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const num = (value) => Number(value || 0);
  const text = (node, fallback = '') => node?.textContent?.trim() || fallback;
  const attr = (node, name, fallback = '') => node?.getAttribute(name) ?? fallback;
  const bool = (value) => String(value).toLowerCase() === 'true';
  const pct = (value, total) => Math.max(0, Math.min(100, total ? Math.round((value / total) * 100) : 0));

  function nodeList(root, selector) {
    return [...root.querySelectorAll(selector)];
  }

  function parseXml(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML inválido');

    const seed = structuredClone(fallbackSeed);
    seed.profiles = nodeList(doc, 'profiles > profile').map((node) => ({
      id: num(attr(node, 'id')),
      name: attr(node, 'name'),
      email: attr(node, 'email'),
      role: attr(node, 'role'),
      status: attr(node, 'status')
    }));
    seed.accounts = nodeList(doc, 'accounts > account').map((node) => ({
      id: num(attr(node, 'id')),
      code: attr(node, 'code'),
      name: attr(node, 'name'),
      kind: attr(node, 'kind'),
      balance: num(attr(node, 'balance')),
      target: num(attr(node, 'target')),
      color: attr(node, 'color', '#0f8bff')
    }));
    seed.financeEntries = nodeList(doc, 'financeEntries > entry').map((node) => ({
      id: num(attr(node, 'id')),
      date: attr(node, 'date'),
      account: attr(node, 'account'),
      type: attr(node, 'type'),
      category: attr(node, 'category'),
      description: attr(node, 'description'),
      amount: num(attr(node, 'amount')),
      orderId: num(attr(node, 'orderId')),
      saleId: num(attr(node, 'saleId')),
      purchaseId: num(attr(node, 'purchaseId')),
      webOrderId: num(attr(node, 'webOrderId'))
    }));
    seed.clients = nodeList(doc, 'clients > client').map((node) => ({
      id: num(attr(node, 'id')),
      name: attr(node, 'name'),
      phone: attr(node, 'phone'),
      email: attr(node, 'email'),
      document: attr(node, 'document'),
      tag: attr(node, 'tag'),
      lifetimeValue: num(attr(node, 'lifetimeValue')),
      openOrders: num(attr(node, 'openOrders')),
      lastContact: attr(node, 'lastContact'),
      notes: attr(node, 'notes')
    }));
    seed.orders = nodeList(doc, 'orders > order').map((node) => ({
      id: num(attr(node, 'id')),
      code: attr(node, 'code'),
      clientId: num(attr(node, 'clientId')),
      client: attr(node, 'client'),
      equipment: attr(node, 'equipment'),
      defect: attr(node, 'defect'),
      status: attr(node, 'status'),
      approval: attr(node, 'approval'),
      technician: attr(node, 'technician'),
      due: attr(node, 'due'),
      total: num(attr(node, 'total')),
      paid: num(attr(node, 'paid')),
      stage: attr(node, 'stage'),
      items: nodeList(node, 'items > item').map((item) => ({
        sku: attr(item, 'sku'),
        name: attr(item, 'name'),
        quantity: num(attr(item, 'quantity')),
        unit: num(attr(item, 'unit'))
      })),
      services: nodeList(node, 'services > service').map((service) => ({
        code: attr(service, 'code'),
        name: attr(service, 'name'),
        quantity: num(attr(service, 'quantity')),
        unit: num(attr(service, 'unit'))
      })),
      timeline: nodeList(node, 'timeline > event').map((event) => ({
        at: attr(event, 'at'),
        label: attr(event, 'label'),
        actor: attr(event, 'actor')
      }))
    }));
    seed.catalog = nodeList(doc, 'catalog > product').map((node) => ({
      sku: attr(node, 'sku'),
      name: attr(node, 'name'),
      category: attr(node, 'category'),
      stock: num(attr(node, 'stock')),
      minStock: num(attr(node, 'minStock')),
      cost: num(attr(node, 'cost')),
      price: num(attr(node, 'price')),
      location: attr(node, 'location'),
      storeEnabled: bool(attr(node, 'storeEnabled'))
    }));
    seed.services = nodeList(doc, 'services > service').map((node) => ({
      code: attr(node, 'code'),
      name: attr(node, 'name'),
      type: attr(node, 'type'),
      basePrice: num(attr(node, 'basePrice')),
      deadline: attr(node, 'deadline'),
      active: bool(attr(node, 'active'))
    }));
    seed.purchases = nodeList(doc, 'purchases > purchase').map((node) => ({
      id: num(attr(node, 'id')),
      date: attr(node, 'date'),
      supplier: attr(node, 'supplier'),
      status: attr(node, 'status'),
      total: num(attr(node, 'total')),
      account: attr(node, 'account'),
      items: attr(node, 'items')
    }));
    seed.sales = nodeList(doc, 'sales > sale').map((node) => ({
      id: num(attr(node, 'id')),
      code: attr(node, 'code'),
      date: attr(node, 'date'),
      client: attr(node, 'client'),
      operator: attr(node, 'operator'),
      total: num(attr(node, 'total')),
      payment: attr(node, 'payment'),
      items: attr(node, 'items')
    }));
    const settings = doc.querySelector('webstore > settings');
    seed.webstore = {
      status: attr(settings, 'status'),
      homepage: attr(settings, 'homepage'),
      theme: attr(settings, 'theme'),
      ordersInQueue: num(attr(settings, 'ordersInQueue')),
      gmail: attr(settings, 'gmail')
    };
    seed.webOrders = nodeList(doc, 'webstore > orders > webOrder').map((node) => ({
      id: num(attr(node, 'id')),
      code: attr(node, 'code'),
      client: attr(node, 'client'),
      phone: attr(node, 'phone'),
      delivery: attr(node, 'delivery'),
      payment: attr(node, 'payment'),
      total: num(attr(node, 'total')),
      status: attr(node, 'status')
    }));
    seed.calendar = nodeList(doc, 'calendar > event').map((node) => ({
      id: num(attr(node, 'id')),
      date: attr(node, 'date'),
      time: attr(node, 'time'),
      title: attr(node, 'title'),
      relatedOrder: num(attr(node, 'relatedOrder')),
      owner: attr(node, 'owner'),
      status: attr(node, 'status')
    }));
    seed.tasks = nodeList(doc, 'tasks > task').map((node) => ({
      id: num(attr(node, 'id')),
      title: attr(node, 'title'),
      owner: attr(node, 'owner'),
      status: attr(node, 'status'),
      relatedOrder: num(attr(node, 'relatedOrder')),
      priority: attr(node, 'priority')
    }));
    seed.alerts = nodeList(doc, 'alerts > alert').map((node) => ({
      id: num(attr(node, 'id')),
      title: attr(node, 'title'),
      body: attr(node, 'body'),
      tone: attr(node, 'tone')
    }));
    return seed;
  }

  async function loadSeed() {
    try {
      const response = await fetch('demo-data.xml', { cache: 'no-store' });
      if (!response.ok) throw new Error('XML não encontrado');
      return parseXml(await response.text());
    } catch (error) {
      console.warn('[CRMosFULL demo] usando fallback local:', error);
      return structuredClone(fallbackSeed);
    }
  }

  function rows(items, cols) {
    return `<thead><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${items.map((item) => `<tr>${cols.map((c) => `<td>${typeof c[1] === 'function' ? c[1](item) : item[c[1]] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  function kpi(title, value, helper, tone = '') {
    return `<article class="card kpi-card ${tone}"><p class="eyebrow">${title}</p><div class="metric">${value}</div><p class="muted">${helper || ''}</p></article>`;
  }

  function barChart(items, maxValue, formatter = (value) => value) {
    return `<div class="bar-chart">${items.map((item) => `<div class="bar-row"><span>${item.label}</span><div class="bar-track"><i style="width:${pct(Math.abs(item.value), maxValue)}%;--bar:${item.color || '#0f8bff'}"></i></div><strong>${formatter(item.value)}</strong></div>`).join('')}</div>`;
  }

  function donut(label, value, total, color = '#0f8bff') {
    return `<div class="donut-card"><div class="donut" style="--value:${pct(value, total)};--donut:${color}"><span>${pct(value, total)}%</span></div><div><strong>${label}</strong><p class="muted">${value} de ${total}</p></div></div>`;
  }

  function statusTone(value) {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('aprov') || raw.includes('abert') || raw.includes('conect')) return 'green';
    if (raw.includes('aguard') || raw.includes('pend') || raw.includes('orçamento')) return 'gold';
    if (raw.includes('mínimo') || raw.includes('despesa') || raw.includes('fech')) return 'red';
    return '';
  }

  function setup(seed) {
    const demo = TGDemo.initDemo('crmosfull-app', seed);
    const tabTitle = {
      dashboard: 'Dashboard',
      financeiro: 'Financeiro',
      os: 'PDV e OS',
      webstore: 'Webstore',
      agenda: 'Calendário e Tarefas',
      inventario: 'Inventário',
      clientes: 'Clientes',
      backup: 'Backup e Importação',
      relatorios: 'Relatórios'
    };

    function totals() {
      const s = demo.state;
      const income = s.financeEntries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
      const expenses = Math.abs(s.financeEntries.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
      const openOrders = s.orders.filter((o) => !String(o.status).toLowerCase().includes('conclu')).length;
      const orderTotal = s.orders.reduce((sum, o) => sum + o.total, 0);
      return { income, expenses, profit: income - expenses, openOrders, orderTotal };
    }

    function renderDashboard() {
      const s = demo.state;
      const t = totals();
      $('#dashboardMetrics').innerHTML = [
        kpi('Receita operacional', demo.money(t.income), 'OS, PDV e webstore no mês.', 'tone-green'),
        kpi('Despesas lançadas', demo.money(t.expenses), 'Compras e custos operacionais.', 'tone-red'),
        kpi('OS em aberto', t.openOrders, 'Fila real de atendimento.', 'tone-gold'),
        kpi('Clientes ativos', s.clients.length, 'Carteira com histórico vinculado.')
      ].join('');
      $('#financeChart').innerHTML = barChart([
        { label: 'Receita', value: t.income, color: '#21b983' },
        { label: 'Despesas', value: t.expenses, color: '#d94b5f' },
        { label: 'Lucro', value: t.profit, color: '#0f8bff' }
      ], Math.max(t.income, t.expenses, t.profit), demo.money);
      $('#stageChart').innerHTML = ['Recepção', 'Diagnóstico', 'Orçamento'].map((stage) => donut(stage, s.orders.filter((o) => o.stage === stage).length, Math.max(s.orders.length, 1), stage === 'Diagnóstico' ? '#0f8bff' : stage === 'Orçamento' ? '#f1b84b' : '#21b983')).join('');
      $('#dashboardRelations').innerHTML = s.orders.slice(0, 3).map((order) => {
        const client = s.clients.find((item) => item.id === order.clientId);
        const entry = s.financeEntries.find((item) => item.orderId === order.id);
        const task = s.tasks.find((item) => item.relatedOrder === order.id);
        return `<article class="relation-card"><span class="status ${statusTone(order.approval)}">${order.approval}</span><h3>${order.code}</h3><p>${order.client} · ${order.equipment}</p><small>Financeiro: ${entry ? demo.money(entry.amount) : 'sem lançamento'} · Tarefa: ${task ? task.title : 'sem tarefa'} · Tag: ${client?.tag || 'sem tag'}</small><button class="btn" data-order-detail="${order.id}">Abrir relação</button></article>`;
      }).join('');
    }

    function renderFinanceiro() {
      const s = demo.state;
      const t = totals();
      $('#financeMetrics').innerHTML = [
        kpi('Saldo atual', demo.money(s.accounts.reduce((sum, a) => sum + a.balance, 0)), 'Soma das contas oficiais.'),
        kpi('Caixa aberto agora', s.cashOpen ? 'Sim' : 'Não', s.cashOpen ? 'Ciclo iniciado nesta sessão.' : 'Nenhum ciclo aberto.', s.cashOpen ? 'tone-green' : 'tone-gold'),
        kpi('Fluxo mensal', demo.money(t.profit), `${s.financeEntries.length} movimentações em 06/2026.`),
        kpi('Receita de OS', demo.money(s.financeEntries.filter((e) => e.category === 'Serviços').reduce((sum, e) => sum + e.amount, 0)), 'Valores vinculados a ordens.')
      ].join('');
      $('#accountsTable').innerHTML = rows(s.accounts, [['Código', 'code'], ['Conta', 'name'], ['Tipo', 'kind'], ['Saldo', (a) => demo.money(a.balance)], ['Meta', (a) => `${pct(Math.max(a.balance, 0), a.target || a.balance || 1)}%`]]);
      $('#cashCycle').innerHTML = `<p>Status: <span class="status ${s.cashOpen ? 'green' : 'gold'}">${s.cashOpen ? 'Aberto' : 'Fechado'}</span></p><p class="muted">O ciclo é manual e compartilhado por loja.</p><button class="btn ${s.cashOpen ? 'danger' : 'primary'}" data-crm-action="toggle-cash">${s.cashOpen ? 'Fechar caixa' : 'Abrir caixa'}</button>`;
      $('#accountChart').innerHTML = barChart(s.accounts.map((account) => ({ label: account.code, value: account.balance, color: account.color })), Math.max(...s.accounts.map((a) => Math.abs(a.balance)), 1), demo.money);
    }

    function renderOrders() {
      const s = demo.state;
      $('#osMetrics').innerHTML = [
        kpi('OS em aberto', s.orders.length, 'Fila carregada da base XML.'),
        kpi('Aguardando aprovação', s.orders.filter((o) => o.approval.includes('Aguardando')).length, 'Precisa de retorno do cliente.', 'tone-gold'),
        kpi('Total em OS', demo.money(s.orders.reduce((sum, o) => sum + o.total, 0)), 'Serviços e peças vinculados.')
      ].join('');
      $('#ordersTable').innerHTML = rows(s.orders, [['OS', 'code'], ['Cliente', 'client'], ['Equipamento', 'equipment'], ['Status', (o) => `<span class="status ${statusTone(o.status)}">${o.status}</span>`], ['Aprovação', (o) => `<span class="status ${statusTone(o.approval)}">${o.approval}</span>`], ['Total', (o) => demo.money(o.total)], ['Ações', (o) => `<button class="btn" data-order-detail="${o.id}">Abrir</button> <button class="btn" data-order-status="${o.id}">Avançar</button>`]]);
      $('#pdvTable').innerHTML = rows(s.sales, [['Cupom', 'code'], ['Cliente', 'client'], ['Operador', 'operator'], ['Pagamento', 'payment'], ['Total', (sale) => demo.money(sale.total)], ['Ações', () => '<button class="btn" data-demo-action="Cupom não fiscal aberto na simulação.">Imprimir</button>']]);
    }

    function renderWebstore() {
      const s = demo.state;
      $('#webOrders').textContent = s.webOrders.length || s.webstore.ordersInQueue || 0;
      $('#webstoreStatus').innerHTML = `<span class="status green">${s.webstore.status}</span><span class="status">${s.webstore.homepage}</span><span class="status ${statusTone(s.webstore.gmail)}">Gmail ${s.webstore.gmail}</span>`;
      $('#webOrdersTable').innerHTML = rows(s.webOrders, [['Pedido', 'code'], ['Cliente', 'client'], ['Entrega', 'delivery'], ['Pagamento', 'payment'], ['Status', (order) => `<span class="status ${statusTone(order.status)}">${order.status}</span>`], ['Total', (order) => demo.money(order.total)]]);
    }

    function renderAgenda() {
      const s = demo.state;
      $('#calendarTable').innerHTML = rows(s.calendar, [['Data', (event) => `${event.date} ${event.time}`], ['Evento', 'title'], ['Responsável', 'owner'], ['OS', (event) => `<button class="btn" data-order-detail="${event.relatedOrder}">#${event.relatedOrder}</button>`], ['Status', (event) => `<span class="status ${statusTone(event.status)}">${event.status}</span>`]]);
      $('#tasksTable').innerHTML = rows(s.tasks, [['Tarefa', 'title'], ['Responsável', 'owner'], ['Prioridade', (task) => `<span class="status ${statusTone(task.priority)}">${task.priority}</span>`], ['Status', 'status'], ['OS', (task) => task.relatedOrder ? `<button class="btn" data-order-detail="${task.relatedOrder}">Abrir OS</button>` : 'Backoffice']]);
    }

    function renderInventario() {
      const s = demo.state;
      $('#catalogTable').innerHTML = rows(s.catalog, [['SKU', 'sku'], ['Nome', 'name'], ['Categoria', 'category'], ['Estoque', (item) => `<span class="status ${item.stock <= item.minStock ? 'red' : 'green'}">${item.stock}/${item.minStock}</span>`], ['Custo', (item) => demo.money(item.cost)], ['Venda', (item) => demo.money(item.price)], ['Local', 'location'], ['Loja', (item) => item.storeEnabled ? 'Sim' : 'Não']]);
      $('#servicesTable').innerHTML = rows(s.services, [['Código', 'code'], ['Serviço', 'name'], ['Tipo', 'type'], ['Preço base', (service) => demo.money(service.basePrice)], ['Prazo', 'deadline'], ['Status', (service) => `<span class="status ${service.active ? 'green' : 'red'}">${service.active ? 'Ativo' : 'Inativo'}</span>`]]);
      $('#stockChart').innerHTML = barChart(s.catalog.map((item) => ({ label: item.sku, value: item.stock, color: item.stock <= item.minStock ? '#d94b5f' : '#21b983' })), Math.max(...s.catalog.map((item) => item.stock), 1), (value) => `${value} un.`);
    }

    function renderClientes() {
      const s = demo.state;
      $('#clientsTable').innerHTML = rows(s.clients, [['Cliente', 'name'], ['WhatsApp', 'phone'], ['Email', 'email'], ['Tag', (client) => `<span class="status">${client.tag}</span>`], ['Aberto', 'openOrders'], ['Receita', (client) => demo.money(client.lifetimeValue)], ['Ações', (client) => `<button class="btn" data-client-detail="${client.id}">Perfil</button>`]]);
      $('#clientChart').innerHTML = barChart(s.clients.map((client) => ({ label: client.name.split(' ')[0], value: client.lifetimeValue, color: '#0f8bff' })), Math.max(...s.clients.map((client) => client.lifetimeValue), 1), demo.money);
    }

    function renderBackup() {
      const s = demo.state;
      $('#backupSummary').innerHTML = [
        kpi('Registros XML', s.clients.length + s.orders.length + s.catalog.length + s.financeEntries.length, 'Base simulada relacional.'),
        kpi('Última importação', '21/06/2026', 'Planilha validada sem tocar servidor.'),
        kpi('Integridade', '100%', 'Chaves de cliente, OS e financeiro coerentes.', 'tone-green')
      ].join('');
    }

    function renderRelatorios() {
      const s = demo.state;
      const t = totals();
      $('#reportMetrics').innerHTML = [
        kpi('Receita', demo.money(t.income), 'Entradas do período.'),
        kpi('Despesas', demo.money(t.expenses), 'Saídas do período.', 'tone-red'),
        kpi('Lucro', demo.money(t.profit), 'Receita menos despesas.', 'tone-green')
      ].join('');
      $('#reportsTable').innerHTML = rows(s.financeEntries, [['Data', 'date'], ['Categoria', 'category'], ['Descrição', 'description'], ['Conta', 'account'], ['Valor', (entry) => demo.money(entry.amount)]]);
      $('#reportChart').innerHTML = barChart(s.financeEntries.map((entry) => ({ label: entry.category, value: entry.amount, color: entry.amount >= 0 ? '#21b983' : '#d94b5f' })), Math.max(...s.financeEntries.map((entry) => Math.abs(entry.amount)), 1), demo.money);
    }

    function renderAlerts() {
      const s = demo.state;
      $('#alertsList').innerHTML = s.alerts.map((alert) => `<article class="card alert-card ${alert.tone || ''}"><span class="status ${alert.tone || ''}">${alert.tone || 'info'}</span><strong>${alert.title}</strong><p class="muted">${alert.body}</p></article>`).join('');
      $('[data-alert-count]').textContent = s.alerts.length;
    }

    function render() {
      renderDashboard();
      renderFinanceiro();
      renderOrders();
      renderWebstore();
      renderAgenda();
      renderInventario();
      renderClientes();
      renderBackup();
      renderRelatorios();
      renderAlerts();
    }

    function showTab(id = 'dashboard') {
      if (!tabTitle[id]) id = 'dashboard';
      $$('[data-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== id;
      });
      $$('[data-tab]').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === id);
      });
      $('[data-title]').textContent = tabTitle[id];
    }

    function orderDetail(id) {
      const s = demo.state;
      const order = s.orders.find((item) => String(item.id) === String(id));
      if (!order) return;
      const client = s.clients.find((item) => item.id === order.clientId);
      const entries = s.financeEntries.filter((item) => item.orderId === order.id);
      $('#orderDetailTitle').textContent = order.code;
      $('#orderDetailBody').innerHTML = `
        <div class="grid cols-3">
          <article class="card"><p class="eyebrow">Cliente</p><h3>${order.client}</h3><p>${client?.phone || 'Sem telefone'} · ${client?.tag || 'Sem tag'}</p></article>
          <article class="card"><p class="eyebrow">Status</p><h3>${order.status}</h3><p>${order.approval} · ${order.technician}</p></article>
          <article class="card"><p class="eyebrow">Total</p><h3>${demo.money(order.total)}</h3><p>Pago: ${demo.money(order.paid)}</p></article>
        </div>
        <div class="grid cols-2 modal-section">
          <article class="card"><h3>Itens e serviços</h3>${rows([...order.items.map((item) => ({ type: 'Peça', name: item.name, quantity: item.quantity, total: item.quantity * item.unit })), ...order.services.map((service) => ({ type: 'Serviço', name: service.name, quantity: service.quantity, total: service.quantity * service.unit }))], [['Tipo', 'type'], ['Descrição', 'name'], ['Qtd', 'quantity'], ['Total', (item) => demo.money(item.total)]])}</article>
          <article class="card"><h3>Timeline</h3><div class="timeline">${order.timeline.map((event) => `<p><strong>${event.label}</strong><span>${event.actor} · ${event.at.slice(0, 16).replace('T', ' ')}</span></p>`).join('') || '<p class="muted">Sem eventos.</p>'}</div></article>
        </div>
        <article class="card modal-section"><h3>Relações financeiras</h3><p>${entries.length ? entries.map((entry) => `${entry.description}: ${demo.money(entry.amount)}`).join('<br>') : 'Sem lançamento financeiro vinculado.'}</p><div class="actions"><button class="btn primary" data-demo-action="Impressão de OS aberta na simulação.">Imprimir OS</button><button class="btn" data-demo-action="Edição de OS simulada.">Editar</button><button class="btn" data-demo-action="Novo checkpoint adicionado na simulação.">Nova atualização</button></div></article>
      `;
      demo.openModal('orderDetailModal');
    }

    function clientDetail(id) {
      const s = demo.state;
      const client = s.clients.find((item) => String(item.id) === String(id));
      if (!client) return;
      const orders = s.orders.filter((order) => order.clientId === client.id);
      $('#orderDetailTitle').textContent = client.name;
      $('#orderDetailBody').innerHTML = `
        <div class="grid cols-3">
          <article class="card"><p class="eyebrow">Contato</p><h3>${client.phone}</h3><p>${client.email}</p></article>
          <article class="card"><p class="eyebrow">Carteira</p><h3>${demo.money(client.lifetimeValue)}</h3><p>${client.openOrders} OS em aberto</p></article>
          <article class="card"><p class="eyebrow">Tag</p><h3>${client.tag}</h3><p>${client.notes}</p></article>
        </div>
        <article class="card modal-section"><h3>Histórico de OS</h3>${rows(orders, [['OS', 'code'], ['Equipamento', 'equipment'], ['Status', 'status'], ['Total', (order) => demo.money(order.total)], ['Ações', (order) => `<button class="btn" data-order-detail="${order.id}">Abrir</button>`]])}</article>
      `;
      demo.openModal('orderDetailModal');
    }

    $$('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.tab;
        if (location.hash.slice(1) !== id) location.hash = id;
        showTab(id);
        render();
      });
    });

    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-crm-action]');
      if (action) {
        const type = action.dataset.crmAction;
        if (type === 'toggle-cash' || type === 'open-cash') {
          demo.state.cashOpen = !demo.state.cashOpen;
          demo.toast(demo.state.cashOpen ? 'Caixa aberto na simulação.' : 'Caixa fechado na simulação.');
        }
        if (type === 'select-all') {
          demo.state.selectedOrders = demo.state.orders.map((o) => o.id);
          demo.toast(`${demo.state.selectedOrders.length} OS selecionadas.`);
        }
        if (type === 'create-os') {
          demo.state.orders.unshift({ id: Date.now(), code: `BE-DEMO-${demo.state.orders.length + 1}`, clientId: 1, client: 'Maxine Atelier', equipment: 'Notebook Dell', defect: 'Entrada criada no modal demo', status: 'Diagnóstico', approval: 'Aguardando aprovação', technician: 'Atendimento', due: '2026-06-25', total: 729.8, paid: 0, stage: 'Recepção', items: [], services: [], timeline: [{ at: new Date().toISOString(), label: 'OS criada na demo', actor: 'Atendimento' }] });
          demo.closeModal('newOsModal');
        }
        demo.save();
        render();
      }

      const detail = event.target.closest('[data-order-detail]');
      if (detail) orderDetail(detail.dataset.orderDetail);

      const client = event.target.closest('[data-client-detail]');
      if (client) clientDetail(client.dataset.clientDetail);

      const status = event.target.closest('[data-order-status]');
      if (status) {
        const order = demo.state.orders.find((o) => String(o.id) === status.dataset.orderStatus);
        if (order) {
          order.status = order.status === 'Concluída' ? 'Diagnóstico' : 'Concluída';
          order.stage = order.status;
          demo.toast('Status da OS atualizado no cache.');
          demo.save();
          render();
        }
      }
    });

    window.addEventListener('hashchange', () => {
      showTab((location.hash || '#dashboard').slice(1));
      render();
    });
    showTab((location.hash || '#dashboard').slice(1));
    render();
  }

  loadSeed().then(setup);
})();
