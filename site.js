const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const revealItems = document.querySelectorAll('[data-reveal]');
const wizard = document.querySelector('[data-wizard]');
const sections = [...document.querySelectorAll('.section-panel')];
const morphPath = document.querySelector('[data-morph-path]');
const morphLine = document.querySelector('[data-morph-line]');
const morphShapes = {
  home: {
    fill: 'M-80,526 C180,356 292,156 552,214 C812,272 884,530 1146,454 C1408,378 1518,162 1590,252 L1590,980 L-80,980 Z',
    line: 'M-80,304 C180,188 374,154 578,286 C782,418 942,596 1210,494 C1478,392 1518,220 1590,278',
    angle: -4
  },
  services: {
    fill: 'M-80,312 C204,144 384,402 608,342 C832,282 896,118 1166,224 C1436,330 1498,586 1590,478 L1590,980 L-80,980 Z',
    line: 'M-80,516 C196,616 338,372 602,396 C866,420 998,180 1220,260 C1442,340 1490,518 1590,438',
    angle: 8
  },
  partners: {
    fill: 'M-80,444 C148,612 362,528 580,412 C798,296 944,398 1168,322 C1392,246 1514,332 1590,176 L1590,980 L-80,980 Z',
    line: 'M-80,234 C194,420 382,436 590,316 C798,196 934,464 1206,384 C1478,304 1512,224 1590,154',
    angle: -10
  },
  contact: {
    fill: 'M-80,620 C178,438 326,506 566,332 C806,158 1012,238 1208,430 C1404,622 1512,474 1590,548 L1590,980 L-80,980 Z',
    line: 'M-80,404 C172,294 360,562 574,374 C788,186 1014,224 1206,422 C1398,620 1512,534 1590,612',
    angle: 12
  }
};

const morphState = {
  activeId: 'home',
  fill: morphShapes.home.fill,
  line: morphShapes.home.line,
  fillAnimation: null,
  lineAnimation: null
};

const setScrollState = () => {
  const y = window.scrollY || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const scrollRatio = y / viewportHeight;
  document.documentElement.style.setProperty('--scroll-ratio', String(scrollRatio));
  header?.classList.toggle('scrolled', scrollRatio > .02);
  updateSectionScene();
};

setScrollState();
window.addEventListener('scroll', setScrollState, { passive: true });
window.addEventListener('resize', setScrollState);

menuButton?.addEventListener('click', () => {
  const open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  menuButton.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
});

nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    nav.classList.remove('open');
    menuButton?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => observer.observe(item));

function updateSectionScene() {
  if (!sections.length) return;

  const viewportCenter = window.innerHeight * 0.52;
  let activeIndex = 0;
  let closestDistance = Infinity;

  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.top + rect.height / 2;
    const distance = Math.abs(sectionCenter - viewportCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      activeIndex = index;
    }
  });

  sections.forEach((section, index) => {
    section.classList.toggle('is-active', index === activeIndex);
    section.classList.toggle('is-before', index < activeIndex);
    section.classList.toggle('is-after', index > activeIndex);
  });

  const activeSection = sections[activeIndex];
  const activeId = activeSection?.id || 'home';
  const heroRect = document.querySelector('#home')?.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const onHero = heroRect ? heroRect.bottom > viewportHeight * .14 : activeId === 'home';

  header?.classList.toggle('on-hero', onHero);
  if (onHero) {
    nav?.classList.remove('open');
    menuButton?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }

  if (activeId !== morphState.activeId && morphShapes[activeId]) {
    morphTo(activeId);
  }
}

function morphTo(id) {
  const target = morphShapes[id];
  morphState.activeId = id;
  document.documentElement.style.setProperty('--morph-angle', String(target.angle));

  morphState.fillAnimation = animatePath(morphPath, morphState.fill, target.fill, (value) => {
    morphState.fill = value;
  }, morphState.fillAnimation);

  morphState.lineAnimation = animatePath(morphLine, morphState.line, target.line, (value) => {
    morphState.line = value;
  }, morphState.lineAnimation);
}

function animatePath(pathElement, fromPath, toPath, onFrame, previousAnimation) {
  if (!pathElement) return null;
  if (previousAnimation?.frameId) cancelAnimationFrame(previousAnimation.frameId);

  const fromNumbers = extractNumbers(fromPath);
  const toNumbers = extractNumbers(toPath);
  const template = toPath.split(/-?\d*\.?\d+/g);
  const start = performance.now();
  const duration = 760;
  const animation = { frameId: null };

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const values = toNumbers.map((target, index) => {
      const from = fromNumbers[index] ?? target;
      return from + (target - from) * eased;
    });
    const nextPath = buildPath(template, values);
    pathElement.setAttribute('d', nextPath);
    onFrame(nextPath);

    if (progress < 1) {
      animation.frameId = requestAnimationFrame(tick);
    }
  };

  animation.frameId = requestAnimationFrame(tick);
  return animation;
}

