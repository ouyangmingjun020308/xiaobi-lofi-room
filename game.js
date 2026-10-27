/* ================================================================
   小比的像素小屋 · XIAOBI'S LOFI ROOM
   像素风 lofi 治愈互动 demo（单房间 + 立绘状态切换）
   ================================================================ */
'use strict';

const $ = id => document.getElementById(id);

/* ---------------- 状态 ---------------- */
const S = {
  score: 0,
  started: false,
  music: false,
  timeIdx: 0,
  track: 0,
  found: new Set(),
  hints: true,
  seenStates: new Set(['sit']),
  allFound: false,
  allStates: false,
  lampOn: true,
  windowOpen: false,
};
const TIMES = ['day', 'night'];

/* ================================================================
   像素粒子系统（方块暖尘 / 星屑）
   ================================================================ */
const fx = $('fx'), fc = fx.getContext('2d');
let W = 0, H = 0, PXU = 3;
const motes = [], sparks = [];

function resize(){
  const r = $('stage').getBoundingClientRect();
  W = Math.round(r.width); H = Math.round(r.height);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  fx.width = W * dpr; fx.height = H * dpr;
  fx.style.width = W + 'px'; fx.style.height = H + 'px';
  fc.setTransform(dpr, 0, 0, dpr, 0, 0);
  fc.imageSmoothingEnabled = false;
  PXU = Math.max(2, Math.round(W / 480));
}
addEventListener('resize', resize);

const snap = v => Math.round(v / PXU) * PXU;

const MOTE_COLORS = ['#ffd9a0', '#fff0d6', '#ffc06b', '#f6b088', '#ffe9c7'];
const DUST_SHAPE = [
  [0,1,0],
  [1,2,1],
  [0,1,0],
];
const PAW_SHAPE = [
  [1,0,1,0],
  [1,2,2,1],
  [0,1,1,0],
];

function spawnMote(){
  const isPaw = Math.random() < .3;
  motes.push({
    x: Math.random() * W,
    y: -14,
    vy: .2 + Math.random() * .4,
    phase: Math.random() * Math.PI * 2,
    sway: .5 + Math.random() * 1.0,
    shape: isPaw ? PAW_SHAPE : DUST_SHAPE,
    scale: isPaw ? 1.15 : (Math.random() < .5 ? 1 : 1.4),
    color: MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
    t: Math.random() * 60,
  });
}

function drawShape(shape, cx, cy, unit, color, alpha){
  fc.globalAlpha = alpha;
  const h = shape.length, w = shape[0].length;
  const ox = cx - (w * unit) / 2, oy = cy - (h * unit) / 2;
  for(let r = 0; r < h; r++){
    for(let c = 0; c < w; c++){
      const v = shape[r][c];
      if(!v) continue;
      fc.fillStyle = v === 2 ? '#ffffff' : color;
      fc.fillRect(snap(ox + c * unit), snap(oy + r * unit), unit, unit);
    }
  }
  fc.globalAlpha = 1;
}

function burst(x, y, color){
  const n = 10;
  for(let i = 0; i < n; i++){
    const a = (Math.PI * 2 * i) / n + Math.random() * .4;
    const sp = 1.1 + Math.random() * 2.2;
    sparks.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .8,
      life: 1, color: color || '#ffc06b',
      size: 1 + Math.floor(Math.random() * 2),
    });
  }
}

let lastSpawn = 0;
function loop(t){
  fc.clearRect(0, 0, W, H);

  if(S.started && t - lastSpawn > 680 && motes.length < 18){
    spawnMote(); lastSpawn = t;
  }

  for(let i = motes.length - 1; i >= 0; i--){
    const m = motes[i];
    m.t++;
    m.phase += .022 * m.sway;
    m.x += Math.sin(m.phase) * .5;
    m.y += m.vy;
    if(m.y > H + 16){ motes.splice(i, 1); continue; }
    let a = .4 + .4 * (0.5 + 0.5 * Math.sin(m.t * .09));
    if(m.y > H * .88) a *= Math.max(0, 1 - (m.y - H * .88) / (H * .12));
    drawShape(m.shape, m.x, m.y, PXU * m.scale, m.color, a);
  }

  for(let i = sparks.length - 1; i >= 0; i--){
    const s = sparks[i];
    s.x += s.vx; s.y += s.vy; s.vy += .07; s.life -= .026;
    if(s.life <= 0){ sparks.splice(i, 1); continue; }
    const u = PXU * s.size;
    fc.globalAlpha = Math.max(0, s.life);
    fc.fillStyle = s.color;
    fc.fillRect(snap(s.x), snap(s.y), u, u);
    fc.globalAlpha = 1;
  }
  requestAnimationFrame(loop);
}

/* ================================================================
   电子钟：真实时间
   ================================================================ */
function tickClock(){
  const d = new Date();
  let h = d.getHours();
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  $('clockBox').textContent = `${ap} ${String(h).padStart(2, '0')}:${m}`;
}
tickClock(); setInterval(tickClock, 10000);

/* ================================================================
   打字机对话框
   ================================================================ */
let typing = null, dlgTimer = null;
/* 小比说话时气泡跟随到角色头侧；其它（物件等）保持底部居中 */
function positionDlg(who){
  const dlg = $('dlg'), sr = $('stage').getBoundingClientRect();
  if(who === '小比'){
    const vis = catCanvas.classList.contains('show') ? catCanvas : catImg;
    const r = vis.getBoundingClientRect();
    let cx = (r.left + r.width / 2 - sr.left) / sr.width * 100;
    cx = Math.max(18, Math.min(82, cx));
    let bot = (sr.bottom - r.top) / sr.height * 100 + 2; // 底边贴猫头顶稍上
    bot = Math.min(bot, 90);
    dlg.style.top = 'auto';
    dlg.style.left = cx + '%';
    dlg.style.bottom = bot + '%';
  } else {
    dlg.style.top = 'auto';
    dlg.style.left = '50%';
    dlg.style.bottom = '3%';
  }
}
function say(text, who = '小比'){
  const dlg = $('dlg'), el = $('dlgText');
  $('dlgWho').textContent = who;
  positionDlg(who);
  dlg.classList.add('show');
  dlg.classList.remove('done');
  clearInterval(typing); clearTimeout(dlgTimer);
  el.textContent = '';
  let i = 0;
  typing = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if(i % 2 === 0) blip(1300 + Math.random() * 360, .012, 'square', .04);
    if(i >= text.length){
      clearInterval(typing);
      dlg.classList.add('done');
      dlgTimer = setTimeout(() => dlg.classList.remove('show'), 2600);
    }
  }, 36);
}

/* ================================================================
   计分 / 飘字
   ================================================================ */
function addScore(n, x, y, label){
  S.score += n;
  const el = $('score');
  el.textContent = S.score;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  const p = document.createElement('div');
  p.className = 'plus';
  p.textContent = label || ('+' + n);
  p.style.left = x + 'px'; p.style.top = y + 'px';
  $('stage').appendChild(p);
  setTimeout(() => p.remove(), 1100);
}

function floaties(cx, cy, n = 4){
  for(let i = 0; i < n; i++){
    setTimeout(() => {
      const h = document.createElement('div');
      h.className = 'fh';
      h.textContent = ['♥', '♡', '✦', '🐾'][Math.floor(Math.random() * 4)];
      h.style.color = MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)];
      h.style.left = (cx + (Math.random() - .5) * 70) + 'px';
      h.style.top = (cy + (Math.random() - .5) * 40) + 'px';
      $('stage').appendChild(h);
      setTimeout(() => h.remove(), 1550);
    }, i * 130);
  }
}

/* 点击飘落的暖尘；点击空白处让小比瞬移；拖拽小比移动 */
/* （合并后的事件处理见下方 moveCatTo 之后） */

/* 小比瞬移到指定位置（用 sit 立绘） */
function moveCatTo(leftPct, bottomPct){
  clearTimeout(gotoTimer);
  gotoTimer = null;
  const st = STATES[STATE_IDX.sit];
  const c = st.cat;
  // 保证当前是 sit 立绘；若不是，先切
  if(curState !== STATE_IDX.sit){
    catEl.className = 'sit';
    document.body.dataset.catstate = 'sit';
    startVideoSprite(st);
    catVideo.pause();
  }
  catEl.style.left = leftPct + '%';
  catEl.style.bottom = bottomPct + '%';
  catEl.style.height = c.h + '%';
  curState = STATE_IDX.sit;
  syncShade(); setTimeout(syncShade, 300);
  $('stateName').textContent = st.name;
  const sb = $('stateBadge');
  sb.querySelector('.si').textContent = st.icon;
  // 同步移动小比热区到当前位置（大致跟随）
  const hc = $('h-cat');
  hc.style.left = (leftPct - 14) + '%';
  hc.style.top = (100 - bottomPct - 40) + '%';
  hc.style.width = '28%';
  hc.style.height = '42%';
  // 到位音效（不蹦跳）
  blip(660, .05, 'square', .08);
  setTimeout(() => keepBirdClearOfCat(true), 80);
  armAutoState();   // 手动瞬移也算一次互动，重新计时
}

/* ---------- 拖拽小比：左键拖动，双击切换动作 ---------- */
/* 物理约束：只能在地面/地毯上，不能爬上沙发靠背、猫包、窗台、灯；
   睡姿允许躺在猫窝的凹陷里。坐标均为舞台 %（left 从左、bottom 从底）。 */
const FLOOR = { minBottom: 1.5, minLeft: 6, maxLeft: 80, wallTop: 85 };
/* 猫碗右缘（舞台 %）：小比的活动范围左边界不得越过猫碗。
   猫以中心锚定，实际左边界 = 猫碗右缘 + 猫身半宽（见 placeCatAt / syncShade）。 */
const BOWL_RIGHT_PCT = 17.5;
let catHalfWPct = 11;   // 当前动作猫元素的半宽（舞台 %），由 syncShade 按实际渲染宽度刷新
/* 家具在地面上的阻挡带：猫只能走到家具“前缘”，不能被抬到家具上面。
   立绘不随纵深缩小，一旦抬高就会显得踩在半空/踩在后方木条上，所以整体只允许靠前的地毯区域。 */
