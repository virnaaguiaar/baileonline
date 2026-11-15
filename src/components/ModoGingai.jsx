import React, { useEffect, useState } from 'react';
import RobotPicker   from './RobotPicker';
import RobotFloorMap from './RobotFloorMap';

// ─── Estilos conhecidos ──────────────────────────────────────────────────────
// Mesmos BPM do GingAI (packages/core/src/choreography.ts → STYLE_BPM).
// Estilo novo, cadastrado no GingAI, chega aqui com o BPM que o GingAI mandar.
const ESTILOS = [
  { slug: 'forro',  nome: 'Forró',  emoji: '🪗', bpm: 120 },
  { slug: 'samba',  nome: 'Samba',  emoji: '🥁', bpm: 110 },
  { slug: 'funk',   nome: 'Funk',   emoji: '🔊', bpm: 130 },
  { slug: 'reggae', nome: 'Reggae', emoji: '🌴', bpm: 76  },
];

// Endereço do GingAI publicado (defina no .env: VITE_GINGAI_URL=https://...)
const GINGAI_URL = (import.meta.env.VITE_GINGAI_URL || '').replace(/\/$/, '');

function infoEstilo(slug) {
  return ESTILOS.find((e) => e.slug === slug)
    || { slug, nome: slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '—', emoji: '🎶' };
}

/** "agora", "há 12 s", "há 3 min" */
function haQuantoTempo(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return 'agora';
  if (s < 60) return `há ${s} s`;
  return `há ${Math.floor(s / 60)} min`;
}

/**
 * Aba "GingAI": mostra o estilo que o GingAI mandou os robôs dançarem,
 * permite testar a dança sincronizada à mão e abre o telão do GingAI.
 * Recebe a conexão MQTT do App (não abre outra).
 */
export default function ModoGingai({
  robotsPose = {},
  id_robo = 'Todos',
  onRobotIdChange = () => {},
  isConnected = false,
  estiloGingai = null,
  enviarEstilo = () => {},
}) {
  const [codigoFesta, setCodigoFesta] = useState('');
  const [, forcarRelogio] = useState(0);

  // Atualiza o "há X s" a cada segundo
  useEffect(() => {
    const id = setInterval(() => forcarRelogio((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const topico = id_robo === 'Todos' ? 'cmd' : `cmd/${id_robo}`;
  const atual = estiloGingai ? infoEstilo(estiloGingai.style) : null;
  const codigoLimpo = codigoFesta.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const linkTelao = GINGAI_URL && codigoLimpo ? `${GINGAI_URL}/e/${codigoLimpo}/robos` : '';

  return (
    <div className="flex flex-col items-center w-full max-w-[1100px] mx-auto gap-6 py-4">

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="w-full bg-white/95 border border-[#f62681]/20 rounded-3xl shadow-xl shadow-[#f62681]/10 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-[0.14em] text-[#f62681]/70">INTEGRAÇÃO</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#9d174d]">Modo GingAI</h1>
            <p className="text-sm text-gray-500 mt-1">
              Os robôs dançam o ritmo que a festa está dançando no GingAI.
            </p>
          </div>
          <span className={`px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 ${
            isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
            {isConnected ? 'MQTT conectado' : 'Sem conexão'}
          </span>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Coluna esquerda ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* O que o GingAI mandou */}
          <section className="bg-white/95 border border-[#f62681]/20 rounded-2xl shadow-lg p-6 text-center">
            <h2 className="text-base font-black text-[#9d174d] mb-3">Agora os robôs dançam</h2>
            {atual ? (
              <>
                <div className="text-6xl mb-2">{atual.emoji}</div>
                <div className="text-3xl font-black text-[#f62681]">{atual.nome}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {estiloGingai.bpm} BPM · recebido {haQuantoTempo(estiloGingai.recebidoEm)}
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-2">🤖</div>
                <div className="text-lg font-bold text-gray-500">Nenhuma dança no momento</div>
                <div className="text-xs text-gray-400 mt-1">
                  Quando o telão do GingAI mandar um ritmo, ele aparece aqui.
                </div>
              </>
            )}
          </section>

          {/* Teste manual */}
          <section className="bg-white/95 border border-[#f62681]/20 rounded-2xl shadow-lg p-5">
            <h2 className="text-base font-black text-[#9d174d] mb-1">Testar sem o GingAI</h2>
            <p className="text-xs text-gray-500 mb-3">
              Envia o mesmo comando que o GingAI envia (DN0EST). Útil para ensaiar.
            </p>

            <RobotPicker id_robo={id_robo} onRobotIdChange={onRobotIdChange} robotsPose={robotsPose} />
            <div className="mt-1 mb-3 text-center text-xs text-gray-400 font-mono">
              Tópico: <span className="text-[#f62681]">{topico}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ESTILOS.map((e) => (
                <button
                  key={e.slug}
                  onClick={() => enviarEstilo(e.slug, e.bpm, topico)}
                  disabled={!isConnected}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-[#f62681] hover:bg-[#e8197a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-lg">{e.emoji}</span> {e.nome}
                  <span className="text-[10px] opacity-80">{e.bpm}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => enviarEstilo(null, 0, topico)}
              disabled={!isConnected}
              className="mt-2 w-full py-3 rounded-xl font-black text-white text-sm bg-[#9d174d] hover:bg-[#be185d] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⏹ Parar a dança
            </button>
            <p className="mt-2 text-[10px] text-gray-400 text-center">
              Só os robôs com o firmware novo (comando DN0EST) respondem a estes botões.
              O painel acima só mostra comandos enviados para “Todos”.
            </p>
          </section>
        </div>

        {/* ── Coluna direita ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Abrir o telão do GingAI */}
          <section className="bg-white/95 border border-[#f62681]/20 rounded-2xl shadow-lg p-5">
            <h2 className="text-base font-black text-[#9d174d] mb-1">Abrir a festa no GingAI</h2>
            <p className="text-xs text-gray-500 mb-3">
              Digite o código da festa. O telão de robôs do GingAI decide o ritmo
              e comanda os robôs (marque lá “Comandar os robôs reais”).
            </p>
            <div className="flex gap-2">
              <input
                value={codigoFesta}
                onChange={(e) => setCodigoFesta(e.target.value)}
                placeholder="Código (ex.: K7MP2Q)"
                className="input-modern flex-1 min-w-0 font-mono uppercase tracking-widest"
              />
              <a
                href={linkTelao || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!linkTelao}
                className={`px-4 py-2 rounded-xl font-bold text-sm text-white flex items-center ${
                  linkTelao ? 'bg-[#11813a] hover:opacity-90' : 'bg-gray-300 pointer-events-none'
                }`}
              >
                Abrir
              </a>
            </div>
            {!GINGAI_URL && (
              <p className="mt-2 text-[11px] text-rose-500">
                Falta definir VITE_GINGAI_URL no arquivo .env do site.
              </p>
            )}
          </section>

          <RobotFloorMap
            robotsPose={robotsPose}
            mqttOnline={isConnected}
            selectedRobotId={id_robo}
            title="Robôs na pista"
          />
        </div>
      </div>
    </div>
  );
}
