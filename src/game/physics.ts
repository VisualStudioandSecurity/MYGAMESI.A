import { LEVEL_HEIGHT_TILES, LEVELS, TILE_SIZE } from './levels';
import type {
  AudioCue,
  BlockMeta,
  CollectibleItem,
  Enemy,
  Fireball,
  FloatingText,
  GamePhase,
  InputState,
  MovingPlatform,
  Particle,
  Player,
  QuestionReward,
  RunSnapshot,
  TileType,
  WorldCoin,
  WorldState,
} from './types';

export const PARTICLE_POOL_SIZE = 160;
export const VIRTUAL_HEIGHT = LEVEL_HEIGHT_TILES * TILE_SIZE; // 480

export const PHYSICS = {
  gravity: 1480,
  maxFallSpeed: 680,
  walkAccel: 1180,
  runAccel: 1520,
  airAccel: 920,
  friction: 1300,
  skidDecel: 2250,
  walkMaxSpeed: 185,
  runMaxSpeed: 275,
  jumpVelocity: -575,
  runJumpVelocity: -610,
  jumpCutMultiplier: 0.45,
  coyoteDuration: 0.1,
  jumpBufferDuration: 0.12,
  stompBounceVelocity: -360,
  stompHighBounceVelocity: -490,
  fireCooldown: 0.28,
};

function blockKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

export function isSolidTile(tile: TileType): boolean {
  return (
    tile === 'ground' ||
    tile === 'brick' ||
    tile === 'question' ||
    tile === 'used' ||
    tile === 'stone' ||
    tile === 'pipe_tl' ||
    tile === 'pipe_tr' ||
    tile === 'pipe_bl' ||
    tile === 'pipe_br' ||
    tile === 'bridge'
  );
}

function createEmptyParticles(): Particle[] {
  const pool: Particle[] = new Array(PARTICLE_POOL_SIZE);
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#ffffff',
      alpha: 1,
      life: 0,
      maxLife: 0.4,
      gravity: 400,
      rot: 0,
      vRot: 0,
      shape: 'square',
    };
  }
  return pool;
}

export function spawnParticle(
  world: WorldState,
  opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    maxLife: number;
    gravity?: number;
    vRot?: number;
    shape?: 'square' | 'circle' | 'star';
  },
): void {
  const p = world.particles[world.particleCursor];
  world.particleCursor = (world.particleCursor + 1) % PARTICLE_POOL_SIZE;
  p.active = true;
  p.x = opts.x;
  p.y = opts.y;
  p.vx = opts.vx;
  p.vy = opts.vy;
  p.size = opts.size;
  p.color = opts.color;
  p.alpha = 1;
  p.life = 0;
  p.maxLife = opts.maxLife;
  p.gravity = opts.gravity ?? 520;
  p.rot = 0;
  p.vRot = opts.vRot ?? 0;
  p.shape = opts.shape ?? 'square';
}

export function spawnParticleBurst(
  world: WorldState,
  x: number,
  y: number,
  count: number,
  colors: string[],
  speedMin = 60,
  speedMax = 210,
  shape: 'square' | 'circle' | 'star' = 'square',
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.sin(i * 17.3 + world.worldTime * 11) * 0.25);
    const speed = speedMin + ((i * 37) % 100) * 0.01 * (speedMax - speedMin);
    spawnParticle(world, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 90,
      size: 4 + (i % 4),
      color: colors[i % colors.length],
      maxLife: 0.35 + (i % 4) * 0.08,
      gravity: 560,
      vRot: (i % 2 === 0 ? 1 : -1) * 8,
      shape,
    });
  }
}

export function addFloatingText(
  world: WorldState,
  x: number,
  y: number,
  text: string,
  color = '#FEF08A',
): void {
  world.floatingTexts.push({
    id: world.nextEntityId++,
    x,
    y,
    vy: -56,
    text,
    color,
    life: 0,
    maxLife: 0.78,
  });
}

function pushAudio(world: WorldState, cue: AudioCue): void {
  world.audioQueue.push(cue);
}