const BLOCKERS = [
  { x0: 30, x1: 82, groundBottom: 14 }, // 中间大猫窝/沙发及其右缘：只站窝前地毯（封住沙发右侧到落地灯间的空档）
  { x0: 4,  x1: 31, groundBottom: 16 }, // 左侧猫包/饭碗一带前缘
  { x0: 84, x1: 100, groundBottom: 16 },// 右侧落地灯一带
];
/* 睡姿专属：窝垫凹陷范围（躺在窝里是合理的，不算穿模） */
const BED_ZONE = { x0: 38, x1: 68, b0: 18, b1: 37 };
let dragging = false, dragOffset = { x: 0, y: 0 };
let dragStart = { x: 0, y: 0 }, dragMoved = false;
let dragRaf = 0, dragTarget = null;   // 拖动按 rAF 合帧，避免每个 pointermove 都触发布局
let lastCatClickTime = 0;
const DOUBLE_CLICK_MS = 350, DRAG_THRESHOLD = 4;

/* 可拖拽状态：坐着、睡觉 */
const DRAGGABLE = new Set(['sit', 'sleep']);

/* 根据当前状态猫的高度计算最大 bottom，确保猫顶不超过墙面（点击瞬移的预钳制，
   最终仍会过 placeCatAt 的逐列地面高度） */
function getMaxBottom(){
  const c = STATES[curState].cat;
  return Math.min(16, FLOOR.wallTop - c.h);
}

/* 该水平位置处，地面可行走的最远（最高）bottom；被家具挡住则只到家具前缘。
   开阔处也只给 15%：立绘不随纵深缩小，再高就会显得踩在后方半空。 */
function groundMaxBottom(leftPct){
  let m = 15; // 开阔地板/地毯可走到的最远位置（只在前缘地毯）
  for(const b of BLOCKERS){
    if(leftPct >= b.x0 && leftPct <= b.x1) m = Math.min(m, b.groundBottom);
  }
  return m;
}
function inBedZone(leftPct, bottomPct){
  return leftPct >= BED_ZONE.x0 && leftPct <= BED_ZONE.x1 &&
         bottomPct >= BED_ZONE.b0 && bottomPct <= BED_ZONE.b1;
}

function placeCatAt(leftPct, bottomPct){
  const st = STATES[curState];
  const c = st.cat;
  const minL = BOWL_RIGHT_PCT + catHalfWPct;   // 猫的左缘不越过猫碗
  leftPct = Math.max(minL, Math.min(FLOOR.maxLeft, leftPct));
  /* 睡姿躺在窝内时允许到窝垫高度；其余一律压到该列的地面可行走高度，
     杜绝爬上沙发靠背/猫包而盖住家具的穿模 */
  let cap = groundMaxBottom(leftPct);
  if(st.key === 'sleep' && inBedZone(leftPct, bottomPct)) cap = BED_ZONE.b1;
  cap = Math.min(cap, FLOOR.wallTop - c.h);
  bottomPct = Math.max(FLOOR.minBottom, Math.min(cap, bottomPct));
  catEl.style.left = leftPct + '%';
  catEl.style.bottom = bottomPct + '%';
  catEl.style.height = c.h + '%';
  /* 拖动进行中只更新位置：阴影宽度与动作有关、热区只影响下次点击，
     不必每帧重算（syncShade 里的 getBoundingClientRect 会强制回流，是卡顿主因）。
     松手后会用非拖动路径再调一次 placeCatAt 补齐。 */
  if(dragging) return;
  syncShade();
  const hc = $('h-cat');
  hc.style.left = (leftPct - 14) + '%';
  hc.style.top = (100 - bottomPct - 40) + '%';
  hc.style.width = '28%'; hc.style.height = '42%';
}

function isCatHit(px, py){
  const r = $('stage').getBoundingClientRect();
  const visEl = catCanvas.classList.contains('show') ? catCanvas : catImg;
  const cr = visEl.getBoundingClientRect();
  const catCx = cr.left - r.left + cr.width / 2;
  const catCy = cr.top - r.top + cr.height / 2;
  const hitW = cr.width * 0.55, hitH = cr.height * 0.5;
  return Math.abs(px - catCx) < hitW && Math.abs(py - catCy) < hitH;
}

function cycleState(){
  const next = (curState + 1) % STATES.length;
  setState(next);
}

/* 小比每隔 10 秒自己换一个动作（发呆 ↔ 睡觉）。自动切换保持安静：不播音效、不弹台词，
   只换立绘/位置/徽章。任何一次真实切换（手动或自动）后都重新计时，避免刚手动换完又被打断；
   拖动中、动作锁定的 700ms 内、或刚点了猫窝等待走过去时，顺延本次。
   特例：夜晚睡着时让小比多睡一会儿（夜睡停留更久），其余状态仍是 10 秒。 */
const AUTO_STATE_MS = 10000;
const NIGHT_SLEEP_MS = 30000;   // 夜晚进入“睡觉中”后的停留时长
let autoStateTimer = null;
function stateHoldMs(){
  if(curState === STATE_IDX.sleep && TIMES[S.timeIdx] === 'night') return NIGHT_SLEEP_MS;
  return AUTO_STATE_MS;
}
function armAutoState(){
  clearTimeout(autoStateTimer);
  autoStateTimer = setTimeout(() => {
    if(!S.started || dragging || switching || gotoTimer){ armAutoState(); return; }
    setState((curState + 1) % STATES.length, true);
  }, stateHoldMs());
}

/* 窗户每隔 10 秒自动开/关一次。自动切换保持安静：只换窗态与背景，不播音效、不弹台词。
   用户手动双击窗户后立即重新计时，避免刚操作完就被自动打断。 */
const AUTO_WINDOW_MS = 10000;
let autoWindowTimer = null;
function setWindowOpen(open){
  S.windowOpen = open;
  document.body.dataset.window = open ? 'open' : 'closed';
  setBG(sceneKey());
}
function armAutoWindow(){
  clearTimeout(autoWindowTimer);
  autoWindowTimer = setTimeout(() => {
    if(!S.started){ armAutoWindow(); return; }
    setWindowOpen(!S.windowOpen);
    armAutoWindow();
  }, AUTO_WINDOW_MS);
}

/* 白天/夜晚每隔 30 秒自动切换一次。自动切换保持安静：只走视觉换肤
   （data-time、夜色调、四态背景、立绘、按钮图标），不播音效、不弹台词。
   用户手动点时段按钮后立即重新计时。 */
const AUTO_TIME_MS = 30000;
let autoTimeTimer = null;
function applyTime(idx){
  S.timeIdx = idx;
  const k = TIMES[idx];
  document.body.dataset.time = k;
  startNightMix();          // 画布小比与 CSS 元素共用同一条 2s ease 时间轴
  setBG(sceneKey());        // 换时段时保留窗户开关状态（日/夜 × 开/关 四态叠化）
  if(STATES[curState].type === 'image') crossfadeCatImg(spriteSrc(STATES[curState]));
  $('btnTime').textContent = ['☀', '🌙'][idx];
}
function armAutoTime(){
  clearTimeout(autoTimeTimer);
  autoTimeTimer = setTimeout(() => {
    if(!S.started){ armAutoTime(); return; }
    applyTime((S.timeIdx + 1) % TIMES.length);
    armAutoTime();
  }, AUTO_TIME_MS);
}

/* 蘑菇灯自动循环：开 30 秒 → 关 5 秒 → 再开，往复。自动切换保持安静：只走视觉换肤
   （data-lamp、CSS 暖光/熄灭、画布小比布光），不播音效、不弹台词。
   下一次翻转的等待时长由当前灯态决定；用户双击灯后立即重新计时。 */
const LAMP_ON_MS = 30000;    // 亮灯持续
const LAMP_OFF_MS = 5000;    // 熄灯持续
let autoLampTimer = null;
function setLampOn(on){
  S.lampOn = on;
  document.body.dataset.lamp = on ? 'on' : 'off';
}
function armAutoLamp(){
  clearTimeout(autoLampTimer);
  autoLampTimer = setTimeout(() => {
    if(!S.started){ armAutoLamp(); return; }
    setLampOn(!S.lampOn);
    armAutoLamp();
  }, S.lampOn ? LAMP_ON_MS : LAMP_OFF_MS);   // 亮→30s 后熄；熄→5s 后亮
}

$('stage').addEventListener('pointerdown', e => {
  if(!S.started) return;
  if(e.button !== undefined && e.button !== 0) return; // 仅左键
  const r = $('stage').getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;

  // 命中小比 → 准备拖动（双击在 pointerup 判断）
  if(isCatHit(px, py)){
    dragMoved = false;
    dragging = true;
    dragTarget = null;
    if(dragRaf){ cancelAnimationFrame(dragRaf); dragRaf = 0; }
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    const visEl = catCanvas.classList.contains('show') ? catCanvas : catImg;
    const cr = visEl.getBoundingClientRect();
    dragOffset.x = px - (cr.left - r.left + cr.width / 2);
    dragOffset.y = py - (cr.top - r.top + cr.height / 2);
    catInner.classList.remove('hop');
    try { $('stage').setPointerCapture(e.pointerId); } catch(_){}
    blip(520, .04, 'square', .06);
    return;
  }
  // 其他热区/HUD/右上角按钮/对话框不响应（按钮只在 click 里拦截，挡不住这里的 pointerdown，
  // 故必须在此排除 #ctrls，否则点按钮会被当成“点空白处”把小比瞬移过去）
  if(e.target.closest('.hot') || e.target.closest('#hud') || e.target.closest('#ctrls') || e.target.closest('#dialog') || e.target.closest('#banner')) return;
  // 点击飘落暖尘
  for(let i = motes.length - 1; i >= 0; i--){
    const m = motes[i];
    const dx = m.x - px, dy = m.y - py;
    const rad = PXU * 4 + 16;
    if(dx * dx + dy * dy < rad * rad){
      motes.splice(i, 1);
      burst(m.x, m.y, m.color);
      addScore(1, m.x - 10, m.y - 12);
      blip(720 + Math.random() * 260, .07, 'square');
      return;
    }
  }
  // 点击空白处瞬移（仅当前是可拖拽状态时）
  if(DRAGGABLE.has(STATES[curState].key)){
    const leftPct = (px / r.width) * 100;
    const maxB = getMaxBottom();
    const bottomPct = Math.max(FLOOR.minBottom, Math.min(maxB, ((r.height - py) / r.height) * 100));
    placeCatAt(leftPct, bottomPct);
    saveCatPos();
    blip(660, .05, 'square', .08);
  }
});

