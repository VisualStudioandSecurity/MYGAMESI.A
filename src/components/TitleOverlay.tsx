import React from 'react';
import { Lock, Play } from 'lucide-react';
import { LEVELS } from '../game/levels';

interface TitleOverlayProps {
  selectedStage: number;
  highestUnlockedStage: number;
  bestScore: number;
  onSelectStage: (index: number) => void;
  onStart: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  selectedStage,
  highestUnlockedStage,
  bestScore,
  onSelectStage,
  onStart,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between px-4 py-5 sm:py-8 pointer-events-none">
      {/* Upper Calm Sky Zone: Bespoke SVG Emblem + Stage Selector + Start CTA */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-3.5 mt-1 sm:mt-2 pointer-events-auto">
        <svg
          viewBox="0 0 680 200"
          className="w-full max-w-[540px] h-auto drop-shadow-[0_8px_0_rgba(24,24,27,0.85)]"
          role="img"
          aria-label="Super Marco: Reino dos Blocos"
        >
          <defs>
            <linearGradient id="plaqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id="goldTextGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>

          {/* Diegetic Crimson-Gold Plaque */}
          <rect
            x="20"
            y="14"
            width="640"
            height="142"
            rx="18"
            fill="url(#plaqueGrad)"
            stroke="#1E1B18"
            strokeWidth="7"
          />
          <rect
            x="30"
            y="24"
            width="620"
            height="122"
            rx="12"
            fill="none"
            stroke="#FDBA74"
            strokeWidth="3"
            strokeOpacity="0.6"
          />

          {/* Corner Rivets */}
          <circle cx="44" cy="38" r="5" fill="#FDE047" stroke="#1E1B18" strokeWidth="2.5" />
          <circle cx="636" cy="38" r="5" fill="#FDE047" stroke="#1E1B18" strokeWidth="2.5" />
          <circle cx="44" cy="132" r="5" fill="#FDE047" stroke="#1E1B18" strokeWidth="2.5" />
          <circle cx="636" cy="132" r="5" fill="#FDE047" stroke="#1E1B18" strokeWidth="2.5" />

          {/* Bespoke Mushroom Crest Icon (well clear of title text) */}
          <g transform="translate(64, 44)">
            <path
              d="M 6 42 C 6 10, 62 10, 62 42 Z"
              fill="#FACC15"
              stroke="#1E1B18"
              strokeWidth="4.5"
            />
            <circle cx="22" cy="28" r="5.5" fill="#FFFFFF" stroke="#1E1B18" strokeWidth="2.2" />
            <circle cx="46" cy="28" r="5.5" fill="#FFFFFF" stroke="#1E1B18" strokeWidth="2.2" />
            <circle cx="34" cy="17" r="4.5" fill="#FFFFFF" stroke="#1E1B18" strokeWidth="2.2" />
            <rect
              x="19"
              y="42"
              width="30"
              height="22"
              rx="8"
              fill="#FEF3C7"
              stroke="#1E1B18"
              strokeWidth="4.5"
            />
            <rect x="28" y="48" width="3.5" height="7" rx="1.5" fill="#1E1B18" />
            <rect x="37" y="48" width="3.5" height="7" rx="1.5" fill="#1E1B18" />
          </g>

          {/* Main Display Title */}
          <text
            x="386"
            y="98"
            textAnchor="middle"
            fill="url(#goldTextGrad)"
            stroke="#1E1B18"
            strokeWidth="10"
            paintOrder="stroke fill"
            fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
            fontWeight="800"
            fontSize="60"
            letterSpacing="1"
          >
            SUPER MARCO
          </text>

          {/* Subtitle Ribbon */}
          <rect x="228" y="132" width="224" height="34" rx="8" fill="#1E1B18" />
          <text
            x="340"
            y="154"
            textAnchor="middle"
            fill="#FDE047"
            fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
            fontWeight="700"
            fontSize="16"
            letterSpacing="2.5"
          >
            REINO DOS BLOCOS
          </text>
        </svg>

        {bestScore > 0 && (
          <div className="text-sm font-display font-bold text-amber-200 hud-stroke-sm tabular-nums">
            Recorde: {bestScore.toString().padStart(6, '0')}
          </div>
        )}

        {/* Stage Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {LEVELS.map((lvl, idx) => {
            const locked = idx > highestUnlockedStage;
            const active = selectedStage === idx;
            return (
              <button
                key={lvl.id}
                type="button"
                disabled={locked}
                onClick={() => onSelectStage(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 font-display font-bold text-xs sm:text-sm transition-transform duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  locked
                    ? 'bg-stone-900/80 border-stone-700 text-stone-400 cursor-not-allowed'
                    : active
                      ? 'bg-amber-400 border-stone-950 text-stone-950 shadow-[0_3px_0_#1e1b18] -translate-y-0.5'
                      : 'bg-stone-900/85 border-stone-950 text-stone-100 hover:bg-stone-800 shadow-[0_3px_0_#1e1b18]'
                }`}
              >
                {locked && <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>
                  {lvl.code} · {lvl.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Start CTA positioned cleanly in sky above ground level */}
        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="inline-flex items-center gap-3 px-10 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-stone-950 font-display font-extrabold text-xl border-[3px] border-stone-950 shadow-[0_6px_0_#1e1b18] transition-transform duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        >
          <Play className="w-6 h-6 fill-stone-950" aria-hidden="true" />
          <span>Jogar</span>
        </button>
      </div>

      {/* Bottom Safe-Margin Single Flat Control Hint */}
      <div className="w-full text-center pointer-events-none pb-0.5">
        <p className="text-xs sm:text-sm font-semibold text-white hud-stroke-sm tracking-wide">
          A / D ou Setas Mover · Espaço / W Pular · Shift Correr · X Fogo · Esc Pausar
        </p>
      </div>
    </div>
  );
};