export function createWorld(
  stageIndex: number,
  options?: {
    phase?: GamePhase;
    score?: number;
    bestScore?: number;
    coins?: number;
    lives?: number;
    power?: Player['power'];
  },
): WorldState {
  const safeIdx = Math.max(0, Math.min(LEVELS.length - 1, stageIndex));
  const def = LEVELS[safeIdx];
  const heightTiles = def.rows.length;
  const widthTiles = def.rows[0].length;

  const tiles: TileType[][] = Array.from({ length: heightTiles }, () =>
    Array.from({ length: widthTiles }, () => 'empty' as TileType),
  );
  const blocks = new Map<string, BlockMeta>();
  const enemies: Enemy[] = [];
  const worldCoins: WorldCoin[] = [];
  let nextEntityId = 1;

  let spawnX = 4 * TILE_SIZE;
  let spawnY = 12 * TILE_SIZE;
  let flagX = (widthTiles - 10) * TILE_SIZE;
  let flagBaseRow = 12;
  let castleDoorX = (widthTiles - 4) * TILE_SIZE;

  for (let ty = 0; ty < heightTiles; ty++) {
    const row = def.rows[ty];
    for (let tx = 0; tx < widthTiles; tx++) {
      const ch = row[tx];
      switch (ch) {
        case '#':
          tiles[ty][tx] = 'ground';
          break;
        case 'B':
          tiles[ty][tx] = 'brick';
          blocks.set(blockKey(tx, ty), { bounceY: 0, bounceVy: 0 });
          break;
        case '?':
        case 'M':
        case 'S':
        case 'U': {
          tiles[ty][tx] = 'question';
          let reward: QuestionReward = 'coin';
          if (ch === 'M') reward = 'mushroom_or_fire';
          else if (ch === 'S') reward = 'star';
          else if (ch === 'U') reward = 'one_up';
          const override = def.questionRewards?.[blockKey(tx, ty)];
          if (override) reward = override;
          blocks.set(blockKey(tx, ty), { reward, bounceY: 0, bounceVy: 0 });
          break;
        }
        case 'X':
          tiles[ty][tx] = 'stone';
          break;
        case '=':
          tiles[ty][tx] = 'bridge';
          break;
        case '[':
          tiles[ty][tx] = 'pipe_tl';
          break;
        case ']':
          tiles[ty][tx] = 'pipe_tr';
          break;
        case '(':
          tiles[ty][tx] = 'pipe_tl';
          // Spawn a Piranha plant centered inside this 2-tile pipe
          enemies.push({
            id: nextEntityId++,
            kind: 'piranha',
            x: tx * TILE_SIZE + 18,
            y: ty * TILE_SIZE + 4,
            w: 28,
            h: 34,
            vx: 0,
            vy: 0,
            facing: -1,
            grounded: false,
            alive: true,
            koTimer: 0,
            pipeBaseY: ty * TILE_SIZE,
            piranhaTimer: 0.6 + (tx % 3) * 0.5,
            piranhaPhase: 'hidden',
            hitFlash: 0,
          });
          break;
        case ')':
          tiles[ty][tx] = 'pipe_tr';
          break;
        case '{':
          tiles[ty][tx] = 'pipe_bl';
          break;
        case '}':
          tiles[ty][tx] = 'pipe_br';
          break;
        case 'C':
          worldCoins.push({
            id: nextEntityId++,
            x: tx * TILE_SIZE + 6,
            y: ty * TILE_SIZE + 4,
            collected: false,
            bobOffset: tx * 0.7,
          });
          break;
        case 'G':
          enemies.push({
            id: nextEntityId++,
            kind: 'goomba',
            x: tx * TILE_SIZE + 3,
            y: ty * TILE_SIZE + 4,
            w: 26,
            h: 28,
            vx: -55,
            vy: 0,
            facing: -1,
            grounded: false,
            alive: true,
            koTimer: 0,
            hitFlash: 0,
          });
          break;
        case 'K':
          enemies.push({
            id: nextEntityId++,
            kind: 'koopa',
            x: tx * TILE_SIZE + 3,
            y: ty * TILE_SIZE - 4,
            w: 26,
            h: 36,
            vx: -62,
            vy: 0,
            facing: -1,
            grounded: false,
            alive: true,
            koTimer: 0,
            koopaState: 'walk',
            shellTimer: 0,
            shellCombo: 0,
            hitFlash: 0,
          });
          break;
        case 'W':
          enemies.push({
            id: nextEntityId++,
            kind: 'parakoopa',
            x: tx * TILE_SIZE + 2,
            y: ty * TILE_SIZE - 6,
            w: 28,
            h: 38,
            vx: -68,
            vy: 0,
            facing: -1,
            grounded: false,
            alive: true,
            koTimer: 0,
            koopaState: 'walk',
            jumpWindup: 0.5,
            hitFlash: 0,
          });
          break;
        case 'P':
          spawnX = tx * TILE_SIZE + 5;
          spawnY = ty * TILE_SIZE;
          break;
        case 'F':
          flagX = tx * TILE_SIZE + TILE_SIZE / 2 - 3;
          flagBaseRow = ty;
          break;
        case 'H':
          castleDoorX = tx * TILE_SIZE + 16;
          tiles[ty][tx] = 'castle';
          break;
        default:
          break;
      }
    }
  }

  // Place flagpole tiles upward from flagBaseRow
  const flagTopRow = Math.max(2, flagBaseRow - 7);
  const flagTx = Math.floor(flagX / TILE_SIZE);
  for (let r = flagTopRow + 1; r <= flagBaseRow; r++) {
    tiles[r][flagTx] = 'flag_pole';
  }
  tiles[flagTopRow][flagTx] = 'flag_top';
  // Base pedestal stone beneath flagpole
  if (flagBaseRow + 1 < heightTiles) {
    tiles[flagBaseRow + 1][flagTx] = 'stone';
  }

  const movingPlatforms: MovingPlatform[] = (def.movingPlatforms ?? []).map((mp) => ({
    id: nextEntityId++,
    x: mp.tx * TILE_SIZE,
    y: mp.ty * TILE_SIZE,
    w: mp.wTiles * TILE_SIZE,
    h: 14,
    startX: mp.tx * TILE_SIZE,
    startY: mp.ty * TILE_SIZE,
    endX: mp.endTx * TILE_SIZE,
    endY: mp.endTy * TILE_SIZE,
    speed: mp.speed,
    progress: 0,
    dir: 1,
    vx: 0,
    vy: 0,
  }));

  const power = options?.power ?? 'small';
  const playerW = power === 'small' ? 22 : 24;
  const playerH = power === 'small' ? 28 : 46;
  const adjustedY = spawnY + (TILE_SIZE - playerH);

  const player: Player = {
    x: spawnX,
    y: adjustedY,
    w: playerW,
    h: playerH,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    power,
    starTimer: 0,
    invulnTimer: 0,
    fireCooldown: 0,
    walkDistance: 0,
    scaleX: 1,
    scaleY: 1,
    skidding: false,
    dead: false,
    deathTimer: 0,
    flagSlide: false,
    flagDone: false,
    castleWalk: false,
    stompCombo: 0,
  };

  return {
    phase: options?.phase ?? 'title',
    stageIndex: safeIdx,
    stageCode: def.code,
    stageName: def.name,
    theme: def.theme,
    widthTiles,
    heightTiles,
    tiles,
    blocks,
    player,
    enemies,
    items: [],
    worldCoins,
    fireballs: [],
    movingPlatforms,
    floatingTexts: [],
    particles: createEmptyParticles(),
    particleCursor: 0,
    score: options?.score ?? 0,
    bestScore: options?.bestScore ?? 0,
    coins: options?.coins ?? 0,
    lives: options?.lives ?? 3,
    timeRemaining: def.timeLimit,
    elapsedTime: 0,
    enemiesDefeated: 0,
    cameraX: 0,
    trauma: 0,
    hitstop: 0,
    flagX,
    flagTopY: flagTopRow * TILE_SIZE + 8,
    flagBottomY: (flagBaseRow + 1) * TILE_SIZE - 4,
    flagSlideY: flagTopRow * TILE_SIZE + 12,
    castleDoorX,
    worldTime: 0,
    nextEntityId,
    audioQueue: [],
    deathPendingTimer: 0,
    victoryPendingTimer: 0,
  };
}

function getTileAt(world: WorldState, tx: number, ty: number): TileType {
  if (tx < 0 || tx >= world.widthTiles) return 'stone';
  if (ty < 0) return 'empty';
  if (ty >= world.heightTiles) return 'empty';
  return world.tiles[ty][tx];
}

function addCoins(world: WorldState, amount: number): void {
  world.coins += amount;
  if (world.coins >= 100) {
    world.coins -= 100;
    world.lives += 1;
    pushAudio(world, 'one_up');
    addFloatingText(world, world.player.x, world.player.y - 12, '1UP!', '#4ADE80');
  }
}

function addScore(world: WorldState, pts: number): void {
  world.score += pts;
  if (world.score > world.bestScore) {
    world.bestScore = world.score;
  }
}