$('stage').addEventListener('pointermove', e => {
  if(!dragging) return;
  // 用起始位置判断是否真正拖动
  if(!dragMoved){
    if(Math.abs(e.clientX - dragStart.x) > DRAG_THRESHOLD || Math.abs(e.clientY - dragStart.y) > DRAG_THRESHOLD){
      dragMoved = true;
    } else {
      return; // 没超过阈值，不移动
    }
  }
  const r = $('stage').getBoundingClientRect();
  const px = e.clientX - r.left - dragOffset.x;
  const py = e.clientY - r.top - dragOffset.y;
  // 只记录目标落点，由 rAF 合帧写一次样式（与屏幕刷新对齐，跟手不抖、不重复回流）
  dragTarget = [(px / r.width) * 100, ((r.height - py) / r.height) * 100];
  if(!dragRaf){
    dragRaf = requestAnimationFrame(() => {
      dragRaf = 0;
      if(dragging && dragTarget){
        placeCatAt(dragTarget[0], dragTarget[1]);
      }
    });
  }
});

$('stage').addEventListener('pointerup', e => {
  if(!dragging) return;
  dragging = false;
  try { $('stage').releasePointerCapture(e.pointerId); } catch(_){}
  if(dragMoved){
    // 取消尚未执行的合帧，立刻用最新落点完整放置一次（补齐阴影与热区）
    if(dragRaf){ cancelAnimationFrame(dragRaf); dragRaf = 0; }
    if(dragTarget){ placeCatAt(dragTarget[0], dragTarget[1]); dragTarget = null; }
    // 拖动到位：仅音效，不蹦跳；记住落点，刷新后保持
    saveCatPos();
    keepBirdClearOfCat(true);
    blip(620, .04, 'square', .06);
  } else {
    // 没拖动 → 判断双击切状态
    const now = Date.now();
    if(now - lastCatClickTime < DOUBLE_CLICK_MS){
      lastCatClickTime = 0;
      cycleState();
      blip(720, .06, 'square', .07);
    } else {
      lastCatClickTime = now;
    }
  }
});

/* ================================================================
   状态系统 —— 小比在房间里可以做的事
   每个状态 = 立绘图 + 槽位（left/bottom/height）+ 热区盒 + 台词
   ================================================================ */
const STATES = [
  {
    key: 'sit', name: '发呆中', icon: '◈', type: 'video', src: 'assets/sit.webm?v=28',
    png: 'assets/sit.png',   // 同构图的静态降级图（浏览器不支持视频 alpha 时使用）
    cat: { left: 63, bottom: 1.5, h: 43, shade: 62 },
    box: { l: 45.5, t: 54, w: 36, h: 45 },
    enter: '在地毯上团成一块猫饼，尾巴仔细地把爪子盖好。',
    lines: [
      '尾巴尖一抖一抖的，其实没有睡着。',
      '这块地毯被太阳晒得刚刚好，占住。',
      '你看什么看，没见过猫发呆吗。',
      '发呆的时候，一只猫等于一整间屋子的安静。',
      '再摸两下头，本比就勉强原谅你今天晚回家。',
    ],
  },
  {
    key: 'sleep', name: '睡觉中', icon: 'z', type: 'image', src: 'assets/sleep.png?v=25',
    cat: { left: 50.5, bottom: 30, h: 22, shade: 62 },
    box: { l: 34, t: 54, w: 33, h: 22 },
    enter: '窝刚晒过，整只猫陷进去，呼噜声立刻响了起来。',
    lines: [
      'zzz……胡子还在一抖一抖。',
      '这个窝的每个边边，都被本比踩奶踩软了。',
      '梦里有吃不完的冻干，而且全是鸡肉味。',
      '（翻了个身露出半截肚皮，别碰——碰了就是陷阱）',
      '嘘，它睡着的时候，全世界都要小声一点。',
    ],
  },
];
const STATE_IDX = {};
STATES.forEach((s, i) => STATE_IDX[s.key] = i);
const STATE_TOTAL = STATES.length;

let curState = 0, switching = false, gotoTimer = null;
const stateLine = {};

/* ---------- 预加载所有状态素材 ---------- */
STATES.forEach(st => {
  if(st.type === 'video'){
    const v = document.createElement('video');
    v.src = st.src; v.muted = true; v.loop = true; v.preload = 'auto';
    v.load();
  }else{
    const im = new Image(); im.src = st.src;
  }
});

const catEl = $('cat'), catImg = $('catImg'), catVideo = $('catVideo'), catCanvas = $('catCanvas'),
      catCtx = catCanvas.getContext('2d'), catInner = catEl.querySelector('.inner'),
      catShade = catEl.querySelector('.shade');

/* 悬停小比热区 → 在真实立绘头顶浮现“点击移动”（命中仍走 #h-cat，不影响收集/双击/拖拽） */
$('h-cat').addEventListener('mouseenter', () => catEl.classList.add('hint-show'));
$('h-cat').addEventListener('mouseleave', () => catEl.classList.remove('hint-show'));

/* 脚下接触阴影：#cat 宽度塌陷为 0（子元素全绝对定位），无法用 % 定宽，
   改为按当前可见媒体（canvas/img）的实际渲染宽度 × 状态比例，以 px 同步。 */
let _lastShadeW = -1;
function syncShade(){
  const st = STATES[curState];
  if(!st) return;
  const vis = catCanvas.classList.contains('show') ? catCanvas : catImg;
  const w = vis.getBoundingClientRect().width;
  const sr = $('stage').getBoundingClientRect();
  if(w > 0 && sr.width > 0) catHalfWPct = (w / sr.width) * 50;  // 半宽（舞台 %），供左边界钳制
  const shadeRatio = st.cat.shade / 100;
  const target = w > 0 ? w * shadeRatio : 0;
  if(Math.abs(target - _lastShadeW) > 0.5){
    _lastShadeW = target;
    catShade.style.width = target ? target.toFixed(1) + 'px' : '0px';
  }
}
if(typeof ResizeObserver !== 'undefined'){
  const shadeRO = new ResizeObserver(syncShade);
  shadeRO.observe(catCanvas);
  shadeRO.observe(catImg);
}
window.addEventListener('resize', syncShade);
catImg.addEventListener('load', syncShade);

/* 把隐藏 video 的当前帧绘制到可见 canvas（便于截图捕获 + 统一渲染） */
let catDrawing = false;
/* 夜晚布光权重：与 CSS（filter 2s ease）共用同一条 2 秒 ease 时间轴，
   保证小比身上的画布冷光与小鸟/画框/#cat 的 CSS 明暗严格同步。 */
const NIGHT_MS = 2000;
let nightMix = (document.body.dataset.time === 'night') ? 1 : 0;
let nightAnim = null;   // {from,to,t0}
function startNightMix(){
  nightAnim = { from: nightMix,
                to: document.body.dataset.time === 'night' ? 1 : 0,
                t0: performance.now() };
}
/* CSS 关键字 ease 等价曲线 cubic-bezier(.25,.1,.25,1)：由 x 求参数 u，再算 y */
function easeCSS(t){
  if(t <= 0) return 0;
  if(t >= 1) return 1;
  const x1 = .25, y1 = .1, x2 = .25, y2 = 1;
  let u = t;
  for(let i = 0; i < 8; i++){
    const xu = 3*(1-u)*(1-u)*u*x1 + 3*(1-u)*u*u*x2 + u*u*u - t;
    if(Math.abs(xu) < 1e-6) break;
    const d = 3*(1-u)*(1-u)*x1 + 6*(1-u)*u*(x2-x1) + 3*u*u*(1-x2);
    u -= xu / d;
  }
  return 3*(1-u)*(1-u)*u*y1 + 3*(1-u)*u*u*y2 + u*u*u;
}
function stepNightMix(now){
  if(!nightAnim) nightAnim = { from: nightMix, to: nightMix, t0: now };
  const p = Math.max(0, Math.min(1, (now - nightAnim.t0) / NIGHT_MS));
  nightMix = nightAnim.from + (nightAnim.to - nightAnim.from) * easeCSS(p);
  if(p >= 1) nightMix = nightAnim.to;
}
function drawCatFrame(){
  if(!catDrawing) return;
  // 与页面其它元素同一条 2s ease 时间轴，昼夜切换时一起慢慢亮/暗
  stepNightMix(performance.now());
  if(catVideo.readyState >= 2 && catVideo.videoWidth){
    if(catCanvas.width !== catVideo.videoWidth){
      catCanvas.width = catVideo.videoWidth;
      catCanvas.height = catVideo.videoHeight;
    }
    catCtx.clearRect(0, 0, catCanvas.width, catCanvas.height);
    catCtx.drawImage(catVideo, 0, 0);
    if(nightMix > .001) paintCatLight(catCtx, catCanvas.width, catCanvas.height, nightMix);
    if(catVideo.paused){ const p = catVideo.play(); if(p && p.catch) p.catch(()=>{}); }
  }
  syncShade();
  requestAnimationFrame(drawCatFrame);
}

/* 按时段在画布上给小比布光（夜晚冷环境+右侧台灯暖光；清晨金色侧光）。
   mix 为 0→1 的夜晚权重，使昼夜切换时布光在约 2 秒内平滑淡入淡出。
   每次填充后用 destination-in 借原视频 alpha 裁掉透明区。 */
