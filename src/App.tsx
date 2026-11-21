import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { audioEngine } from './game/audio';
import { LEVELS } from './game/levels';
import { buildRunSnapshot, createWorld, stepWorld, VIRTUAL_HEIGHT } from './game/physics';
import { renderWorld } from './game/renderer';
import type { GamePhase, InputState, PowerState, RunSnapshot, WorldState } from './game/types';

const STORAGE_BEST_KEY = 'super_marco_best_score_v1';
const STORAGE_STAGE_KEY = 'super_marco_highest_stage_v1';

function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_BEST_KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(STORAGE_BEST_KEY, String(Math.round(score)));
  } catch {
    // Ignore storage quota errors
  }
}

function loadHighestStage(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_STAGE_KEY);
    return raw ? Math.max(0, Math.min(LEVELS.length - 1, parseInt(raw, 10) || 0)) : 0;
  } catch {
    return 0;
  }
}

function saveHighestStage(stageIdx: number): void {
  try {
    window.localStorage.setItem(STORAGE_STAGE_KEY, String(stageIdx));
  } catch {
    // Ignore storage quota errors
  }
}

function syncBodyDatasetState(phase: GamePhase): void {
  if (typeof document === 'undefined') return;
  if (phase === 'victory' || phase === 'gameover') {
    document.body.dataset.state = 'gameover';
  } else {
    document.body.dataset.state = phase;
  }
}

interface HudState {
  score: number;
  coins: number;
  lives: number;
  power: PowerState;
  stageCode: string;
  stageName: string;
  timeRemaining: number;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const initialBest = typeof window !== 'undefined' ? loadBestScore() : 0;
  const initialHighestStage = typeof window !== 'undefined' ? loadHighestStage() : 0;

  const worldRef = useRef<WorldState>(
    createWorld(0, {
      phase: initialAutostart ? 'playing' : 'title',
      bestScore: initialBest,
    }),
  );

  const heldKeysRef = useRef<Set<string>>(new Set());
  const touchStateRef = useRef({ left: false, right: false, jump: false, action: false });
  const prevJumpHeldRef = useRef(false);
  const prevActionHeldRef = useRef(false);
  const viewWorldWidthRef = useRef(768);

  const [phase, setPhase] = useState<GamePhase>(worldRef.current.phase);
  const [selectedStage, setSelectedStage] = useState(0);
  const [highestUnlockedStage, setHighestUnlockedStage] = useState(initialHighestStage);
  const [bestScore, setBestScore] = useState(initialBest);
  const bestScoreRef = useRef(initialBest);
  const [muted, setMuted] = useState(false);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [hud, setHud] = useState<HudState>(() => ({
    score: worldRef.current.score,
    coins: worldRef.current.coins,
    lives: worldRef.current.lives,
    power: worldRef.current.player.power,
    stageCode: worldRef.current.stageCode,
    stageName: worldRef.current.stageName,
    timeRemaining: Math.round(worldRef.current.timeRemaining),
  }));

  const clearInputs = useCallback(() => {
    heldKeysRef.current.clear();
    touchStateRef.current = { left: false, right: false, jump: false, action: false };
    prevJumpHeldRef.current = false;
    prevActionHeldRef.current = false;
  }, []);

  const syncHudFromWorld = useCallback((w: WorldState) => {
    const roundedTime = Math.round(w.timeRemaining);
    const roundedScore = Math.round(w.score);
    setHud((prev) => {
      if (
        prev.score === roundedScore &&
        prev.coins === w.coins &&
        prev.lives === w.lives &&
        prev.power === w.player.power &&
        prev.stageCode === w.stageCode &&
        prev.stageName === w.stageName &&
        prev.timeRemaining === roundedTime
      ) {
        return prev;
      }
      return {
        score: roundedScore,
        coins: w.coins,
        lives: w.lives,
        power: w.player.power,
        stageCode: w.stageCode,
        stageName: w.stageName,
        timeRemaining: roundedTime,
      };
    });
  }, []);