function hitBlockFromBelow(world: WorldState, tx: number, ty: number): void {
  const tile = getTileAt(world, tx, ty);
  const key = blockKey(tx, ty);
  const meta = world.blocks.get(key);

  if (tile === 'question') {
    const reward = meta?.reward ?? 'coin';
    world.tiles[ty][tx] = 'used';
    if (meta) {
      meta.bounceY = -10;
      meta.bounceVy = 65;
    }

    const bx = tx * TILE_SIZE;
    const by = ty * TILE_SIZE;

    if (reward === 'coin') {
      addCoins(world, 1);
      addScore(world, 100);
      pushAudio(world, 'coin');
      world.items.push({
        id: world.nextEntityId++,
        kind: 'coin_pop',
        x: bx + 8,
        y: by - 14,
        w: 16,
        h: 20,
        vx: 0,
        vy: -280,
        emergeTimer: 0,
        active: true,
        life: 0.45,
      });
      spawnParticleBurst(world, bx + 16, by - 4, 6, ['#FACC15', '#FEF08A', '#F59E0B'], 50, 140, 'star');
      addFloatingText(world, bx + 6, by - 16, '+100', '#FDE047');
    } else if (reward === 'mushroom_or_fire') {
      const kind = world.player.power === 'small' ? 'mushroom' : 'fire_flower';
      pushAudio(world, 'powerup_spawn');
      world.items.push({
        id: world.nextEntityId++,
        kind,
        x: bx + 3,
        y: by - 4,
        w: 26,
        h: 26,
        vx: kind === 'mushroom' ? 88 : 0,
        vy: 0,
        emergeTimer: 0.32,
        active: true,
        life: 999,
      });
    } else if (reward === 'star') {
      pushAudio(world, 'powerup_spawn');
      world.items.push({
        id: world.nextEntityId++,
        kind: 'star',
        x: bx + 3,
        y: by - 4,
        w: 26,
        h: 26,
        vx: 108,
        vy: -220,
        emergeTimer: 0.32,
        active: true,
        life: 999,
      });
    } else if (reward === 'one_up') {
      pushAudio(world, 'powerup_spawn');
      world.items.push({
        id: world.nextEntityId++,
        kind: 'one_up',
        x: bx + 3,
        y: by - 4,
        w: 26,
        h: 26,
        vx: 88,
        vy: 0,
        emergeTimer: 0.32,
        active: true,
        life: 999,
      });
    }
    bumpEnemiesAboveBlock(world, tx, ty);
    return;
  }

  if (tile === 'brick') {
    const bx = tx * TILE_SIZE;
    const by = ty * TILE_SIZE;
    if (world.player.power !== 'small') {
      // Shatter brick!
      world.tiles[ty][tx] = 'empty';
      world.blocks.delete(key);
      world.hitstop = 0.035;
      world.trauma = Math.min(1, world.trauma + 0.25);
      addScore(world, 50);
      pushAudio(world, 'brick');
      spawnParticleBurst(world, bx + 16, by + 16, 12, ['#C2410C', '#EA580C', '#9A3412', '#FDBA74'], 90, 250, 'square');
    } else {
      if (meta) {
        meta.bounceY = -8;
        meta.bounceVy = 60;
      }
      pushAudio(world, 'bump');
    }
    bumpEnemiesAboveBlock(world, tx, ty);
    return;
  }

  if (tile === 'used' || tile === 'stone') {
    pushAudio(world, 'bump');
  }
}

function bumpEnemiesAboveBlock(world: WorldState, tx: number, ty: number): void {
  const bx = tx * TILE_SIZE;
  const by = ty * TILE_SIZE;
  for (const enemy of world.enemies) {
    if (!enemy.alive || enemy.koTimer > 0 || enemy.kind === 'piranha') continue;
    const overlapX = enemy.x + enemy.w > bx + 2 && enemy.x < bx + TILE_SIZE - 2;
    const nearTop = Math.abs(enemy.y + enemy.h - by) <= 10;
    if (overlapX && nearTop) {
      koEnemyFlip(world, enemy, enemy.x + enemy.w / 2 >= bx + 16 ? 1 : -1, 100);
    }
  }
}

function koEnemyFlip(world: WorldState, enemy: Enemy, dir: 1 | -1, points = 200): void {
  enemy.alive = false;
  enemy.koType = 'flip';
  enemy.koTimer = 0.45;
  enemy.vx = dir * 110;
  enemy.vy = -260;
  enemy.hitFlash = 0.08;
  world.enemiesDefeated += 1;
  addScore(world, points);
  addFloatingText(world, enemy.x, enemy.y - 8, `+${points}`, '#FFFFFF');
  spawnParticleBurst(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 10, ['#FACC15', '#FB923C', '#FFFFFF'], 70, 200, 'star');
}

function koEnemySquash(world: WorldState, enemy: Enemy, points = 100): void {
  enemy.alive = false;
  enemy.koType = 'squash';
  enemy.koTimer = 0.36;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.hitFlash = 0.06;
  world.enemiesDefeated += 1;
  addScore(world, points);
  addFloatingText(world, enemy.x, enemy.y - 8, `+${points}`, '#FDE047');
  spawnParticleBurst(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 8, ['#FDE68A', '#FFFFFF'], 60, 160, 'circle');
}

export function setPlayerPower(player: Player, nextPower: Player['power']): void {
  if (player.power === nextPower) return;
  const oldBottom = player.y + player.h;
  player.power = nextPower;
  if (nextPower === 'small') {
    player.w = 22;
    player.h = 28;
  } else {
    player.w = 24;
    player.h = 46;
  }
  player.y = oldBottom - player.h;
  player.scaleX = 1.24;
  player.scaleY = 0.8;
}

function damagePlayer(world: WorldState): void {
  const p = world.player;
  if (p.dead || p.invulnTimer > 0 || p.starTimer > 0 || p.flagSlide) return;

  if (p.power !== 'small') {
    setPlayerPower(p, 'small');
    p.invulnTimer = 1.6;
    world.hitstop = 0.06;
    world.trauma = Math.min(1, world.trauma + 0.55);
    pushAudio(world, 'hurt');
    spawnParticleBurst(world, p.x + p.w / 2, p.y + p.h / 2, 14, ['#F87171', '#FFFFFF', '#FBBF24'], 90, 220, 'circle');
    return;
  }

  killPlayer(world);
}

function killPlayer(world: WorldState): void {
  const p = world.player;
  if (p.dead) return;
  p.dead = true;
  p.deathTimer = 0;
  p.vx = 0;
  p.vy = -440;
  p.grounded = false;
  world.hitstop = 0.06;
  world.trauma = Math.min(1, world.trauma + 0.7);
  pushAudio(world, 'die');
  spawnParticleBurst(world, p.x + p.w / 2, p.y + p.h / 2, 18, ['#EF4444', '#FDE047', '#FFFFFF'], 80, 260, 'star');
}

function aabbOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function moveAndCollideTiles(
  world: WorldState,
  entity: { x: number; y: number; w: number; h: number; vx: number; vy: number },
  dt: number,
  options?: {
    onHeadHit?: (tx: number, ty: number) => void;
    bounceHorizontal?: boolean;
    bounceVertical?: number;
    stopAtEdges?: boolean;
    cornerNudge?: boolean;
  },
): { hitWall: boolean; grounded: boolean; hitCeiling: boolean } {
  let hitWall = false;
  let grounded = false;
  let hitCeiling = false;

  // Horizontal step
  entity.x += entity.vx * dt;
  if (entity.x < 0) {
    entity.x = 0;
    hitWall = true;
  }
  const maxX = world.widthTiles * TILE_SIZE - entity.w;
  if (entity.x > maxX) {
    entity.x = maxX;
    hitWall = true;
  }

  const topTileY = Math.max(0, Math.floor((entity.y + 4) / TILE_SIZE));
  const botTileY = Math.min(world.heightTiles - 1, Math.floor((entity.y + entity.h - 4) / TILE_SIZE));

  if (entity.vx > 0) {
    const rightTx = Math.floor((entity.x + entity.w) / TILE_SIZE);
    for (let ty = topTileY; ty <= botTileY; ty++) {
      if (isSolidTile(getTileAt(world, rightTx, ty))) {
        entity.x = rightTx * TILE_SIZE - entity.w;
        hitWall = true;
        break;
      }
    }
  } else if (entity.vx < 0) {
    const leftTx = Math.floor(entity.x / TILE_SIZE);
    for (let ty = topTileY; ty <= botTileY; ty++) {
      if (isSolidTile(getTileAt(world, leftTx, ty))) {
        entity.x = (leftTx + 1) * TILE_SIZE;
        hitWall = true;
        break;
      }
    }
  }

  if (hitWall && options?.bounceHorizontal) {
    entity.vx = -entity.vx;
  } else if (hitWall) {
    entity.vx = 0;
  }

  // Vertical step
  entity.y += entity.vy * dt;

  const leftTx = Math.max(0, Math.floor((entity.x + 3) / TILE_SIZE));
  const rightTx = Math.min(world.widthTiles - 1, Math.floor((entity.x + entity.w - 3) / TILE_SIZE));

  if (entity.vy >= 0) {
    const footTy = Math.floor((entity.y + entity.h) / TILE_SIZE);
    if (footTy >= 0 && footTy < world.heightTiles) {
      for (let tx = leftTx; tx <= rightTx; tx++) {
        if (isSolidTile(getTileAt(world, tx, footTy))) {
          entity.y = footTy * TILE_SIZE - entity.h;
          if (options?.bounceVertical && entity.vy > 80) {
            entity.vy = -Math.abs(options.bounceVertical);
          } else {
            entity.vy = 0;
            grounded = true;
          }
          break;
        }
      }
    }
  } else {
    const headTy = Math.floor(entity.y / TILE_SIZE);
    if (headTy >= 0 && headTy < world.heightTiles) {
      const solidCols: number[] = [];
      for (let tx = leftTx; tx <= rightTx; tx++) {
        if (isSolidTile(getTileAt(world, tx, headTy))) {
          solidCols.push(tx);
        }
      }

      if (solidCols.length > 0) {
        // Forgiving corner nudge if only hitting the outer edge of 1 tile by <= 6px
        if (options?.cornerNudge && solidCols.length === 1) {
          const hitTx = solidCols[0];
          const tileLeft = hitTx * TILE_SIZE;
          const tileRight = tileLeft + TILE_SIZE;
          const overlapRight = entity.x + entity.w - tileLeft;
          const overlapLeft = tileRight - entity.x;
          if (overlapRight > 0 && overlapRight <= 7 && getTileAt(world, hitTx - 1, headTy) === 'empty') {
            entity.x = tileLeft - entity.w - 0.5;
            return { hitWall, grounded, hitCeiling };
          }
          if (overlapLeft > 0 && overlapLeft <= 7 && getTileAt(world, hitTx + 1, headTy) === 'empty') {
            entity.x = tileRight + 0.5;
            return { hitWall, grounded, hitCeiling };
          }
        }

        entity.y = (headTy + 1) * TILE_SIZE;
        entity.vy = 0;
        hitCeiling = true;
        if (options?.onHeadHit) {
          // Hit the tile closest to entity's horizontal center
          const centerX = entity.x + entity.w / 2;
          let bestTx = solidCols[0];
          let bestDist = Infinity;
          for (const c of solidCols) {
            const d = Math.abs(c * TILE_SIZE + TILE_SIZE / 2 - centerX);
            if (d < bestDist) {
              bestDist = d;
              bestTx = c;
            }
          }
          options.onHeadHit(bestTx, headTy);
        }
      }
    }
  }

  // Optional edge turnaround for patrolling enemies like Koopas
  if (options?.stopAtEdges && grounded && entity.vx !== 0) {
    const aheadX = entity.vx > 0 ? entity.x + entity.w + 2 : entity.x - 2;
    const aheadTx = Math.floor(aheadX / TILE_SIZE);
    const belowTy = Math.floor((entity.y + entity.h + 4) / TILE_SIZE);
    if (
      aheadTx >= 0 &&
      aheadTx < world.widthTiles &&
      belowTy >= 0 &&
      belowTy < world.heightTiles &&
      !isSolidTile(getTileAt(world, aheadTx, belowTy))
    ) {
      entity.vx = -entity.vx;
    }
  }

  return { hitWall, grounded, hitCeiling };
}

function updateMovingPlatforms(world: WorldState, simDt: number): void {
  for (const mp of world.movingPlatforms) {
    const dx = mp.endX - mp.startX;
    const dy = mp.endY - mp.startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;

    const prevX = mp.x;
    const prevY = mp.y;
    mp.progress += ((mp.speed * simDt) / dist) * mp.dir;
    if (mp.progress >= 1) {
      mp.progress = 1;
      mp.dir = -1;
    } else if (mp.progress <= 0) {
      mp.progress = 0;
      mp.dir = 1;
    }

    // Smooth ease at ends
    const t = mp.progress;
    mp.x = mp.startX + dx * t;
    mp.y = mp.startY + dy * t;
    mp.vx = simDt > 0 ? (mp.x - prevX) / simDt : 0;
    mp.vy = simDt > 0 ? (mp.y - prevY) / simDt : 0;
  }
}