function extractNumbers(path) {
  return (path.match(/-?\d*\.?\d+/g) || []).map(Number);
}

function buildPath(template, values) {
  return template.reduce((path, chunk, index) => {
    const value = values[index];
    return path + chunk + (Number.isFinite(value) ? Number(value.toFixed(2)) : '');
  }, '');
}

if (wizard) {
  let step = 0;
  const steps = [...wizard.querySelectorAll('[data-step]')];
  const navSteps = [...wizard.querySelectorAll('[data-step-nav]')];
  const prev = wizard.querySelector('[data-prev]');
  const next = wizard.querySelector('[data-next]');
  const submit = wizard.querySelector('[data-submit]');
  const review = wizard.querySelector('[data-review]');

  const getFormData = () => {
    const data = new FormData(wizard);
    const services = ['Hospedagem', ...data.getAll('services')].filter((item, index, list) => list.indexOf(item) === index);
    return {
      product: data.get('product') || 'Site Básico',
      services,
      name: data.get('name') || '',
      company: data.get('company') || '',
      email: data.get('email') || '',
      whatsapp: data.get('whatsapp') || '',
      message: data.get('message') || ''
    };
  };

  const renderReview = () => {
    const data = getFormData();
    review.innerHTML = `
      <dl>
        <dt>Produto</dt><dd>${escapeHtml(data.product)}</dd>
        <dt>Serviços</dt><dd>${escapeHtml(data.services.join(', '))}</dd>
        <dt>Nome</dt><dd>${escapeHtml(data.name || 'Não informado')}</dd>
        <dt>Empresa</dt><dd>${escapeHtml(data.company || 'Não informado')}</dd>
        <dt>E-mail</dt><dd>${escapeHtml(data.email || 'Não informado')}</dd>
        <dt>WhatsApp</dt><dd>${escapeHtml(data.whatsapp || 'Não informado')}</dd>
        <dt>Mensagem</dt><dd>${escapeHtml(data.message || 'Não informado')}</dd>
      </dl>
    `;
  };

  const showStep = (target) => {
    step = Math.max(0, Math.min(target, steps.length - 1));
    steps.forEach((item, index) => item.classList.toggle('active', index === step));
    navSteps.forEach((item, index) => item.classList.toggle('active', index === step));
    prev.disabled = step === 0;
    next.classList.toggle('hidden', step === steps.length - 1);
    submit.classList.toggle('hidden', step !== steps.length - 1);
    if (step === steps.length - 1) renderReview();
  };

  const validateStep = () => {
    if (step !== 2) return true;
    const name = wizard.elements.name;
    if (!name.value.trim()) {
      name.focus();
      name.setCustomValidity('Informe seu nome para continuar.');
      name.reportValidity();
      return false;
    }
    name.setCustomValidity('');
    return true;
  };

  wizard.addEventListener('change', (event) => {
    const choice = event.target.closest('.choice');
    if (!choice) return;
    if (event.target.type === 'radio') {
      wizard.querySelectorAll(`input[name="${event.target.name}"]`).forEach((input) => {
        input.closest('.choice')?.classList.toggle('active', input.checked);
      });
    } else {
      choice.classList.toggle('active', event.target.checked);
    }
  });

  navSteps.forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.stepNav);
      if (target <= step || validateStep()) showStep(target);
    });
  });

  prev.addEventListener('click', () => showStep(step - 1));
  next.addEventListener('click', () => {
    if (validateStep()) showStep(step + 1);
  });

  wizard.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = getFormData();
    const lines = [
      '*Solicitação via Site TGDevs*',
      `*Nome:* ${data.name || 'Não informado'}`,
      data.company ? `*Empresa:* ${data.company}` : '',
      data.email ? `*E-mail:* ${data.email}` : '',
      data.whatsapp ? `*WhatsApp:* ${data.whatsapp}` : '',
      `*Produto:* ${data.product}`,
      `*Serviços:* ${data.services.join(', ')}`,
      data.message ? `*Mensagem:* ${data.message}` : ''
    ].filter(Boolean);

    window.open(`https://wa.me/5531999014013?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  });

  showStep(0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
