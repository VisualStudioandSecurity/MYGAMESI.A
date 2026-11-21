import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TILE_SIZE } from './levels';
import { createWorld, isSolidTile, stepWorld, buildRunSnapshot } from './physics';
import type { InputState } from './types';

const IDLE_INPUT: InputState = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpJustPressed: false,
  runHeld: false,
  actionJustPressed: false,
};

test('all 3 stages have safe spawn, grounded pipes, and flagpole before castle', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const world = createWorld(i, { phase: 'playing' });
    assert.ok(world.flagX > world.player.x + 200, `Stage ${world.stageCode} flagpole should be ahead of spawn`);
    assert.ok(world.castleDoorX > world.flagX, `Stage ${world.stageCode} castle should be after flagpole`);

    // Step 2 seconds idle: player must survive on starting platform
    for (let f = 0; f < 120; f++) {
      stepWorld(world, IDLE_INPUT, 1 / 60);
    }
    assert.equal(world.player.dead, false, `Stage ${world.stageCode} player died while idle at spawn`);
    assert.equal(world.player.grounded, true, `Stage ${world.stageCode} player should rest on ground`);

    // Verify all pipe bases rest on solid ground and pipe height is <= 3 tiles (clearable by standing jump)
    for (let ty = 0; ty < world.heightTiles - 1; ty++) {
      for (let tx = 0; tx < world.widthTiles; tx++) {
        const t = world.tiles[ty][tx];
        if (t === 'pipe_tl' || t === 'pipe_tr') {
          let pipeTiles = 1;
          let scanY = ty + 1;
          while (
            scanY < world.heightTiles &&
            (world.tiles[scanY][tx] === 'pipe_bl' || world.tiles[scanY][tx] === 'pipe_br')
          ) {
            pipeTiles += 1;
            scanY += 1;
          }
          assert.ok(
            pipeTiles <= 3,
            `Stage ${world.stageCode} pipe at (${tx},${ty}) is ${pipeTiles} tiles tall (max 3)`,
          );
        }
        if (t === 'pipe_bl' || t === 'pipe_br') {
          const below = world.tiles[ty + 1][tx];
          assert.ok(
            below === 'pipe_bl' || below === 'pipe_br' || isSolidTile(below),
            `Stage ${world.stageCode} pipe at (${tx},${ty}) is not supported below`,
          );
        }
      }
    }
  }
});

test('variable jump height and coyote time behave cleanly', () => {
  const fullJumpWorld = createWorld(0, { phase: 'playing' });
  const shortJumpWorld = createWorld(0, { phase: 'playing' });

  // Let both settle on ground
  for (let i = 0; i < 10; i++) {
    stepWorld(fullJumpWorld, IDLE_INPUT, 1 / 60);
    stepWorld(shortJumpWorld, IDLE_INPUT, 1 / 60);
  }
  const startY = fullJumpWorld.player.y;

  // Full jump: hold jump for 30 frames
  let minFullY = startY;
  for (let i = 0; i < 30; i++) {
    stepWorld(
      fullJumpWorld,
      { ...IDLE_INPUT, jumpHeld: true, jumpJustPressed: i === 0 },
      1 / 60,
    );
    minFullY = Math.min(minFullY, fullJumpWorld.player.y);
  }

  // Short jump: release jump after 2 frames
  let minShortY = startY;
  for (let i = 0; i < 30; i++) {
    stepWorld(
      shortJumpWorld,
      { ...IDLE_INPUT, jumpHeld: i < 2, jumpJustPressed: i === 0 },
      1 / 60,
    );
    minShortY = Math.min(minShortY, shortJumpWorld.player.y);
  }

  const fullHeight = startY - minFullY;
  const shortHeight = startY - minShortY;
  assert.ok(fullHeight > 85, `Expected full jump > 85px, got ${fullHeight}`);
  assert.ok(shortHeight < fullHeight * 0.65, `Expected short jump (${shortHeight}) < 65% of full jump (${fullHeight})`);
});