function updatePlayer(world: WorldState, input: InputState, simDt: number): void {
  const p = world.player;

  // Recover squash & stretch smoothly toward 1
  p.scaleX += (1 - p.scaleX) * Math.min(1, simDt * 14);
  p.scaleY += (1 - p.scaleY) * Math.min(1, simDt * 14);

  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - simDt);
  if (p.starTimer > 0) p.starTimer = Math.max(0, p.starTimer - simDt);
  if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - simDt);

  if (p.dead) {
    p.deathTimer += simDt;
    if (p.deathTimer > 0.16) {
      p.vy = Math.min(PHYSICS.maxFallSpeed, p.vy + PHYSICS.gravity * simDt);
      p.y += p.vy * simDt;
    }
    if (p.deathTimer >= 1.25 && world.deathPendingTimer <= 0) {
      world.deathPendingTimer = 0.01;
    }
    return;
  }

  // Flagpole slide & castle walk sequence
  if (p.flagSlide) {
    if (!p.flagDone) {
      p.vx = 0;
      p.vy = 180;
      p.y += p.vy * simDt;
      world.flagSlideY = Math.min(world.flagBottomY - 22, world.flagSlideY + 190 * simDt);
      if (p.y + p.h >= world.flagBottomY) {
        p.y = world.flagBottomY - p.h;
        p.flagDone = true;
        p.castleWalk = true;
        p.facing = 1;
      }
    } else if (p.castleWalk) {
      p.vx = 115;
      p.x += p.vx * simDt;
      p.walkDistance += Math.abs(p.vx * simDt);
      if (p.x >= world.castleDoorX - 8) {
        p.vx = 0;
        p.castleWalk = false;
        if (world.victoryPendingTimer <= 0) {
          world.victoryPendingTimer = 0.45;
        }
      }
    }
    return;
  }

  // Jump buffer & coyote time
  if (input.jumpJustPressed) {
    p.jumpBufferTimer = PHYSICS.jumpBufferDuration;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - simDt);
  }

  if (p.grounded) {
    p.coyoteTimer = PHYSICS.coyoteDuration;
    p.stompCombo = 0;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - simDt);
  }

  // Horizontal movement
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxSpeed = input.runHeld ? PHYSICS.runMaxSpeed : PHYSICS.walkMaxSpeed;
  const accel = p.grounded
    ? input.runHeld
      ? PHYSICS.runAccel
      : PHYSICS.walkAccel
    : PHYSICS.airAccel;

  p.skidding = false;
  if (moveDir !== 0) {
    p.facing = moveDir as 1 | -1;
    if (p.grounded && Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== moveDir && Math.abs(p.vx) > 65) {
      p.skidding = true;
      p.vx += moveDir * PHYSICS.skidDecel * simDt;
      if (Math.floor(world.worldTime * 28) % 3 === 0) {
        spawnParticle(world, {
          x: p.x + p.w / 2,
          y: p.y + p.h - 2,
          vx: -moveDir * 45,
          vy: -25,
          size: 4,
          color: '#E2E8F0',
          maxLife: 0.24,
          gravity: 80,
          shape: 'circle',
        });
      }
    } else {
      p.vx += moveDir * accel * simDt;
      if (Math.abs(p.vx) > maxSpeed) {
        p.vx = moveDir * maxSpeed;
      }
    }
  } else if (p.grounded) {
    const drop = PHYSICS.friction * simDt;
    if (Math.abs(p.vx) <= drop) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * drop;
  } else {
    const airDrag = PHYSICS.friction * 0.28 * simDt;
    if (Math.abs(p.vx) <= airDrag) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * airDrag;
  }

  // Execute buffered jump if grounded or within coyote time
  if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
    const isRunningFast = Math.abs(p.vx) > 210;
    p.vy = isRunningFast ? PHYSICS.runJumpVelocity : PHYSICS.jumpVelocity;
    p.grounded = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.scaleX = 0.84;
    p.scaleY = 1.2;
    pushAudio(world, p.power === 'small' ? 'jump' : 'jump_big');
    spawnParticleBurst(world, p.x + p.w / 2, p.y + p.h, 4, ['#F8FAFC', '#CBD5E1'], 30, 80, 'circle');
  }

  // Variable jump cut on early release
  if (!input.jumpHeld && p.vy < -150) {
    p.vy *= PHYSICS.jumpCutMultiplier;
  }

  // Fireball ability (if fire state)
  if (input.actionJustPressed && p.power === 'fire' && p.fireCooldown <= 0 && world.fireballs.length < 3) {
    p.fireCooldown = PHYSICS.fireCooldown;
    pushAudio(world, 'fireball');
    world.fireballs.push({
      id: world.nextEntityId++,
      x: p.facing > 0 ? p.x + p.w + 2 : p.x - 10,
      y: p.y + p.h * 0.42,
      vx: p.facing * 360,
      vy: 60,
      radius: 6,
      active: true,
      bounces: 0,
      life: 2.2,
    });
  }

  // Gravity
  p.vy = Math.min(PHYSICS.maxFallSpeed, p.vy + PHYSICS.gravity * simDt);

  const wasGrounded = p.grounded;
  const col = moveAndCollideTiles(world, p, simDt, {
    cornerNudge: true,
    onHeadHit: (tx, ty) => hitBlockFromBelow(world, tx, ty),
  });
  p.grounded = col.grounded;

  // Moving platform landing & carry
  for (const mp of world.movingPlatforms) {
    const prevBottom = p.y + p.h - p.vy * simDt;
    const horizOverlap = p.x + p.w > mp.x + 2 && p.x < mp.x + mp.w - 2;
    if (horizOverlap && p.vy >= 0 && prevBottom <= mp.y + 8 && p.y + p.h >= mp.y) {
      p.y = mp.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.x += mp.vx * simDt;
      p.y += mp.vy * simDt;
      break;
    }
  }

  if (!wasGrounded && p.grounded) {
    p.scaleX = 1.22;
    p.scaleY = 0.78;
    spawnParticleBurst(world, p.x + p.w / 2, p.y + p.h, 4, ['#E2E8F0', '#94A3B8'], 25, 70, 'circle');
  }

  if (p.grounded) {
    p.walkDistance += Math.abs(p.vx * simDt);
  }

  // Pit fall check
  if (p.y > VIRTUAL_HEIGHT + 40) {
    killPlayer(world);
    return;
  }

  // Flagpole capture check
  if (p.x + p.w >= world.flagX && p.x <= world.flagX + 16 && p.y + p.h >= world.flagTopY) {
    p.flagSlide = true;
    p.x = world.flagX - p.w + 8;
    p.vx = 0;
    p.vy = 0;
    // Height bonus based on how high on the pole the player grabbed
    const heightRatio = Math.max(
      0,
      Math.min(1, (world.flagBottomY - (p.y + p.h)) / Math.max(1, world.flagBottomY - world.flagTopY)),
    );
    const poleBonus = heightRatio > 0.8 ? 5000 : heightRatio > 0.5 ? 2000 : heightRatio > 0.25 ? 800 : 400;
    const timeBonus = Math.round(world.timeRemaining) * 10;
    addScore(world, poleBonus + timeBonus);
    addFloatingText(world, world.flagX - 12, p.y - 12, `+${poleBonus}`, '#FDE047');
    pushAudio(world, 'flagpole');
    spawnParticleBurst(world, world.flagX, p.y + 8, 18, ['#FACC15', '#4ADE80', '#FFFFFF'], 90, 240, 'star');
  }
}

