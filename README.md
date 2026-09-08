# NOVE — Landing Page de Investimento em Campos Society

Landing page estática, mobile-first, criada para o funil:

**VSL → Quiz de qualificação → Identificação → Resultado → WhatsApp**

Não há backend nem dependências de framework. O projeto usa HTML, CSS e JavaScript puro.

## Estrutura

- `index.html` — página principal
- `assets/styles.css` — identidade visual e responsividade
- `assets/script.js` — quiz, score, localStorage, tracking e WhatsApp
- `assets/vsl.mp4` — vídeo da VSL
- `assets/vsl-poster.webp` — capa leve do vídeo
- `assets/favicon.svg` — favicon

## Trocar o vídeo da VSL

Substitua `assets/vsl.mp4` mantendo o mesmo nome, ou altere o caminho no `<source>` do vídeo dentro de `index.html`.

O vídeo está configurado com `preload="metadata"` e não inicia automaticamente para reduzir consumo de dados em mobile.

Existe um listener de `ended` preparado em `assets/script.js`. No MVP ele **não bloqueia** o quiz, mas pode ser usado depois para liberar o CTA somente após a conclusão da VSL.

## Alterar faixas de investimento

Abra `assets/script.js` e edite somente:

```js
CONFIG.investmentRanges
```

Há um comentário `ALTERE AQUI` no código. As faixas não estão duplicadas no HTML.

## Alterar pesos do lead score

Abra `assets/script.js` e edite:

```js
CONFIG.scoreWeights
CONFIG.thresholds
```

A função principal é:

```js
calculateLeadScore()
```

Ela retorna internamente `hot`, `warm` ou `cold`. Essa classificação não é exibida nem enviada na mensagem do WhatsApp.

## Trocar o WhatsApp

Edite em `assets/script.js`:

```js
CONFIG.whatsappNumber
```

Use o número completo com DDI + DDD, apenas números.

O botão flutuante possui também um link direto no `index.html`. Ao alterar o número, atualize esse `href` para manter os dois pontos consistentes.

## GTM / Meta Pixel

A função:

```js
trackEvent(name, data)
```

já dispara para `window.dataLayer` quando ele existe e sempre registra em `console.log` no MVP.

Eventos preparados:

- `vsl_started`
- `quiz_started`
- `quiz_question_1` a `quiz_question_6`
- `lead_form_completed`
- `lead_hot`
- `lead_warm`
- `lead_cold`
- `whatsapp_clicked`

Para instalar GTM, adicione o snippet oficial do container no `<head>` e o fallback recomendado no `<body>` do `index.html`.

Para Meta Pixel, adicione o script oficial com o Pixel ID fornecido pela NOVE. Não há nenhum ID fictício no projeto.

## Persistência

O progresso é salvo em `localStorage` pela chave:

```text
nove_society_lead_v1
```

Atualizar a página não apaga as respostas. Após gerar o resultado ou clicar no WhatsApp, os dados permanecem salvos. O usuário pode reiniciar a simulação pela interface.

## Publicação

### Vercel

O projeto é estático e pode ser publicado diretamente conectando este repositório a um projeto Vercel. O diretório raiz é o próprio repositório e não há comando de build.

### GitHub Pages

Também é compatível com GitHub Pages: publique a branch `main` a partir da raiz (`/`). Como todos os assets usam caminhos relativos, a landing funciona mesmo sob o caminho do repositório.

## Pontos de validação do MVP

- 6 perguntas, uma por tela
- voltar entre perguntas
- avanço automático após seleção
- progresso salvo em `localStorage`
- validação de nome, cidade e WhatsApp
- score silencioso hot/warm/cold
- tratamento de “Outro estado” sem bloqueio
- mensagem de WhatsApp criada com respostas reais e URL encoded
- tracking preparado para dataLayer/GTM/Meta Pixel
- CTA flutuante pequeno
- experiência mobile-first
