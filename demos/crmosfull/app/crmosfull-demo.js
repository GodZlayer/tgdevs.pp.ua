(() => {
  const demo = TGDemo.initDemo('crmosfull-app', {
    cashOpen: false,
    selectedOrders: [],
    alerts: [{ id: 1, title: 'Demo ativa', body: 'Todas as ações ficam somente no cache local.' }],
    accounts: [
      { code: 'CAIXA', name: 'Caixinha loja', balance: 1240.5 },
      { code: 'MAQ-AM', name: 'Máquina amarela', balance: 3860 },
      { code: 'OUTROS', name: 'Boletos e despesas', balance: -450 }
    ],
    orders: [
      { id: 101, code: 'BE-2026-06-20-01', client: 'Maxine Atelier', equipment: 'Notebook Dell', status: 'Em andamento', approval: 'Aprovada', total: 729.8 },
      { id: 102, code: 'BE-2026-06-20-02', client: 'Cosmedamião Festas', equipment: 'Desktop i5', status: 'Aguardando cliente', approval: 'Aguardando aprovação', total: 389.9 },
      { id: 103, code: 'BE-2026-06-20-03', client: 'Endodontia Clínica', equipment: 'Impressora', status: 'Diagnóstico', approval: 'Pré-aprovada', total: 160 }
    ],
    catalog: [
      { sku: 'SSD-480', name: 'SSD 480GB', category: 'Peças', stock: 14, price: 219.9 },
      { sku: 'LIMP-01', name: 'Limpeza preventiva', category: 'Serviços', stock: 99, price: 120 },
      { sku: 'TELA-15', name: 'Tela notebook 15.6', category: 'Peças', stock: 8, price: 389.9 }
    ],
    clients: [
      { name: 'Maxine Atelier', phone: '(11) 98888-0101', email: 'contato@maxine.pp.ua', notes: 'Cliente recorrente' },
      { name: 'Cosmedamião Festas', phone: '(85) 97777-0202', email: 'eventos@cosmedamiaofestas.com.br', notes: 'Prioridade em eventos' },
      { name: 'Endodontia Clínica', phone: '(31) 97777-3030', email: 'agenda@endodontia.pp.ua', notes: 'Retornos agendados' }
    ],
    tasks: [
      { title: 'Conferir OS prioritárias', owner: 'Santo', status: 'Pendente' },
      { title: 'Separar peça para Maxine', owner: 'Atendimento', status: 'Hoje' }
    ]
  });

  const $ = (selector) => document.querySelector(selector);
  const tabTitle = {
    financeiro: 'Financeiro',
    os: 'PDV e OS',
    webstore: 'Webstore',
    agenda: 'Calendário e Tarefas',
    inventario: 'Inventário',
    clientes: 'Clientes',
    backup: 'Backup e Importação',
    relatorios: 'Relatórios'
  };

  function rows(items, cols) {
    return `<thead><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${items.map((item) => `<tr>${cols.map((c) => `<td>${typeof c[1] === 'function' ? c[1](item) : item[c[1]]}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  function render() {
    const s = demo.state;
    $('[data-title]').textContent = tabTitle[(location.hash || '#financeiro').slice(1)] || 'Financeiro';
    $('#financeMetrics').innerHTML = [
      ['Saldo atual', demo.money(s.accounts.reduce((sum, a) => sum + a.balance, 0)), 'Soma das contas oficiais.'],
      ['Caixa aberto agora', s.cashOpen ? 'Sim' : 'Não', s.cashOpen ? 'Ciclo iniciado nesta sessão.' : 'Nenhum ciclo aberto.'],
      ['Fluxo mensal', demo.money(11070), '31 movimentações em 06/2026.'],
      ['Saldo Outros', demo.money(s.accounts[2].balance), 'Conta OUTROS para despesas gerais.']
    ].map((m) => `<article class="card"><p class="eyebrow">${m[0]}</p><div class="metric">${m[1]}</div><p class="muted">${m[2]}</p></article>`).join('');
    $('#accountsTable').innerHTML = rows(s.accounts, [['Código', 'code'], ['Conta', 'name'], ['Saldo', (a) => demo.money(a.balance)]]);
    $('#cashCycle').innerHTML = `<p>Status: <span class="status ${s.cashOpen ? 'green' : 'gold'}">${s.cashOpen ? 'Aberto' : 'Fechado'}</span></p><p class="muted">O ciclo é manual e compartilhado por loja.</p><button class="btn ${s.cashOpen ? 'danger' : 'primary'}" data-crm-action="toggle-cash">${s.cashOpen ? 'Fechar caixa' : 'Abrir caixa'}</button>`;
    $('#osMetrics').innerHTML = [
      ['OS em aberto', s.orders.length],
      ['Aguardando aprovação', s.orders.filter((o) => o.approval.includes('Aguardando')).length],
      ['Total em OS', demo.money(s.orders.reduce((sum, o) => sum + o.total, 0))]
    ].map((m) => `<article class="card"><p class="eyebrow">${m[0]}</p><div class="metric">${m[1]}</div></article>`).join('');
    $('#ordersTable').innerHTML = rows(s.orders, [['OS', 'code'], ['Cliente', 'client'], ['Equipamento', 'equipment'], ['Status', (o) => `<span class="status">${o.status}</span>`], ['Total', (o) => demo.money(o.total)], ['Ações', (o) => `<button class="btn" data-order-detail="${o.id}">Abrir</button> <button class="btn" data-order-status="${o.id}">Avançar</button>`]]);
    $('#webOrders').textContent = s.orders.length;
    $('#calendarTable').innerHTML = rows([{ date: 'Hoje 15:00', title: 'Retorno Maxine' }, { date: 'Amanhã 09:30', title: 'Entrega Endodontia' }], [['Data', 'date'], ['Evento', 'title']]);
    $('#tasksTable').innerHTML = rows(s.tasks, [['Tarefa', 'title'], ['Responsável', 'owner'], ['Status', 'status']]);
    $('#catalogTable').innerHTML = rows(s.catalog, [['SKU', 'sku'], ['Nome', 'name'], ['Categoria', 'category'], ['Estoque', 'stock'], ['Preço', (p) => demo.money(p.price)]]);
    $('#clientsTable').innerHTML = rows(s.clients, [['Cliente', 'name'], ['WhatsApp', 'phone'], ['Email', 'email'], ['Notas', 'notes']]);
    $('#reportMetrics').innerHTML = [['Receita', 18420], ['Despesas', 7350], ['Lucro', 11070]].map((m) => `<article class="card"><p class="eyebrow">${m[0]}</p><div class="metric">${demo.money(m[1])}</div></article>`).join('');
    $('#reportsTable').innerHTML = rows([{ date: '20/06', desc: 'Recebimento OS Maxine', amount: 729.8 }, { date: '20/06', desc: 'Compra de peça', amount: -180 }], [['Data', 'date'], ['Descrição', 'desc'], ['Valor', (r) => demo.money(r.amount)]]);
    $('#alertsList').innerHTML = s.alerts.map((a) => `<article class="card"><strong>${a.title}</strong><p class="muted">${a.body}</p></article>`).join('');
    $('[data-alert-count]').textContent = s.alerts.length;
  }

  function showTab(id = 'financeiro') {
    if (!tabTitle[id]) id = 'financeiro';
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== id;
    });
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === id);
    });
    $('[data-title]').textContent = tabTitle[id];
  }

  document.querySelectorAll('[data-tab]').forEach((button) => {
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
        demo.state.orders.unshift({ id: Date.now(), code: `BE-DEMO-${demo.state.orders.length + 1}`, client: 'Maxine Atelier', equipment: 'Notebook Dell', status: 'Diagnóstico', approval: 'Aguardando aprovação', total: 729.8 });
        demo.closeModal('newOsModal');
      }
      demo.save();
      render();
    }
    const detail = event.target.closest('[data-order-detail]');
    if (detail) {
      const order = demo.state.orders.find((o) => String(o.id) === detail.dataset.orderDetail);
      $('#orderDetailTitle').textContent = order.code;
      $('#orderDetailBody').innerHTML = `<div class="grid cols-3"><article class="card"><p class="eyebrow">Cliente</p><h3>${order.client}</h3><p>${order.equipment}</p></article><article class="card"><p class="eyebrow">Status</p><h3>${order.status}</h3><p>${order.approval}</p></article><article class="card"><p class="eyebrow">Total</p><h3>${demo.money(order.total)}</h3><p>Serviços, peças e pagamentos vinculados.</p></article></div><div class="card" style="margin-top:16px"><h3>Timeline da OS</h3><p>OS criada · Técnico acionado · Cliente notificado · Aguardando próxima ação.</p><div class="actions"><button class="btn primary" data-demo-action="Impressão de OS aberta na simulação.">Imprimir OS</button><button class="btn" data-demo-action="Edição de OS simulada.">Editar</button></div></div>`;
      demo.openModal('orderDetailModal');
    }
    const status = event.target.closest('[data-order-status]');
    if (status) {
      const order = demo.state.orders.find((o) => String(o.id) === status.dataset.orderStatus);
      order.status = order.status === 'Concluída' ? 'Diagnóstico' : 'Concluída';
      demo.toast('Status da OS atualizado no cache.');
      demo.save();
      render();
    }
  });
  window.addEventListener('hashchange', () => {
    showTab((location.hash || '#financeiro').slice(1));
    render();
  });
  showTab((location.hash || '#financeiro').slice(1));
  render();
})();