function paintCatLight(ctx, w, h, mix){
  const m = Math.max(0, Math.min(1, mix));
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, w * .25, h);
  g.addColorStop(0, 'rgba(70,82,138,1)');
  g.addColorStop(1, 'rgba(112,116,164,1)');
  ctx.globalAlpha = m;                 // 冷色压暗随权重淡入淡出
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(catVideo, 0, 0);
  /* 台灯暖光描边只在灯亮时叠加；关灯后只留窗外冷月光 */
  if(document.body.dataset.lamp !== 'off'){
    const warm = .13 * m;
    ctx.globalCompositeOperation = 'lighter';
    const r = ctx.createRadialGradient(w * 1.04, h * .42, 0, w * 1.02, h * .48, w * .95);
    r.addColorStop(0, `rgba(255,178,98,${warm})`);
    r.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(catVideo, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
}
/* 部分浏览器（Safari / iOS 的 WebKit）解码 VP9 时不支持 alpha 通道，视频帧会带上一层
   不透明的浅灰底（正是 sit.png 的背景色 #e6e6e5），在房间里表现为一块白框。
   这里在首帧可用时实测四角透明度：四角全不透明即判定不支持 alpha，退回同构图静态 PNG
   （构图与尺寸完全一致，只少了尾巴的细微摆动）。 */
let videoAlphaOK = null;   // null = 尚未测定
function probeVideoAlpha(){
  if(videoAlphaOK !== null) return videoAlphaOK;
  if(catVideo.readyState < 2 || !catVideo.videoWidth) return null;
  try{
    const c = document.createElement('canvas');
    c.width = catVideo.videoWidth; c.height = catVideo.videoHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(catVideo, 0, 0);
    const pts = [[0, 0], [c.width - 1, 0], [0, c.height - 1], [c.width - 1, c.height - 1]];
    videoAlphaOK = pts.some(([px, py]) => x.getImageData(px, py, 1, 1).data[3] < 64);
  }catch(_){
    videoAlphaOK = true;     // 读不到像素（如跨域）时按支持处理，保持原有行为
  }
  return videoAlphaOK;
}

/* 启动 video 立绘：先用同构图静态 PNG 顶上（既避免白框闪现，也作为降级图），
   等首帧解码完成后探测 alpha，通过才切到 canvas 逐帧渲染。 */
function startVideoSprite(st){
  catDrawing = false;
  if(catVideo.src.split('/').pop() !== st.src.split('/').pop()){
    catVideo.src = st.src;
    catVideo.load();
  }
  catCanvas.classList.remove('show');
  if(catImg.getAttribute('src') !== st.png){
    catImg.classList.remove('show');
    catImg.src = st.png;
  }
  const showStill = () => {
    if(document.body.dataset.catstate === st.key) catImg.classList.add('show');
  };
  if(catImg.complete && catImg.naturalWidth){ showStill(); }
  else { catImg.addEventListener('load', showStill, { once: true }); }

  const useCanvas = () => {
    if(document.body.dataset.catstate !== st.key) return;   // 已切到别的动作，丢弃回调
    const p = catVideo.play();
    if(p && p.catch) p.catch(() => {});
    const ok = probeVideoAlpha();
    if(ok === null){ setTimeout(useCanvas, 120); return; }   // 帧还没解出来，稍后再测
    if(ok === false){ catVideo.pause(); return; }            // alpha 不可用 → 停在静态图
    catCanvas.classList.add('show');
    catImg.classList.remove('show');
    catDrawing = true;
    requestAnimationFrame(drawCatFrame);
  };
  if(catVideo.readyState >= 2){ useCanvas(); }
  else { catVideo.addEventListener('canplay', useCanvas, { once: true }); }
  syncShade();
  setTimeout(syncShade, 320);
}

/* 静态立绘夜晚用烘焙了冷暖光的版本 */
function spriteSrc(st){
  if(st.type === 'image' && document.body.dataset.time === 'night'){
    return st.src.replace('.png', '_night.png');
  }
  return st.src;
}
/* 昼夜切换时，睡猫静态图用 2s ease 同步叠化（旧图克隆层淡出、底层立即换日夜烘焙版），
   与小鸟/画框的 CSS 2s ease 明暗节奏完全一致；不再“先消失再出现”。
   token 用于在“切动作/再次切换时段”时作废未完成的叠化。 */
let imgFadeToken = 0;
function cancelCatImgFade(){
  imgFadeToken++;
  catImg.style.transition = '';
  catImg.style.opacity = '';
  catImg.parentElement.querySelectorAll('img.xfade').forEach(n => n.remove());
}
function crossfadeCatImg(url){
  const target = new URL(url, location.href).href;
  if(catImg.src.split('?')[0] === target.split('?')[0]) return;  // 已是该图
  if(!catImg.classList.contains('show')){ catImg.src = url; return; } // 未显示：交给 setState 揭示
  const my = ++imgFadeToken;
  // 旧画面克隆一层盖在上方（几何/滤镜都由同一条 #cat img CSS 提供）
  const old = catImg.cloneNode(false);
  old.removeAttribute('id');
  old.classList.add('xfade');
  old.style.animation = 'none';
  old.style.transition = 'none';
  old.style.opacity = '1';
  old.style.zIndex = '2';
  catImg.parentElement.appendChild(old);
  // 底层立即换成新（日/夜烘焙版），随后克隆层在 2s ease 内淡出，露出新图
  catImg.src = url;
  void old.offsetWidth;
  requestAnimationFrame(() => {
    if(my !== imgFadeToken) return;
    old.style.transition = 'opacity 2s ease';
    old.style.opacity = '0';
  });
  setTimeout(() => { if(my === imgFadeToken && old.parentNode) old.remove(); }, 2050);
}
/* ================================================================
   位置持久化：刷新后“原样”保留小比（每个动作各记各位）与小鸟的位置。
   v2 起一律存/恢复【实际渲染的精确落点】，刷新时不再重新钳制，确保绝不挪位；
   仅在从 v1 迁移时，把旧版允许的偏高落点按当前地面规则钳一次后存为精确值。
   ================================================================ */
const POS_KEY = 'xiaobi.pos.v2';
const LEGACY_POS_KEY = 'xiaobi.pos.v1';
const savedPos = { cat: {}, bird: null, paint: 0 };
/* 用与拖拽完全相同的物理约束钳制落点（仅用于 v1→v2 的一次性迁移） */
function clampCatPos(st, leftPct, bottomPct){
  leftPct = Math.max(FLOOR.minLeft, Math.min(FLOOR.maxLeft, leftPct));
  let cap = groundMaxBottom(leftPct);
  if(st.key === 'sleep' && inBedZone(leftPct, bottomPct)) cap = BED_ZONE.b1;
  cap = Math.min(cap, FLOOR.wallTop - st.cat.h);
  bottomPct = Math.max(FLOOR.minBottom, Math.min(cap, bottomPct));
  return { left: leftPct, bottom: bottomPct };
}
(function loadPos(){
  try{
    const raw = localStorage.getItem(POS_KEY);
    if(raw){
      const p = JSON.parse(raw);
      if(p && typeof p === 'object'){
        if(p.cat && typeof p.cat === 'object') savedPos.cat = p.cat;
        if(p.bird && typeof p.bird === 'object') savedPos.bird = p.bird;
        /* 旧三态存档里 paint=2 表示“空墙”；新四态中空墙=3、2 改为埃及猫，故把旧的 2 迁到 3 */
        if(p.paint === 0 || p.paint === 1 || p.paint === 3) savedPos.paint = p.paint;
        else if(p.paint === 2) savedPos.paint = 3;
      }
    }else{
      const oldRaw = localStorage.getItem(LEGACY_POS_KEY);
      if(oldRaw){
        const o = JSON.parse(oldRaw);
        if(o && typeof o === 'object'){
          if(o.cat && typeof o.cat === 'object'){
            STATES.forEach(st => {
              const v = o.cat[st.key];
              if(v && isFinite(v.left) && isFinite(v.bottom))
                savedPos.cat[st.key] = clampCatPos(st, v.left, v.bottom);
            });
          }
          if(o.bird && isFinite(o.bird.left) && isFinite(o.bird.bottom))
            savedPos.bird = { left: o.bird.left, bottom: o.bird.bottom };
          persistPos();
        }
      }
    }
  }catch(_){}
})();
function persistPos(){
  try { localStorage.setItem(POS_KEY, JSON.stringify(savedPos)); } catch(_){}
}
/* 保存当前动作下小比的精确落点（放置时 placeCatAt 已钳制，这里不再二次解释） */
function saveCatPos(){
  const st = STATES[curState];
  if(!st) return;
  const L = parseFloat(catEl.style.left), B = parseFloat(catEl.style.bottom);
  if(!isFinite(L) || !isFinite(B)) return;
  savedPos.cat[st.key] = { left: L, bottom: B };
  persistPos();
}

function placeCat(st){
  const c = st.cat;
  const sv = savedPos.cat[st.key];
  /* 有记忆就严格回到记忆位置（刷新不挪位），否则用默认槽位 */
  const left   = (sv && isFinite(sv.left))   ? sv.left   : c.left;
  const bottom = (sv && isFinite(sv.bottom)) ? sv.bottom : c.bottom;
  catEl.style.left = left + '%';
  catEl.style.bottom = bottom + '%';
  catEl.style.height = c.h + '%';
  /* 切动作/落位后，若小鸟与小比重叠则把鸟让到最近空位；睡图异步揭示，故再补一次 */
  setTimeout(() => keepBirdClearOfCat(true), 80);
  setTimeout(() => keepBirdClearOfCat(true), 520);
}
function moveCatHot(box){
  const el = $('h-cat');
  el.style.left = box.l + '%';
  el.style.top = box.t + '%';
  el.style.width = box.w + '%';
  el.style.height = box.h + '%';
}

function updateStateProgress(){
  const n = S.seenStates.size;
  $('stTxt').textContent = `${n}/${STATE_TOTAL}`;
  $('stFill').style.width = (n / STATE_TOTAL * 100) + '%';
  if(n === STATE_TOTAL && !S.allStates){
    S.allStates = true;
    // 不弹成就横幅，只加分 + 小庆祝特效
    addScore(40, W * .5, H * .5, '+40 LIFE!');
    for(let i = 0; i < 6; i++){
      setTimeout(() => burst(W * (.2 + Math.random() * .6), H * (.25 + Math.random() * .4), '#a8d8b9'), i * 150);
    }
    chime();
  }
}

function setState(key, auto){
  const idx = typeof key === 'number' ? key : STATE_IDX[key];
  if(idx === undefined) return;
  const st = STATES[idx];

  if(idx === curState){
    if(!auto) speakState(st);
    return;
  }

  switching = true;
  cancelCatImgFade();   // 切动作立即显示：作废可能正在进行的昼夜图片淡变，保持硬切不闪
  setTimeout(() => { switching = false; }, 700);
  const first = !S.seenStates.has(st.key);

  // 音效（不做蹦跳）；自动切换保持安静
  if(!auto){
    blip(760, .07, 'square', .14);
    setTimeout(() => blip(1040, .05, 'square', .12), 90);
  }

  // 立绘切换（video / image crossfade）
  catEl.className = st.key;
  if($('h-cat').matches(':hover')) catEl.classList.add('hint-show');  // 切动作不丢悬停提示
  document.body.dataset.catstate = st.key;
  if(st.type === 'video'){
    startVideoSprite(st);
  }else{
    /* 静态立绘：先保持透明并保留上一动作画面垫底，等新图加载到正确尺寸后再淡入，
       避免 src 刚切换、固有尺寸未就绪时 width:auto 回退成大宽度而“变大一闪” */
    const url = spriteSrc(st);
    catImg.classList.remove('show');
    const reveal = () => {
      if(STATES[curState] && STATES[curState].key !== st.key) return; // 已切到别的动作，丢弃本次回调
      catImg.classList.add('show');
      catCanvas.classList.remove('show');
      syncShade();
    };
    catImg.addEventListener('load', reveal, { once: true });
    catImg.src = url;
    if(catImg.complete && catImg.naturalWidth){
      catImg.removeEventListener('load', reveal);
      requestAnimationFrame(reveal);
    }
    catDrawing = false;
    catVideo.pause();
  }
  placeCat(st);
  moveCatHot(st.box);
  curState = idx;
  syncShade(); setTimeout(syncShade, 320);

  // 徽章
  $('stateName').textContent = st.name;
  const sb = $('stateBadge');
  sb.querySelector('.si').textContent = st.icon;
  sb.classList.remove('flash'); void sb.offsetWidth; sb.classList.add('flash');

  if(first){
    S.seenStates.add(st.key);
    updateStateProgress();
    const r = $('h-cat').getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
    addScore(6, r.left - sr.left + r.width / 2 - 18, r.top - sr.top + r.height * .3, '+6 NEW!');
    floaties(r.left - sr.left + r.width / 2, r.top - sr.top + r.height * .35, 4);
    chime();
  }

  if(!auto) say(st.enter, '小比');
  armAutoState();   // 任何真实切换后，重新开始 10 秒倒计时
}

function speakState(st){
  const i = stateLine[st.key] || 0;
  say(st.lines[i % st.lines.length], '小比');
  stateLine[st.key] = i + 1;
}

/* ================================================================
   互动热区
   ================================================================ */
const SPOTS = {
  'h-cat': { reward: 4, color: '#ffc06b', act: 'cycle' },
  'h-bed':  { reward: 4, color: '#ffd9a0', goto: 'sleep', who: '猫窝',
    pre: '阳光在窝中间留了一块最软的位置。' },
  'h-bowl': { reward: 4, color: '#f6b088', who: '饭碗',
    lines: [
      '碗擦得干干净净，一粒冻干都没有，本比表示严正关切。',
      '把爪子伸进空碗里按了按，提醒人类该补货了。',
      '这个碗的位置刚刚好，可惜它现在是空的。',
      '碗在，饭呢？这是一个值得反复追问的问题。',
    ] },
  'h-bag':  { reward: 4, color: '#d9b88c', who: '猫包',
    lines: [
      '猫包在墙角，上面还留着上次出门的味道。',
      '包门敞着，但本比今天并不打算出门。',
      '把爪子搭在猫包上拍了拍，像在检查它结不结实。',
      '这个包只有在有小鱼干随行的时候才可以打开。',
    ] },
  'h-rug':  { reward: 3, color: '#ffe9c7', goto: 'sit', who: '地毯',
    pre: '地毯刚被踩奶过，温度刚刚好。' },
  'h-window': {
    reward: 4, color: '#b9d8ff', who: '窗外', special: 'window',
    lines: [
      '百叶窗把光切成一条一条的，在地上摆成琴键。',
      '窗外那只鸟每天下午都来，本比已经记住它了。',
      '鼻子贴在玻璃上看云，是一只猫最重要的工作。',
      '起风了，百叶窗的影子在墙上轻轻晃。',
    ],
    openLines: [
      '夜风带着草地的味道，胡须被吹得一抖一抖。',
      '远处那扇亮着暖灯的窗，里面会不会也住着一只猫？',
      '树叶在风里沙沙响，像在给小比念睡前故事。',
      '小比把鼻子探出窗外，认真检查了一遍夜色。',
    ],
  },
  'h-lamp': { reward: 3, color: '#ffd479', who: '蘑菇灯', special: 'lamp' },
};
const TOTAL = Object.keys(SPOTS).length;   // 7
const LAMP_LINES = [
  '这盏灯的颜色像融化的黄油。',
  '蘑菇灯是小比半夜巡逻的灯塔。',
  '灯影晃一下，耳朵就跟着转一下。',
];
const lineIdx = {};

function updateProgress(){
  const n = S.found.size;
  $('progTxt').textContent = `${n}/${TOTAL}`;
  $('progFill').style.width = (n / TOTAL * 100) + '%';
  if(n === TOTAL && !S.allFound){
    S.allFound = true;
    setTimeout(() => {
      $('bannerT').textContent = '★ ALL FOUND ★';
      $('bannerM').innerHTML = '小屋的每个角落<br>都被你摸过一遍了<br><span style="color:var(--amber)">小比今晚一定睡得很好 🌙</span>';
      $('banner').classList.add('show');
      addScore(30, W * .5, H * .5, '+30 ALL!');
      for(let i = 0; i < 5; i++){
        setTimeout(() => burst(W * (.25 + Math.random() * .5), H * (.3 + Math.random() * .3), '#ffd479'), i * 160);
      }
      chime();
      setTimeout(() => $('banner').classList.remove('show'), 5200);
    }, 700);
  }
}

let lastLampClickTime = 0;
let lastWindowClickTime = 0;
Object.keys(SPOTS).forEach(id => {
  const el = $(id);
  if(!el) return;
  lineIdx[id] = 0;
  el.addEventListener('pointerdown', e => {
    if(!S.started) return;
    const sp = SPOTS[id];
    const r = el.getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
    const cx = r.left - sr.left + r.width / 2;
    const cy = r.top - sr.top + r.height / 2;

    /* 小比：动作切换只认“双击”，拖动也在 stage 的手势里处理。
       这里不拦截冒泡、不单击换动作，仅在第一次发现时计入收集。 */
    if(sp.act === 'cycle'){
      const first = !S.found.has(id);
      if(first){
        S.found.add(id);
        el.classList.add('done');
        addScore(sp.reward, cx - 14, cy, '+' + sp.reward + ' NEW!');
        updateProgress();
        chime();
        burst(cx, cy, sp.color);
        floaties(cx, cy, 5);
      }
      return; // 不调用 stopPropagation：事件继续冒泡给 stage 判定拖动 / 双击
    }

    e.stopPropagation();

    const first = !S.found.has(id);
    if(first){
      S.found.add(id);
      el.classList.add('done');
      addScore(sp.reward, cx - 14, cy, '+' + sp.reward + ' NEW!');
      updateProgress();
      chime();
    }else{
      addScore(1, cx - 8, cy);
      blip(620, .06, 'square');
    }
    burst(cx, cy, sp.color);
    floaties(cx, cy, first ? 5 : 2);

    /* 蘑菇灯：仅“双击”开关（与小比换动作一致的 350ms 双击窗）；单击只给提示 */
    if(sp.special === 'lamp'){
      const now = Date.now();
      if(now - lastLampClickTime < DOUBLE_CLICK_MS){
        lastLampClickTime = 0;
        setLampOn(!S.lampOn);
        armAutoLamp();          // 手动开关后按当前灯态重新计时（开→30s，关→5s）
        if(S.lampOn && Math.random() < .5){
          say(LAMP_LINES[lineIdx[id] % LAMP_LINES.length], sp.who);
          lineIdx[id]++;
        }else{
          say(S.lampOn
            ? '灯又亮啦，一小块暖色在地板上化开。'
            : '蘑菇灯调暗啦，好好休息吧。', sp.who);
        }
        blip(S.lampOn ? 880 : 392, .08, 'square', .18);
      }else{
        lastLampClickTime = now;
        say('双击蘑菇灯，可以开灯或关灯。', sp.who);
      }
      return;
    }

    /* 窗户：双击开 / 关窗（与蘑菇灯同一套双击判定）；单击只念一句环境台词 */
    if(sp.special === 'window'){
      const now = Date.now();
      if(now - lastWindowClickTime < DOUBLE_CLICK_MS){
        lastWindowClickTime = 0;
        setWindowOpen(!S.windowOpen);
        armAutoWindow();   // 用户手动开关后，重新开始 10 秒倒计时
        const k = TIMES[S.timeIdx];
        const openMsg = {
          day:   '推开窗，风和阳光一起涌了进来。',
          night: '推开窗，夜风先一步溜了进来。',
        };
        say(S.windowOpen ? openMsg[k] : '把窗关好，一室的安静也被留住了。', sp.who);
        if(S.windowOpen){
          blip(660, .07, 'sine', .2);
          setTimeout(() => blip(880, .09, 'sine', .2), 90);
        }else{
          blip(520, .07, 'sine', .2);
          setTimeout(() => blip(392, .09, 'sine', .2), 90);
        }
      }else{
        lastWindowClickTime = now;
        const arr = S.windowOpen ? sp.openLines : sp.lines;
        say(arr[lineIdx[id] % arr.length], sp.who);
        lineIdx[id]++;
      }
      return;
    }

    /* 物件：让小比去做那件事 */
    if(sp.goto){
      const target = sp.goto;
      if(STATE_IDX[target] === curState){
        speakState(STATES[curState]);
      }else{
        if(sp.pre) say(sp.pre, sp.who);
        clearTimeout(gotoTimer);
        gotoTimer = setTimeout(() => { gotoTimer = null; setState(target); }, sp.pre ? 1500 : 120);
      }
      return;
    }

    /* 纯台词 */
    const arr = sp.lines;
    say(arr[lineIdx[id] % arr.length], sp.who);
    lineIdx[id]++;
  });
});

/* ================================================================
   WEB AUDIO —— 古典乐 BGM（录音）/ 音效
   ================================================================ */
let AC = null, master;

function initAudio(){
  if(AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = .85;
  master.connect(AC.destination);
}

function blip(freq, vol = .07, type = 'square', dur = .3){
  if(!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, AC.currentTime);
  g.gain.linearRampToValueAtTime(vol, AC.currentTime + .008);
  g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(AC.currentTime + dur + .05);
}
function chime(){
  if(!AC) return;
  [880, 1108, 1318, 1760].forEach((f, i) =>
    setTimeout(() => blip(f, .07, 'square', .34), i * 85));
}

/* ================================================================
   古典乐 BGM：三首公有领域 / CC0 钢琴名曲录音。<audio> 经 WebAudio
   （MediaElementSource + 每轨 GainNode）播放，循环、淡入淡出、可切歌；
   音效 blip/chime 仍直接走 master 总线。
     · Satie   Gymnopédie No.1      — Robin Alciatore 演奏（musopen，Public Domain）
     · Debussy Clair de Lune        — Wikimedia Commons 录音（Public Domain）
     · Chopin  Nocturne Op.9 No.2   — Membeth 演奏（Wikimedia Commons，CC0）
   ================================================================ */
const TRACKS = [
  { file: 'assets/music/gymnopedie_no1.m4a', name: 'SATIE · GYMNOPÉDIE NO.1', short: 'GYMNOPÉDIE' },
  { file: 'assets/music/clair_de_lune.m4a',  name: 'DEBUSSY · CLAIR DE LUNE',  short: 'CLAIR DE LUNE' },
  { file: 'assets/music/nocturne_op9_no2.m4a', name: 'CHOPIN · NOCTURNE OP.9 NO.2', short: 'NOCTURNE OP.9' },
];
let musicEls = null, musicBus = null, trackGain = null, activeI = -1;

/* 惰性创建 3 个 <audio>（本地同源、循环），各自经独立 GainNode 汇到 master */
function ensureMusic(){
  if(musicEls) return;
  musicEls = TRACKS.map(t => { const a = new Audio(t.file); a.loop = true; a.preload = 'metadata'; return a; });
  musicBus = AC.createGain(); musicBus.gain.value = 1; musicBus.connect(master);
  trackGain = musicEls.map(a => {
    const src = AC.createMediaElementSource(a);
    const g = AC.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(musicBus);
    return g;
  });
}
function _fadeGain(g, to, sec){
  const t = AC.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(0, g.gain.value), t);
  g.gain.linearRampToValueAtTime(to, t + sec);
}
/* 淡入播放第 i 首（从头），其它曲目立即静音；旧曲可选淡出后暂停 */
function _playTrack(i, fadeSec){
  ensureMusic();
  if(AC.state === 'suspended') AC.resume();
  const a = musicEls[i];
  try{ a.currentTime = 0; }catch(_){}
  _fadeGain(trackGain[i], 1, fadeSec);
  const pr = a.play(); if(pr && pr.catch) pr.catch(()=>{});
}
/* 开始播放当前曲目：1.2s 淡入，其余立即静音暂停 */
function startMusic(){
  ensureMusic();
  S.music = true;
  musicEls.forEach((a, k) => {
    if(k === S.track) return;
    a.pause();
    const t = AC.currentTime;
    trackGain[k].gain.cancelScheduledValues(t);
    trackGain[k].gain.setValueAtTime(0, t);
  });
  activeI = S.track;
  syncMusicBtn();
  _playTrack(S.track, 1.2);
}
/* 点 ♪：切下一首。旧曲 .45s 淡出后暂停，新曲 .8s 淡入（没在放则直接开启）。
   以显式 activeI 为准、并停掉除目标外所有曲目，连点也不会两首叠播 */
function nextTrack(){
  ensureMusic();
  if(AC.state === 'suspended') AC.resume();
  const to = ((activeI >= 0 ? activeI : S.track) + 1) % TRACKS.length;
  S.track = to;
  musicEls.forEach((a, k) => {
    if(k === to) return;
    const playing = !a.paused;
    _fadeGain(trackGain[k], 0, playing ? .45 : .05);
    if(playing){ const el = a; setTimeout(() => { if(activeI !== k) el.pause(); }, 520); }
  });
  activeI = to;
  _playTrack(to, .8);
  S.music = true;
  syncMusicBtn();
}
/* 同步喇叭按钮图标 / ♪ 置灰（不改变播放，只反映 S.music） */
function syncMusicBtn(){
  const on = !!S.music;
  const nm = $('btnMusic'); if(nm) nm.classList.toggle('off', !on);
  const g = $('musicGlyph'); if(g) g.textContent = on ? '🔊' : '🔇';
}
/* 关闭音乐：全部曲目 .4s 淡出后暂停。延迟暂停用 S.music 守卫，
   “关了立刻又开”时旧的暂停回调作废，不会把刚开的音乐停掉 */
function stopMusic(){
  ensureMusic();
  S.music = false;
  activeI = -1;
  syncMusicBtn();
  musicEls.forEach((el, k) => _fadeGain(trackGain[k], 0, .4));
  setTimeout(() => { if(!S.music) musicEls.forEach(a => a.pause()); }, 460);
}
/* 喇叭按钮：开 ↔ 关 */
function toggleMusic(){
  ensureMusic();
  if(S.music) stopMusic(); else startMusic();
}
function showNP(){
  const parts = [];
  if(S.music) parts.push(TRACKS[S.track].short);
  $('npName').textContent = parts.length ? parts.join('　·　') : '—';
  $('nowPlaying').classList.toggle('show', parts.length > 0);
}

/* ================================================================
   控制按钮
   ================================================================ */
/* 喇叭：开 / 关音乐 */
$('btnMusicToggle').addEventListener('click', function(e){
  e.stopPropagation();
  if(!AC) return;
  toggleMusic();
  blip(S.music ? 700 : 360, .05, 'square', .18);
  showNP();
});
/* ♪：切到下一首（音乐没开就顺带开启）；3 首循环 */
$('btnMusic').addEventListener('click', function(e){
  e.stopPropagation();
  if(!AC) return;
  if(!S.music){ startMusic(); }
  else { nextTrack(); }
  blip(700, .05, 'square', .18);
  showNP();
});
$('btnTime').addEventListener('click', function(e){
  e.stopPropagation();
  applyTime((S.timeIdx + 1) % TIMES.length);
  armAutoTime();            // 用户手动切换后，重新开始 30 秒倒计时
  this.appendChild(Object.assign(document.createElement('span'),
    { className: 'tip', textContent: '切换时段' }));
  blip(520, .07, 'square');
  const msg = {
    day:   '阳光正好，屋里亮堂堂的。',
    night: '夜深了……小比把耳朵放平了一点。',
  };
  say(msg[TIMES[S.timeIdx]], '小比');
});

/* ---------- 挂画：点击在 猫蒂丝 / 花豹 / 埃及猫 / 空墙 四态间循环（状态持久化） ---------- */
const PAINT_SRC = [
  'assets/painting_cat.png?v=1',
  'assets/painting_leopard.png?v=1',
  'assets/painting_egypt.png?v=2',
];
const PAINT_SAY = [
  '换上了《猫蒂丝》——五只橘猫手拉手转圈，小比盯着看了很久，也想加入。',
  '换上了花豹装饰画。据说它只在深夜才会从画里下来巡视一圈。',
  '换上了埃及猫神贝斯特——金色的眼睛像月光下的尼罗河，小比不自觉地坐直了。',
  '画被取下来了，墙上只剩一片安安静静的暖色。',
];
const paintingEl = $('painting');
new Image().src = PAINT_SRC[1];   // 预载花豹，切换时无白闪
new Image().src = PAINT_SRC[2];   // 预载埃及猫
const PAINT_EMPTY = PAINT_SRC.length;   // 空墙态下标 = 3
function applyPaint(idx, quiet){
  savedPos.paint = idx;
  document.body.dataset.paint = String(idx);   // 空墙(3)时让 #paintSlot 热区可点，把画挂回去
  if(idx === PAINT_EMPTY){
    paintingEl.classList.add('none');
  }else{
    if(paintingEl.dataset.idx !== String(idx)){
      paintingEl.dataset.idx = String(idx);
      paintingEl.src = PAINT_SRC[idx];
    }
    paintingEl.classList.remove('none');
  }
  if(!quiet){ persistPos(); say(PAINT_SAY[idx], '小比'); blip(560, .05, 'square', .06); }
}
// 阻止冒泡：点画不应被舞台当成“点空白处瞬移小比”
paintingEl.addEventListener('pointerdown', e => e.stopPropagation());
paintingEl.addEventListener('click', e => {
  e.stopPropagation();
  applyPaint((savedPos.paint + 1) % (PAINT_EMPTY + 1));
});
/* 空墙热区：画被取下后点这里挂回（空墙态→猫蒂丝），与点画同一套循环 */
const paintSlotEl = $('paintSlot');
paintSlotEl.addEventListener('pointerdown', e => e.stopPropagation());
paintSlotEl.addEventListener('click', e => {
  e.stopPropagation();
  applyPaint((savedPos.paint + 1) % (PAINT_EMPTY + 1));
});
applyPaint(savedPos.paint, true);

/* ---------- 小鸟玩具：左键拖动；松手只能落在 地面/猫包/猫窝/窗台 四个地方 ---------- */
/* 落点矩形（舞台 %，坐标为 left 范围与 bottom 范围，依据房间家具实测） */
const BIRD_PERCHES = [
  { name: 'floor',  x0: 18, x1: 97, b0: 1,  b1: 15 }, // 地毯地面（避开左侧猫碗）
  // 猫包：感应区是顶面一带（松手靠近即吸附），但只能停在拱形网格窗下方台沿上的唯一固定点
  { name: 'bag',    x0: 9,  x1: 30, b0: 50, b1: 60, point: [22.5, 56.2] },
  // 猫窝：感应区是整个窝面，但只能停两个固定点（窝垫中部、右侧前檐）
  { name: 'bed',    x0: 33, x1: 73, b0: 26, b1: 44,
    points: [[49.5, 36.9], [58.7, 35.9]] },
  // 窗台只有“一条线”（白色窗台下沿实测 bottom≈71%）：释放到窗户区域时垂直一律吸附到该线，
  // 只能沿窗台水平移动，不能悬空贴在玻璃/墙面上。b0/b1 仅用于靠近判定。
  // 右界 49：再往右鸟喙会越过右侧白色窗框（喙尖实测极限 ≈48.9%）。
  { name: 'window', x0: 12, x1: 49, b0: 64, b1: 78, line: 71 },
];
/* 点到矩形的最近距离（在矩形内为 0） */
function _rectDist(p, r){
  const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1);
  const dy = Math.max(r.b0 - p.b, 0, p.b - r.b1);
  return Math.hypot(dx, dy);
}
/* 固定点落点（point 单点 / points 多点）；自由落点返回 null */
function _perchPoints(r){
  if(r.point) return [r.point];
  if(r.points) return r.points;
  return null;
}
/* 把任意 (left,bottom) 吸附到最近的合法落点；返回 {left,bottom,name} */
function snapBird(leftPct, bottomPct){
  const p = { x: leftPct, b: bottomPct };
  let best = BIRD_PERCHES[0], bd = Infinity;
  for(const r of BIRD_PERCHES){
    const d = _rectDist(p, r);
    if(d < bd){ bd = d; best = r; }
  }
  const pts = _perchPoints(best);
  if(pts){                       // 固定点落点：取离释放处最近的那个点
    let q = pts[0], qd = Infinity;
    for(const [px, pb] of pts){
      const d = Math.hypot(px - p.x, pb - p.b);
      if(d < qd){ qd = d; q = [px, pb]; }
    }
    return { left: q[0], bottom: q[1], name: best.name };
  }
  return {
    left: Math.max(best.x0, Math.min(best.x1, p.x)),
    bottom: best.line !== undefined ? best.line : Math.max(best.b0, Math.min(best.b1, p.b)),
    name: best.name,
  };
}
function birdInPerch(leftPct, bottomPct){
  return BIRD_PERCHES.some(r => {
    const pts = _perchPoints(r);
    if(pts) return pts.some(([px, pb]) => Math.abs(leftPct - px) <= 1.5 && Math.abs(bottomPct - pb) <= 1.5);
    if(!(leftPct >= r.x0 && leftPct <= r.x1)) return false;
    return r.line !== undefined ? Math.abs(bottomPct - r.line) <= 1.5
                                : (bottomPct >= r.b0 && bottomPct <= r.b1);
  });
}
/* ---------- 小鸟 / 小比 互不重叠：屏幕空间矩形避让 ---------- */
function _rectsOverlap(a, b, margin){
  return !(a.x + a.w < b.x - margin || b.x + b.w < a.x - margin ||
           a.y + a.h < b.y - margin || b.y + b.h < a.y - margin);
}
/* 小鸟在 (left,bottom)% 时的身体包围盒（脚底锚点，略收窄忽略尾巴尖） */
function birdBodyRect(leftPct, bottomPct){
  const sr = $('stage').getBoundingClientRect();
  const el = $('bird');
  const rr = el.getBoundingClientRect();
  const rwPx = rr.width || sr.width * .075;
  const aspect = rr.height > 0 ? rr.height / rr.width : 1;
  const w = rwPx * .68, h = rwPx * aspect * .82;
  const cx = sr.left + leftPct / 100 * sr.width;
  const feetY = sr.bottom - bottomPct / 100 * sr.height;
  return { x: cx - w / 2, y: feetY - h, w, h };
}
/* 小比当前可见立绘的身体包围盒（略收窄，忽略尾巴/耳朵边缘） */
function catBodyRect(){
  const vis = catCanvas.classList.contains('show') ? catCanvas : catImg;
  let r = vis.getBoundingClientRect();
  if(r.width === 0) r = catCanvas.getBoundingClientRect();
  /* 略收窄身体包围盒，忽略尾巴/耳朵边缘，供小鸟避让判定 */
  const w = r.width * .72;
  const h = r.height * .92;
  return { x: r.left + r.width / 2 - w / 2, y: r.bottom - h, w, h };
}
function birdClearAt(leftPct, bottomPct){
  return !_rectsOverlap(birdBodyRect(leftPct, bottomPct), catBodyRect(), 3);
}
/* 在四个落点中找离 (x,b) 最近、且不与小比重叠的位置 */
function resolveBirdPerch(x, b){
  const order = [...BIRD_PERCHES].sort((p, q) => _rectDist({ x, b }, p) - _rectDist({ x, b }, q));
  let fallback = null, fd = Infinity;   // 仅记录最近的固定点（即使被占），所有落点都无解时才兜底
  for(const r of order){
    const fpts = _perchPoints(r);
    if(fpts){                                                        // 固定点落点（猫包 1 点 / 猫窝 2 点）
      const cand = fpts
        .map(([px, pb]) => ({ px, pb, d: Math.hypot(px - x, pb - b) }))
        .sort((a, c) => a.d - c.d);                                  // 优先吸附到离释放处最近的点
      for(const { px, pb, d } of cand){
        if(birdClearAt(px, pb)) return { left: +px.toFixed(2), bottom: +pb.toFixed(2), name: r.name };
        // 被占的固定点只作最终兜底，绝不写入 best，否则会被当成“已找到空位”提前返回（仍重叠）
        if(d < fd){ fd = d; fallback = { left: +px.toFixed(2), bottom: +pb.toFixed(2), name: r.name }; }
      }
      continue;                                                      // 点全被占：记兜底后继续找下一家具
    }
    const bands = r.line !== undefined
      ? [r.line]                                                     // 窗台：只吸附到那一条线
      : [Math.max(r.b0, Math.min(r.b1, b)), (r.b0 + r.b1) / 2, r.b1, r.b0];
    let best = null, bd = Infinity;
    for(const bc of bands){
      const xs = [];                                                   // 步进候选 + 右端点，保证边界精确可达
      for(let lx = r.x0; lx <= r.x1 + .01; lx += 1.5) xs.push(lx);
      if(xs[xs.length - 1] < r.x1 - .01) xs.push(r.x1);
      for(const lx of xs){
        if(!birdClearAt(lx, bc)) continue;
        const d = Math.hypot(lx - x, bc - b);
        if(d < bd){ bd = d; best = { left: +lx.toFixed(2), bottom: +bc.toFixed(2), name: r.name }; }
      }
    }
    if(best) return best;   // 最近的自由落点内能找到空位：用其中最近的，不再去更远家具
  }
  return fallback || snapBird(x, b);   // 所有落点都被占（极端）才退回最近固定点 / 无碰撞吸附
}
/* 若小鸟当前与小比重叠（或不在落点内），把它挪到最近的空位；animate 决定是否滑过去 */
function keepBirdClearOfCat(animate){
  const el = $('bird');
  let L = parseFloat(el.style.left), B = parseFloat(el.style.bottom);
  if(!isFinite(L) || !isFinite(B)){      // 还没用内联样式（CSS 默认位）时按包围盒换算
    const sr = $('stage').getBoundingClientRect(), rr = el.getBoundingClientRect();
    L = ((rr.left + rr.width / 2 - sr.left) / sr.width) * 100;
    B = ((sr.bottom - rr.bottom) / sr.height) * 100;
  }
  if(birdInPerch(L, B) && birdClearAt(L, B)) return;
  const s = resolveBirdPerch(L, B);
  el.style.transition = animate ? 'left .26s ease,bottom .26s ease' : 'none';
  el.style.left = s.left + '%';
  el.style.bottom = s.bottom + '%';
  savedPos.bird = { left: s.left, bottom: s.bottom };
  persistPos();
  if(animate) setTimeout(() => { el.style.transition = ''; }, 300);
}
const birdEl = $('bird');
let birdDragging = false, birdOffset = { x: 0, y: 0 };

