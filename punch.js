/* ------------------------------------------------------------------
   Easter egg: thump the flip button (⤢) three times in a row — or hit
   the F key three times — and a fist punches the board. The pieces leap
   off their squares and about half of them land flat on their backs.

   Entirely cosmetic. Nothing in here touches the game state, the legal
   moves or the answers: it only adds CSS classes to the piece elements
   that are already on screen. The component redraws the board on any
   real move, undo or reset, which throws the classes away — so playing
   on tidies the pieces back up by itself.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  var PRESSES = 3;     // presses needed to set it off
  var WINDOW  = 1400;  // ms — they have to come this quickly to count
  var CALM    = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- styles ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".board-frame { position: relative; }",
    /* The fist swings in from off the board. Without this its run-up widens
       the page and the whole thing scrolls sideways on a phone. */
    ".board-frame.bp-clip { overflow: hidden; }",
    ".bp-fist {",
    "  position: absolute; left: 50%; top: 50%; z-index: 6;",
    "  line-height: 1; pointer-events: none; user-select: none;",
    "  filter: drop-shadow(0 6px 10px rgba(0,0,0,.45));",
    "  animation: bp-fly 760ms cubic-bezier(.25,.1,.3,1) both;",
    "}",
    "@keyframes bp-fly {",
    "  0%   { transform: translate(-50%,-50%) translate(78%,-78%) rotate(-30deg) scale(.5); opacity: 0; }",
    "  22%  { opacity: 1; }",
    "  42%  { transform: translate(-50%,-50%) translate(4%,-4%)     rotate(-7deg)  scale(1.14); opacity: 1; }",
    "  52%  { transform: translate(-50%,-50%) translate(0,0)        rotate(0deg)   scale(.98); opacity: 1; }",
    "  100% { transform: translate(-50%,-50%) translate(72%,-72%) rotate(-26deg) scale(.55); opacity: 0; }",
    "}",
    ".bp-shake { animation: bp-shake 480ms cubic-bezier(.36,.07,.19,.97) both; }",
    "@keyframes bp-shake {",
    "  0%,100% { transform: translate(0,0) rotate(0); }",
    "  12% { transform: translate(-5px,4px) rotate(-1.1deg); }",
    "  28% { transform: translate(6px,-3px) rotate(1deg); }",
    "  44% { transform: translate(-4px,2px) rotate(-.7deg); }",
    "  62% { transform: translate(3px,-2px) rotate(.5deg); }",
    "  80% { transform: translate(-2px,1px) rotate(-.25deg); }",
    "}",
    /* SVG pieces need an explicit box or the rotation pivots off-corner */
    ".pc.bp-jump, .pc.bp-down { transform-box: fill-box; transform-origin: 50% 50%; }",
    ".pc.bp-jump { animation: bp-jump 620ms var(--bp-d,0ms) cubic-bezier(.3,-.35,.5,1.45) both; }",
    "@keyframes bp-jump {",
    "  0%   { transform: translateY(0) rotate(0); }",
    "  34%  { transform: translateY(-52%) rotate(var(--bp-r,12deg)); }",
    "  68%  { transform: translateY(-12%) rotate(calc(var(--bp-r,12deg) * .35)); }",
    "  86%  { transform: translateY(2%)   rotate(0); }",
    "  100% { transform: translateY(0)    rotate(0); }",
    "}",
    ".pc.bp-down { transform: rotate(var(--bp-l,90deg)) scale(.9); transition: transform 200ms ease-out; }",
    "@media (prefers-reduced-motion: reduce) {",
    "  .bp-fist, .bp-shake { animation: none; }",
    "  .pc.bp-jump { animation: none; }",
    "  .pc.bp-down { transition: none; }",
    "}"
  ].join("\n");
  document.head.appendChild(css);

  /* ---------- sound: synthesised, so there is no file to load ---------- */
  var ac = null;
  function thump() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = ac || new AC();
      if (ac.state === "suspended" && ac.resume) ac.resume();
      var t = ac.currentTime;

      // the body of the punch: a short pitch-dropping sine
      var osc = ac.createOscillator(), og = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.exponentialRampToValueAtTime(44, t + 0.17);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.42, t + 0.012);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(og); og.connect(ac.destination);
      osc.start(t); osc.stop(t + 0.26);

      // the slap on top: a fast-decaying band-passed noise burst
      var n = Math.floor(ac.sampleRate * 0.085);
      var buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0);
      for (var i = 0; i < n; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.7);
      }
      var src = ac.createBufferSource(); src.buffer = buf;
      var bp = ac.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.8;
      var ng = ac.createGain(); ng.gain.value = 0.3;
      src.connect(bp); bp.connect(ng); ng.connect(ac.destination);
      src.start(t);
    } catch (e) { /* sound is a bonus — never let it break the animation */ }
  }

  /* ---------- the punch ---------- */
  function punch(frame) {
    if (!frame || frame.dataset.bpBusy) return;
    frame.dataset.bpBusy = "1";
    frame.classList.add("bp-clip");
    thump();

    var fist = document.createElement("div");
    fist.className = "bp-fist";
    fist.setAttribute("aria-hidden", "true");
    fist.textContent = "👊";
    fist.style.fontSize = Math.max(44, Math.round(frame.clientWidth * 0.46)) + "px";
    frame.appendChild(fist);

    var land = function () {
      var pcs = [].slice.call(frame.querySelectorAll(".pc"));
      pcs.forEach(function (p) {
        p.classList.remove("bp-jump");
        // about half of them end up flat on their backs
        if (Math.random() < 0.5) {
          p.style.setProperty("--bp-l", (Math.random() < 0.5 ? 90 : -90) + "deg");
          p.classList.add("bp-down");
        } else {
          p.classList.remove("bp-down");
          p.style.removeProperty("--bp-l");
        }
      });
      frame.classList.remove("bp-shake");
    };

    var impact = function () {
      frame.classList.add("bp-shake");
      var pcs = [].slice.call(frame.querySelectorAll(".pc"));
      pcs.forEach(function (p) {
        p.style.setProperty("--bp-d", (Math.random() * 120 | 0) + "ms");
        p.style.setProperty("--bp-r", ((Math.random() * 46 - 23) | 0) + "deg");
        p.classList.remove("bp-down");
        p.classList.add("bp-jump");
      });
      setTimeout(land, CALM ? 0 : 640);
    };

    if (CALM) {
      impact(); fist.remove();
      frame.classList.remove("bp-clip");
      delete frame.dataset.bpBusy;
      return;
    }
    setTimeout(impact, 300);
    setTimeout(function () {
      fist.remove();
      frame.classList.remove("bp-clip");
      delete frame.dataset.bpBusy;
    }, 1000);
  }

  /* ---------- which board did they mean? ---------- */
  function frameFor(el) {
    var n = el;
    while (n && n !== document.body) {
      if (n.querySelector) {
        var f = n.querySelector(".board-frame");
        if (f) return f;
      }
      n = n.parentElement;
    }
    return visibleFrame();
  }

  // for the keyboard: whichever board is nearest the middle of the screen
  function visibleFrame() {
    var best = null, bestD = Infinity, mid = window.innerHeight / 2;
    [].slice.call(document.querySelectorAll(".board-frame")).forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestD) { bestD = d; best = f; }
    });
    return best || document.querySelector(".board-frame");
  }

  /* ---------- count the presses ---------- */
  var count = 0, last = 0, lastFrame = null;
  function bump(frame) {
    if (!frame) return;
    var now = Date.now();
    if (now - last > WINDOW || frame !== lastFrame) count = 0;
    last = now; lastFrame = frame; count++;
    if (count >= PRESSES) { count = 0; punch(frame); }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest('[data-a="flip"], #bFlip');
    if (btn) bump(frameFor(btn));
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "f" && e.key !== "F") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    bump(visibleFrame());
  });
})();
