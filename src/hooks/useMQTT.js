import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import mqtt from 'mqtt';

// ─── Uma conexão MQTT para o site inteiro ────────────────────────────────────
// Antes cada componente que chamava useMQTT() abria a própria conexão: com a aba
// Manual aberta eram quatro (App, controle, músicas, coreografia). Agora o cliente
// fica neste módulo e todos os componentes compartilham o mesmo.
//
// Endereço, usuário e senha vêm do .env (localmente) ou das Environment Variables
// da Vercel. Atenção: num site React tudo que começa com VITE_ vai para o
// navegador, então quem abrir o site consegue ver essa senha. Use no broker um
// usuário só para o site, com permissão apenas nos tópicos cmd/#, robo/# e status.
const BROKER = import.meta.env.VITE_MQTT_BROKER;
const USUARIO = import.meta.env.VITE_MQTT_USERNAME;
const SENHA = import.meta.env.VITE_MQTT_PASSWORD;

let client = null;
let estado = {
  isConnected: false,
  status: null,
  robotsPose: {},
  estiloGingai: null,   // último DN0EST visto no tópico cmd; null = sem dança
};
const ouvintes = new Set();

function publicarEstado(parcial) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((f) => f());
}

// As poses chegam a 10 Hz por robô. Junta tudo e atualiza a tela no máximo 10x/s.
let posesPendentes = {};
let timerPoses = null;
function agendarPoses() {
  if (timerPoses) return;
  timerPoses = setTimeout(() => {
    timerPoses = null;
    publicarEstado({ robotsPose: { ...estado.robotsPose, ...posesPendentes } });
    posesPendentes = {};
  }, 100);
}

function tratarMensagem(topic, payload) {
  const msg = payload.toString();
  if (topic === 'status') {
    publicarEstado({ status: msg });
  } else if (topic.startsWith('robo/pose/')) {
    const id = topic.split('/')[2];
    try {
      posesPendentes[id] = { ...JSON.parse(msg), lastUpdate: Date.now() };
      agendarPoses();
    } catch {
      // pose mal formada: ignora
    }
  } else if (topic === 'cmd') {
    // Formato: DN0EST<estilo>,<bpm>,<t0>  ou  DN0EST-
    if (msg.startsWith('DN0EST')) {
      const resto = msg.slice(6);
      if (resto === '-') {
        publicarEstado({ estiloGingai: null });
      } else {
        const [style, bpm, t0] = resto.split(',');
        publicarEstado({
          estiloGingai: { style, bpm: Number(bpm) || 0, t0: Number(t0) || 0, recebidoEm: Date.now() },
        });
      }
    } else if (msg === 'DN0CPA' || msg === 'DN0192') {
      publicarEstado({ estiloGingai: null });
    }
  }
}

function conectar() {
  if (client) return;
  if (!BROKER) {
    console.error('Falta VITE_MQTT_BROKER no .env (ou nas variáveis da Vercel).');
    return;
  }
  client = mqtt.connect(BROKER, {
    protocolVersion: 4,
    clientId: `web_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 6)}`,
    keepalive: 30,
    reconnectPeriod: 6000,
    connectTimeout: 15000,
    clean: true,
    username: USUARIO,
    password: SENHA,
  });
  client.on('connect', () => {
    publicarEstado({ isConnected: true });
    client.subscribe(['cmd', 'status', 'robo/pose/+', 'robo/status']);
  });
  client.on('message', tratarMensagem);
  const desligado = () => publicarEstado({ isConnected: false });
  client.on('offline', desligado);
  client.on('close', desligado);
  client.on('error', (err) => {
    console.error('MQTT:', err.message || err);
    desligado();
  });
}

function assinar(f) {
  ouvintes.add(f);
  conectar();
  return () => ouvintes.delete(f);
}
const lerEstado = () => estado;

function _buildMoveCmd(x, y) {
  const dirX = x >= 0 ? '+' : '-';
  const dirY = y >= 0 ? '+' : '-';
  return `DN0X${dirX}${Math.min(Math.abs(x), 9)}Y${dirY}${Math.min(Math.abs(y), 9)}`;
}

/**
 * Mesmo uso de antes: const { sendCommand, isConnected, ... } = useMQTT();
 * O primeiro parâmetro (endereço do broker) é aceito por compatibilidade, mas o
 * endereço vale para o site todo e vem do .env.
 * watchedRobotId: se informado, isRobotConnected só fica verde com a pose desse robô.
 */
export function useMQTT(_brokerUrl, watchedRobotId = null) {
  const { isConnected, status, robotsPose, estiloGingai } = useSyncExternalStore(assinar, lerEstado);

  // Robô "vivo" = pose recebida nos últimos 3 s
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const vivos = Object.entries(robotsPose).filter(([, p]) => agora - (p.lastUpdate || 0) < 3000);
  const isRobotConnected = watchedRobotId
    ? vivos.some(([id]) => id === watchedRobotId)
    : vivos.length > 0;

  const sendCommand = useCallback((comando, topico = 'cmd') => {
    if (!client?.connected) {
      console.warn('MQTT desconectado. Comando ignorado:', comando);
      return false;
    }
    client.publish(topico, comando, { qos: 0, retain: false });
    return true;
  }, []);

  const topicoDe = (id) => (!id || id === 'Todos' ? 'cmd' : `cmd/${id}`);

  const mover = useCallback((x, y) => sendCommand(_buildMoveCmd(x, y)), [sendCommand]);
  const parar = useCallback(() => sendCommand('DN0CPA'), [sendCommand]);
  const moverRobo = useCallback((id, x, y) => sendCommand(_buildMoveCmd(x, y), topicoDe(id)), [sendCommand]);
  const pararRobo = useCallback((id) => sendCommand('DN0CPA', topicoDe(id)), [sendCommand]);
  const ligarLed = useCallback((n) => { if (n >= 0 && n <= 7) sendCommand(`DN0CL${n}`); }, [sendCommand]);
  const desligarLed = useCallback((n) => { if (n >= 0 && n <= 7) sendCommand(`DN0CD${n}`); }, [sendCommand]);
  const iniciarCoreografia = useCallback(() => sendCommand('DN0CG'), [sendCommand]);
  const pararCoreografia = useCallback(() => sendCommand('DN0CPA'), [sendCommand]);
  const mp3TocarMusica = useCallback((id) => sendCommand(`DN0CM${id}`), [sendCommand]);
  const mp3PararMusica = useCallback(() => sendCommand('DN0CPS'), [sendCommand]);
  const setRobotId = useCallback((id) => sendCommand(`DN0ID${id}`), [sendCommand]);
  const resetOdometry = useCallback(() => sendCommand('DN0RSTODO'), [sendCommand]);

  // Dança por estilo, o mesmo comando que o GingAI envia. Começa 1,5 s no futuro
  // para todos os carrinhos iniciarem juntos (eles acertam o relógio por NTP).
  const enviarEstilo = useCallback((style, bpm, topico = 'cmd') => {
    if (!style) return sendCommand('DN0EST-', topico);
    return sendCommand(`DN0EST${style},${bpm},${Date.now() + 1500}`, topico);
  }, [sendCommand]);

  return {
    isConnected, status, robotsPose, isRobotConnected, estiloGingai,
    mover, parar, moverRobo, pararRobo, ligarLed, desligarLed,
    iniciarCoreografia, pararCoreografia, mp3TocarMusica, mp3PararMusica,
    setRobotId, resetOdometry, sendCommand, enviarEstilo,
  };
}

export default useMQTT;