/* ---------- 双击小鸟：一次性“摇晃”动画（61 帧网格 sprite，12fps ≈ 5s） ---------- */
const BIRD_SHAKE = { src: 'assets/bird_shake.png?v=2', frames: 61, cols: 11, cellW: 508, cellH: 270, fps: 12 };
const birdShakeImg = new Image(); birdShakeImg.src = BIRD_SHAKE.src;
/* 夜版摇晃序列帧：与静态夜版立绘同一套重着色烘焙（压暗偏冷、胸腹去亮、暗部除零无彩噪），
   避免用白天帧仅靠 CSS 压暗导致浅腹过亮、与静态夜鸟有色差 */
const birdShakeNightImg = new Image(); birdShakeNightImg.src = 'assets/bird_shake_night.png?v=1';
const birdAnimEl = $('birdAnim'), birdAnimCtx = birdAnimEl.getContext('2d');
const birdImgs = birdEl.querySelectorAll('img');
let birdShake = null, birdAnimRaf = 0;
/* 摇晃绘制源：夜晚用烘焙夜版，白天用原帧（CSS 端同步只留软影、不再二次压暗） */
function birdShakeSrc(){
  return (TIMES[S.timeIdx] === 'night' && birdShakeNightImg.complete && birdShakeNightImg.naturalWidth)
    ? birdShakeNightImg : birdShakeImg;
}
function drawBirdShakeFrame(now){
  if(!birdShake){ birdAnimRaf = 0; return; }
  const el = (now - birdShake.t0) / 1000 * BIRD_SHAKE.fps;
  const idx = Math.min(BIRD_SHAKE.frames - 1, Math.floor(el));
  const row = (idx / BIRD_SHAKE.cols) | 0, col = idx % BIRD_SHAKE.cols;
  birdAnimCtx.clearRect(0, 0, BIRD_SHAKE.cellW, BIRD_SHAKE.cellH);
  birdAnimCtx.drawImage(birdShakeSrc(),
    col * BIRD_SHAKE.cellW, row * BIRD_SHAKE.cellH, BIRD_SHAKE.cellW, BIRD_SHAKE.cellH,
    0, 0, BIRD_SHAKE.cellW, BIRD_SHAKE.cellH);
  if(idx >= BIRD_SHAKE.frames - 1){ finishBirdShake(); return; }
  birdAnimRaf = requestAnimationFrame(drawBirdShakeFrame);
}
function startBirdShake(){
  const needImg = birdShakeSrc();
  if(!needImg.complete || !needImg.naturalWidth){
    needImg.addEventListener('load', () => startBirdShake(), { once: true });
    return;
  }
  // 静态立绘瞬时隐藏（覆盖其 2s opacity 过渡），否则会与 0.3s 淡入的动画层叠出“开头重影”
  birdImgs.forEach(im => { im.style.transition = 'opacity 0s, filter 2s ease'; });
  birdEl.classList.add('shake');
  void birdEl.offsetWidth;                 // 确保“隐藏”先落地再显示动画层
  birdAnimEl.style.transition = 'none';
  birdAnimEl.style.opacity = '1';
  birdShake = { t0: performance.now() };
  if(!birdAnimRaf) birdAnimRaf = requestAnimationFrame(drawBirdShakeFrame);
  blip(1180, .05, 'square', .06);
  setTimeout(() => blip(1480, .05, 'square', .05), 110);
}
function finishBirdShake(){
  // 末帧≈静态立绘：静态 img 与动画层用同一段 .3s 做反向交叉，不留重影、也不瞬间跳变
  birdShake = null; birdAnimRaf = 0;
  birdImgs.forEach(im => { im.style.transition = 'opacity .3s ease, filter 2s ease'; });
  birdEl.classList.remove('shake');
  void birdEl.offsetWidth;
  requestAnimationFrame(() => {
    birdAnimEl.style.transition = 'opacity .3s ease';
    birdAnimEl.style.opacity = '0';
  });
  setTimeout(() => {
    birdAnimCtx.clearRect(0, 0, BIRD_SHAKE.cellW, BIRD_SHAKE.cellH);
    birdImgs.forEach(im => { im.style.transition = ''; });   // 交还 CSS 的 2s 昼夜交叉
  }, 340);
}
function cancelBirdShake(){
  if(!birdShake) return;
  birdShake = null; birdAnimRaf = 0;
  birdImgs.forEach(im => { im.style.transition = 'opacity 0s, filter 2s ease'; });
  birdEl.classList.remove('shake');
  birdAnimEl.style.transition = 'none';
  birdAnimEl.style.opacity = '0';
  birdAnimCtx.clearRect(0, 0, BIRD_SHAKE.cellW, BIRD_SHAKE.cellH);
  requestAnimationFrame(() => birdImgs.forEach(im => { im.style.transition = ''; }));
}

