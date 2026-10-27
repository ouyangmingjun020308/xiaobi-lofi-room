/* ============================================================
   手机竖屏版的触屏适配（仅 mobile.html 引用，不改动桌面版逻辑）
   1. 用真实视口高度算房间横带位置（微信里 100vh 不可靠）
   2. 触屏没有原生 dblclick → 两次轻点合成一次 dblclick
   3. 老 WebView 没有 PointerEvent → 把 touch 桥接成 pointer
   ============================================================ */
(function () {
  var root = document.documentElement;

  function layout() {
    var h = window.innerHeight || root.clientHeight || 640;
    // 房间带放在屏幕上部约 18% 处，下方留给对话框与按钮
    root.style.setProperty('--band-top', Math.round(h * 0.18) + 'px');
  }
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 260); });

  /* ---------- 双击合成 ---------- */
  var lastT = 0, lastX = 0, lastY = 0;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0], el = e.target;
    if (el.closest && el.closest('button, summary, .cbtn')) return;   // 按钮交给原生点击
    var now = Date.now();
    var near = Math.hypot(t.clientX - lastX, t.clientY - lastY) < 32;
    if (now - lastT < 320 && near) {
      lastT = 0;
      el.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true, cancelable: true, view: window,
        clientX: t.clientX, clientY: t.clientY
      }));
    } else {
      lastT = now; lastX = t.clientX; lastY = t.clientY;
    }
  }, { passive: true });

  /* ---------- PointerEvent 缺失时的桥接 ---------- */
  if (!window.PointerEvent) {
    var map = {
      touchstart: 'pointerdown', touchmove: 'pointermove',
      touchend: 'pointerup', touchcancel: 'pointercancel'
    };
    Object.keys(map).forEach(function (type) {
      document.addEventListener(type, function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        e.target.dispatchEvent(new MouseEvent(map[type], {
          bubbles: true, cancelable: true, view: window,
          clientX: t.clientX, clientY: t.clientY,
          button: 0, buttons: type === 'touchend' ? 0 : 1
        }));
      }, { passive: true });
    });
  }

  /* ---------- 微信里首次触摸时再补一次音频解锁 ---------- */
  var unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // 页面内的 AudioContext 在 pointerdown 时创建；这里只做一次静默的 resume 兜底
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      var ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      setTimeout(function () { try { ctx.close(); } catch (_) {} }, 1200);
    } catch (_) {}
  }
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
})();
