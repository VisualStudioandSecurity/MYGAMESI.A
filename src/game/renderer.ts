import { TILE_SIZE } from './levels';
import { PARTICLE_POOL_SIZE, VIRTUAL_HEIGHT } from './physics';
import type { Enemy, Player, WorldState } from './types';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  viewW: number,
): void {
  const { theme, cameraX, worldTime } = world;

  // 1. Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  if (theme === 'overworld') {
    grad.addColorStop(0, '#3B82F6');
    grad.addColorStop(0.55, '#60A5FA');
    grad.addColorStop(1, '#BAE6FD');
  } else if (theme === 'underground') {
    grad.addColorStop(0, '#070B19');
    grad.addColorStop(0.6, '#111936');
    grad.addColorStop(1, '#1E293B');
  } else {
    grad.addColorStop(0, '#1E1B4B');
    grad.addColorStop(0.45, '#9A3412');
    grad.addColorStop(1, '#FB923C');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, VIRTUAL_HEIGHT);

  if (theme === 'overworld') {
    // Sun glow
    ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.beginPath();
    ctx.arc(viewW * 0.82 - cameraX * 0.03, 88, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(viewW * 0.82 - cameraX * 0.03, 88, 28, 0, Math.PI * 2);
    ctx.fill();

    // Parallax clouds (single unified path so there are no internal alpha seams)
    const cloudSpan = 280;
    const cloudStart = Math.floor((cameraX * 0.25) / cloudSpan) - 1;
    const cloudCount = Math.ceil(viewW / cloudSpan) + 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    for (let i = cloudStart; i < cloudStart + cloudCount; i++) {
      const cx = i * cloudSpan - cameraX * 0.25 + ((i * 53) % 70) + Math.sin(worldTime * 0.3 + i) * 6;
      const cy = 58 + ((Math.abs(i) * 47) % 85);
      const cw = 72 + (Math.abs(i) % 3) * 18;
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.24, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.24, cy - 8, cw * 0.3, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.52, cy, cw * 0.22, 0, Math.PI * 2);
      ctx.roundRect(cx - cw * 0.16, cy - 2, cw * 0.84, cw * 0.25, 8);
      ctx.fill();
    }

    // Parallax rolling hills
    const hillSpan = 340;
    const hillStart = Math.floor((cameraX * 0.45) / hillSpan) - 1;
    const hillCount = Math.ceil(viewW / hillSpan) + 3;
    for (let i = hillStart; i < hillStart + hillCount; i++) {
      const hx = i * hillSpan - cameraX * 0.45;
      const hh = 92 + (Math.abs(i) % 2) * 38;
      ctx.fillStyle = i % 2 === 0 ? '#16A34A' : '#22C55E';
      ctx.beginPath();
      ctx.moveTo(hx - 40, VIRTUAL_HEIGHT - 64);
      ctx.quadraticCurveTo(hx + 95, VIRTUAL_HEIGHT - 64 - hh * 1.4, hx + 230, VIRTUAL_HEIGHT - 64);
      ctx.closePath();
      ctx.fill();

      // Hill highlights
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(hx + 72, VIRTUAL_HEIGHT - 64 - hh * 0.65, 10, 0, Math.PI * 2);
      ctx.arc(hx + 104, VIRTUAL_HEIGHT - 64 - hh * 0.45, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Foreground bushes
    const bushSpan = 260;
    const bushStart = Math.floor((cameraX * 0.72) / bushSpan) - 1;
    const bushCount = Math.ceil(viewW / bushSpan) + 3;
    for (let i = bushStart; i < bushStart + bushCount; i++) {
      const bx = i * bushSpan - cameraX * 0.72 + 40;
      const by = VIRTUAL_HEIGHT - 64;
      ctx.fillStyle = '#15803D';
      ctx.beginPath();
      ctx.arc(bx, by - 6, 16, Math.PI, 0);
      ctx.arc(bx + 20, by - 12, 22, Math.PI, 0);
      ctx.arc(bx + 42, by - 6, 15, Math.PI, 0);
      ctx.fill();
    }
  } else if (theme === 'underground') {
    // Glowing cavern crystals & stalactites
    const span = 220;
    const start = Math.floor((cameraX * 0.35) / span) - 1;
    const count = Math.ceil(viewW / span) + 3;
    for (let i = start; i < start + count; i++) {
      const sx = i * span - cameraX * 0.35 + 40;
      const sh = 65 + (Math.abs(i) % 3) * 28;
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(sx - 24, 64);
      ctx.lineTo(sx, 64 + sh);
      ctx.lineTo(sx + 26, 64);
      ctx.closePath();
      ctx.fill();

      // Crystal shimmer
      const glowAlpha = 0.25 + 0.15 * Math.sin(worldTime * 2 + i);
      ctx.fillStyle = `rgba(56, 189, 248, ${glowAlpha})`;
      ctx.beginPath();
      ctx.moveTo(sx - 7, 64 + sh * 0.45);
      ctx.lineTo(sx, 64 + sh + 12);
      ctx.lineTo(sx + 7, 64 + sh * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Fortress sunset silhouettes & drifting sky clouds
    const towerSpan = 280;
    const tStart = Math.floor((cameraX * 0.35) / towerSpan) - 1;
    const tCount = Math.ceil(viewW / towerSpan) + 3;
    for (let i = tStart; i < tStart + tCount; i++) {
      const tx = i * towerSpan - cameraX * 0.35;
      const th = 140 + (Math.abs(i) % 3) * 45;
      ctx.fillStyle = 'rgba(30, 27, 75, 0.52)';
      ctx.fillRect(tx, VIRTUAL_HEIGHT - th, 68, th);
      // Battlements
      ctx.fillRect(tx - 4, VIRTUAL_HEIGHT - th - 14, 18, 14);
      ctx.fillRect(tx + 25, VIRTUAL_HEIGHT - th - 14, 18, 14);
      ctx.fillRect(tx + 54, VIRTUAL_HEIGHT - th - 14, 18, 14);
      // Lit windows
      ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.fillRect(tx + 26, VIRTUAL_HEIGHT - th + 28, 16, 22);
    }

    // Golden cloud bands
    const cSpan = 300;
    const cStart = Math.floor((cameraX * 0.2) / cSpan) - 1;
    const cCount = Math.ceil(viewW / cSpan) + 3;
    for (let i = cStart; i < cStart + cCount; i++) {
      const cx = i * cSpan - cameraX * 0.2;
      const cy = 78 + (Math.abs(i) % 3) * 34;
      ctx.fillStyle = 'rgba(254, 215, 170, 0.28)';
      drawRoundedRect(ctx, cx, cy, 110, 24, 12);
      ctx.fill();
    }
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, doorX: number, groundY: number): void {
  const cx = doorX - 58;
  const cw = 128;
  const ch = 128;
  const topY = groundY - ch;

  // Main brick body
  ctx.fillStyle = '#B45309';
  ctx.fillRect(cx, topY + 32, cw, ch - 32);
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx, topY + 32, cw, ch - 32);

  // Upper turret
  ctx.fillStyle = '#D97706';
  ctx.fillRect(cx + 28, topY, cw - 56, 38);
  ctx.strokeRect(cx + 28, topY, cw - 56, 38);

  // Battlements
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#D97706';
    ctx.fillRect(cx + i * 26, topY + 22, 16, 12);
    ctx.strokeRect(cx + i * 26, topY + 22, 16, 12);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(cx + 28 + i * 28, topY - 12, 16, 12);
    ctx.strokeRect(cx + 28 + i * 28, topY - 12, 16, 12);
  }

  // Arched castle door
  ctx.fillStyle = '#1E1B18';
  ctx.beginPath();
  ctx.arc(doorX + 6, groundY - 32, 18, Math.PI, 0);
  ctx.lineTo(doorX + 24, groundY);
  ctx.lineTo(doorX - 12, groundY);
  ctx.closePath();
  ctx.fill();

  // Slit windows
  ctx.fillStyle = '#1E1B18';
  ctx.fillRect(cx + 20, topY + 52, 12, 22);
  ctx.fillRect(cx + cw - 32, topY + 52, 12, 22);
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  tx: number,
  ty: number,
  x: number,
  y: number,
): void {
  const tile = world.tiles[ty][tx];
  if (tile === 'empty' || tile === 'castle') return;

  const meta = world.blocks.get(`${tx},${ty}`);
  const drawY = y + (meta ? meta.bounceY : 0);

  if (tile === 'ground') {
    const isTopGround = ty === 0 || world.tiles[ty - 1][tx] !== 'ground';
    const w = TILE_SIZE + 0.8;
    const h = TILE_SIZE + 0.8;
    if (world.theme === 'overworld') {
      ctx.fillStyle = '#9A4B23';
      ctx.fillRect(x - 0.4, y - 0.4, w, h);
      ctx.fillStyle = '#7C3616';
      ctx.fillRect(x + 4, y + 14, 10, 6);
      ctx.fillRect(x + 18, y + 22, 9, 6);
      if (isTopGround) {
        ctx.fillStyle = '#16A34A';
        ctx.fillRect(x - 0.4, y - 0.4, w, 9.5);
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(x - 0.4, y - 0.4, w, 3.2);
      }
    } else if (world.theme === 'underground') {
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(x - 0.4, y - 0.4, w, h);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      if (isTopGround) {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(x - 0.4, y - 0.4, w, 4.5);
      }
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 0.4, y - 0.4, w, h);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      if (isTopGround) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(x - 0.4, y - 0.4, w, 5.2);
      }
    }
    return;
  }

  if (tile === 'brick') {
    const base = world.theme === 'underground' ? '#1D4ED8' : world.theme === 'fortress' ? '#78350F' : '#C2410C';
    const light = world.theme === 'underground' ? '#60A5FA' : world.theme === 'fortress' ? '#D97706' : '#FB923C';
    const dark = '#1E1B18';
    ctx.fillStyle = base;
    ctx.fillRect(x, drawY, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = light;
    ctx.fillRect(x + 2, drawY + 2, TILE_SIZE - 4, 3);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, drawY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    // Brick mortar pattern
    ctx.beginPath();
    ctx.moveTo(x, drawY + 16);
    ctx.lineTo(x + TILE_SIZE, drawY + 16);
    ctx.moveTo(x + 16, drawY);
    ctx.lineTo(x + 16, drawY + 16);
    ctx.moveTo(x + 8, drawY + 16);
    ctx.lineTo(x + 8, drawY + TILE_SIZE);
    ctx.moveTo(x + 24, drawY + 16);
    ctx.lineTo(x + 24, drawY + TILE_SIZE);
    ctx.stroke();
    return;
  }

  if (tile === 'question') {
    const pulse = 0.5 + 0.5 * Math.sin(world.worldTime * 6.5);
    ctx.fillStyle = pulse > 0.5 ? '#F59E0B' : '#FBBF24';
    drawRoundedRect(ctx, x + 1, drawY + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Corner rivets
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x + 4, drawY + 4, 3, 3);
    ctx.fillRect(x + TILE_SIZE - 7, drawY + 4, 3, 3);
    ctx.fillRect(x + 4, drawY + TILE_SIZE - 7, 3, 3);
    ctx.fillRect(x + TILE_SIZE - 7, drawY + TILE_SIZE - 7, 3, 3);
    // Crisp '?'
    ctx.fillStyle = '#FFFBEB';
    ctx.font = '800 18px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + TILE_SIZE / 2, drawY + TILE_SIZE / 2 + 1);
    return;
  }

  if (tile === 'used') {
    ctx.fillStyle = '#78716C';
    drawRoundedRect(ctx, x + 1, drawY + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
    ctx.fill();
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#44403C';
    ctx.fillRect(x + 5, drawY + 5, 3, 3);
    ctx.fillRect(x + TILE_SIZE - 8, drawY + 5, 3, 3);
    ctx.fillRect(x + 5, drawY + TILE_SIZE - 8, 3, 3);
    ctx.fillRect(x + TILE_SIZE - 8, drawY + TILE_SIZE - 8, 3, 3);
    return;
  }

  if (tile === 'stone') {
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 2, y + TILE_SIZE - 5, TILE_SIZE - 4, 3);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    return;
  }

  if (tile === 'bridge') {
    ctx.fillStyle = '#B45309';
    ctx.fillRect(x, y, TILE_SIZE, 14);
    ctx.fillStyle = '#FCD34D';
    ctx.fillRect(x, y, TILE_SIZE, 4);
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, 13);
    return;
  }

  if (tile === 'pipe_tl' || tile === 'pipe_tr' || tile === 'pipe_bl' || tile === 'pipe_br') {
    const isLeft = tile === 'pipe_tl' || tile === 'pipe_bl';
    const isTop = tile === 'pipe_tl' || tile === 'pipe_tr';
    const bodyX = isLeft ? x + 2 : x;
    const bodyW = TILE_SIZE - 2;

    if (isTop) {
      // Pipe rim
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = isLeft ? '#4ADE80' : '#15803D';
      ctx.fillRect(isLeft ? x + 5 : x, y + 2, isLeft ? 10 : TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + (isLeft ? 1 : -1), y + 1, TILE_SIZE, TILE_SIZE - 2);
    } else {
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(bodyX, y, bodyW, TILE_SIZE);
      ctx.fillStyle = isLeft ? '#4ADE80' : '#15803D';
      ctx.fillRect(isLeft ? bodyX + 4 : bodyX, y, isLeft ? 9 : bodyW - 4, TILE_SIZE);
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(bodyX + 1, y);
        ctx.lineTo(bodyX + 1, y + TILE_SIZE);
      } else {
        ctx.moveTo(x + TILE_SIZE - 3, y);
        ctx.lineTo(x + TILE_SIZE - 3, y + TILE_SIZE);
      }
      ctx.stroke();
    }
    return;
  }

  if (tile === 'flag_pole') {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(x + TILE_SIZE / 2 - 3, y, 6, TILE_SIZE);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + TILE_SIZE / 2 - 3, y, 6, TILE_SIZE);
    return;
  }

  if (tile === 'flag_top') {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(x + TILE_SIZE / 2 - 3, y + 14, 6, TILE_SIZE - 14);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + 12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, worldTime: number): void {
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;

  ctx.save();
  if (enemy.koType === 'flip') {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
  } else if (enemy.koType === 'squash') {
    ctx.translate(cx, enemy.y + enemy.h);
    ctx.scale(1.25, 0.35);
    ctx.translate(-cx, -(enemy.y + enemy.h));
  }

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = 0.7;
  }

  if (enemy.kind === 'goomba') {
    // Mushroom cap
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.arc(cx, enemy.y + 12, 13, Math.PI, 0);
    ctx.lineTo(enemy.x + enemy.w, enemy.y + 16);
    ctx.lineTo(enemy.x, enemy.y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cream stem
    ctx.fillStyle = '#FDE68A';
    drawRoundedRect(ctx, enemy.x + 5, enemy.y + 14, enemy.w - 10, 10, 4);
    ctx.fill();
    ctx.stroke();

    // Angry brows & eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 7, enemy.y + 7, 5, 6);
    ctx.fillRect(cx + 2, enemy.y + 7, 5, 6);
    ctx.fillStyle = '#1E1B18';
    ctx.fillRect(cx - 5, enemy.y + 9, 3, 4);
    ctx.fillRect(cx + 3, enemy.y + 9, 3, 4);
    ctx.beginPath();
    ctx.moveTo(cx - 8, enemy.y + 6);
    ctx.lineTo(cx - 1, enemy.y + 9);
    ctx.moveTo(cx + 8, enemy.y + 6);
    ctx.lineTo(cx + 1, enemy.y + 9);
    ctx.stroke();

    // Waddling feet
    const step = enemy.alive ? Math.sin(worldTime * 12) * 3 : 0;
    ctx.fillStyle = '#451A03';
    drawRoundedRect(ctx, enemy.x + 2 + step, enemy.y + enemy.h - 7, 9, 7, 3);
    ctx.fill();
    drawRoundedRect(ctx, enemy.x + enemy.w - 11 - step, enemy.y + enemy.h - 7, 9, 7, 3);
    ctx.fill();
  } else if (enemy.kind === 'koopa' || enemy.kind === 'parakoopa') {
    const isShell = enemy.kind === 'koopa' && (enemy.koopaState === 'shell_idle' || enemy.koopaState === 'shell_moving');
    const isWaking = enemy.kind === 'koopa' && enemy.koopaState === 'shell_idle' && (enemy.shellTimer ?? 0) > 4.6;
    const shakeX = isWaking ? Math.sin(worldTime * 42) * 2.5 : 0;
    const shellColor = enemy.kind === 'parakoopa' ? '#DC2626' : '#16A34A';

    ctx.translate(shakeX, 0);

    if (isShell) {
      // Shell only
      ctx.fillStyle = shellColor;
      drawRoundedRect(ctx, enemy.x, enemy.y + 2, enemy.w, enemy.h - 2, 10);
      ctx.fill();
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 2;
      ctx.stroke();
      // White belly rim
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(enemy.x + 2, enemy.y + enemy.h - 7, enemy.w - 4, 5);
      // Shell highlight stripe
      ctx.fillStyle = '#86EFAC';
      ctx.fillRect(enemy.x + 6, enemy.y + 6, enemy.w - 12, 4);
    } else {
      // Crouch windup telegraph for parakoopa before jumping
      const crouch = enemy.kind === 'parakoopa' && enemy.grounded && (enemy.jumpWindup ?? 1) < 0.22 ? 0.84 : 1;
      if (crouch < 1) {
        ctx.translate(cx, enemy.y + enemy.h);
        ctx.scale(1.12, crouch);
        ctx.translate(-cx, -(enemy.y + enemy.h));
      }

      // Head
      const headX = enemy.facing > 0 ? enemy.x + enemy.w - 10 : enemy.x;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(headX + 5, enemy.y + 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E1B18';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Eye
      ctx.fillStyle = '#1E1B18';
      ctx.fillRect(headX + (enemy.facing > 0 ? 7 : 1), enemy.y + 7, 3, 4);

      // Shell back
      ctx.fillStyle = shellColor;
      drawRoundedRect(ctx, enemy.x + 2, enemy.y + 10, enemy.w - 4, 20, 8);
      ctx.fill();
      ctx.stroke();

      // Wings for Parakoopa
      if (enemy.kind === 'parakoopa') {
        const flap = Math.sin(worldTime * 18) * 5;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(cx - enemy.facing * 6, enemy.y + 12 + flap, 9, 5, -0.35 * enemy.facing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Feet
      const step = Math.sin(worldTime * 11) * 3;
      ctx.fillStyle = '#F59E0B';
      drawRoundedRect(ctx, enemy.x + 3 + step, enemy.y + enemy.h - 7, 9, 7, 3);
      ctx.fill();
      drawRoundedRect(ctx, enemy.x + enemy.w - 12 - step, enemy.y + enemy.h - 7, 9, 7, 3);
      ctx.fill();
    }
  } else if (enemy.kind === 'piranha') {
    if (enemy.piranhaPhase === 'hidden') {
      ctx.restore();
      return;
    }
    // Stem
    ctx.fillStyle = '#15803D';
    ctx.fillRect(cx - 4, enemy.y + 16, 8, enemy.h - 14);
    // Red spotted bulb head
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, enemy.y + 12, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#450A0A';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Spots
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 5, enemy.y + 10, 3, 0, Math.PI * 2);
    ctx.arc(cx + 6, enemy.y + 13, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Teeth chomp
    const chomp = Math.abs(Math.sin(worldTime * 9)) * 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 7, enemy.y + 1, 14, 3 + chomp);
  }

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, worldTime: number): void {
  if (player.invulnTimer > 0 && Math.floor(worldTime * 18) % 2 === 0 && !player.dead) {
    return; // Invulnerability blink
  }

  const cx = player.x + player.w / 2;
  const footY = player.y + player.h;

  ctx.save();
  ctx.translate(cx, footY);
  ctx.scale(player.facing * player.scaleX, player.scaleY);

  // Starman rainbow aura
  if (player.starTimer > 0) {
    const hue = Math.floor((worldTime * 420) % 360);
    ctx.shadowColor = `hsl(${hue}, 95%, 60%)`;
    ctx.shadowBlur = 14;
  }

  const isBig = player.power !== 'small';
  const isFire = player.power === 'fire';
  const hatColor = isFire ? '#F8FAFC' : '#DC2626';
  const shirtColor = isFire ? '#EF4444' : '#B91C1C';
  const overallColor = isFire ? '#FFFFFF' : '#2563EB';
  const h = player.h;
  const w = player.w;

  const stride = player.grounded && Math.abs(player.vx) > 12 ? Math.sin(player.walkDistance * 0.22) * 4 : 0;

  // Boots
  ctx.fillStyle = '#451A03';
  drawRoundedRect(ctx, -w / 2 + 1 + stride, -7, 9, 7, 2);
  ctx.fill();
  drawRoundedRect(ctx, w / 2 - 10 - stride, -7, 9, 7, 2);
  ctx.fill();

  // Overalls / Torso
  ctx.fillStyle = shirtColor;
  drawRoundedRect(ctx, -w / 2 + 2, -h * 0.56, w - 4, h * 0.28, 3);
  ctx.fill();

  ctx.fillStyle = overallColor;
  drawRoundedRect(ctx, -w / 2 + 2, -h * 0.42, w - 4, h * 0.25, 3);
  ctx.fill();
  ctx.strokeStyle = '#1E1B18';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Gold overall buttons
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-4, -h * 0.4, 3, 3);
  ctx.fillRect(2, -h * 0.4, 3, 3);

  // Arm (raised during jump!)
  ctx.fillStyle = shirtColor;
  if (!player.grounded) {
    drawRoundedRect(ctx, 2, -h * 0.66, 7, 10, 3);
    ctx.fill();
  } else {
    drawRoundedRect(ctx, -w / 2 - 2, -h * 0.52 + stride * 0.5, 6, 10, 3);
    ctx.fill();
  }

  // Head
  const headR = isBig ? 10.5 : 8.5;
  const headY = -h + headR + 4;
  ctx.fillStyle = '#FDBA74';
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1E1B18';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Eye & Mustache
  ctx.fillStyle = '#1E1B18';
  ctx.fillRect(3, headY - 3, 2.5, 4);
  ctx.fillStyle = '#451A03';
  drawRoundedRect(ctx, 1, headY + 1, 7, 3, 1.5);
  ctx.fill();

  // Cap + Brim + 'M' emblem
  ctx.fillStyle = hatColor;
  ctx.beginPath();
  ctx.arc(0, headY - 2, headR + 1, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cap visor pointing forward
  ctx.fillStyle = isFire ? '#DC2626' : hatColor;
  drawRoundedRect(ctx, 0, headY - 4, headR + 4, 4, 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  canvasWidth: number,
  canvasHeight: number,
): number {
  const scale = canvasHeight / VIRTUAL_HEIGHT;
  const viewWorldW = canvasWidth / scale;

  ctx.save();
  ctx.scale(scale, scale);

  // Trauma camera shake
  const shakeAmt = world.trauma * world.trauma * 10;
  const shakeX = shakeAmt > 0.1 ? Math.sin(world.worldTime * 67) * shakeAmt : 0;
  const shakeY = shakeAmt > 0.1 ? Math.cos(world.worldTime * 53) * shakeAmt : 0;

  drawBackground(ctx, world, viewWorldW);

  ctx.save();
  ctx.translate(-Math.round(world.cameraX + shakeX), Math.round(shakeY));

  // Draw castle behind tiles/flagpole
  drawCastle(ctx, world.castleDoorX, (world.heightTiles - 2) * TILE_SIZE);

  // Draw Piranha plants BEFORE pipes so they emerge from inside pipe mouths!
  for (const enemy of world.enemies) {
    if (enemy.kind === 'piranha') {
      drawEnemy(ctx, enemy, world.worldTime);
    }
  }

  // Draw visible tiles only
  const startTx = Math.max(0, Math.floor(world.cameraX / TILE_SIZE) - 1);
  const endTx = Math.min(world.widthTiles - 1, Math.ceil((world.cameraX + viewWorldW) / TILE_SIZE) + 1);
  for (let ty = 0; ty < world.heightTiles; ty++) {
    for (let tx = startTx; tx <= endTx; tx++) {
      drawTile(ctx, world, tx, ty, tx * TILE_SIZE, ty * TILE_SIZE);
    }
  }

  // Flagpole banner
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.moveTo(world.flagX + 3, world.flagSlideY);
  ctx.lineTo(world.flagX - 24, world.flagSlideY + 10);
  ctx.lineTo(world.flagX + 3, world.flagSlideY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Moving platforms
  for (const mp of world.movingPlatforms) {
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, mp.x, mp.y, mp.w, mp.h, 4);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(mp.x + 3, mp.y + 2, mp.w - 6, 3);
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // World coins
  for (const coin of world.worldCoins) {
    if (coin.collected) continue;
    const bob = Math.sin(world.worldTime * 4.5 + coin.bobOffset) * 3;
    const spinWidth = 4 + Math.abs(Math.cos(world.worldTime * 4 + coin.bobOffset)) * 6;
    const cx = coin.x + 10;
    const cy = coin.y + 12 + bob;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(cx, cy, spinWidth, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#FEF9C3';
    ctx.fillRect(cx - spinWidth * 0.25, cy - 5, Math.max(1.5, spinWidth * 0.35), 10);
  }

  // Collectible items
  for (const item of world.items) {
    if (!item.active) continue;
    if (item.kind === 'coin_pop') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.ellipse(item.x + 8, item.y + 10, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (item.kind === 'mushroom' || item.kind === 'one_up') {
      const cap = item.kind === 'one_up' ? '#16A34A' : '#EF4444';
      ctx.fillStyle = '#FEF3C7';
      drawRoundedRect(ctx, item.x + 5, item.y + 13, item.w - 10, 13, 4);
      ctx.fill();
      ctx.strokeStyle = '#1E1B18';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + 13, 13, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + 7, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'fire_flower') {
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(item.x + 11, item.y + 14, 4, 12);
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(item.x + 13, item.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(item.x + 13, item.y + 10, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'star') {
      const cx = item.x + 13;
      const cy = item.y + 13;
      ctx.fillStyle = Math.floor(world.worldTime * 12) % 2 === 0 ? '#FACC15' : '#FDE047';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 13 : 6;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // Non-piranha enemies
  for (const enemy of world.enemies) {
    if (enemy.kind !== 'piranha') {
      drawEnemy(ctx, enemy, world.worldTime);
    }
  }

  // Fireballs
  for (const fb of world.fireballs) {
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player
  drawPlayer(ctx, world.player, world.worldTime);

  // Pooled particles
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  // Floating score popups
  for (const ft of world.floatingTexts) {
    const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 13px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1E1B18';
    ctx.strokeText(ft.text, ft.x + 12, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x + 12, ft.y);
    ctx.restore();
  }

  ctx.restore(); // camera translate

  // Critical low vitality peripheral vignette (last life & small)
  if (world.phase === 'playing' && world.lives === 1 && world.player.power === 'small') {
    const pulse = 0.14 + 0.08 * Math.sin(world.worldTime * 4.5);
    const vig = ctx.createRadialGradient(
      viewWorldW / 2,
      VIRTUAL_HEIGHT / 2,
      VIRTUAL_HEIGHT * 0.35,
      viewWorldW / 2,
      VIRTUAL_HEIGHT / 2,
      viewWorldW * 0.72,
    );
    vig.addColorStop(0, 'rgba(220, 38, 38, 0)');
    vig.addColorStop(1, `rgba(220, 38, 38, ${pulse})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, viewWorldW, VIRTUAL_HEIGHT);
  }

  ctx.restore();
  return viewWorldW;
}