function updateItems(world: WorldState, simDt: number): void {
  const p = world.player;
  for (const item of world.items) {
    if (!item.active) continue;

    if (item.kind === 'coin_pop') {
      item.life -= simDt;
      item.vy += PHYSICS.gravity * 0.72 * simDt;
      item.y += item.vy * simDt;
      if (item.life <= 0) item.active = false;
      continue;
    }

    if (item.emergeTimer > 0) {
      item.emergeTimer = Math.max(0, item.emergeTimer - simDt);
      item.y -= (TILE_SIZE / 0.32) * simDt * 0.72;
      continue;
    }

    if (item.kind === 'mushroom' || item.kind === 'one_up') {
      item.vy = Math.min(PHYSICS.maxFallSpeed, item.vy + PHYSICS.gravity * simDt);
      moveAndCollideTiles(world, item, simDt, { bounceHorizontal: true });
    } else if (item.kind === 'star') {
      item.vy = Math.min(PHYSICS.maxFallSpeed, item.vy + PHYSICS.gravity * 0.82 * simDt);
      moveAndCollideTiles(world, item, simDt, { bounceHorizontal: true, bounceVertical: 360 });
    }

    if (item.y > VIRTUAL_HEIGHT + 64) {
      item.active = false;
      continue;
    }

    if (!p.dead && !p.flagSlide && aabbOverlap(p.x, p.y, p.w, p.h, item.x, item.y, item.w, item.h)) {
      item.active = false;
      if (item.kind === 'mushroom') {
        if (p.power === 'small') setPlayerPower(p, 'big');
        addScore(world, 1000);
        pushAudio(world, 'powerup');
        addFloatingText(world, item.x, item.y - 8, '+1000', '#F87171');
        spawnParticleBurst(world, item.x + 13, item.y + 13, 12, ['#EF4444', '#FEF08A', '#FFFFFF'], 70, 200, 'star');
      } else if (item.kind === 'fire_flower') {
        setPlayerPower(p, 'fire');
        addScore(world, 1000);
        pushAudio(world, 'powerup');
        addFloatingText(world, item.x, item.y - 8, 'FOGO!', '#FB923C');
        spawnParticleBurst(world, item.x + 13, item.y + 13, 14, ['#F97316', '#FDE047', '#FFFFFF'], 80, 220, 'star');
      } else if (item.kind === 'star') {
        p.starTimer = 9.0;
        addScore(world, 1000);
        pushAudio(world, 'powerup');
        addFloatingText(world, item.x, item.y - 8, 'ESTRELA!', '#FACC15');
        spawnParticleBurst(world, item.x + 13, item.y + 13, 16, ['#FACC15', '#38BDF8', '#4ADE80'], 90, 240, 'star');
      } else if (item.kind === 'one_up') {
        world.lives += 1;
        pushAudio(world, 'one_up');
        addFloatingText(world, item.x, item.y - 8, '1UP!', '#4ADE80');
        spawnParticleBurst(world, item.x + 13, item.y + 13, 12, ['#4ADE80', '#FFFFFF'], 70, 190, 'star');
      }
    }
  }
  world.items = world.items.filter((i) => i.active);
}

function updateWorldCoins(world: WorldState): void {
  const p = world.player;
  if (p.dead || p.flagSlide) return;
  for (const coin of world.worldCoins) {
    if (coin.collected) continue;
    if (aabbOverlap(p.x, p.y, p.w, p.h, coin.x, coin.y, 20, 24)) {
      coin.collected = true;
      addCoins(world, 1);
      addScore(world, 100);
      pushAudio(world, 'coin');
      spawnParticleBurst(world, coin.x + 10, coin.y + 12, 6, ['#FACC15', '#FEF08A', '#FFFFFF'], 45, 130, 'star');
      addFloatingText(world, coin.x, coin.y - 6, '+100', '#FDE047');
    }
  }
}

function updateFireballs(world: WorldState, simDt: number): void {
  for (const fb of world.fireballs) {
    if (!fb.active) continue;
    fb.life -= simDt;
    if (fb.life <= 0) {
      fb.active = false;
      continue;
    }

    fb.vy = Math.min(PHYSICS.maxFallSpeed, fb.vy + PHYSICS.gravity * 0.9 * simDt);
    const box = {
      x: fb.x - fb.radius,
      y: fb.y - fb.radius,
      w: fb.radius * 2,
      h: fb.radius * 2,
      vx: fb.vx,
      vy: fb.vy,
    };
    const res = moveAndCollideTiles(world, box, simDt, {
      bounceVertical: 270,
    });
    fb.x = box.x + fb.radius;
    fb.y = box.y + fb.radius;
    fb.vx = box.vx;
    fb.vy = box.vy;

    if (res.hitWall || fb.y > VIRTUAL_HEIGHT + 24) {
      fb.active = false;
      spawnParticleBurst(world, fb.x, fb.y, 8, ['#F97316', '#FDE047', '#EF4444'], 50, 150, 'circle');
      continue;
    }

    // Check enemy hit
    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;
      if (enemy.kind === 'piranha' && enemy.piranhaPhase === 'hidden') continue;
      if (aabbOverlap(fb.x - fb.radius, fb.y - fb.radius, fb.radius * 2, fb.radius * 2, enemy.x, enemy.y, enemy.w, enemy.h)) {
        fb.active = false;
        koEnemyFlip(world, enemy, fb.vx >= 0 ? 1 : -1, 200);
        pushAudio(world, 'kick');
        world.hitstop = 0.03;
        break;
      }
    }
  }
  world.fireballs = world.fireballs.filter((f) => f.active);
}