/* 指针：区分“点击/双击”与“拖动”（与小比同一套 350ms / 4px 阈值） */
let birdDownX = 0, birdDownY = 0, birdMoved = false, birdPressed = false, lastBirdClickTime = 0;
birdEl.addEventListener('pointerdown', e => {
  if(!S.started) return;
  if(e.button !== undefined && e.button !== 0) return;
  e.stopPropagation();
  const r = birdEl.getBoundingClientRect();
  birdPressed = true; birdDragging = false; birdMoved = false;
  birdDownX = e.clientX; birdDownY = e.clientY;
  birdEl.style.transition = 'none';      // 一旦转拖动则跟手
  birdOffset.x = e.clientX - (r.left + r.width / 2);
  birdOffset.y = e.clientY - r.bottom; // 相对脚底锚点
  try { birdEl.setPointerCapture(e.pointerId); } catch(_){}
});
birdEl.addEventListener('pointermove', e => {
  if(!birdPressed) return;   // 必须先按住（点击）才跟手，纯悬停不拖动
  if(!birdMoved){
    if(Math.hypot(e.clientX - birdDownX, e.clientY - birdDownY) <= DRAG_THRESHOLD) return;
    birdMoved = true; birdDragging = true;
    cancelBirdShake();   // 真拖动：中止摇晃，回到静态立绘跟手
  }
  const sr = $('stage').getBoundingClientRect();
  let leftPct = (e.clientX - birdOffset.x - sr.left) / sr.width * 100;
  let bottomPct = (sr.bottom - (e.clientY - birdOffset.y)) / sr.height * 100;
  // 拖动中可自由穿过空隙，仅保证不出舞台；松手时才吸附到合法落点
  leftPct = Math.max(1, Math.min(99, leftPct));
  bottomPct = Math.max(1, Math.min(80, bottomPct));
  birdEl.style.left = leftPct + '%';
  birdEl.style.bottom = bottomPct + '%';
});
function saveBirdPos(){
  const L = parseFloat(birdEl.style.left), B = parseFloat(birdEl.style.bottom);
  if(!isFinite(L) || !isFinite(B)) return;
  savedPos.bird = { left: L, bottom: B };   // 松手时已吸附到合法落点，原样精确保存
  persistPos();
}
birdEl.addEventListener('pointerup', e => {
  birdPressed = false;
  try { birdEl.releasePointerCapture(e.pointerId); } catch(_){}
  if(birdMoved){
    birdDragging = false;
    const L = parseFloat(birdEl.style.left), B = parseFloat(birdEl.style.bottom);
    const s = resolveBirdPerch(L, B);   // 吸附到最近且不与小比重叠的落点
    birdEl.style.transition = 'left .22s ease,bottom .22s ease';
    birdEl.style.left = s.left + '%';
    birdEl.style.bottom = s.bottom + '%';
    saveBirdPos();
    blip(640, .04, 'square', .05);
    return;
  }
  // 未拖动 → 双击判定：双击播放摇晃，单击只做时间窗判定（不弹台词）
  const now = Date.now();
  if(now - lastBirdClickTime < DOUBLE_CLICK_MS){
    lastBirdClickTime = 0;
    startBirdShake();
  }else{
    lastBirdClickTime = now;
  }
});
birdEl.addEventListener('pointercancel', () => { birdPressed = false; birdDragging = false; });
/* 刷新后严格回到小鸟上次的落点；若旧存档不在任何落点内（旧版自由拖动遗留），
   则无动画吸附到最近落点一次 */
