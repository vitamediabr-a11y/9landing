(() => {
  'use strict';

  const STORAGE_KEY = 'nove_society_lead_v1';
  // Cole aqui a URL /exec do Google Apps Script quando o webhook for publicado.
  const LEAD_WEBHOOK_URL = '';
  const ORIGIN = 'Landing Society NOVE — Campo Society';
  const QUIZ_KEYS = ['state','terrain','area','investment','objective','timing'];

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };

  const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

  const formatPhone = (value) => {
    const d = digitsOnly(value).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const hasIdentity = (state) => {
    const name = state?.lead?.name?.trim() || '';
    const phone = digitsOnly(state?.lead?.phone || '');
    return name.length >= 2 && phone.length >= 10;
  };

  const ensureLeadIdentity = (state) => {
    if (!state.leadId) {
      state.leadId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `nove-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    if (!state.capturedAt) state.capturedAt = new Date().toISOString();
    saveState(state);
    return state;
  };

  const pushEvent = (name, data = {}) => {
    const payload = { event: name, ...data };
    console.log('[NOVE tracking]', payload);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  };

  const syncLead = (status, extra = {}) => {
    if (!LEAD_WEBHOOK_URL) return;
    let state = readState();
    if (!hasIdentity(state)) return;
    state = ensureLeadIdentity(state);
    const answers = state.answers || {};
    const answeredCount = QUIZ_KEYS.filter(key => answers[key]).length;
    const payload = {
      leadId: state.leadId,
      capturedAt: state.capturedAt,
      updatedAt: new Date().toISOString(),
      name: state.lead?.name || '',
      phone: state.lead?.phone || '',
      consent: !!state.lead?.consent,
      state: answers.state || '',
      terrain: answers.terrain || '',
      area: answers.area || '',
      investment: answers.investment || '',
      objective: answers.objective || '',
      timing: answers.timing || '',
      city: state.lead?.city || '',
      score: state.score || '',
      status,
      lastStage: extra.lastStage || (answeredCount ? `Pergunta ${answeredCount} de 6` : 'Cadastro inicial'),
      whatsappClicked: !!extra.whatsappClicked,
      origin: ORIGIN
    };

    fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(error => console.warn('[NOVE lead sync]', error));
  };

  window.NoveLeadSync = { sync: syncLead, configured: Boolean(LEAD_WEBHOOK_URL) };

  const startBtn = document.getElementById('startQuizBtn');
  const quizSection = document.getElementById('analise');
  const preLeadForm = document.getElementById('preLeadForm');
  const preLeadName = document.getElementById('preLeadName');
  const preLeadPhone = document.getElementById('preLeadPhone');
  const preLeadConsent = document.getElementById('preLeadConsent');
  const preLeadNameError = document.querySelector('[data-prelead-error="name"]');
  const preLeadPhoneError = document.querySelector('[data-prelead-error="phone"]');
  const preLeadConsentError = document.querySelector('[data-prelead-error="consent"]');
  const quizStage = document.getElementById('quizStage');
  const options = document.getElementById('options');
  const finalLeadForm = document.getElementById('leadForm');
  const resultPanel = document.getElementById('resultPanel');
  const whatsappResult = document.getElementById('whatsappResultBtn');
  const floatingWhatsapp = document.getElementById('floatingWhatsapp');

  if (!startBtn || !quizSection || !preLeadForm) return;

  const showPreLead = () => {
    const state = readState();
    preLeadName.value = state?.lead?.name || '';
    preLeadPhone.value = formatPhone(state?.lead?.phone || '');
    preLeadConsent.checked = !!state?.lead?.consent;

    quizSection.hidden = false;
    if (quizStage) quizStage.hidden = true;
    if (finalLeadForm) finalLeadForm.hidden = true;
    if (resultPanel) resultPanel.hidden = true;
    preLeadForm.hidden = false;

    requestAnimationFrame(() => {
      quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => preLeadName.focus({ preventScroll: true }), 250);
    });
  };

  startBtn.addEventListener('click', (event) => {
    if (hasIdentity(readState())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pushEvent('lead_capture_opened');
    showPreLead();
  }, true);

  preLeadPhone.addEventListener('input', (event) => {
    event.target.value = formatPhone(event.target.value);
  });

  preLeadForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = preLeadName.value.trim();
    const phone = preLeadPhone.value.trim();
    const digits = digitsOnly(phone);
    const consent = preLeadConsent.checked;

    const nameError = name.length < 2 ? 'Informe seu nome.' : '';
    const phoneError = (digits.length < 10 || digits.length > 11) ? 'Informe um WhatsApp válido com DDD.' : '';
    const consentError = !consent ? 'Confirme que podemos entrar em contato sobre seu projeto.' : '';

    preLeadNameError.textContent = nameError;
    preLeadPhoneError.textContent = phoneError;
    preLeadConsentError.textContent = consentError;

    if (nameError || phoneError || consentError) return;

    let state = readState();
    state.step = Number.isInteger(state.step) ? Math.min(state.step, 5) : 0;
    state.answers = state.answers || {};
    state.lead = { ...(state.lead || {}), name, phone, consent };
    state.score = null;
    state.completed = false;
    state = ensureLeadIdentity(state);

    pushEvent('lead_captured_before_quiz', { phone_digits: digits.length });
    syncLead('captured', { lastStage: 'Cadastro inicial' });
    preLeadForm.hidden = true;

    startBtn.click();
  });

  if (options) {
    options.addEventListener('click', (event) => {
      if (!event.target.closest('.option-btn')) return;
      setTimeout(() => {
        const state = readState();
        const answeredCount = QUIZ_KEYS.filter(key => state?.answers?.[key]).length;
        if (answeredCount) syncLead('quiz_in_progress', { lastStage: `Pergunta ${answeredCount} de 6` });
      }, 220);
    });
  }

  if (finalLeadForm) {
    finalLeadForm.addEventListener('submit', () => {
      setTimeout(() => {
        const state = readState();
        if (state.completed) syncLead('completed', { lastStage: 'Quiz concluído' });
      }, 80);
    });
  }

  if (whatsappResult) {
    whatsappResult.addEventListener('click', () => syncLead('whatsapp_clicked', { lastStage: 'WhatsApp', whatsappClicked: true }));
  }

  if (floatingWhatsapp) {
    floatingWhatsapp.addEventListener('click', () => syncLead('whatsapp_clicked', { lastStage: 'WhatsApp flutuante', whatsappClicked: true }));
  }
})();