function updateEnemies(world: WorldState, simDt: number): void {
  const p = world.player;

  for (const enemy of world.enemies) {
    if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - simDt);

    if (!enemy.alive) {
      enemy.koTimer -= simDt;
      if (enemy.koType === 'flip') {
        enemy.vy += PHYSICS.gravity * simDt;
        enemy.x += enemy.vx * simDt;
        enemy.y += enemy.vy * simDt;
      }
      continue;
    }

    // Only simulate non-piranha enemies when reasonably near camera/player or active shell
    const distFromView = Math.min(Math.abs(enemy.x - world.cameraX), Math.abs(enemy.x - p.x));
    if (
      enemy.kind !== 'piranha' &&
      !(enemy.kind === 'koopa' && enemy.koopaState === 'shell_moving') &&
      distFromView > 1300
    ) {
      continue;
    }

    if (enemy.kind === 'piranha') {
      const baseY = enemy.pipeBaseY ?? enemy.y;
      enemy.piranhaTimer = (enemy.piranhaTimer ?? 0) - simDt;
      const playerNearPipe = Math.abs(p.x + p.w / 2 - (enemy.x + enemy.w / 2)) < 46 && p.y + p.h <= baseY + 12;

      if (enemy.piranhaPhase === 'hidden') {
        enemy.y = baseY + 4;
        if ((enemy.piranhaTimer ?? 0) <= 0 && !playerNearPipe) {
          enemy.piranhaPhase = 'telegraph';
          enemy.piranhaTimer = 0.45; // windup peek telegraph!
        }
      } else if (enemy.piranhaPhase === 'telegraph') {
        // Peek 6px above pipe rim as clear windup
        enemy.y = baseY - 6;
        if ((enemy.piranhaTimer ?? 0) <= 0) {
          enemy.piranhaPhase = 'rising';
        }
      } else if (enemy.piranhaPhase === 'rising') {
        enemy.y -= 62 * simDt;
        if (enemy.y <= baseY - 34) {
          enemy.y = baseY - 34;
          enemy.piranhaPhase = 'open';
          enemy.piranhaTimer = 1.25;
        }
      } else if (enemy.piranhaPhase === 'open') {
        if ((enemy.piranhaTimer ?? 0) <= 0) {
          enemy.piranhaPhase = 'retreating';
        }
      } else if (enemy.piranhaPhase === 'retreating') {
        enemy.y += 58 * simDt;
        if (enemy.y >= baseY + 4) {
          enemy.y = baseY + 4;
          enemy.piranhaPhase = 'hidden';
          enemy.piranhaTimer = 1.6;
        }
      }

      // Piranha collision with player (can only be defeated by star/fireball)
      if (!p.dead && !p.flagSlide && enemy.piranhaPhase !== 'hidden') {
        if (aabbOverlap(p.x + 2, p.y + 2, p.w - 4, p.h - 4, enemy.x + 3, enemy.y + 4, enemy.w - 6, enemy.h - 6)) {
          if (p.starTimer > 0) {
            koEnemyFlip(world, enemy, p.vx >= 0 ? 1 : -1, 200);
            pushAudio(world, 'kick');
          } else {
            damagePlayer(world);
          }
        }
      }
      continue;
    }

    // Parakoopa (Besouro Alado): hops periodically with crouch windup telegraph
    if (enemy.kind === 'parakoopa') {
      enemy.vy = Math.min(PHYSICS.maxFallSpeed, enemy.vy + PHYSICS.gravity * 0.72 * simDt);
      if (enemy.grounded) {
        enemy.jumpWindup = (enemy.jumpWindup ?? 0) - simDt;
        if ((enemy.jumpWindup ?? 0) <= 0) {
          enemy.vy = -410;
          enemy.grounded = false;
          enemy.jumpWindup = 0.42;
        }
      }
      const col = moveAndCollideTiles(world, enemy, simDt, { bounceHorizontal: true });
      enemy.grounded = col.grounded;
      enemy.facing = enemy.vx >= 0 ? 1 : -1;
    } else if (enemy.kind === 'koopa') {
      enemy.vy = Math.min(PHYSICS.maxFallSpeed, enemy.vy + PHYSICS.gravity * simDt);
      if (enemy.koopaState === 'shell_idle') {
        enemy.vx = 0;
        enemy.shellTimer = (enemy.shellTimer ?? 0) + simDt;
        if ((enemy.shellTimer ?? 0) >= 6.2) {
          // Wake back up into walking Koopa
          enemy.koopaState = 'walk';
          enemy.h = 36;
          enemy.y -= 10;
          enemy.vx = enemy.facing * 62;
          enemy.shellTimer = 0;
        }
        const col = moveAndCollideTiles(world, enemy, simDt);
        enemy.grounded = col.grounded;
      } else if (enemy.koopaState === 'shell_moving') {
        const col = moveAndCollideTiles(world, enemy, simDt, { bounceHorizontal: true });
        enemy.grounded = col.grounded;
        if (col.hitWall) {
          pushAudio(world, 'bump');
        }
        enemy.facing = enemy.vx >= 0 ? 1 : -1;

        // Moving shell hits other enemies!
        for (const other of world.enemies) {
          if (other === enemy || !other.alive || other.kind === 'piranha') continue;
          if (aabbOverlap(enemy.x, enemy.y, enemy.w, enemy.h, other.x, other.y, other.w, other.h)) {
            enemy.shellCombo = (enemy.shellCombo ?? 0) + 1;
            const comboTable = [200, 400, 800, 1600, 3200];
            const pts = comboTable[Math.min(comboTable.length - 1, enemy.shellCombo - 1)];
            koEnemyFlip(world, other, enemy.vx >= 0 ? 1 : -1, pts);
            pushAudio(world, 'kick');
            world.hitstop = 0.03;
            world.trauma = Math.min(1, world.trauma + 0.18);
          }
        }
      } else {
        const col = moveAndCollideTiles(world, enemy, simDt, {
          bounceHorizontal: true,
          stopAtEdges: true,
        });
        enemy.grounded = col.grounded;
        enemy.facing = enemy.vx >= 0 ? 1 : -1;
      }
    } else {
      // Goomba walker
      enemy.vy = Math.min(PHYSICS.maxFallSpeed, enemy.vy + PHYSICS.gravity * simDt);
      const col = moveAndCollideTiles(world, enemy, simDt, { bounceHorizontal: true });
      enemy.grounded = col.grounded;
      enemy.facing = enemy.vx >= 0 ? 1 : -1;
    }

    if (enemy.y > VIRTUAL_HEIGHT + 64) {
      enemy.alive = false;
      enemy.koTimer = 0;
      continue;
    }

    // Player <-> Enemy interaction
    if (!p.dead && !p.flagSlide && aabbOverlap(p.x + 2, p.y + 2, p.w - 4, p.h - 2, enemy.x + 2, enemy.y + 2, enemy.w - 4, enemy.h - 2)) {
      if (p.starTimer > 0) {
        koEnemyFlip(world, enemy, p.vx >= 0 ? 1 : -1, 200);
        pushAudio(world, 'kick');
        world.hitstop = 0.035;
        continue;
      }

      // Kick stationary Koopa shell from either side
      if (enemy.kind === 'koopa' && enemy.koopaState === 'shell_idle') {
        const kickDir: 1 | -1 = p.x + p.w / 2 < enemy.x + enemy.w / 2 ? 1 : -1;
        enemy.koopaState = 'shell_moving';
        enemy.vx = kickDir * 340;
        enemy.shellCombo = 0;
        enemy.x += kickDir * 8;
        pushAudio(world, 'kick');
        addScore(world, 400);
        addFloatingText(world, enemy.x, enemy.y - 10, '+400', '#4ADE80');
        continue;
      }

      // Check stomp from above (player descending and feet near top half of enemy)
      const playerBottom = p.y + p.h;
      const isStomp = p.vy > 0 && playerBottom - p.vy * simDt <= enemy.y + enemy.h * 0.58;

      if (isStomp) {
        p.stompCombo += 1;
        const stompPts = Math.min(1600, 100 * Math.pow(2, p.stompCombo - 1));
        p.vy = p.jumpBufferTimer > 0 ? PHYSICS.stompHighBounceVelocity : PHYSICS.stompBounceVelocity;
        p.y = enemy.y - p.h - 1;
        p.scaleX = 1.18;
        p.scaleY = 0.82;
        world.hitstop = 0.04;
        world.trauma = Math.min(1, world.trauma + 0.22);
        pushAudio(world, 'stomp');

        if (enemy.kind === 'goomba') {
          koEnemySquash(world, enemy, stompPts);
        } else if (enemy.kind === 'parakoopa') {
          // Lose wings and turn into ground koopa
          enemy.kind = 'koopa';
          enemy.koopaState = 'walk';
          enemy.h = 36;
          enemy.vx = enemy.facing * 62;
          enemy.hitFlash = 0.08;
          addScore(world, stompPts);
          addFloatingText(world, enemy.x, enemy.y - 8, `+${stompPts}`, '#FDE047');
        } else if (enemy.kind === 'koopa') {
          if (enemy.koopaState === 'walk' || enemy.koopaState === 'shell_moving') {
            enemy.koopaState = 'shell_idle';
            enemy.vx = 0;
            enemy.y = enemy.y + (enemy.h - 26);
            enemy.h = 26;
            enemy.shellTimer = 0;
            enemy.hitFlash = 0.06;
            addScore(world, stompPts);
            addFloatingText(world, enemy.x, enemy.y - 8, `+${stompPts}`, '#4ADE80');
          }
        }
      } else {
        damagePlayer(world);
      }
    }
  }

  world.enemies = world.enemies.filter((e) => e.alive || e.koTimer > 0);
}

