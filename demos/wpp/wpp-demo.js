(() => {
  const surface = location.pathname.toLowerCase().includes('funcionario') ? 'funcionario' : 'admin';
  const storageKey = `tgdevs-wppcrm-${surface}-v2`;

  const seed = {
    selectedClient: 'maxine',
    selectedConversation: 'maxine',
    clients: [
      {
        id: 'maxine',
        name: 'Maxine Atelier',
        company: 'Atelier Maxine LTDA',
        owner: 'Lia Campos',
        phone: '+55 11 99999-0001',
        email: 'contato@maxine.pp.ua',
        tag: 'VIP',
        status: 'Em proposta',
        revenue: 14850,
        last: 'Hoje, 14:11',
        note: 'Cliente recorrente. Prefere retorno pelo WhatsApp e aprova peças por anexo.',
        files: ['briefing-maxine.pdf', 'catalogo-inverno.zip'],
        history: ['Briefing recebido por e-mail', 'Orçamento enviado', 'Cliente pediu prévia no WhatsApp']
      },
      {
        id: 'cosmedamiao',
        name: 'Cosmedamião Festas',
        company: 'Cosmedamião Eventos',
        owner: 'Rafa Nunes',
        phone: '+55 85 98888-0002',
        email: 'contratos@cosmedamiao.pp.ua',
        tag: 'Contrato',
        status: 'Contrato pendente',
        revenue: 9320,
        last: 'Ontem, 17:40',
        note: 'Aguardando assinatura do aditivo anual e duas fotos de referência.',
        files: ['contrato-eventos.pdf', 'foto-evento.jpg'],
        history: ['Arquivo recebido no WhatsApp', 'Aditivo enviado', 'Financeiro marcou pendência']
      },
      {
        id: 'endodontia',
        name: 'Endodontia Prime',
        company: 'Clínica Endodontia Prime',
        owner: 'Maya Torres',
        phone: '+55 31 97777-4410',
        email: 'agenda@endoprime.pp.ua',
        tag: 'Retorno',
        status: 'Aguardando cliente',
        revenue: 4760,
        last: 'Hoje, 09:20',
        note: 'Operação depende de agenda semanal e lembretes automatizados.',
        files: ['agenda-junho.xlsx'],
        history: ['Reunião agendada', 'Template de retorno aplicado', 'Cliente abriu e-mail']
      }
    ],
    conversations: [
      {
        id: 'maxine',
        clientId: 'maxine',
        unread: 2,
        channel: 'WhatsApp',
        priority: 'Alta',
        summary: 'Pedido de orçamento recebido agora.',
        messages: [
          { side: 'in', text: 'Oi, conseguem atualizar o catálogo ainda hoje?', time: '14:06' },
          { side: 'out', text: 'Conseguimos sim. Vou separar as imagens e te envio uma prévia.', time: '14:09' },
          { side: 'in', text: 'Perfeito. Pode incluir o pacote premium também?', time: '14:11' }
        ]
      },
      {
        id: 'cosmedamiao',
        clientId: 'cosmedamiao',
        unread: 0,
        channel: 'WhatsApp',
        priority: 'Média',
        summary: 'Anexo de contrato vinculado.',
        messages: [
          { side: 'in', text: 'Enviei o contrato e a referência do evento.', time: '17:35' },
          { side: 'out', text: 'Recebido. Já deixei o documento vinculado ao seu cadastro.', time: '17:40' }
        ]
      },
      {
        id: 'endodontia',
        clientId: 'endodontia',
        unread: 1,
        channel: 'E-mail',
        priority: 'Baixa',
        summary: 'Retorno agendado para sexta.',
        messages: [
          { side: 'out', text: 'Confirmei o horário de sexta às 10h.', time: '09:10' },
          { side: 'in', text: 'Obrigado. Pode enviar lembrete para a equipe?', time: '09:20' }
        ]
      }
    ],
    orders: [
      { id: 'OS-1048', clientId: 'maxine', title: 'Atualização de catálogo', status: 'Em produção', value: 4850, due: 'Hoje 18:00', owner: 'Lia Campos', items: ['Layout do catálogo', 'Tratamento de 18 imagens', 'Envio de prévia'] },
      { id: 'OS-1041', clientId: 'cosmedamiao', title: 'Contrato anual de eventos', status: 'Aguardando assinatura', value: 9320, due: '22 jun', owner: 'Rafa Nunes', items: ['Aditivo contratual', 'Galeria de referência'] },
      { id: 'OS-1037', clientId: 'endodontia', title: 'Fluxo de lembretes', status: 'Aguardando cliente', value: 2760, due: '24 jun', owner: 'Maya Torres', items: ['Template WhatsApp', 'Agenda semanal', 'Teste de envio'] }
    ],
    finance: [
      { id: 'FIN-880', orderId: 'OS-1048', clientId: 'maxine', type: 'Entrada', status: 'Previsto', value: 4850, due: 'Hoje' },
      { id: 'FIN-874', orderId: 'OS-1041', clientId: 'cosmedamiao', type: 'Entrada', status: 'Atrasado', value: 3200, due: 'Ontem' },
      { id: 'FIN-861', orderId: 'OS-1037', clientId: 'endodontia', type: 'Entrada', status: 'Recebido', value: 2760, due: '19 jun' },
      { id: 'FIN-858', orderId: 'Interno', clientId: 'maxine', type: 'Saída', status: 'Pago', value: 640, due: '18 jun' }
    ],
    files: [
      { name: 'briefing-maxine.pdf', clientId: 'maxine', source: 'E-mail', tag: 'Orçamento', type: 'PDF', status: 'Vinculado', date: '19 jun' },
      { name: 'catalogo-inverno.zip', clientId: 'maxine', source: 'WhatsApp', tag: 'Mídia', type: 'ZIP', status: 'Em revisão', date: 'Hoje' },
      { name: 'foto-evento.jpg', clientId: 'cosmedamiao', source: 'WhatsApp', tag: 'Referência', type: 'Imagem', status: 'Vinculado', date: '18 jun' },
      { name: 'agenda-junho.xlsx', clientId: 'endodontia', source: 'E-mail', tag: 'Agenda', type: 'Planilha', status: 'Sem revisão', date: '17 jun' }
    ],
    tasks: [
      { id: 'T-61', clientId: 'maxine', title: 'Enviar prévia do catálogo', owner: 'Lia Campos', time: 'Hoje 16:30', status: 'Pendente' },
      { id: 'T-62', clientId: 'cosmedamiao', title: 'Cobrar assinatura do aditivo', owner: 'Rafa Nunes', time: 'Hoje 17:00', status: 'Pendente' },
      { id: 'T-63', clientId: 'endodontia', title: 'Confirmar agenda de sexta', owner: 'Maya Torres', time: 'Amanhã 09:00', status: 'Agendado' }
    ],
    users: [
      { name: 'Santo Demo', email: 'demo@tgdevs.pp.ua', role: 'Administrador', status: 'Online', active: '5h 40min', queue: 0 },
      { name: 'Lia Campos', email: 'lia@demo.local', role: 'Atendimento', status: 'Em atendimento', active: '4h 50min', queue: 4 },
      { name: 'Rafa Nunes', email: 'rafa@demo.local', role: 'Comercial', status: 'Ausente', active: '2h 30min', queue: 2 }
    ],
    alerts: [
      { tone: 'danger', title: 'Pagamento atrasado', text: 'Cosmedamião tem R$ 3.200 vencidos e contrato em aberto.' },
      { tone: 'warning', title: 'SLA alto', text: 'Maxine aguarda prévia do pacote premium ainda hoje.' },
      { tone: 'info', title: 'Arquivo sem revisão', text: 'agenda-junho.xlsx precisa ser conferido antes do disparo.' }
    ]
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  })();
  const state = saved ? { ...clone(seed), ...saved } : clone(seed);

  const nav = surface === 'admin'
    ? [
        ['dashboard', 'Dashboard'],
        ['messages', 'Atendimento'],
        ['contacts', 'Clientes'],
        ['orders', 'OS e vendas'],
        ['finance', 'Financeiro'],
        ['files', 'Arquivos'],
        ['users', 'Usuários'],
        ['integrations', 'Integrações']
      ]
    : [
        ['dashboard', 'Hoje'],
        ['messages', 'Mensagens'],
        ['contacts', 'Contatos'],
        ['orders', 'Tarefas e OS'],
        ['files', 'Arquivos'],
        ['emails', 'E-mails']
      ];

  const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const byId = (items, id) => items.find((item) => item.id === id);
  const client = (id) => byId(state.clients, id) || state.clients[0];
  const order = (id) => state.orders.find((item) => item.id === id) || state.orders[0];
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function css() {
    return `
      :root{--wpp-bg:#eef3f1;--wpp-panel:#fff;--wpp-panel-2:#f7faf9;--wpp-line:#dce6e2;--wpp-ink:#17231f;--wpp-muted:#66756f;--wpp-primary:#128c62;--wpp-primary-2:#0d6f50;--wpp-blue:#2563eb;--wpp-danger:#c2414b;--wpp-warn:#b7791f;--wpp-shadow:0 10px 28px rgba(18,39,31,.08)}
      *{box-sizing:border-box}body{margin:0;background:var(--wpp-bg);color:var(--wpp-ink);font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px}.wpp-shell{min-height:100dvh;display:grid;grid-template-columns:236px minmax(0,1fr)}.wpp-sidebar{background:#122820;color:#e9fff6;padding:14px;display:flex;flex-direction:column;gap:14px;position:sticky;top:0;height:100dvh}.wpp-brand{display:flex;align-items:center;gap:10px;padding:8px 6px 12px}.wpp-brand-mark{width:36px;height:36px;border-radius:8px;background:var(--wpp-primary);display:grid;place-items:center;font-weight:900}.wpp-brand strong{display:block;font-size:15px}.wpp-brand span{color:#a8c9bc;font-size:12px}.wpp-nav{display:grid;gap:4px}.wpp-nav button{border:0;border-radius:6px;background:transparent;color:#cfe6dd;text-align:left;padding:10px 11px;font-weight:750;cursor:pointer}.wpp-nav button:hover,.wpp-nav button.active{background:rgba(255,255,255,.11);color:#fff}.wpp-sidebox{margin-top:auto;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:11px;background:rgba(255,255,255,.06);font-size:12px;color:#b8d5ca}.wpp-sidebox strong{display:block;color:#fff;margin-bottom:3px}.wpp-main{min-width:0;padding:14px 18px 24px}.wpp-topbar{height:56px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.wpp-topbar h1{font-size:20px;margin:0}.wpp-topbar p{margin:2px 0 0;color:var(--wpp-muted);font-size:12px}.wpp-actions{display:flex;gap:8px;flex-wrap:wrap}.wpp-btn{border:1px solid var(--wpp-line);border-radius:6px;background:var(--wpp-panel);color:var(--wpp-ink);padding:8px 10px;font-weight:750;cursor:pointer}.wpp-btn.primary{background:var(--wpp-primary);border-color:var(--wpp-primary);color:#fff}.wpp-btn.danger{color:var(--wpp-danger)}.wpp-btn.small{padding:6px 8px;font-size:12px}.wpp-grid{display:grid;gap:12px}.wpp-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.wpp-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.wpp-cols-2{grid-template-columns:1.2fr .8fr}.wpp-panel,.wpp-card{background:var(--wpp-panel);border:1px solid var(--wpp-line);border-radius:8px;box-shadow:var(--wpp-shadow)}.wpp-panel{padding:14px}.wpp-card{padding:12px}.wpp-panel header,.wpp-table-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.wpp-panel h2,.wpp-card h2{font-size:15px;margin:0}.wpp-panel p,.wpp-card p{margin:5px 0 0;color:var(--wpp-muted);line-height:1.38}.wpp-metric strong{font-size:24px;display:block;margin:4px 0}.wpp-metric span{color:var(--wpp-muted);font-size:12px}.wpp-status{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:800;background:#edf7f2;color:var(--wpp-primary-2)}.wpp-status.warn{background:#fff7e6;color:var(--wpp-warn)}.wpp-status.danger{background:#fff0f1;color:var(--wpp-danger)}.wpp-status.info{background:#eff6ff;color:var(--wpp-blue)}.wpp-table-wrap{overflow:auto;border:1px solid var(--wpp-line);border-radius:8px;background:#fff}.wpp-table{width:100%;border-collapse:collapse;min-width:720px}.wpp-table th,.wpp-table td{border-bottom:1px solid var(--wpp-line);padding:10px 11px;text-align:left;vertical-align:middle}.wpp-table th{font-size:11px;text-transform:uppercase;color:var(--wpp-muted);background:var(--wpp-panel-2);letter-spacing:.02em}.wpp-table tr:last-child td{border-bottom:0}.wpp-name{display:flex;align-items:center;gap:9px;min-width:0}.wpp-avatar{width:34px;height:34px;border-radius:8px;background:#dff4eb;color:#0b6a4b;display:grid;place-items:center;font-weight:900;flex:0 0 auto}.wpp-name small,.wpp-muted{display:block;color:var(--wpp-muted);font-size:12px}.wpp-list{display:grid;gap:8px}.wpp-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--wpp-line);border-radius:8px;padding:10px;background:var(--wpp-panel-2)}.wpp-row strong{display:block}.wpp-row small{color:var(--wpp-muted)}.wpp-alert{border-left:4px solid var(--wpp-blue)}.wpp-alert.danger{border-left-color:var(--wpp-danger)}.wpp-alert.warning{border-left-color:var(--wpp-warn)}.wpp-chat{display:grid;grid-template-columns:300px minmax(0,1fr) 320px;gap:12px;min-height:640px}.wpp-thread-list,.wpp-thread,.wpp-context{background:var(--wpp-panel);border:1px solid var(--wpp-line);border-radius:8px;overflow:hidden}.wpp-thread-list{display:flex;flex-direction:column}.wpp-search{padding:10px;border-bottom:1px solid var(--wpp-line)}.wpp-search input,.wpp-field input,.wpp-field textarea,.wpp-field select{width:100%;border:1px solid var(--wpp-line);border-radius:6px;background:#fff;padding:9px 10px;color:var(--wpp-ink);font:inherit}.wpp-thread-button{border:0;border-bottom:1px solid var(--wpp-line);background:#fff;text-align:left;padding:10px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:9px;cursor:pointer}.wpp-thread-button.active{background:#effaf5}.wpp-thread-button b{background:var(--wpp-primary);color:#fff;border-radius:999px;min-width:20px;height:20px;display:grid;place-items:center;font-size:11px}.wpp-thread-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;border-bottom:1px solid var(--wpp-line);background:#fbfdfc}.wpp-message-area{height:470px;overflow:auto;padding:14px;background:#f3f7f5}.wpp-bubble{width:fit-content;max-width:min(78%,680px);border:1px solid var(--wpp-line);border-radius:8px;padding:9px 10px;margin-bottom:8px;background:#fff}.wpp-bubble.out{margin-left:auto;background:#dcf8eb;border-color:#c9efde}.wpp-bubble p{margin:3px 0 5px}.wpp-bubble small{color:var(--wpp-muted)}.wpp-composer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:10px;border-top:1px solid var(--wpp-line)}.wpp-composer input{border:1px solid var(--wpp-line);border-radius:6px;padding:9px 10px}.wpp-context{padding:12px}.wpp-context section{border-top:1px solid var(--wpp-line);padding-top:10px;margin-top:10px}.wpp-kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.wpp-lane{background:var(--wpp-panel-2);border:1px solid var(--wpp-line);border-radius:8px;padding:10px}.wpp-lane h2{font-size:13px;margin:0 0 9px;color:var(--wpp-muted)}.wpp-modal-backdrop{position:fixed;inset:0;background:rgba(8,18,15,.42);display:none;align-items:center;justify-content:center;padding:18px;z-index:30}.wpp-modal-backdrop.open{display:flex}.wpp-modal{width:min(860px,100%);max-height:min(780px,calc(100dvh - 36px));overflow:auto;background:#fff;border-radius:8px;border:1px solid var(--wpp-line);box-shadow:0 30px 90px rgba(0,0,0,.25)}.wpp-modal header{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--wpp-line);display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px}.wpp-modal-body{padding:14px}.wpp-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wpp-toast{position:fixed;right:16px;bottom:16px;z-index:40;max-width:360px;background:#112820;color:#fff;border-radius:8px;padding:12px 14px;box-shadow:0 18px 50px rgba(0,0,0,.22);opacity:0;transform:translateY(12px);transition:.18s}.wpp-toast.show{opacity:1;transform:translateY(0)}.wpp-empty{border:1px dashed var(--wpp-line);border-radius:8px;padding:18px;text-align:center;color:var(--wpp-muted);background:var(--wpp-panel-2)}
      @media(max-width:1100px){.wpp-shell{grid-template-columns:1fr}.wpp-sidebar{position:static;height:auto}.wpp-nav{grid-template-columns:repeat(4,minmax(0,1fr))}.wpp-chat{grid-template-columns:1fr}.wpp-context{order:3}.wpp-cols-4,.wpp-cols-3,.wpp-cols-2,.wpp-kanban{grid-template-columns:1fr 1fr}}
      @media(max-width:720px){body{font-size:13px}.wpp-main{padding:10px}.wpp-topbar{height:auto;align-items:flex-start;flex-direction:column}.wpp-nav{grid-template-columns:1fr 1fr}.wpp-cols-4,.wpp-cols-3,.wpp-cols-2,.wpp-kanban,.wpp-detail-grid{grid-template-columns:1fr}.wpp-chat{min-height:0}.wpp-message-area{height:360px}.wpp-composer{grid-template-columns:1fr}.wpp-table{min-width:620px}.wpp-sidebar{padding:10px}.wpp-sidebox{display:none}}
    `;
  }

  function metrics() {
    const received = state.finance.filter((item) => item.status === 'Recebido').reduce((sum, item) => sum + item.value, 0);
    const expected = state.finance.filter((item) => item.status === 'Previsto').reduce((sum, item) => sum + item.value, 0);
    const overdue = state.finance.filter((item) => item.status === 'Atrasado').reduce((sum, item) => sum + item.value, 0);
    const unread = state.conversations.reduce((sum, item) => sum + item.unread, 0);
    return { received, expected, overdue, unread };
  }

  function setBody() {
    document.head.querySelector('#wppcrm-demo-style')?.remove();
    const style = document.createElement('style');
    style.id = 'wppcrm-demo-style';
    style.textContent = css();
    document.head.appendChild(style);
    document.title = surface === 'admin' ? 'WPP CRM Admin Demo' : 'WPP CRM Funcionário Demo';
    document.body.innerHTML = `
      <div class="wpp-shell">
        <aside class="wpp-sidebar">
          <div class="wpp-brand"><span class="wpp-brand-mark">W</span><div><strong>WPP CRM</strong><span>${surface === 'admin' ? 'Administração' : 'Atendimento'}</span></div></div>
          <nav class="wpp-nav">${nav.map(([id, label]) => `<button data-screen="${id}">${label}</button>`).join('')}</nav>
          <div class="wpp-sidebox"><strong>${surface === 'admin' ? 'Santo Demo' : 'Lia Campos'}</strong>${surface === 'admin' ? 'Administrador com visão completa' : 'Fila de atendimento e carteira própria'}</div>
        </aside>
        <main class="wpp-main">
          <div class="wpp-topbar">
            <div><h1 data-page-title>Dashboard</h1><p>${surface === 'admin' ? 'Visão operacional da central, usuários e indicadores.' : 'Fila de conversas, tarefas e clientes da sua carteira.'}</p></div>
            <div class="wpp-actions">
              <button class="wpp-btn" data-action="sync">Sincronizar</button>
              <button class="wpp-btn primary" data-action="newItem">${surface === 'admin' ? 'Nova conta' : 'Novo atendimento'}</button>
            </div>
          </div>
          <div data-view></div>
        </main>
      </div>
      <div class="wpp-modal-backdrop" data-modal></div>
      <div class="wpp-toast" data-toast></div>
    `;
  }

  function render() {
    const current = location.hash.replace('#', '') || 'dashboard';
    const screen = nav.some(([id]) => id === current) ? current : 'dashboard';
    document.querySelectorAll('[data-screen]').forEach((button) => {
      button.classList.toggle('active', button.dataset.screen === screen);
    });
    document.querySelector('[data-page-title]').textContent = nav.find(([id]) => id === screen)?.[1] || 'Dashboard';
    document.querySelector('[data-view]').innerHTML = screens[screen] ? screens[screen]() : screens.dashboard();
  }

  const screens = {
    dashboard() {
      const m = metrics();
      return `
        <section class="wpp-grid wpp-cols-4">
          <article class="wpp-card wpp-metric"><span>Mensagens abertas</span><strong>${m.unread}</strong><span>em ${state.conversations.length} conversas ativas</span></article>
          <article class="wpp-card wpp-metric"><span>Recebido no mês</span><strong>${money(m.received)}</strong><span>${money(m.expected)} previsto hoje</span></article>
          <article class="wpp-card wpp-metric"><span>Pendências financeiras</span><strong>${money(m.overdue)}</strong><span>1 cliente em atraso</span></article>
          <article class="wpp-card wpp-metric"><span>OS em andamento</span><strong>${state.orders.length}</strong><span>${state.tasks.filter((task) => task.status === 'Pendente').length} tarefas pendentes</span></article>
        </section>
        <section class="wpp-grid wpp-cols-2" style="margin-top:12px">
          <article class="wpp-panel">
            <header><div><h2>Atenção agora</h2><p>Alertas ligados a clientes, arquivos e financeiro.</p></div></header>
            <div class="wpp-list">${state.alerts.map((item) => `<div class="wpp-row wpp-alert ${item.tone}"><div><strong>${item.title}</strong><small>${item.text}</small></div><button class="wpp-btn small" data-action="resolveAlert">Resolver</button></div>`).join('')}</div>
          </article>
          <article class="wpp-panel">
            <header><div><h2>Agenda e tarefas</h2><p>Próximas ações conectadas às OS.</p></div><button class="wpp-btn small primary" data-action="newTask">Nova tarefa</button></header>
            <div class="wpp-list">${state.tasks.map(taskRow).join('')}</div>
          </article>
        </section>
        <section class="wpp-grid wpp-cols-2" style="margin-top:12px">
          ${ordersPanel()}
          ${financePanel()}
        </section>
      `;
    },
    messages() {
      const current = byId(state.conversations, state.selectedConversation) || state.conversations[0];
      const c = client(current.clientId);
      return `
        <section class="wpp-chat">
          <aside class="wpp-thread-list">
            <div class="wpp-search"><input placeholder="Buscar conversa" value=""></div>
            ${state.conversations.map((item) => {
              const rowClient = client(item.clientId);
              return `<button class="wpp-thread-button ${item.id === current.id ? 'active' : ''}" data-select-conversation="${item.id}">
                <span class="wpp-avatar">${initials(rowClient.name)}</span>
                <span><strong>${rowClient.name}</strong><small>${item.summary}</small></span>
                ${item.unread ? `<b>${item.unread}</b>` : '<span></span>'}
              </button>`;
            }).join('')}
          </aside>
          <section class="wpp-thread">
            <header class="wpp-thread-head">
              <div class="wpp-name"><span class="wpp-avatar">${initials(c.name)}</span><div><strong>${c.name}</strong><small>${current.channel} · ${c.phone} · ${c.tag}</small></div></div>
              <button class="wpp-btn small" data-open-client="${c.id}">Perfil</button>
            </header>
            <div class="wpp-message-area">
              ${current.messages.map((msg) => `<article class="wpp-bubble ${msg.side === 'out' ? 'out' : ''}"><strong>${msg.side === 'out' ? 'Atendimento' : c.name}</strong><p>${escape(msg.text)}</p><small>${msg.time} · ${msg.side === 'out' ? 'Entregue' : 'Recebida'}</small></article>`).join('')}
            </div>
            <form class="wpp-composer" data-message-form><input name="message" placeholder="Digite uma mensagem para ${escape(c.name)}"><button class="wpp-btn primary">Enviar WhatsApp</button></form>
          </section>
          ${clientContext(c)}
        </section>
      `;
    },
    contacts() {
      return `
        <section class="wpp-panel">
          <header><div><h2>Clientes e contatos</h2><p>Carteira com receita, histórico, arquivos e ações.</p></div><button class="wpp-btn primary" data-action="newClient">Novo contato</button></header>
          <div class="wpp-table-wrap"><table class="wpp-table">
            <thead><tr><th>Cliente</th><th>Responsável</th><th>Status</th><th>Receita</th><th>Último contato</th><th></th></tr></thead>
            <tbody>${state.clients.map((c) => `<tr><td>${nameCell(c)}</td><td>${c.owner}</td><td><span class="wpp-status ${c.status.includes('pendente') ? 'warn' : ''}">${c.status}</span></td><td>${money(c.revenue)}</td><td>${c.last}</td><td><button class="wpp-btn small" data-open-client="${c.id}">Abrir</button></td></tr>`).join('')}</tbody>
          </table></div>
        </section>
        <section class="wpp-grid wpp-cols-3" style="margin-top:12px">
          ${state.clients.map((c) => `<article class="wpp-card"><h2>${c.name}</h2><p>${c.note}</p><p><span class="wpp-status">${c.tag}</span></p><button class="wpp-btn small" data-select-conversation="${c.id}">Atender</button></article>`).join('')}
        </section>
      `;
    },
    orders() {
      return `
        <section class="wpp-kanban">${['Em produção', 'Aguardando assinatura', 'Aguardando cliente'].map((status) => `
          <div class="wpp-lane"><h2>${status}</h2>
            <div class="wpp-list">${state.orders.filter((item) => item.status === status).map(orderCard).join('') || '<div class="wpp-empty">Sem itens nesta etapa</div>'}</div>
          </div>`).join('')}
        </section>
        <section class="wpp-grid wpp-cols-2" style="margin-top:12px">${ordersPanel()}${tasksPanel()}</section>
      `;
    },
    finance() {
      return `
        <section class="wpp-grid wpp-cols-4">${financeMetrics().join('')}</section>
        <section class="wpp-grid wpp-cols-2" style="margin-top:12px">${financePanel()}${ordersPanel()}</section>
      `;
    },
    files() {
      return `
        <section class="wpp-panel">
          <header><div><h2>Arquivos vinculados</h2><p>Anexos recebidos por WhatsApp e e-mail, ligados aos clientes.</p></div><button class="wpp-btn primary" data-action="uploadFile">Enviar arquivo</button></header>
          <div class="wpp-table-wrap"><table class="wpp-table">
            <thead><tr><th>Arquivo</th><th>Cliente</th><th>Origem</th><th>Tag</th><th>Status</th><th>Data</th><th></th></tr></thead>
            <tbody>${state.files.map((file) => `<tr><td><strong>${file.name}</strong><small class="wpp-muted">${file.type}</small></td><td>${client(file.clientId).name}</td><td>${file.source}</td><td>${file.tag}</td><td><span class="wpp-status ${file.status.includes('Sem') ? 'warn' : 'info'}">${file.status}</span></td><td>${file.date}</td><td><button class="wpp-btn small" data-open-file="${file.name}">Abrir</button></td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      `;
    },
    emails() {
      return `
        <section class="wpp-grid wpp-cols-3">
          <article class="wpp-card wpp-metric"><span>Entrada</span><strong>42</strong><span>7 sem vínculo automático</span></article>
          <article class="wpp-card wpp-metric"><span>Respondidos hoje</span><strong>18</strong><span>tempo médio 12 min</span></article>
          <article class="wpp-card wpp-metric"><span>Anexos importados</span><strong>${state.files.filter((file) => file.source === 'E-mail').length}</strong><span>ligados a clientes</span></article>
        </section>
        <section class="wpp-grid wpp-cols-2" style="margin-top:12px">
          <article class="wpp-panel"><header><h2>Caixa integrada</h2></header><div class="wpp-list">${state.clients.map((c) => `<div class="wpp-row"><div><strong>Re: ${c.status}</strong><small>${c.email} · ${c.name}</small></div><button class="wpp-btn small" data-open-client="${c.id}">Vincular</button></div>`).join('')}</div></article>
          <form class="wpp-panel" data-email-form><header><h2>Resposta rápida</h2></header><label class="wpp-field">Para<input name="to" value="${client(state.selectedClient).email}"></label><br><label class="wpp-field">Mensagem<textarea name="body" rows="8">Olá! Segue retorno conforme combinado.</textarea></label><br><button class="wpp-btn primary">Enviar e-mail</button></form>
        </section>
      `;
    },
    users() {
      return `
        <section class="wpp-panel">
          <header><div><h2>Gerenciamento de contas</h2><p>Perfis, presença produtiva, fila e permissões.</p></div><button class="wpp-btn primary" data-action="newUser">Nova conta</button></header>
          <div class="wpp-table-wrap"><table class="wpp-table">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Tempo ativo</th><th>Fila</th><th></th></tr></thead>
            <tbody>${state.users.map((user) => `<tr><td><strong>${user.name}</strong><small class="wpp-muted">${user.email}</small></td><td>${user.role}</td><td><span class="wpp-status ${user.status === 'Ausente' ? 'warn' : ''}">${user.status}</span></td><td>${user.active}</td><td>${user.queue}</td><td><button class="wpp-btn small" data-action="editUser">Permissões</button></td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      `;
    },
    integrations() {
      return `
        <section class="wpp-grid wpp-cols-3">
          <article class="wpp-card"><h2>WhatsApp / OpenWA</h2><p>Conectado como Atendimento TGDevs. Último heartbeat há 18s.</p><button class="wpp-btn small" data-action="qr">Regerar QR</button></article>
          <article class="wpp-card"><h2>IMAP e SMTP</h2><p>atendimento@demo.local importando anexos e sugestões de vínculo.</p><button class="wpp-btn small" data-action="testEmail">Testar conexão</button></article>
          <article class="wpp-card"><h2>Importação PST</h2><p>1 job validado, 284 contatos reconhecidos e 41 sem vínculo.</p><button class="wpp-btn small" data-action="importPst">Importar PST</button></article>
        </section>
        <section class="wpp-panel" style="margin-top:12px"><header><h2>Logs recentes</h2></header><div class="wpp-list"><div class="wpp-row"><strong>WhatsApp sincronizado</strong><small>Mensagens e mídias processadas agora</small></div><div class="wpp-row"><strong>Arquivo vinculado</strong><small>briefing-maxine.pdf ligado à OS-1048</small></div></div></section>
      `;
    }
  };

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function nameCell(c) {
    return `<div class="wpp-name"><span class="wpp-avatar">${initials(c.name)}</span><span><strong>${c.name}</strong><small>${c.phone}</small></span></div>`;
  }

  function taskRow(task) {
    return `<div class="wpp-row"><div><strong>${task.title}</strong><small>${client(task.clientId).name} · ${task.owner} · ${task.time}</small></div><button class="wpp-btn small" data-complete-task="${task.id}">${task.status === 'Concluído' ? 'Reabrir' : 'Concluir'}</button></div>`;
  }

  function orderCard(item) {
    return `<article class="wpp-card"><h2>${item.id}</h2><p><strong>${item.title}</strong><br>${client(item.clientId).name}</p><p>${money(item.value)} · ${item.due}</p><button class="wpp-btn small" data-open-order="${item.id}">Abrir OS</button> <button class="wpp-btn small" data-advance-order="${item.id}">Avançar</button></article>`;
  }

  function ordersPanel() {
    return `<article class="wpp-panel"><header><div><h2>OS e vendas</h2><p>Status, valor, cliente e prazo.</p></div><button class="wpp-btn small primary" data-action="newOrder">Nova OS</button></header><div class="wpp-list">${state.orders.map((item) => `<div class="wpp-row"><div><strong>${item.id} · ${item.title}</strong><small>${client(item.clientId).name} · ${item.status} · ${money(item.value)}</small></div><button class="wpp-btn small" data-open-order="${item.id}">Detalhes</button></div>`).join('')}</div></article>`;
  }

  function tasksPanel() {
    return `<article class="wpp-panel"><header><h2>Tarefas</h2></header><div class="wpp-list">${state.tasks.map(taskRow).join('')}</div></article>`;
  }

  function financePanel() {
    return `<article class="wpp-panel"><header><div><h2>Financeiro</h2><p>Movimentações ligadas às OS.</p></div></header><div class="wpp-table-wrap"><table class="wpp-table"><thead><tr><th>ID</th><th>Cliente</th><th>OS</th><th>Status</th><th>Valor</th></tr></thead><tbody>${state.finance.map((item) => `<tr><td>${item.id}</td><td>${client(item.clientId).name}</td><td>${item.orderId}</td><td><span class="wpp-status ${item.status === 'Atrasado' ? 'danger' : item.status === 'Previsto' ? 'warn' : ''}">${item.status}</span></td><td>${money(item.value)}</td></tr>`).join('')}</tbody></table></div></article>`;
  }

  function financeMetrics() {
    const m = metrics();
    return [
      ['Recebido', money(m.received), 'entradas confirmadas'],
      ['Previsto', money(m.expected), 'a receber hoje'],
      ['Atrasado', money(m.overdue), 'exige cobrança'],
      ['Saldo operacional', money(m.received + m.expected - 640), 'recebido + previsto - saídas']
    ].map(([label, value, text]) => `<article class="wpp-card wpp-metric"><span>${label}</span><strong>${value}</strong><span>${text}</span></article>`);
  }

  function clientContext(c) {
    const orders = state.orders.filter((item) => item.clientId === c.id);
    const files = state.files.filter((item) => item.clientId === c.id);
    const finance = state.finance.filter((item) => item.clientId === c.id);
    return `<aside class="wpp-context">
      <div class="wpp-name"><span class="wpp-avatar">${initials(c.name)}</span><span><strong>${c.name}</strong><small>${c.company}</small></span></div>
      <p>${c.note}</p>
      <section><h2>OS vinculadas</h2><div class="wpp-list">${orders.map((item) => `<div class="wpp-row"><strong>${item.id}</strong><small>${item.status} · ${money(item.value)}</small></div>`).join('')}</div></section>
      <section><h2>Arquivos</h2><div class="wpp-list">${files.map((item) => `<div class="wpp-row"><strong>${item.name}</strong><small>${item.source} · ${item.status}</small></div>`).join('')}</div></section>
      <section><h2>Financeiro</h2><div class="wpp-list">${finance.map((item) => `<div class="wpp-row"><strong>${item.id}</strong><small>${item.status} · ${money(item.value)}</small></div>`).join('')}</div></section>
    </aside>`;
  }

  function modal(title, body) {
    const host = document.querySelector('[data-modal]');
    host.innerHTML = `<section class="wpp-modal"><header><h2>${title}</h2><button class="wpp-btn small" data-close-modal>Fechar</button></header><div class="wpp-modal-body">${body}</div></section>`;
    host.classList.add('open');
  }

  function clientModal(id) {
    const c = client(id);
    state.selectedClient = c.id;
    save();
    modal(c.name, `
      <div class="wpp-detail-grid">
        <article class="wpp-card"><h2>Dados principais</h2><p>${c.company}<br>${c.phone}<br>${c.email}</p><p><span class="wpp-status">${c.tag}</span> <span class="wpp-status warn">${c.status}</span></p></article>
        <article class="wpp-card"><h2>Resumo comercial</h2><p>Receita acumulada: <strong>${money(c.revenue)}</strong><br>Responsável: ${c.owner}<br>Último contato: ${c.last}</p></article>
      </div>
      <section class="wpp-panel" style="margin-top:12px"><header><h2>Histórico</h2></header><div class="wpp-list">${c.history.map((item) => `<div class="wpp-row"><strong>${item}</strong><small>${c.name}</small></div>`).join('')}</div></section>
      <section class="wpp-grid wpp-cols-2" style="margin-top:12px">${ordersPanel()}${financePanel()}</section>
    `);
  }

  function orderModal(id) {
    const item = order(id);
    const c = client(item.clientId);
    modal(`${item.id} · ${item.title}`, `
      <div class="wpp-detail-grid">
        <article class="wpp-card"><h2>Cliente</h2><p>${c.name}<br>${c.phone}<br>${c.email}</p><button class="wpp-btn small" data-open-client="${c.id}">Abrir cliente</button></article>
        <article class="wpp-card"><h2>OS</h2><p>Status: <strong>${item.status}</strong><br>Valor: <strong>${money(item.value)}</strong><br>Prazo: ${item.due}<br>Responsável: ${item.owner}</p></article>
      </div>
      <section class="wpp-panel" style="margin-top:12px"><header><h2>Itens e serviços</h2></header><div class="wpp-list">${item.items.map((line) => `<div class="wpp-row"><strong>${line}</strong><small>${item.id}</small></div>`).join('')}</div></section>
      <section class="wpp-grid wpp-cols-2" style="margin-top:12px">${financePanel()}${tasksPanel()}</section>
    `);
  }

  function fileModal(name) {
    const file = state.files.find((item) => item.name === name);
    if (!file) return;
    const c = client(file.clientId);
    modal(file.name, `
      <div class="wpp-detail-grid">
        <article class="wpp-card"><h2>Arquivo</h2><p>Tipo: ${file.type}<br>Origem: ${file.source}<br>Status: ${file.status}<br>Tag: ${file.tag}</p></article>
        <article class="wpp-card"><h2>Vínculo</h2><p>${c.name}<br>${c.email}<br>${c.status}</p><button class="wpp-btn small" data-open-client="${c.id}">Abrir cliente</button></article>
      </div>
    `);
  }

  function notify(text) {
    const toast = document.querySelector('[data-toast]');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function advanceOrder(id) {
    const item = order(id);
    const flow = ['Aguardando cliente', 'Aguardando assinatura', 'Em produção', 'Concluído'];
    item.status = flow[(flow.indexOf(item.status) + 1) % flow.length] || 'Em produção';
    save();
    render();
    notify(`${item.id} avançou para ${item.status}.`);
  }

  function addFake(kind) {
    if (kind === 'newTask') {
      state.tasks.unshift({ id: `T-${70 + state.tasks.length}`, clientId: state.selectedClient, title: 'Retorno criado na simulação', owner: surface === 'admin' ? 'Santo Demo' : 'Lia Campos', time: 'Hoje 18:30', status: 'Pendente' });
      notify('Tarefa adicionada à agenda.');
    } else if (kind === 'newClient') {
      state.clients.unshift({ id: `cliente-${Date.now()}`, name: 'Novo Cliente Demo', company: 'Operação simulada', owner: 'Lia Campos', phone: '+55 11 90000-0000', email: 'novo@demo.local', tag: 'Novo', status: 'Primeiro contato', revenue: 0, last: 'Agora', note: 'Contato criado apenas nesta simulação.', files: [], history: ['Contato criado na demo'] });
      notify('Contato fake inserido na carteira.');
    } else if (kind === 'uploadFile') {
      state.files.unshift({ name: `anexo-demo-${state.files.length + 1}.pdf`, clientId: state.selectedClient, source: 'Upload', tag: 'Novo', type: 'PDF', status: 'Sem revisão', date: 'Agora' });
      notify('Arquivo fake incluído e aguardando revisão.');
    } else {
      notify('Ação simulada registrada. Nenhum dado real foi enviado.');
    }
    save();
    render();
  }

  setBody();
  render();

  window.addEventListener('hashchange', render);
  document.addEventListener('click', (event) => {
    const screen = event.target.closest('[data-screen]');
    if (screen) {
      location.hash = screen.dataset.screen;
      render();
      return;
    }
    const close = event.target.closest('[data-close-modal]');
    if (close || event.target.matches('[data-modal]')) {
      document.querySelector('[data-modal]').classList.remove('open');
      return;
    }
    const selected = event.target.closest('[data-select-conversation]');
    if (selected) {
      state.selectedConversation = selected.dataset.selectConversation;
      const conversation = byId(state.conversations, state.selectedConversation);
      if (conversation) conversation.unread = 0;
      save();
      location.hash = 'messages';
      render();
      return;
    }
    const openClient = event.target.closest('[data-open-client]');
    if (openClient) {
      clientModal(openClient.dataset.openClient);
      return;
    }
    const openOrder = event.target.closest('[data-open-order]');
    if (openOrder) {
      orderModal(openOrder.dataset.openOrder);
      return;
    }
    const openFile = event.target.closest('[data-open-file]');
    if (openFile) {
      fileModal(openFile.dataset.openFile);
      return;
    }
    const advance = event.target.closest('[data-advance-order]');
    if (advance) {
      advanceOrder(advance.dataset.advanceOrder);
      return;
    }
    const task = event.target.closest('[data-complete-task]');
    if (task) {
      const item = byId(state.tasks, task.dataset.completeTask);
      item.status = item.status === 'Concluído' ? 'Pendente' : 'Concluído';
      save();
      render();
      notify(`${item.title}: ${item.status}.`);
      return;
    }
    const action = event.target.closest('[data-action]');
    if (action) {
      addFake(action.dataset.action);
    }
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();
    const messageForm = event.target.closest('[data-message-form]');
    if (messageForm) {
      const conversation = byId(state.conversations, state.selectedConversation);
      const input = messageForm.elements.message;
      const text = input.value.trim() || 'Mensagem simulada enviada.';
      conversation.messages.push({ side: 'out', text, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
      input.value = '';
      save();
      render();
      notify('Mensagem adicionada à conversa do demo.');
      return;
    }
    const emailForm = event.target.closest('[data-email-form]');
    if (emailForm) {
      state.files.unshift({ name: `resposta-email-${state.files.length + 1}.eml`, clientId: state.selectedClient, source: 'E-mail', tag: 'Resposta', type: 'EML', status: 'Vinculado', date: 'Agora' });
      save();
      render();
      notify('E-mail simulado enviado e vinculado ao cliente.');
    }
  });
})();