(function restoreBirdPos(){
  const b = savedPos.bird;
  if(!b || !isFinite(b.left) || !isFinite(b.bottom)) return;
  if(birdInPerch(b.left, b.bottom)){
    birdEl.style.left = b.left + '%';
    birdEl.style.bottom = b.bottom + '%';
  }else{
    const s = snapBird(b.left, b.bottom);
    birdEl.style.left = s.left + '%';
    birdEl.style.bottom = s.bottom + '%';
    savedPos.bird = { left: s.left, bottom: s.bottom };
    persistPos();
  }
})();


/* ================================================================
   开场
   ================================================================ */
$('intro').addEventListener('pointerdown', () => {
  initAudio();
  if(AC.state === 'suspended') AC.resume();
  S.started = true;
  $('intro').classList.add('hide');
  resize();
  armAutoState();   // 开始“每 10 秒自动换动作”
  armAutoWindow();  // 开始“每 10 秒自动开/关窗”
  armAutoTime();    // 开始“每 30 秒自动切换白天/夜晚”
  armAutoLamp();    // 开始“开 30 秒 → 关 5 秒”蘑菇灯循环

  setTimeout(() => { startMusic(); showNP(); }, 500);

  setTimeout(() => say('你回来啦～小比已经在地毯上等你一整天了。', '小比'), 1100);
  for(let i = 0; i < 10; i++) setTimeout(spawnMote, i * 150);
}, { once: true });
/* 键盘也可进门（Enter / Space） */
addEventListener('keydown', e => {
  if(!S.started && (e.key === 'Enter' || e.key === ' ')){
    $('intro').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  }
});