function updateBlocksAndParticles(world: WorldState, realDt: number, simDt: number): void {
  // Block bounce animation
  for (const meta of world.blocks.values()) {
    if (meta.bounceY < 0 || meta.bounceVy !== 0) {
      meta.bounceY += meta.bounceVy * simDt;
      meta.bounceVy += 420 * simDt;
      if (meta.bounceY >= 0) {
        meta.bounceY = 0;
        meta.bounceVy = 0;
      }
    }
  }

  // Particles tick in realDt so visual juice stays crisp during hitstop
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    p.life += realDt;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }
    p.vy += p.gravity * realDt;
    p.x += p.vx * realDt;
    p.y += p.vy * realDt;
    p.rot += p.vRot * realDt;
    p.alpha = 1 - p.life / p.maxLife;
  }

  // Floating texts
  for (const ft of world.floatingTexts) {
    ft.life += realDt;
    ft.y += ft.vy * realDt;
  }
  world.floatingTexts = world.floatingTexts.filter((f) => f.life < f.maxLife);
}

export function stepWorld(
  world: WorldState,
  input: InputState,
  rawDt: number,
  viewportWorldWidth = 768,
): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  world.worldTime += dt;

  // Title screen gentle ambient world pan
  if (world.phase === 'title') {
    const maxCam = Math.max(0, world.widthTiles * TILE_SIZE - viewportWorldWidth);
    world.cameraX = Math.min(maxCam, 90 + Math.sin(world.worldTime * 0.22) * 90);
    updateBlocksAndParticles(world, dt, dt * 0.5);
    return;
  }

  if (world.phase !== 'playing') {
    return;
  }

  // Trauma decay in real dt
  world.trauma = Math.max(0, world.trauma - dt * 1.9);

  // Hitstop freezes simulation physics briefly while particles/shake continue
  let simDt = dt;
  if (world.hitstop > 0) {
    world.hitstop = Math.max(0, world.hitstop - dt);
    simDt = 0;
  }

  if (simDt > 0) {
    // Stage timer countdown (unless dead or sliding down flagpole)
    if (!world.player.dead && !world.player.flagSlide) {
      world.elapsedTime += simDt;
      world.timeRemaining = Math.max(0, world.timeRemaining - simDt);
      if (world.timeRemaining <= 0) {
        killPlayer(world);
      }
    }

    updateMovingPlatforms(world, simDt);
    updatePlayer(world, input, simDt);
    updateItems(world, simDt);
    updateWorldCoins(world);
    updateFireballs(world, simDt);
    updateEnemies(world, simDt);

    // Smooth camera follow with lookahead
    const targetCam = world.player.x - viewportWorldWidth * 0.36;
    const maxCam = Math.max(0, world.widthTiles * TILE_SIZE - viewportWorldWidth);
    const clampedTarget = Math.max(0, Math.min(maxCam, targetCam));
    world.cameraX += (clampedTarget - world.cameraX) * Math.min(1, simDt * 8.5);
  }

  updateBlocksAndParticles(world, dt, simDt);

  // Handle pending death respawn or game over transition
  if (world.deathPendingTimer > 0) {
    world.deathPendingTimer -= dt;
    if (world.deathPendingTimer <= 0) {
      if (world.lives > 1) {
        const nextLives = world.lives - 1;
        const fresh = createWorld(world.stageIndex, {
          phase: 'playing',
          score: world.score,
          bestScore: world.bestScore,
          coins: world.coins,
          lives: nextLives,
          power: 'small',
        });
        Object.assign(world, fresh);
      } else {
        world.lives = 0;
        world.phase = 'gameover';
        pushAudio(world, 'gameover');
      }
    }
  }

  // Handle victory transition after entering castle
  if (world.victoryPendingTimer > 0) {
    world.victoryPendingTimer -= dt;
    if (world.victoryPendingTimer <= 0) {
      world.phase = 'victory';
      pushAudio(world, 'victory');
    }
  }
}

export function buildRunSnapshot(world: WorldState, isVictory: boolean): RunSnapshot {
  const progressPct = isVictory
    ? 100
    : Math.max(0, Math.min(99, Math.round((world.player.x / Math.max(1, world.flagX)) * 100)));
  return {
    stageIndex: world.stageIndex,
    stageCode: world.stageCode,
    stageName: world.stageName,
    score: Math.round(world.score),
    bestScore: Math.round(world.bestScore),
    coins: world.coins,
    lives: world.lives,
    timeRemaining: Math.round(world.timeRemaining),
    clearTime: Math.round(world.elapsedTime),
    progressPct,
    enemiesDefeated: world.enemiesDefeated,
    isVictory,
  };
}
