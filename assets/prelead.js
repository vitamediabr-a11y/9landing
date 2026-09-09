(() => {
  'use strict';

  const STORAGE_KEY = 'nove_society_lead_v1';

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

  const pushEvent = (name, data = {}) => {
    const payload = { event: name, ...data };
    console.log('[NOVE tracking]', payload);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  };

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
  const finalLeadForm = document.getElementById('leadForm');
  const resultPanel = document.getElementById('resultPanel');

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

    const state = readState();
    state.step = Number.isInteger(state.step) ? Math.min(state.step, 5) : 0;
    state.answers = state.answers || {};
    state.lead = { ...(state.lead || {}), name, phone, consent };
    state.score = null;
    state.completed = false;
    saveState(state);

    pushEvent('lead_captured_before_quiz', { phone_digits: digits.length });
    preLeadForm.hidden = true;

    startBtn.click();
  });
})();
