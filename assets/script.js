(() => {
  'use strict';

  const CONFIG = {
    whatsappNumber: '5591993333032',
    storageKey: 'nove_society_lead_v1',
    // ALTERE AQUI as faixas de investimento da campanha.
    investmentRanges: [
      'Até R$ 100 mil',
      'De R$ 100 mil a R$ 200 mil',
      'De R$ 200 mil a R$ 300 mil',
      'Acima de R$ 300 mil',
      'Ainda estou definindo o investimento'
    ],
    scoreWeights: {
      state: { 'Pará': 3, 'Maranhão': 3, 'Tocantins': 3, 'Outro estado': 0 },
      terrain: { 'Já possuo o terreno': 4, 'Estou negociando um terreno': 2, 'Ainda estou procurando um terreno': 0, 'Já possuo uma estrutura esportiva e quero ampliar': 4 },
      area: { 'Até 800 m²': 1, 'De 800 a 1.200 m²': 2, 'De 1.200 a 2.000 m²': 4, 'Mais de 2.000 m²': 5, 'Ainda não sei': 0 },
      investment: { 'Até R$ 100 mil': 1, 'De R$ 100 mil a R$ 200 mil': 3, 'De R$ 200 mil a R$ 300 mil': 4, 'Acima de R$ 300 mil': 5, 'Ainda estou definindo o investimento': 0 },
      objective: { 'Criar uma arena para locação de horários': 4, 'Investir em um novo negócio': 4, 'Ampliar um complexo esportivo existente': 4, 'Campo para condomínio, escola ou empresa': 2, 'Outro objetivo': 1 },
      timing: { 'O mais rápido possível': 5, 'Nos próximos 3 meses': 4, 'De 3 a 6 meses': 2, 'Mais de 6 meses': 1, 'Ainda estou estudando o projeto': 0 }
    },
    thresholds: { hot: 18, warm: 10 }
  };

  const QUESTIONS = [
    { key:'state', title:'Onde você pretende instalar seu campo society?', options:['Pará','Maranhão','Tocantins','Outro estado'] },
    { key:'terrain', title:'Qual é a situação do terreno?', options:['Já possuo o terreno','Estou negociando um terreno','Ainda estou procurando um terreno','Já possuo uma estrutura esportiva e quero ampliar'] },
    { key:'area', title:'Qual é o tamanho aproximado da área disponível?', options:['Até 800 m²','De 800 a 1.200 m²','De 1.200 a 2.000 m²','Mais de 2.000 m²','Ainda não sei'] },
    { key:'investment', title:'Quanto você pretende disponibilizar para o investimento?', options:CONFIG.investmentRanges },
    { key:'objective', title:'Qual é o principal objetivo do projeto?', options:['Criar uma arena para locação de horários','Investir em um novo negócio','Ampliar um complexo esportivo existente','Campo para condomínio, escola ou empresa','Outro objetivo'] },
    { key:'timing', title:'Quando você pretende iniciar?', options:['O mais rápido possível','Nos próximos 3 meses','De 3 a 6 meses','Mais de 6 meses','Ainda estou estudando o projeto'] }
  ];

  const DEFAULT_STATE = { step:0, answers:{}, lead:{ name:'', city:'', phone:'', consent:false }, score:null, completed:false };
  let state = loadState();

  const $ = (id) => document.getElementById(id);
  const els = {
    quizSection:$('analise'), stage:$('quizStage'), questionTitle:$('quiz-title'), options:$('options'), counter:$('questionCounter'), percent:$('progressPercent'), bar:$('progressBar'), back:$('backBtn'),
    leadForm:$('leadForm'), leadName:$('leadName'), leadCity:$('leadCity'), leadPhone:$('leadPhone'), leadConsent:$('leadConsent'), result:$('resultPanel'), resultTitle:$('resultTitle'), resultText:$('resultText'), otherState:$('otherStateNote'), whatsapp:$('whatsappResultBtn'), floating:$('floatingWhatsapp'), vslStatus:$('vslStatus'), vslVideo:$('vslVideo'), videoPlay:$('videoPlayBtn'), videoProgress:$('videoProgress'), videoTime:$('videoTime'), videoShell:$('videoShell')
  };

  function loadState(){
    try { return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}') }; }
    catch { return structuredClone(DEFAULT_STATE); }
  }
  function saveState(){ localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); }
  function trackEvent(name, data={}){
    const payload = { event:name, ...data };
    console.log('[NOVE tracking]', payload);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  }
  window.trackEvent = trackEvent;

  function calculateLeadScore(){
    const w = CONFIG.scoreWeights;
    const a = state.answers;
    const total = ['state','terrain','area','investment','objective','timing'].reduce((sum,key) => sum + (w[key]?.[a[key]] || 0), 0);
    if (total >= CONFIG.thresholds.hot) return 'hot';
    if (total >= CONFIG.thresholds.warm) return 'warm';
    return 'cold';
  }
  window.calculateLeadScore = calculateLeadScore;

  function renderQuestion(){
    const q = QUESTIONS[state.step];
    const pct = Math.round(((state.step + 1) / QUESTIONS.length) * 100);
    els.counter.textContent = `Pergunta ${state.step + 1} de ${QUESTIONS.length}`;
    els.percent.textContent = `${pct}%`;
    els.bar.style.width = `${pct}%`;
    els.questionTitle.textContent = q.title;
    els.options.innerHTML = '';
    q.options.forEach(option => {
      const btn = document.createElement('button');
      btn.type='button'; btn.className='option-btn' + (state.answers[q.key] === option ? ' selected' : ''); btn.textContent=option;
      btn.addEventListener('click', () => chooseOption(q.key, option));
      els.options.appendChild(btn);
    });
    els.back.hidden = state.step === 0;
    els.stage.hidden = false; els.leadForm.hidden = true; els.result.hidden = true;
  }

  function chooseOption(key, option){
    state.answers[key] = option;
    saveState();
    trackEvent(`quiz_question_${state.step + 1}`, { question:key, answer:option });
    els.options.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('selected', b.textContent === option));
    setTimeout(() => {
      if (state.step < QUESTIONS.length - 1) { state.step += 1; saveState(); renderQuestion(); }
      else showLeadForm();
    }, 140);
  }

  function showLeadForm(){
    state.step = QUESTIONS.length; saveState();
    els.stage.hidden = true; els.result.hidden = true; els.leadForm.hidden = false;
    els.leadName.value = state.lead.name || '';
    els.leadCity.value = state.lead.city || '';
    els.leadPhone.value = state.lead.phone || '';
    els.leadConsent.checked = !!state.lead.consent;
    setTimeout(() => els.leadName.focus({preventScroll:true}), 100);
  }

  function validateLead(){
    const data = { name:els.leadName.value.trim(), city:els.leadCity.value.trim(), phone:els.leadPhone.value.trim(), consent:els.leadConsent.checked };
    const digits = data.phone.replace(/\D/g,'');
    const errors = { name:data.name.length < 2 ? 'Informe seu nome.' : '', city:data.city.length < 2 ? 'Informe sua cidade.' : '', phone:(digits.length < 10 || digits.length > 13) ? 'Informe um WhatsApp válido com DDD.' : '' };
    document.querySelectorAll('.field-error').forEach(el => el.textContent = errors[el.dataset.errorFor] || '');
    if (Object.values(errors).some(Boolean)) return null;
    return data;
  }

  function formatPhone(value){
    const d = value.replace(/\D/g,'').slice(0,11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  }

  function buildWhatsappUrl(){
    const a=state.answers, l=state.lead;
    const message = `Oi, pessoal da NOVE! Tudo bem? 👋\n\nMeu nome é ${l.name} e acabei de fazer a análise do meu projeto pelo site.\n\n📍 ${l.city} / ${a.state}\n🏟️ Terreno: ${a.terrain}\n📐 Área: ${a.area}\n💰 Investimento: ${a.investment}\n🎯 Objetivo: ${a.objective}\n🗓️ Prazo: ${a.timing}\n\nQueria conversar com vocês sobre esse projeto e entender como podemos avançar.`;
    return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function showResult(){
    state.score = calculateLeadScore(); state.completed = true; saveState();
    const copy = {
      hot:['Seu projeto tem um perfil muito interessante para uma análise da NOVE.','Pelas informações que você forneceu, já existem elementos suficientes para nossa equipe avaliar terreno, implantação e próximos passos.'],
      warm:['Seu projeto já tem informações importantes para avançarmos.','Nossa equipe pode ajudar você a entender melhor terreno, estrutura necessária e próximos passos para amadurecer o investimento.'],
      cold:['Você já deu o primeiro passo para estruturar seu projeto.','Mesmo que alguns pontos ainda estejam em definição, podemos orientar quais informações serão importantes antes de avançar.']
    }[state.score];
    els.resultTitle.textContent=copy[0]; els.resultText.textContent=copy[1];
    els.otherState.hidden = state.answers.state !== 'Outro estado';
    els.whatsapp.href = buildWhatsappUrl();
    els.stage.hidden = true; els.leadForm.hidden = true; els.result.hidden = false;
    trackEvent(`lead_${state.score}`, { region:state.answers.state });
  }

  function openQuiz(){
    els.quizSection.hidden = false;
    document.body.classList.add('quiz-open');
    trackEvent('quiz_started');
    if (state.completed && state.score) showResult();
    else if (state.step >= QUESTIONS.length) showLeadForm();
    else renderQuestion();
    setTimeout(() => els.quizSection.scrollIntoView({behavior:'smooth',block:'start'}), 30);
  }

  function restart(){
    state = structuredClone(DEFAULT_STATE); saveState();
    els.quizSection.hidden = false; renderQuestion();
    els.quizSection.scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('startQuizBtn').addEventListener('click', openQuiz);
  els.back.addEventListener('click', () => { if (state.step>0){ state.step--; saveState(); renderQuestion(); } });
  $('backFromFormBtn').addEventListener('click', () => { state.step=QUESTIONS.length-1; saveState(); renderQuestion(); });
  $('restartBtn').addEventListener('click', restart);
  $('restartTopBtn').addEventListener('click', restart);
  els.leadPhone.addEventListener('input', e => { e.target.value = formatPhone(e.target.value); });
  els.leadForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = validateLead(); if (!data) return;
    state.lead = data; saveState();
    trackEvent('lead_form_completed', { state:state.answers.state, consent:data.consent });
    showResult();
  });
  els.whatsapp.addEventListener('click', () => trackEvent('whatsapp_clicked', { source:'result', lead_score:state.score }));
  els.floating.addEventListener('click', () => trackEvent('whatsapp_clicked', { source:'floating' }));
  if (els.vslVideo) {
    let startedTracked = false;
    const formatVideoTime = seconds => {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    };
    const updateVideoUI = () => {
      const duration = els.vslVideo.duration || 0;
      const current = els.vslVideo.currentTime || 0;
      const ratio = duration ? current / duration : 0;
      if (els.videoProgress) {
        els.videoProgress.value = Math.round(ratio * 1000);
        els.videoProgress.style.setProperty('--video-progress', `${ratio * 100}%`);
      }
      if (els.videoTime) els.videoTime.textContent = `${formatVideoTime(current)} / ${formatVideoTime(duration)}`;
    };
    const toggleVideo = () => {
      if (els.vslVideo.paused || els.vslVideo.ended) els.vslVideo.play();
      else els.vslVideo.pause();
    };
    if (els.videoPlay) els.videoPlay.addEventListener('click', toggleVideo);
    els.vslVideo.addEventListener('click', toggleVideo);
    if (els.videoProgress) {
      els.videoProgress.addEventListener('input', e => {
        const duration = els.vslVideo.duration || 0;
        if (duration) els.vslVideo.currentTime = (Number(e.target.value) / 1000) * duration;
        updateVideoUI();
      });
    }
    els.vslVideo.addEventListener('loadedmetadata', updateVideoUI);
    els.vslVideo.addEventListener('durationchange', updateVideoUI);
    els.vslVideo.addEventListener('timeupdate', updateVideoUI);
    els.vslVideo.addEventListener('play', () => {
      if (els.videoPlay) els.videoPlay.hidden = true;
      if (!startedTracked) {
        startedTracked = true;
        trackEvent('vsl_started');
        if (els.vslStatus) els.vslStatus.textContent = 'Vídeo iniciado.';
      }
    });
    els.vslVideo.addEventListener('pause', () => {
      if (!els.vslVideo.ended && els.videoPlay) {
        els.videoPlay.hidden = false;
        els.videoPlay.setAttribute('aria-label', 'Continuar vídeo');
      }
      updateVideoUI();
    });
    els.vslVideo.addEventListener('ended', () => {
      if (els.videoPlay) {
        els.videoPlay.hidden = false;
        els.videoPlay.setAttribute('aria-label', 'Reproduzir vídeo novamente');
      }
      updateVideoUI();
      if (els.vslStatus) els.vslStatus.textContent = 'Vídeo concluído. Você pode iniciar a análise do projeto.';
    });
    updateVideoUI();
  }

  if (state.step>0 || state.completed) {
    // Mantém o progresso salvo, mas não força a abertura do quiz ao carregar.
    $('startQuizBtn').querySelector('span').textContent = state.completed ? 'Ver minha análise' : 'Continuar minha análise';
  }
})();