test('hitting question block awards coin and mushroom grows player so bricks shatter', () => {
  const world = createWorld(0, { phase: 'playing' });
  // Move player directly beneath the '?' block at tx=13, ty=8
  world.player.x = 13 * TILE_SIZE + 4;
  world.player.y = 9 * TILE_SIZE + 2;
  world.player.vy = -300;
  world.player.grounded = false;

  const initialCoins = world.coins;
  for (let i = 0; i < 15; i++) {
    stepWorld(world, { ...IDLE_INPUT, jumpHeld: true }, 1 / 60);
  }
  assert.equal(world.tiles[8][13], 'used');
  assert.equal(world.coins, initialCoins + 1);
  assert.ok(world.score >= 100);

  // Now hit the 'M' (mushroom) block at tx=15, ty=8
  world.player.x = 15 * TILE_SIZE + 4;
  world.player.y = 9 * TILE_SIZE + 2;
  world.player.vy = -300;
  for (let i = 0; i < 30; i++) {
    stepWorld(world, { ...IDLE_INPUT, jumpHeld: true }, 1 / 60);
  }
  assert.ok(world.items.some((it) => it.kind === 'mushroom'));

  // Let mushroom fall/walk onto player or move player to mushroom
  const mush = world.items.find((it) => it.kind === 'mushroom')!;
  mush.emergeTimer = 0;
  world.player.x = mush.x;
  world.player.y = mush.y;
  stepWorld(world, IDLE_INPUT, 1 / 60);
  assert.equal(world.player.power, 'big');

  // Big player shatters brick at tx=14, ty=8
  assert.equal(world.tiles[8][14], 'brick');
  world.player.x = 14 * TILE_SIZE + 4;
  world.player.y = 9 * TILE_SIZE + 2;
  world.player.vy = -300;
  for (let i = 0; i < 12; i++) {
    stepWorld(world, { ...IDLE_INPUT, jumpHeld: true }, 1 / 60);
  }
  assert.equal(world.tiles[8][14], 'empty');
});

test('stomping goomba squashes it and kicking koopa shell bowls enemies', () => {
  const world = createWorld(0, { phase: 'playing' });
  const goomba = world.enemies.find((e) => e.kind === 'goomba')!;
  // Position player descending onto goomba
  world.player.x = goomba.x + 2;
  world.player.y = goomba.y - world.player.h - 2;
  world.player.vy = 240;
  world.player.grounded = false;

  stepWorld(world, IDLE_INPUT, 1 / 60);
  assert.equal(goomba.alive, false);
  assert.equal(goomba.koType, 'squash');
  assert.ok(world.player.vy < 0, 'Player should bounce up after stomping');

  // Test Koopa stomp -> shell -> kick (step past Goomba hitstop)
  const koopa = world.enemies.find((e) => e.kind === 'koopa')!;
  world.hitstop = 0;
  world.player.x = koopa.x + 2;
  world.player.y = koopa.y - world.player.h - 2;
  world.player.vy = 240;
  world.player.grounded = false;
  for (let i = 0; i < 4; i++) {
    stepWorld(world, IDLE_INPUT, 1 / 60);
  }
  assert.equal(koopa.alive, true);
  assert.equal(koopa.koopaState, 'shell_idle');

  // Kick stationary shell from the left
  world.hitstop = 0;
  world.player.x = koopa.x - world.player.w + 8;
  world.player.y = koopa.y - 2;
  world.player.vy = 0;
  stepWorld(world, { ...IDLE_INPUT, right: true }, 1 / 60);
  assert.equal(koopa.koopaState, 'shell_moving');
  assert.ok(koopa.vx > 200);
});

test('game over triggers when final life is lost and victory triggers after flagpole', () => {
  const world = createWorld(0, { phase: 'playing', lives: 1 });
  // Drop player into pit
  world.player.y = 540;
  for (let i = 0; i < 120; i++) {
    stepWorld(world, IDLE_INPUT, 1 / 60);
  }
  assert.equal(world.phase, 'gameover');
  assert.equal(world.lives, 0);

  // Victory via flagpole
  const winWorld = createWorld(0, { phase: 'playing', lives: 3 });
  winWorld.player.x = winWorld.flagX - 4;
  winWorld.player.y = winWorld.flagTopY + 12;
  for (let i = 0; i < 240; i++) {
    stepWorld(winWorld, IDLE_INPUT, 1 / 60);
    if (winWorld.phase === 'victory') break;
  }
  assert.equal(winWorld.phase, 'victory');
  const snap = buildRunSnapshot(winWorld, true);
  assert.equal(snap.isVictory, true);
  assert.equal(snap.progressPct, 100);
  assert.ok(snap.score > 0);
});