  const startStage = useCallback(
    (stageIndex: number, keepStats = false) => {
      audioEngine.unlock();
      clearInputs();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const prev = worldRef.current;
      const nextWorld = createWorld(stageIndex, {
        phase: 'playing',
        bestScore: Math.max(prev.bestScore, bestScore),
        score: keepStats ? prev.score : 0,
        coins: keepStats ? prev.coins : 0,
        lives: keepStats ? Math.max(3, prev.lives) : 3,
        power: keepStats ? prev.player.power : 'small',
      });
      worldRef.current = nextWorld;
      setSnapshot(null);
      setPhase('playing');
      syncBodyDatasetState('playing');
      syncHudFromWorld(nextWorld);
      audioEngine.syncMusic('playing');
    },
    [bestScore, clearInputs, syncHudFromWorld],
  );

  const handleSelectStage = useCallback((idx: number) => {
    setSelectedStage(idx);
    const prev = worldRef.current;
    worldRef.current = createWorld(idx, {
      phase: 'title',
      bestScore: prev.bestScore,
    });
    syncHudFromWorld(worldRef.current);
  }, [syncHudFromWorld]);

  const handlePauseToggle = useCallback(() => {
    const w = worldRef.current;
    if (w.phase === 'playing') {
      w.phase = 'paused';
      clearInputs();
      setPhase('paused');
      syncBodyDatasetState('paused');
      audioEngine.syncMusic('paused');
    } else if (w.phase === 'paused') {
      w.phase = 'playing';
      clearInputs();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setPhase('playing');
      syncBodyDatasetState('playing');
      audioEngine.syncMusic('playing');
    }
  }, [clearInputs]);

