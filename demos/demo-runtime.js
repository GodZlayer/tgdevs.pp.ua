(() => {
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function cleanResetParam() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('demoReset')) return false;
    url.searchParams.delete('demoReset');
    const clean = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState(null, '', clean);
    return true;
  }

  function initDemo(namespace, seedData = {}) {
    const key = `tgdevs:${namespace}:state`;
    if (cleanResetParam()) localStorage.removeItem(key);
    let state;
    try {
      state = JSON.parse(localStorage.getItem(key) || 'null') || clone(seedData);
    } catch {
      state = clone(seedData);
    }

    const save = () => localStorage.setItem(key, JSON.stringify(state));
    const reset = () => {
      state = clone(seedData);
      save();
      return state;
    };

    save();

    const api = {
      namespace,
      get state() { return state; },
      save,
      reset,
      money(value) {
        return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      },
      toast(message = 'Acao simulada. Nenhum dado foi enviado.') {
        let toast = document.querySelector('[data-demo-toast]');
        if (!toast) {
          toast = document.createElement('div');
          toast.className = 'demo-toast';
          toast.dataset.demoToast = '';
          document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(api.toastTimer);
        api.toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
      },
      openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = false;
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
      },
      closeModal(id) {
        const modal = id ? document.getElementById(id) : document.querySelector('.demo-modal.is-open');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.hidden = true;
        document.body.classList.remove('modal-open');
      },
      bindTabs(defaultId) {
        const tabs = [...document.querySelectorAll('[data-tab]')];
        const panels = [...document.querySelectorAll('[data-panel]')];
        const show = (id) => {
          const target = id || defaultId || tabs[0]?.dataset.tab || panels[0]?.dataset.panel;
          tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === target));
          panels.forEach((panel) => panel.hidden = panel.dataset.panel !== target);
          if (target) history.replaceState(null, '', `#${target}`);
        };
        tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.tab)));
        show((location.hash || '').slice(1));
        return show;
      }
    };

    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-open-modal]');
      if (open) {
        event.preventDefault();
        api.openModal(open.dataset.openModal);
      }
      const close = event.target.closest('[data-close-modal]');
      if (close) {
        event.preventDefault();
        api.closeModal(close.dataset.closeModal || null);
      }
      const action = event.target.closest('[data-demo-action]');
      if (action) {
        event.preventDefault();
        api.toast(action.dataset.demoAction || undefined);
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-demo-form]');
      if (!form) return;
      event.preventDefault();
      api.toast(form.dataset.demoForm || 'Formulario salvo na simulacao.');
    });

    window.TGDemoCurrent = api;
    return api;
  }

  window.TGDemo = { initDemo };
})();
