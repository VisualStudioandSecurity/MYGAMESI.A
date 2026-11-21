import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Flame, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { PowerState } from '../game/types';

interface GameHudProps {
  score: number;
  coins: number;
  lives: number;
  power: PowerState;
  stageCode: string;
  timeRemaining: number;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTouchInput: (key: 'left' | 'right' | 'jump' | 'action', active: boolean) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  score,
  coins,
  lives,
  power,
  stageCode,
  timeRemaining,
  muted,
  onToggleMute,
  onPause,
  onRestart,
  onTouchInput,
}) => {
  const powerLabel = power === 'fire' ? 'Fogo' : power === 'big' ? 'Super' : 'Base';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Clusters (>= 85% viewport unobstructed) */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 w-full">
        {/* Top-Left Cluster: Score, Coins, Lives Pips & Power */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-7">
          {/* Score */}
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-200 hud-stroke-sm whitespace-nowrap">
              Pontos
            </span>
            <span
              data-testid="hud-score"
              className="font-display font-extrabold text-xl sm:text-3xl leading-none text-white hud-stroke tabular-nums whitespace-nowrap"
            >
              {Math.round(score).toString().padStart(6, '0')}
            </span>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_2px_0_#1e1b18] shrink-0" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="8" ry="10" fill="#FACC15" stroke="#1E1B18" strokeWidth="2.2" />
              <rect x="10.5" y="6.5" width="3" height="11" rx="1" fill="#FEF9C3" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-200 hud-stroke-sm whitespace-nowrap">
                Moedas
              </span>
              <span
                data-testid="hud-coins"
                className="font-display font-extrabold text-xl sm:text-3xl leading-none text-amber-300 hud-stroke tabular-nums whitespace-nowrap"
              >
                {coins.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Lives Pips */}
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-200 hud-stroke-sm whitespace-nowrap">
              Vidas · {powerLabel}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5" aria-label={`Vidas: ${lives}`}>
              {[0, 1, 2].map((idx) => {
                const filled = idx < lives;
                return (
                  <svg key={idx} viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_0_#1e1b18]" aria-hidden="true">
                    <path
                      d="M12 21s-7.5-4.7-9.5-9.1C1 8.5 3.1 4.5 6.8 4.5c2.1 0 3.9 1.1 5.2 2.9 1.3-1.8 3.1-2.9 5.2-2.9 3.7 0 5.8 4 4.3 7.4C19.5 16.3 12 21 12 21z"
                      fill={filled ? '#EF4444' : '#292524'}
                      stroke="#1E1B18"
                      strokeWidth="2.2"
                    />
                    {filled && (
                      <circle cx="8.2" cy="8.5" r="1.8" fill="#FECACA" />
                    )}
                  </svg>
                );
              })}
              {lives > 3 && (
                <span className="font-display font-extrabold text-base sm:text-lg text-emerald-300 hud-stroke-sm tabular-nums whitespace-nowrap">
                  +{lives - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Cluster: Stage, Timer, and Utility Controls */}
        <div className="flex items-start gap-2.5 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-200 hud-stroke-sm whitespace-nowrap">
                Fase
              </span>
              <span className="font-display font-extrabold text-xl sm:text-3xl leading-none text-white hud-stroke tabular-nums whitespace-nowrap">
                {stageCode}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-200 hud-stroke-sm whitespace-nowrap">
                Tempo
              </span>
              <span
                className={`font-display font-extrabold text-xl sm:text-3xl leading-none hud-stroke tabular-nums whitespace-nowrap ${
                  timeRemaining <= 40 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {Math.round(timeRemaining).toString().padStart(3, '0')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
              title="Áudio (M)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-stone-900/85 hover:bg-stone-800 border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] flex items-center justify-center text-amber-300 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Reiniciar fase"
              title="Reiniciar (R)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-stone-900/85 hover:bg-stone-800 border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] flex items-center justify-center text-sky-300 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pausar jogo"
              title="Pausar (Esc / P)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-stone-900/85 hover:bg-stone-800 border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] flex items-center justify-center text-white cursor-pointer"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Touch Controls for mobile / narrow viewports only */}
      <div className="flex md:hidden items-end justify-between w-full pointer-events-none pb-2">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Mover para esquerda"
            onPointerDown={() => onTouchInput('left', true)}
            onPointerUp={() => onTouchInput('left', false)}
            onPointerLeave={() => onTouchInput('left', false)}
            onPointerCancel={() => onTouchInput('left', false)}
            className="w-14 h-14 rounded-xl bg-stone-900/75 border-2 border-stone-950 text-white flex items-center justify-center active:bg-amber-400 active:text-stone-950"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Mover para direita"
            onPointerDown={() => onTouchInput('right', true)}
            onPointerUp={() => onTouchInput('right', false)}
            onPointerLeave={() => onTouchInput('right', false)}
            onPointerCancel={() => onTouchInput('right', false)}
            className="w-14 h-14 rounded-xl bg-stone-900/75 border-2 border-stone-950 text-white flex items-center justify-center active:bg-amber-400 active:text-stone-950"
          >
            <ArrowRight className="w-7 h-7" />
          </button>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {power === 'fire' && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Lançar fogo"
              onPointerDown={() => onTouchInput('action', true)}
              onPointerUp={() => onTouchInput('action', false)}
              onPointerLeave={() => onTouchInput('action', false)}
              onPointerCancel={() => onTouchInput('action', false)}
              className="w-14 h-14 rounded-xl bg-orange-600/85 border-2 border-stone-950 text-white flex items-center justify-center active:bg-orange-400"
            >
              <Flame className="w-7 h-7" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pular"
            onPointerDown={() => onTouchInput('jump', true)}
            onPointerUp={() => onTouchInput('jump', false)}
            onPointerLeave={() => onTouchInput('jump', false)}
            onPointerCancel={() => onTouchInput('jump', false)}
            className="w-16 h-16 rounded-xl bg-emerald-500/90 border-2 border-stone-950 text-stone-950 flex items-center justify-center active:bg-emerald-300"
          >
            <ArrowUp className="w-8 h-8 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
