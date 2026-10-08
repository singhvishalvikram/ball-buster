const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const bestText = document.getElementById('best');

const design = { w: 960, h: 540 };
let W = design.w;
let H = design.h;
const keys = { left: false, right: false };
const isAndroidPhone = /Android/i.test(navigator.userAgent) && window.matchMedia('(pointer: coarse)').matches;

if (isAndroidPhone) {
  document.body.classList.add('android-phone');
}

let bestScore = Number(localStorage.getItem('ball-buster-best') || '0');
bestText.textContent = `Best: ${bestScore}`;

const state = {
  started: false,
  over: false,
  score: 0,
  level: 1,
  time: 0,
  spawnTimer: 0,
  lastTime: 0,
  pointerX: design.w * 0.5,
  enemies: [],
  stars: [],
  player: {
    x: design.w * 0.5,
    y: design.h - 26,
    w: 140,
    h: 18,
    speed: 360,
  },
  ball: {
    x: design.w * 0.5,
    y: design.h - 54,
    vx: 0,
    vy: 0,
    r: 12,
    launched: false,
    trail: [],
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  const shellWidth = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
  const maxWidth = Math.min(shellWidth, 980);
  const maxHeight = Math.min(window.innerHeight * 0.7, 680);
  const ratio = design.h / design.w;

  let nextWidth = maxWidth;
  let nextHeight = nextWidth * ratio;

  if (isAndroidPhone) {
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    nextWidth = window.innerWidth;
    nextHeight = viewportHeight;
  } else if (nextHeight > maxHeight) {
    nextHeight = maxHeight;
    nextWidth = nextHeight / ratio;
  }

  const prevW = W;
  const prevH = H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = nextWidth;
  H = nextHeight;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (prevW && prevH) {
    const scaleX = W / prevW;
    const scaleY = H / prevH;
    const scale = Math.min(scaleX, scaleY);

    state.player.x *= scaleX;
    state.player.y *= scaleY;
    state.player.w *= scaleX;
    state.player.h *= scaleY;
    state.player.speed *= scale;

    state.ball.x *= scaleX;
    state.ball.y *= scaleY;
    state.ball.r *= scale;

    state.pointerX *= scaleX;

    state.enemies = state.enemies.map((enemy) => ({
      ...enemy,
      x: enemy.x * scaleX,
      y: enemy.y * scaleY,
      r: enemy.r * scale,
      speed: enemy.speed * scale,
    }));

    state.stars = state.stars.map((star) => ({
      ...star,
      x: star.x * scaleX,
      y: star.y * scaleY,
      r: star.r * scale,
      speed: star.speed * scale,
    }));
  }

  state.player.x = clamp(state.player.x, state.player.w * 0.5, W - state.player.w * 0.5);
  state.player.y = H - state.player.h * 0.5 - 6;

  state.ball.x = clamp(state.ball.x, state.ball.r, W - state.ball.r);
  state.ball.y = clamp(state.ball.y, state.ball.r, H - state.ball.r);
  state.pointerX = clamp(state.pointerX, 0, W);
}

function setupStars() {
  state.stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 2.2 + 1,
    speed: Math.random() * 0.5 + 0.4,
  }));
}

function resetBall() {
  state.player.y = H - state.player.h * 0.5 - 6;
  state.ball.x = state.player.x;
  state.ball.y = state.player.y - state.ball.r - 14;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.launched = false;
  state.ball.trail = [];
}

function resetGame() {
  state.started = true;
  state.over = false;
  state.score = 0;
  state.level = 1;
  state.time = 0;
  state.spawnTimer = 0;
  state.enemies = [];
  state.player.x = W * 0.5;
  state.player.y = H - state.player.h * 0.5 - 6;
  resetBall();
  updateHud();
}

function launchBall() {
  if (!state.started && !state.over) {
    resetGame();
  }

  if (state.over) {
    resetGame();
    return;
  }

  if (state.ball.launched) {
    return;
  }

  const aim = (state.pointerX - state.player.x) * 0.012;
  const speed = 420;

  state.ball.launched = true;
  state.ball.vx = randomBetween(-0.55, 0.55) * speed * 0.85 + Math.sin(aim) * speed * 0.45;
  state.ball.vy = -Math.abs(randomBetween(0.8, 1.2) * speed * 0.8 + Math.cos(aim) * speed * 0.2);
}

function updateHud() {
  scoreText.textContent = `Score: ${state.score}`;
  bestText.textContent = `Best: ${bestScore}`;
}

function spawnEnemy() {
  const size = randomBetween(18, 34);
  const angle = randomBetween(-0.65, 0.65);
  const base = 150 + state.score * 2.8;

  state.enemies.push({
    x: W + size + 20,
    y: randomBetween(70, H - 110),
    r: size,
    speed: base * randomBetween(0.8, 1.25),
    drift: angle,
    bob: Math.random() * Math.PI * 2,
  });
}

function addTrail() {
  state.ball.trail.push({ x: state.ball.x, y: state.ball.y, life: 1 });
  if (state.ball.trail.length > 10) {
    state.ball.trail.shift();
  }

  state.ball.trail.forEach((dot) => {
    dot.life -= 0.1;
  });
  state.ball.trail = state.ball.trail.filter((dot) => dot.life > 0);
}

