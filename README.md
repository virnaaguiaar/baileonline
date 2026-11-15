# baileonline: site dos robôs do Baile 10D

Controle dos carrinhos por MQTT (manual, multi-robô, coreografias, músicas, LEDs, giroscópio
do celular) e a aba **GingAI**, que mostra o estilo que a festa está dançando e permite testar
os comandos `DN0EST`. Autoria das alterações: Victor Lustosa.

## O que mudou

- **Create React App saiu, Vite entrou.** O `react-scripts` foi descontinuado e não recebe
  mais correções. Com Vite o site abre em menos de um segundo e recarrega a cada arquivo salvo.
- React 18 para React 19, Tailwind 3 para Tailwind 4 (sem `tailwind.config.js`).
- Variáveis de ambiente agora começam com `VITE_` (antes `REACT_APP_`).
- `src/index.js` virou `src/main.jsx`, `src/App.js` virou `src/App.jsx` e o `index.html`
  saiu de `public/` para a raiz.
- Uma só conexão MQTT para o site inteiro (`src/hooks/useMQTT.js`).
- Aba GingAI (`src/components/ModoGingai.jsx`).

## Antes de rodar: imagens

As imagens não estão neste pacote. Copie do repositório antigo:

- a pasta `src/assets/` inteira (logos e setas);
- o `public/favicon.ico` (e o que mais houver em `public/`, menos o `index.html`).

## Rodar no computador

```bash
npm install
cp .env.example .env      # preencha usuário e senha do broker
npm run dev               # http://localhost:5173
npm run build             # gera a pasta dist/, igual à Vercel
```

## Publicar na Vercel

No projeto que já existe: **Settings > Build and Deployment**, Framework Preset **Vite**
(Build Command `npm run build`, Output Directory `dist`). Em **Environment Variables**, apague
as `REACT_APP_*` e cadastre as `VITE_*` do `.env.example`. Depois faça um novo deploy.

## Atenção

Tudo que começa com `VITE_` vai para o navegador: quem abrir o site consegue ler a senha do
broker. Use no EMQX um usuário só para o site, com permissão restrita aos tópicos
`cmd`, `cmd/#`, `robo/#` e `status`.