  const handleReturnTitle = useCallback(() => {
    clearInputs();
    const w = createWorld(selectedStage, {
      phase: 'title',
      bestScore: Math.max(worldRef.current.bestScore, bestScore),
    });
    worldRef.current = w;
    setSnapshot(null);
    setPhase('title');
    syncBodyDatasetState('title');
    syncHudFromWorld(w);
    audioEngine.syncMusic('title');
  }, [bestScore, clearInputs, selectedStage, syncHudFromWorld]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      if (!next) {
        audioEngine.unlock();
        audioEngine.syncMusic(worldRef.current.phase);
      }
      return next;
    });
  }, []);

  const handleTouchInput = useCallback(
    (key: 'left' | 'right' | 'jump' | 'action', active: boolean) => {
      audioEngine.unlock();
      touchStateRef.current[key] = active;
    },
    [],
  );

  // Sync initial body dataset state on mount
  useEffect(() => {
    syncBodyDatasetState(worldRef.current.phase);
  }, []);

  // Keyboard bindings & window focus/blur hygiene
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      const currentPhase = worldRef.current.phase;

      if (!e.repeat) {
        if (e.code === 'KeyM') {
          handleToggleMute();
          return;
        }
        if (currentPhase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
          startStage(selectedStage, false);
          return;
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (currentPhase === 'playing' || currentPhase === 'paused') {
            handlePauseToggle();
            return;
          }
        }
        if (e.code === 'KeyR' && (currentPhase === 'playing' || currentPhase === 'paused')) {
          startStage(worldRef.current.stageIndex, false);
          return;
        }
      }

      heldKeysRef.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const onBlur = () => {
      clearInputs();
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearInputs();
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearInputs, handlePauseToggle, handleToggleMute, selectedStage, startStage]);

  // Isolated 60fps Canvas Loop + ResizeObserver (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cssW = container.clientWidth || window.innerWidth;
    let cssH = container.clientHeight || window.innerHeight;
    let needsPausedRedraw = true;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      cssW = Math.max(320, Math.round(rect.width || window.innerWidth));
      cssH = Math.max(240, Math.round(rect.height || window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewWorldWidthRef.current = cssW / (cssH / VIRTUAL_HEIGHT);
      needsPausedRedraw = true;
    };

    updateCanvasSize();
    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const world = worldRef.current;
      const keys = heldKeysRef.current;
      const touch = touchStateRef.current;

      const jumpHeld =
        keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW') || touch.jump;
      const actionHeld =
        keys.has('KeyX') || keys.has('KeyF') || keys.has('KeyK') || touch.action;

      const input: InputState = {
        left: keys.has('ArrowLeft') || keys.has('KeyA') || touch.left,
        right: keys.has('ArrowRight') || keys.has('KeyD') || touch.right,
        jumpHeld,
        jumpJustPressed: jumpHeld && !prevJumpHeldRef.current,
        runHeld:
          keys.has('ShiftLeft') ||
          keys.has('ShiftRight') ||
          keys.has('KeyZ') ||
          keys.has('KeyJ'),
        actionJustPressed: actionHeld && !prevActionHeldRef.current,
      };
      prevJumpHeldRef.current = jumpHeld;
      prevActionHeldRef.current = actionHeld;

      const prevPhase = world.phase;
      stepWorld(world, input, rawDt, viewWorldWidthRef.current);

      // Flush audio queue
      if (world.audioQueue.length > 0) {
        for (const cue of world.audioQueue) {
          audioEngine.playCue(cue);
        }
        world.audioQueue.length = 0;
      }

      // Detect phase transitions (victory / gameover / respawn)
      if (world.phase !== prevPhase) {
        syncBodyDatasetState(world.phase);
        setPhase(world.phase);
        audioEngine.syncMusic(world.phase);

        if (world.phase === 'victory' || world.phase === 'gameover') {
          const isVictory = world.phase === 'victory';
          const snap = buildRunSnapshot(world, isVictory);
          setSnapshot(snap);

          if (snap.bestScore > bestScoreRef.current) {
            bestScoreRef.current = snap.bestScore;
            setBestScore(snap.bestScore);
            saveBestScore(snap.bestScore);
          }

          if (isVictory) {
            const nextStageIdx = Math.min(LEVELS.length - 1, world.stageIndex + 1);
            setHighestUnlockedStage((prev) => {
              const updated = Math.max(prev, nextStageIdx);
              saveHighestStage(updated);
              return updated;
            });
          }
        }
      }

      syncHudFromWorld(world);
      if (world.phase === 'paused') {
        if (needsPausedRedraw) {
          renderWorld(ctx, world, cssW, cssH);
          needsPausedRedraw = false;
        }
      } else {
        needsPausedRedraw = true;
        renderWorld(ctx, world, cssW, cssH);
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      audioEngine.stopMusic();
    };
  }, [syncHudFromWorld]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Isolated Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          className="block w-full h-full"
        />
      </div>

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleOverlay
          selectedStage={selectedStage}
          highestUnlockedStage={highestUnlockedStage}
          bestScore={bestScore}
          onSelectStage={handleSelectStage}
          onStart={() => startStage(selectedStage, false)}
        />
      )}

      {/* Active Gameplay HUD */}
      {phase !== 'title' && (
        <GameHud
          score={hud.score}
          coins={hud.coins}
          lives={hud.lives}
          power={hud.power}
          stageCode={hud.stageCode}
          timeRemaining={hud.timeRemaining}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePauseToggle}
          onRestart={() => startStage(worldRef.current.stageIndex, false)}
          onTouchInput={handleTouchInput}
        />
      )}

      {/* Status Modal (Paused / Victory / Game Over) */}
      {(phase === 'paused' || phase === 'victory' || phase === 'gameover') && (
        <StatusModal
          phase={phase}
          snapshot={snapshot}
          stageCode={hud.stageCode}
          stageName={hud.stageName}
          onResume={handlePauseToggle}
          onRestart={() => startStage(worldRef.current.stageIndex, false)}
          onNextStage={() => {
            const nextIdx = Math.min(LEVELS.length - 1, worldRef.current.stageIndex + 1);
            setSelectedStage(nextIdx);
            startStage(nextIdx, true);
          }}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </main>
  );
}