function update(dt) {
  const moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  state.player.x += moveDir * state.player.speed * dt;
  state.player.x = clamp(state.player.x, state.player.w * 0.5, W - state.player.w * 0.5);

  if (!state.over && state.started) {
    state.time += dt;
    state.level = 1 + Math.floor(state.time / 10);
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = clamp(1.4 - state.level * 0.08, 0.5, 1.3);
    }

    state.enemies.forEach((enemy) => {
      enemy.x -= enemy.speed * dt;
      enemy.y += Math.sin(state.time * 4 + enemy.bob) * 16 * dt;
      enemy.bob += 0.06;
    });

    state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.r > -20);

    if (state.ball.launched) {
      addTrail();
      state.ball.x += state.ball.vx * dt;
      state.ball.y += state.ball.vy * dt;

      if (state.ball.x < state.ball.r || state.ball.x > W - state.ball.r) {
        state.ball.x = clamp(state.ball.x, state.ball.r, W - state.ball.r);
        state.ball.vx *= -1;
      }

      if (state.ball.y < state.ball.r) {
        state.ball.y = state.ball.r;
        state.ball.vy *= -1;
      }

      const paddleTop = state.player.y - state.player.h * 0.5;
      const paddleBottom = state.player.y + state.player.h * 0.5;
      const paddleLeft = state.player.x - state.player.w * 0.5;
      const paddleRight = state.player.x + state.player.w * 0.5;

      if (
        state.ball.y + state.ball.r >= paddleTop &&
        state.ball.y - state.ball.r <= paddleBottom &&
        state.ball.x >= paddleLeft &&
        state.ball.x <= paddleRight &&
        state.ball.vy > 0
      ) {
        const hitOffset = (state.ball.x - state.player.x) / (state.player.w * 0.5);
        state.ball.y = paddleTop - state.ball.r;
        state.ball.vy = -Math.abs(state.ball.vy) * 1.08;
        state.ball.vx += hitOffset * 180;
      }

      state.enemies.forEach((enemy) => {
        const dx = state.ball.x - enemy.x;
        const dy = state.ball.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < state.ball.r + enemy.r) {
          state.score += 1;
          bestScore = Math.max(bestScore, state.score);
          localStorage.setItem('ball-buster-best', String(bestScore));
          updateHud();
          enemy.x = -999;
          state.ball.vx *= -1.04;
          state.ball.vy *= -1.02;
        }
      });

      const hitPlayer = state.enemies.some((enemy) => {
        const closeX = Math.abs(enemy.x - state.player.x) < enemy.r + state.player.w * 0.5;
        const closeY = Math.abs(enemy.y - state.player.y) < enemy.r + state.player.h * 0.5;
        return closeX && closeY;
      });

      if (state.ball.y > H + state.ball.r || hitPlayer) {
        state.over = true;
        state.started = false;
      }
    }
  }

  if (state.over) {
    state.ball.vx = 0;
    state.ball.vy = 0;
  }

  if (!state.started && !state.over) {
    state.ball.x = state.player.x;
    state.ball.y = state.player.y - state.ball.r - 14;
  }
}

function drawBackground() {
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, W, H);

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  state.stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > H) star.y = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(125, 211, 252, 0.12)';
  for (let i = 0; i < 7; i += 1) {
    const y = i * 80 + 18;
    ctx.fillRect(0, y, W, 1);
  }
}

function drawPlayer() {
  const x = state.player.x;
  const y = state.player.y;
  const w = state.player.w;
  const h = state.player.h;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(x - w * 0.5, y - h * 0.5, w, h);

  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x - w * 0.28, y - h * 0.6, w * 0.56, h * 0.6);
}

function drawBall() {
  state.ball.trail.forEach((dot, index) => {
    ctx.fillStyle = `rgba(251, 113, 133, ${0.2 + index * 0.08})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, state.ball.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    const glow = 0.18 + Math.sin(state.time * 10 + enemy.bob) * 0.08;
    ctx.fillStyle = `rgba(248, 113, 113, ${glow})`;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fee2e2';
    ctx.beginPath();
    ctx.arc(enemy.x - enemy.r * 0.28, enemy.y - enemy.r * 0.18, enemy.r * 0.22, 0, Math.PI * 2);
    ctx.arc(enemy.x + enemy.r * 0.2, enemy.y - enemy.r * 0.18, enemy.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ecfeff';
  ctx.font = '700 48px Segoe UI';
  ctx.fillText(state.over ? 'BOOM! You got zapped.' : 'Ball Buster', W / 2, H / 2 - 28);

  ctx.font = '600 24px Segoe UI';
  ctx.fillStyle = '#facc15';
  ctx.fillText(state.over ? 'Press space or click to restart' : 'Move with A/D or your mouse', W / 2, H / 2 + 20);
}

function render() {
  drawBackground();
  drawPlayer();
  drawEnemies();
  drawBall();

  if (!state.started && !state.over) {
    drawOverlay();
  }

  if (state.over) {
    drawOverlay();
  }
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
  state.lastTime = timestamp;

  if (state.started || state.over) {
    update(dt);
  }

  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = true;
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = true;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    if (!state.started && !state.over) {
      resetGame();
    }
    launchBall();
  }
  if (event.key.toLowerCase() === 'r' && state.over) {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = false;
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = false;
  }
});

window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const rawX = ((event.clientX - rect.left) / rect.width) * W;
  state.pointerX = clamp(rawX, 0, W);
  state.player.x = clamp(rawX, state.player.w * 0.5, W - state.player.w * 0.5);
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    event.preventDefault();
  }

  if (!state.started && !state.over) {
    resetGame();
  }
  launchBall();
});

resizeCanvas();
setupStars();
resetBall();
updateHud();
requestAnimationFrame(loop);
