import React from 'react';
import { ArrowRight, Home, Play, RotateCcw } from 'lucide-react';
import { LEVELS } from '../game/levels';
import type { GamePhase, RunSnapshot } from '../game/types';

interface StatusModalProps {
  phase: Extract<GamePhase, 'paused' | 'victory' | 'gameover'>;
  snapshot: RunSnapshot | null;
  stageCode: string;
  stageName: string;
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  phase,
  snapshot,
  stageCode,
  stageName,
  onResume,
  onRestart,
  onNextStage,
  onReturnTitle,
}) => {
  const hasNextStage = snapshot ? snapshot.stageIndex < LEVELS.length - 1 : false;

  if (phase === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="w-full max-w-md rounded-2xl bg-stone-900 border-[3px] border-stone-950 shadow-[0_10px_0_#1e1b18] p-6 sm:p-7 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            Fase {stageCode} · {stageName}
          </p>
          <h2 id="pause-title" className="font-display font-extrabold text-3xl text-white mt-1">
            Jogo Pausado
          </h2>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-display font-extrabold text-lg border-2 border-stone-950 shadow-[0_4px_0_#1e1b18] cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-stone-950" aria-hidden="true" />
              <span>Continuar</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-display font-bold text-base border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reiniciar Fase</span>
            </button>

            <button
              type="button"
              onClick={onReturnTitle}
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-2.5 rounded-xl bg-stone-800/70 hover:bg-stone-700 text-stone-200 font-display font-bold text-base border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span>Tela Inicial</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVictory = phase === 'victory';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/65 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-title"
        className="w-full max-w-md rounded-2xl bg-stone-900 border-[3px] border-stone-950 shadow-[0_10px_0_#1e1b18] p-6 sm:p-7 text-center"
      >
        <p className={`text-xs font-bold uppercase tracking-widest ${isVictory ? 'text-emerald-300' : 'text-rose-300'}`}>
          Fase {snapshot?.stageCode ?? stageCode} · {snapshot?.stageName ?? stageName}
        </p>
        <h2
          id="outcome-title"
          className={`font-display font-extrabold text-3xl sm:text-4xl mt-1 ${
            isVictory ? 'text-amber-300' : 'text-rose-400'
          }`}
        >
          {isVictory ? (hasNextStage ? 'Fase Concluída!' : 'Reino Conquistado!') : 'Fim de Jogo'}
        </h2>

        {/* 3 Outcome Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-stone-800 border-2 border-stone-950 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Pontuação
            </div>
            <div className="font-display font-extrabold text-xl text-white tabular-nums mt-0.5">
              {(snapshot?.score ?? 0).toString()}
            </div>
          </div>

          <div className="rounded-xl bg-stone-800 border-2 border-stone-950 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {isVictory ? 'Moedas' : 'Progresso'}
            </div>
            <div className="font-display font-extrabold text-xl text-amber-300 tabular-nums mt-0.5">
              {isVictory ? snapshot?.coins ?? 0 : `${snapshot?.progressPct ?? 0}%`}
            </div>
          </div>

          <div className="rounded-xl bg-stone-800 border-2 border-stone-950 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {isVictory ? 'Tempo' : 'Recorde'}
            </div>
            <div className="font-display font-extrabold text-xl text-emerald-300 tabular-nums mt-0.5">
              {isVictory ? `${snapshot?.clearTime ?? 0}s` : snapshot?.bestScore ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {isVictory && hasNextStage ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextStage}
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-display font-extrabold text-lg border-2 border-stone-950 shadow-[0_4px_0_#1e1b18] cursor-pointer whitespace-nowrap"
            >
              <span>Próxima Fase</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-display font-extrabold text-lg border-2 border-stone-950 shadow-[0_4px_0_#1e1b18] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              <span>{isVictory ? 'Jogar Novamente' : 'Tentar Novamente'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnTitle}
            className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-display font-bold text-base border-2 border-stone-950 shadow-[0_3px_0_#1e1b18] cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Tela Inicial</span>
          </button>
        </div>
      </div>
    </div>
  );
};