/* ---------------- 启动 ---------------- */
/* 预加载静态立绘（日/夜），保证切换时尺寸立即可用、不出现变大闪现 */
STATES.forEach(st => {
  if(st.type === 'image'){
    [st.src, st.src.replace('.png', '_night.png')].forEach(u => { const im = new Image(); im.src = u; });
  }
});
resize();
requestAnimationFrame(loop);
updateProgress();
updateStateProgress();
placeCat(STATES[0]);
moveCatHot(STATES[0].box);
document.body.dataset.catstate = STATES[0].key;
catEl.className = STATES[0].key;
// 初始状态用动态 video（经 canvas 渲染；alpha 不可用时自动退回静态 PNG）
(function initMedia(){
  const st = STATES[0];
  if(st.type === 'video'){ startVideoSprite(st); }
})();

/* ---------------- 房间背景：昼夜 × 窗户开关 共四态 ----------------
   background-image 不可过渡，故用 #bg / #bg2 两层 opacity 交叉淡入淡出（2s ease，
   与小比/小鸟/挂画的明暗时间轴一致）。每次切换把新图放进当前隐藏的那层，再对调两层
   不透明度，无论“换时段”还是“开关窗”都走同一条叠化路径。 */
const BG_SCENES = {
  'day-closed':   'assets/room_day.png',
  'night-closed': 'assets/room_night.png',
  'day-open':     'assets/room_day_open.png',
  'night-open':   'assets/room_night_open.png',
};
function sceneKey(){
  return TIMES[S.timeIdx] + '-' + (S.windowOpen ? 'open' : 'closed');
}
let bgLayer = 0;   // 当前不透明度为 1、承载“正在显示的场景”的层（0=#bg, 1=#bg2）
let bgCur = null;
function setBG(key, instant){
  const layers = [$('bg'), $('bg2')];
  if(instant || bgCur === null){
    layers[0].style.backgroundImage = `url('${BG_SCENES[key]}')`;
    layers[0].style.opacity = '1';
    layers[1].style.opacity = '0';
    bgLayer = 0; bgCur = key;
    return;
  }
  if(key === bgCur) return;
  const next = bgLayer === 0 ? 1 : 0;      // 新图放进隐藏层
  const ln = layers[next], old = layers[bgLayer];
  ln.style.transition = 'none';
  ln.style.backgroundImage = `url('${BG_SCENES[key]}')`;
  ln.style.opacity = '0';
  void ln.offsetWidth;                     // 确保“隐藏”先落地再开始淡入
  ln.style.transition = '';
  ln.style.opacity = '1';
  old.style.opacity = '0';
  bgLayer = next; bgCur = key;
}
/* 预加载开窗两张图，首次双击开窗时叠化不会因图片解码而卡顿/跳变 */
['assets/room_day_open.png', 'assets/room_night_open.png']
  .forEach(u => { const im = new Image(); im.src = u; });
/* 开机定场：白天 + 关窗，不做过渡 */
document.body.dataset.window = S.windowOpen ? 'open' : 'closed';
setBG(sceneKey(), true);
