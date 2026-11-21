export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type PowerState = 'small' | 'big' | 'fire';

export type WorldTheme = 'overworld' | 'underground' | 'fortress';

export type TileType =
  | 'empty'
  | 'ground'
  | 'brick'
  | 'question'
  | 'used'
  | 'stone'
  | 'pipe_tl'
  | 'pipe_tr'
  | 'pipe_bl'
  | 'pipe_br'
  | 'bridge'
  | 'flag_pole'
  | 'flag_top'
  | 'castle';

export type QuestionReward = 'coin' | 'mushroom_or_fire' | 'star' | 'one_up' | 'multi_coin';

export interface BlockMeta {
  reward?: QuestionReward;
  coinsLeft?: number;
  bounceY: number;
  bounceVy: number;
  hidden?: boolean;
}

export interface MovingPlatform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number;
  dir: 1 | -1;
  vx: number;
  vy: number;
}

export type EnemyKind = 'goomba' | 'koopa' | 'parakoopa' | 'piranha';

export type KoopaState = 'walk' | 'shell_idle' | 'shell_moving';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  alive: boolean;
  koTimer: number; // squash / knockback KO animation timer
  koType?: 'squash' | 'flip';
  koopaState?: KoopaState;
  shellTimer?: number;
  shellCombo?: number;
  jumpWindup?: number;
  // Piranha specific
  pipeBaseY?: number;
  piranhaTimer?: number;
  piranhaPhase?: 'hidden' | 'telegraph' | 'rising' | 'open' | 'retreating';
  hitFlash: number;
}

export type ItemKind = 'coin_pop' | 'mushroom' | 'fire_flower' | 'star' | 'one_up';

export interface CollectibleItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  emergeTimer: number;
  active: boolean;
  life: number;
}

export interface WorldCoin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

export interface Fireball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  bounces: number;
  life: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  rot: number;
  vRot: number;
  shape: 'square' | 'circle' | 'star';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  power: PowerState;
  starTimer: number;
  invulnTimer: number;
  fireCooldown: number;
  walkDistance: number;
  scaleX: number;
  scaleY: number;
  skidding: boolean;
  dead: boolean;
  deathTimer: number;
  flagSlide: boolean;
  flagDone: boolean;
  castleWalk: boolean;
  stompCombo: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  runHeld: boolean;
  actionJustPressed: boolean;
}

export type AudioCue =
  | 'jump'
  | 'jump_big'
  | 'coin'
  | 'bump'
  | 'brick'
  | 'powerup_spawn'
  | 'powerup'
  | 'one_up'
  | 'stomp'
  | 'kick'
  | 'fireball'
  | 'hurt'
  | 'die'
  | 'flagpole'
  | 'victory'
  | 'gameover';

export interface RunSnapshot {
  stageIndex: number;
  stageCode: string;
  stageName: string;
  score: number;
  bestScore: number;
  coins: number;
  lives: number;
  timeRemaining: number;
  clearTime: number;
  progressPct: number;
  enemiesDefeated: number;
  isVictory: boolean;
}

export interface LevelDefinition {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  theme: WorldTheme;
  timeLimit: number;
  rows: string[];
  questionRewards?: Record<string, QuestionReward>;
  movingPlatforms?: Array<{
    tx: number;
    ty: number;
    wTiles: number;
    endTx: number;
    endTy: number;
    speed: number;
  }>;
  piranhaPipes?: Array<{ tx: number; ty: number }>;
}

export interface WorldState {
  phase: GamePhase;
  stageIndex: number;
  stageCode: string;
  stageName: string;
  theme: WorldTheme;
  widthTiles: number;
  heightTiles: number;
  tiles: TileType[][];
  blocks: Map<string, BlockMeta>;
  player: Player;
  enemies: Enemy[];
  items: CollectibleItem[];
  worldCoins: WorldCoin[];
  fireballs: Fireball[];
  movingPlatforms: MovingPlatform[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  particleCursor: number;
  score: number;
  bestScore: number;
  coins: number;
  lives: number;
  timeRemaining: number;
  elapsedTime: number;
  enemiesDefeated: number;
  cameraX: number;
  trauma: number;
  hitstop: number;
  flagX: number;
  flagTopY: number;
  flagBottomY: number;
  flagSlideY: number;
  castleDoorX: number;
  worldTime: number;
  nextEntityId: number;
  audioQueue: AudioCue[];
  deathPendingTimer: number;
  victoryPendingTimer: number;
}
