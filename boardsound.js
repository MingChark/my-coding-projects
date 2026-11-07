/* ------------------------------------------------------------------
   boardsound.js — a tock when a piece moves, a thunk when one is taken.

   Drop it on any page with a board and it finds them by itself. It
   doesn't call into the board code at all: it watches each board for
   pieces appearing and disappearing and works out what happened from
   the count. That means the puzzle boards, the homework boards and
   the gameboard.js replayer all get sound from one file, and none of
   them had to be edited to get it.

     fewer pieces than before  -> something was captured
     same number, squares moved -> an ordinary move
     more pieces than before    -> an undo or a reset, so stay quiet
     the rank labels flipped    -> the board was turned round, stay quiet

   Both sounds are synthesised with the Web Audio API, so there is no
   audio file to load and nothing to go stale. There is a 🔊 button in
   the corner; the choice is remembered per browser.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  var KEY = "boardsound:on";
  var on = true;
  try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}

  /* ---------- the sounds ---------- */
  var ac = null;
  function ctx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac) ac = new AC();
    if (ac.state === "suspended" && ac.resume) ac.resume();
    return ac;
  }

  /* a short burst of noise, shaped — this is the "wood" in both sounds */
  function knock(a, t, opts) {
    var n = Math.floor(a.sampleRate * opts.len);
    var buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, opts.decay);
    }
    var src = a.createBufferSource(); src.buffer = buf;
    var bp = a.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = opts.hz; bp.Q.value = opts.q;
    var g = a.createGain(); g.gain.value = opts.gain;
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start(t);
  }

  /* a short pitch-dropping sine — the body underneath the knock */
  function body(a, t, from, to, gain, len) {
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + len + 0.02);
  }

  function play(kind) {
    if (!on) return;
    try {
      var a = ctx(); if (!a) return;
      var t = a.currentTime;
      if (kind === "capture") {
        // heavier: more wood, lower thump, a touch longer
        knock(a, t, { len: 0.075, decay: 2.2, hz: 950, q: 0.7, gain: 0.34 });
        body(a, t, 220, 70, 0.26, 0.14);
      } else {
        // a light tock
        knock(a, t, { len: 0.035, decay: 3.4, hz: 1700, q: 1.1, gain: 0.2 });
        body(a, t, 320, 150, 0.1, 0.055);
      }
    } catch (e) { /* sound is a bonus — never let it break a board */ }
  }

  /* ---------- the mute button ---------- */
  function button() {
    var b = document.createElement("button");
    b.id = "bs-toggle";
    b.type = "button";
    b.setAttribute("aria-label", "Board sound");
    var style = document.createElement("style");
    style.textContent = [
      "#bs-toggle { position:fixed; right:14px; bottom:14px; z-index:40;",
      "  font-family:'Trebuchet MS',sans-serif; font-size:17px; line-height:1;",
      "  width:42px; height:42px; border:0; border-radius:50%; cursor:pointer;",
      "  background:rgba(27,79,114,.92); color:#fff;",
      "  box-shadow:0 3px 10px rgba(0,0,0,.3); }",
      "#bs-toggle.off { background:rgba(140,155,170,.9); }",
      "#bs-toggle:hover { transform:scale(1.06); }",
      "@media print { #bs-toggle { display:none; } }"
    ].join("\n");
    document.head.appendChild(style);
    var paint = function () {
      b.textContent = on ? "🔊" : "🔇";
      b.classList.toggle("off", !on);
      b.title = on ? "Board sound on — tap to mute" : "Board sound off — tap to turn on";
    };
    b.addEventListener("click", function () {
      on = !on;
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
      paint();
      if (on) play("move");          // so you can hear what you just turned on
    });
    paint();
    document.body.appendChild(b);
  }

  /* ---------- watch the boards ---------- */
  var PIECES = ".pc, .gbpc";
  var RANKS = ".rank, .gbrank";

  function state(board) {
    var labels = board.querySelectorAll(RANKS);
    return {
      n: board.querySelectorAll(PIECES).length,
      top: labels.length ? labels[0].textContent.trim() : ""
    };
  }

  function watch(board) {
    if (board.dataset.bsWatched) return;
    board.dataset.bsWatched = "1";
    var last = state(board);
    var timer = null;
    var obs = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var now = state(board);
        var flipped = now.top !== last.top;
        if (!flipped) {
          if (now.n < last.n) play("capture");
          else if (now.n === last.n) play("move");
          // more pieces than before = undo or reset, so no sound
        }
        last = now;
      }, 30);
    });
    obs.observe(board, { childList: true, subtree: true });
  }

  function scan() {
    document.querySelectorAll(".board, .gbboard").forEach(watch);
  }

  function start() {
    scan();
    button();
    // boards that mount later (the replayer builds its own markup)
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }
})();
