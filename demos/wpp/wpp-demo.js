(() => {
  const surface = location.pathname.toLowerCase().includes('funcionario') ? 'funcionario' : 'admin';
  const demo = window.TGDemo ? TGDemo.initDemo(`wpp-${surface}`, {
    messages: [
      { side: 'in', text: 'Oi, preciso confirmar o orçamento do pacote mensal.', time: '09:41' },
      { side: 'out', text: 'Claro. Vou conferir o contrato e te envio a proposta atualizada.', time: '09:43' }
    ],
    emails: [
      { from: 'financeiro@cliente.com', subject: 'NF e comprovante', status: 'Pendente' },
      { from: 'operacao@cliente.com', subject: 'Arquivos de campanha', status: 'Respondido' }
    ],
    files: [
      { name: 'briefing-campanha.pdf', tag: 'Campanha', owner: 'Marina Alves' },
      { name: 'contrato-2026.docx', tag: 'Contrato', owner: 'Rafael Nunes' }
    ],
    contacts: [
      { name: 'Marina Alves', phone: '+55 31 99904-2766', tag: 'VIP', note: 'Prefere atendimento por WhatsApp.' },
      { name: 'Rafael Nunes', phone: '+55 11 95555-1900', tag: 'Financeiro', note: 'Enviar boletos por e-mail.' }
    ],
    accounts: [
      { user: 'Santo Demo', role: 'Administrador', status: 'Online' },
      { user: 'Atendimento Demo', role: 'Funcionário', status: 'Em atendimento' }
    ]
  }) : null;
  const state = demo ? demo.state : {};
  const screens = [...document.querySelectorAll('.demo-screen')];
  const links = [...document.querySelectorAll('[data-nav] a')];
  const title = document.querySelector('[data-title]');
  const toast = document.querySelector('[data-toast]');
  const allowed = surface === 'admin'
    ? new Set(['dashboard', 'users'])
    : new Set(['dashboard', 'messages', 'emails', 'files', 'contacts']);

  links.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    link.hidden = !allowed.has(id);
  });
  screens.forEach((screen) => {
    if (!allowed.has(screen.id)) screen.remove();
  });

  const visibleLinks = links.filter((link) => !link.hidden);
  const names = Object.fromEntries(visibleLinks.map((link) => [link.getAttribute('href').slice(1), link.textContent.trim()]));
  const subtitle = document.querySelector('.brand-subtitle');
  const topMuted = document.querySelector('.topbar .muted');
  if (subtitle) subtitle.textContent = surface === 'admin'
    ? 'Painel administrativo demo para visão da operação e gerenciamento de contas.'
    : 'Front funcionário demo para atendimento, mensagens, e-mails, arquivos e contatos.';
  if (topMuted) topMuted.textContent = surface === 'admin'
    ? 'Santo Demo - Administrador'
    : 'Atendimento Demo - Funcionário';
  document.title = surface === 'admin' ? 'WPP CRM Admin Demo' : 'WPP CRM Funcionário Demo';

  function notify(message) {
    if (demo) return demo.toast(message || 'Ação simulada. Nenhum dado foi enviado.');
    toast.textContent = message || 'Ação simulada. Nenhum dado foi enviado.';
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function show(id) {
    if (!names[id]) id = surface === 'admin' ? 'dashboard' : 'messages';
    screens.forEach((screen) => screen.classList.toggle('active', screen.id === id));
    visibleLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + id));
    if (title) title.textContent = names[id];
  }

  function renderMessages() {
    const thread = document.querySelector('[data-wpp-thread]');
    if (!thread || !state.messages) return;
    thread.innerHTML = '<div class="message-day-label">Hoje</div>' + state.messages.map((item) => `
      <div class="message-bubble ${item.side === 'out' ? 'outbound' : 'inbound'}">
        <strong>${item.side === 'out' ? 'Atendimento' : 'Cliente'}</strong>
        <p>${item.text}</p>
        <small>${item.time} · ${item.side === 'out' ? 'Entregue ao destinatário' : 'Recebida no WhatsApp'}</small>
      </div>
    `).join('');
  }

  function renderTables() {
    const usersTable = document.querySelector('#users tbody');
    if (usersTable && state.accounts) {
      usersTable.innerHTML = state.accounts.map((item) => `
        <tr><td>${item.user}</td><td>${item.role}</td><td>${item.status}</td><td><button data-action="Permissões simuladas">Permissões</button></td></tr>
      `).join('');
    }
    const filesTable = document.querySelector('#files tbody');
    if (filesTable && state.files) {
      filesTable.innerHTML = state.files.map((item) => `
        <tr><td>${item.name}</td><td>${item.tag}</td><td>${item.owner}</td><td><button data-action="Visualização simulada do arquivo ${item.name}">Abrir</button></td></tr>
      `).join('');
    }
  }

  function addComposerIfNeeded() {
    const messages = document.querySelector('#messages .conversation-thread');
    if (messages && !document.querySelector('[data-wpp-thread]')) {
      messages.querySelectorAll(':scope > .message-day-label, :scope > .message-bubble').forEach((node) => node.remove());
      const dynamicThread = document.createElement('div');
      dynamicThread.setAttribute('data-wpp-thread', '');
      messages.insertBefore(dynamicThread, messages.querySelector('.message-composer'));
    }
    if (messages && !document.querySelector('.message-composer')) {
      const composer = document.createElement('form');
      composer.className = 'message-composer';
      composer.innerHTML = '<button type="button" data-action="Áudio simulado">Áudio</button><input name="message" placeholder="Digite uma mensagem"><button class="primary">Enviar</button>';
      messages.appendChild(composer);
    }
    const email = document.querySelector('#emails');
    if (email && !document.querySelector('[data-email-compose]')) {
      const box = document.createElement('form');
      box.className = 'panel-card';
      box.setAttribute('data-email-compose', '');
      box.innerHTML = '<h3>Resposta rápida</h3><label class="field">Assunto<input name="subject" value="Re: orçamento"></label><label class="field">Mensagem<textarea name="body">Olá, segue retorno em anexo.</textarea></label><button class="primary">Enviar e-mail simulado</button>';
      email.appendChild(box);
    }
  }

  function save() {
    if (demo) demo.save();
    renderMessages();
    renderTables();
  }

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) return;
    event.preventDefault();
    const message = action.dataset.action || 'Ação simulada.';
    if (message.toLowerCase().includes('arquivo') && state.files) {
      state.files[0].tag = state.files[0].tag === 'Campanha' ? 'Revisado' : 'Campanha';
      save();
      notify('Tag do arquivo alterada no cache do demo.');
      return;
    }
    notify(message);
  });
  document.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.matches('.message-composer')) {
      const input = form.elements.message;
      const text = input.value.trim() || 'Mensagem simulada enviada.';
      state.messages.push({ side: 'out', text, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
      input.value = '';
      save();
      notify('Mensagem adicionada à conversa do demo.');
      return;
    }
    if (form.matches('[data-email-compose]')) {
      state.emails.unshift({ from: 'atendimento@demo.local', subject: form.elements.subject.value || 'Resposta', status: 'Enviado' });
      save();
      notify('E-mail simulado enviado.');
      return;
    }
    notify('Formulário simulado salvo no cache.');
  });

  addComposerIfNeeded();
  renderMessages();
  renderTables();
  show(location.hash.slice(1));
})();
