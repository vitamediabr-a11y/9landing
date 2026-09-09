(() => {
  'use strict';

  const STORAGE_KEY = 'nove_society_lead_v1';
  const QUEUE_KEY = 'nove_society_lead_sync_queue_v1';
  const CAPTURE_VERSION = 2;
  const LEAD_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxQqkmt93WTgvuYQIEe3QPdzYxuk-eFj5GHfZ_XAYnugRJoafWBsCJge5QIv6Np8_wQ/exec';
  const ORIGIN = 'Landing Society NOVE — Campo Society';
  const QUIZ_KEYS = ['state','terrain','area','investment','objective','timing'];

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };

  const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

  const readQueue = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  const saveQueue = (queue) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  const formatPhone = (value) => {
    const d = digitsOnly(value).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const hasIdentity = (state) => {
    const name = state?.lead?.name?.trim() || '';
    const phone = digitsOnly(state?.lead?.phone || '');
    return name.length >= 2 && phone.length >= 10 && state?.lead?.captureVersion === CAPTURE_VERSION;
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

  const buildPayload = (status, extra = {}) => {
    let state = readState();
    if (!hasIdentity(state)) return null;
    state = ensureLeadIdentity(state);
    const answers = state.answers || {};
    const answeredCount = QUIZ_KEYS.filter(key => answers[key]).length;

    return {
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
  };

  // Mantém apenas o estado mais recente de cada lead. Se a internet cair na pergunta 2
  // e voltar na pergunta 5, a fila contém a pergunta 5, que já inclui todas as anteriores.
  const enqueuePayload = (payload) => {
    if (!payload?.leadId) return;
    const queue = readQueue().filter(item => item?.leadId !== payload.leadId);
    queue.push(payload);
    saveQueue(queue.slice(-20));
  };

  const postPayload = async (payload) => {
    if (!LEAD_WEBHOOK_URL) return false;
    try {
      await fetch(LEAD_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.warn('[NOVE lead sync]', error);
      return false;
    }
  };

  let flushing = false;
  const flushQueue = async () => {
    if (flushing || !LEAD_WEBHOOK_URL || !navigator.onLine) return false;
    flushing = true;
    try {
      const queue = readQueue();
      const pending = [];
      for (const payload of queue) {
        const sent = await postPayload(payload);
        if (!sent) pending.push(payload);
      }
      saveQueue(pending);
      return pending.length === 0;
    } finally {
      flushing = false;
    }
  };

  const syncLead = async (status, extra = {}) => {
    const payload = buildPayload(status, extra);
    if (!payload) return false;
    enqueuePayload(payload);
    if (!LEAD_WEBHOOK_URL) return false;
    return flushQueue();
  };

  window.NoveLeadSync = {
    sync: syncLead,
    flush: flushQueue,
    configured: Boolean(LEAD_WEBHOOK_URL)
  };

  window.addEventListener('online', () => { void flushQueue(); });
  if (LEAD_WEBHOOK_URL) setTimeout(() => { void flushQueue(); }, 300);

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

  const params = new URLSearchParams(window.location.search);
  let bypassCaptureOnce = params.get('quiz') === '1' && hasIdentity(readState());

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
    // O único clique que pode pular o cadastro é o clique automático executado
    // imediatamente após o próprio formulário de Nome + WhatsApp ser enviado.
    if (bypassCaptureOnce) {
      bypassCaptureOnce = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    pushEvent('lead_capture_opened');
    showPreLead();
  }, true);

  preLeadPhone.addEventListener('input', (event) => {
    event.target.value = formatPhone(event.target.value);
  });

  preLeadForm.addEventListener('submit', async (event) => {
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

    // Uma nova captura sempre inicia uma análise nova na Pergunta 1.
    state.step = 0;
    state.answers = {};
    state.lead = { name, phone, city: '', consent, captureVersion: CAPTURE_VERSION };
    state.score = null;
    state.completed = false;
    delete state.leadId;
    delete state.capturedAt;
    state = ensureLeadIdentity(state);

    pushEvent('lead_captured_before_quiz', { phone_digits: digits.length });

    // Primeiro cria/atualiza o lead; somente depois abre a Pergunta 1.
    // Se o endpoint estiver temporariamente indisponível, a fila local preserva o payload para retry.
    await Promise.race([
      syncLead('captured', { lastStage: 'Cadastro inicial' }),
      new Promise(resolve => setTimeout(resolve, 1400))
    ]);

    preLeadForm.hidden = true;

    // Recarrega a aplicação para impedir que um estado antigo em memória pule perguntas.
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('quiz', '1');
    nextUrl.hash = 'analise';
    window.location.replace(nextUrl.toString());
  });

  if (options) {
    options.addEventListener('click', (event) => {
      if (!event.target.closest('.option-btn')) return;
      // script.js grava a resposta no localStorage de forma síncrona antes deste evento chegar ao pai.
      setTimeout(() => {
        const state = readState();
        const answeredCount = QUIZ_KEYS.filter(key => state?.answers?.[key]).length;
        if (answeredCount) {
          void syncLead('quiz_in_progress', { lastStage: `Pergunta ${answeredCount} de 6` });
        }
      }, 80);
    });
  }

  if (finalLeadForm) {
    finalLeadForm.addEventListener('submit', () => {
      setTimeout(() => {
        const state = readState();
        if (state.completed) {
          void syncLead('completed', { lastStage: 'Quiz concluído' });
        } else if (state?.lead?.city) {
          void syncLead('quiz_in_progress', { lastStage: 'Cidade informada' });
        }
      }, 120);
    });
  }

  if (whatsappResult) {
    whatsappResult.addEventListener('click', () => {
      void syncLead('whatsapp_clicked', { lastStage: 'WhatsApp', whatsappClicked: true });
    });
  }

  if (floatingWhatsapp) {
    floatingWhatsapp.addEventListener('click', () => {
      void syncLead('whatsapp_clicked', { lastStage: 'WhatsApp flutuante', whatsappClicked: true });
    });
  }

  // Após a captura, abre automaticamente a Pergunta 1 somente depois que script.js já registrou seus eventos.
  if (bypassCaptureOnce) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('quiz');
    window.history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    setTimeout(() => startBtn.click(), 0);
  }
})();
