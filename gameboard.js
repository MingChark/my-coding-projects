/* ------------------------------------------------------------------
   gameboard.js — a small replayer for a game or an opening line.

   Drop-in: put <div class="gbwrap" data-board="some-id"></div> where
   you want the board, define window.BOARDS["some-id"], and load this
   file with <script src="gameboard.js" defer></script>. It brings its
   own styles and its own piece sprite, so it works on any page.

   It only *replays* — there are no legal-move rules in here at all.
   Every position is a FEN worked out ahead of time by python-chess
   (see ~/Desktop/Chess/games/mkboards.py), so the board can't drift
   out of step with the moves written in the text beside it.

   Board data:
     { title, meta, flip, nodes: [{san, from, to, fen, ply, note}],
       startFen, tail }
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  var SPRITE = "<symbol id=\"gb-p\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <circle cx=\"22.5\" cy=\"13.5\" r=\"5.8\"/>\n        <path d=\"M17.3 20.2c-1.9 2.2-2.9 4.4-2.9 7 0 3.3 1.7 5.6 3.1 7.3h10c1.4-1.7 3.1-4 3.1-7.3 0-2.6-1-4.8-2.9-7z\"/>\n        <path d=\"M13 34.5h19l2.7 5.2H10.3z\"/>\n      </g>\n    </symbol>\n\n    <symbol id=\"gb-r\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <path d=\"M11.5 39.5h22v-3.6h-22z\"/>\n        <path d=\"M14 35.9h17l-1.4-13.4H15.4z\"/>\n        <path d=\"M12.6 22.5h19.8v-3.4H12.6z\"/>\n        <path d=\"M13.2 19.1V9.4h4.3v3.9h3.1V9.4h3.8v3.9h3.1V9.4h4.3v9.7z\"/>\n      </g>\n    </symbol>\n\n    <symbol id=\"gb-n\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <path d=\"M11.5 39.5h22v-3.6h-22z\"/>\n        <path d=\"M14.2 35.9c-.3-4.8.6-9.2 2.8-12.6 1.7-2.6 4-4.4 5.7-6.1-.5-1.1-1.5-1.9-2.9-2.1-1 1.5-2.4 2.6-4.1 3.1-.9.3-1.6-.1-1.7-1-.1-1.1.5-2.2 1.4-3.4 1.6-2.1 3.6-3.8 5.6-5 .3-1.3.5-2.5 1.4-3.4.7-.7 1.7-.6 2.2.2.3.5.3 1.1.2 1.7 3.6 1.1 6.7 3.4 8.4 6.9 1.8 3.6 2.2 8.1 2.2 12.6v9.1z\"/>\n      </g>\n    </symbol>\n\n    <symbol id=\"gb-b\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <path d=\"M11.5 39.5h22v-3.6h-22z\"/>\n        <path d=\"M15.2 35.9h14.6c-.4-2.6-1.9-4.2-1.9-4.2H17.1s-1.5 1.6-1.9 4.2z\"/>\n        <path d=\"M22.5 9.6c-4.3 2.9-7.4 6.6-7.4 11.3 0 3.8 2.8 6.7 7.4 8.4 4.6-1.7 7.4-4.6 7.4-8.4 0-4.7-3.1-8.4-7.4-11.3z\"/>\n        <circle cx=\"22.5\" cy=\"7.2\" r=\"2.3\"/>\n        <path d=\"M19.4 17.6h6.2M22.5 14.5v6.2\" fill=\"none\" stroke-width=\"1.5\"/>\n      </g>\n    </symbol>\n\n    <symbol id=\"gb-q\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <path d=\"M10.5 39.5h24v-3.6h-24z\"/>\n        <path d=\"M13.4 35.9h18.2c1.1-4.3 1.7-8.6 1.7-12.4H11.7c0 3.8.6 8.1 1.7 12.4z\"/>\n        <path d=\"M11.7 23.5 9.4 12.8l6.4 5.1 3.2-9.1 3.5 8.6 3.5-8.6 3.2 9.1 6.4-5.1-2.3 10.7z\"/>\n        <circle cx=\"8.6\" cy=\"11.4\" r=\"2.1\"/>\n        <circle cx=\"16.4\" cy=\"8.3\" r=\"2.1\"/>\n        <circle cx=\"22.5\" cy=\"6.9\" r=\"2.1\"/>\n        <circle cx=\"28.6\" cy=\"8.3\" r=\"2.1\"/>\n        <circle cx=\"36.4\" cy=\"11.4\" r=\"2.1\"/>\n      </g>\n    </symbol>\n\n    <symbol id=\"gb-k\" viewBox=\"0 0 45 45\">\n      <g stroke-linejoin=\"round\" stroke-linecap=\"round\" stroke-width=\"1.4\">\n        <path d=\"M11 39.5h23v-3.6H11z\"/>\n        <path d=\"M13.6 35.9h17.8c1.2-3.9 1.9-7.6 1.9-10.6 0-3.4-2.4-5.7-5.3-5.7-2.1 0-3.9 1.2-5.5 3.4-1.6-2.2-3.4-3.4-5.5-3.4-2.9 0-5.3 2.3-5.3 5.7 0 3 .7 6.7 1.9 10.6z\"/>\n        <path d=\"M22.5 19.6V8.4\" fill=\"none\" stroke-width=\"2\"/>\n        <path d=\"M17.6 12.4h9.8\" fill=\"none\" stroke-width=\"2\"/>\n      </g>\n    </symbol>";

  var CSS = [
    ".gbwrap { margin:16px 0; }",
    ".gb { background:rgba(255,255,255,.96); border-radius:18px; padding:15px 16px 13px;",
    "      box-shadow:0 6px 16px rgba(0,0,0,.16); }",
    ".gb .gbtop { margin-bottom:11px; }",
    ".gb .gbttl { font-weight:bold; color:#1b4f72; font-size:18px; }",
    ".gb .gbmeta { font-family:'Trebuchet MS',sans-serif; font-size:13px; color:#5b6b7c; margin-top:2px; }",
    ".gb .gbbody { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start; }",
    ".gb .gbleft { flex:1 1 290px; min-width:0; max-width:430px; }",
    ".gb .gbright { flex:1 1 250px; min-width:0; }",
    ".gb .gbframe { background:#3f5a80; padding:8px; border-radius:6px;",
    "               box-shadow:0 4px 12px rgba(0,0,0,.25); width:100%; }",
    ".gb .gbboard { width:100%; display:grid; grid-template-columns:18px repeat(8,1fr);",
    "               grid-template-rows:repeat(8,auto) 16px; }",
    ".gb .gbsq { position:relative; aspect-ratio:1/1; min-width:0; display:flex;",
    "            align-items:center; justify-content:center; }",
    ".gb .gbsq.light { background:#eef1f5; } .gb .gbsq.dark { background:#8ca9cf; }",
    ".gb .gbsq.from::before, .gb .gbsq.to::before { content:''; position:absolute; inset:0;",
    "            background:rgba(255,214,61,.45); }",
    ".gb .gbsq.to::after { content:''; position:absolute; inset:0;",
    "            box-shadow:inset 0 0 0 3px rgba(240,170,20,.85); }",
    ".gb .gbpc { position:relative; z-index:2; width:88%; height:88%; display:block;",
    "            stroke-linejoin:round; stroke-linecap:round; }",
    ".gb .gbpc.w { fill:#fdfdfd; stroke:#1c1c1c; } .gb .gbpc.b { fill:#262626; stroke:#0b0b0b; }",
    ".gb .gbrank, .gb .gbfile { display:flex; align-items:center; justify-content:center;",
    "            font-family:'Trebuchet MS',sans-serif; font-size:10px; color:#eaf0f7; }",
    ".gb .gbctl { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }",
    ".gb .gbctl button { font-family:inherit; font-size:14px; cursor:pointer; background:#1b4f72;",
    "            color:#fff; border:0; border-radius:11px; padding:7px 11px;",
    "            box-shadow:0 3px 8px rgba(0,0,0,.2); }",
    ".gb .gbctl button.ghost { background:#8aa0b8; }",
    ".gb .gbctl button:disabled { opacity:.45; cursor:default; box-shadow:none; }",
    ".gb .gbsay { margin-top:10px; font-family:'Trebuchet MS',sans-serif; font-size:14px;",
    "            color:#1b4f72; min-height:1.4em; }",
    ".gb .gbsay b { color:#7d3c98; }",
    ".gb .gbnote { margin-top:7px; background:#f4ecfa; border-radius:10px; padding:8px 11px;",
    "            font-family:'Trebuchet MS',sans-serif; font-size:14px; color:#5b3a74; }",
    ".gb .gbmoves { font-family:'Trebuchet MS',sans-serif; font-size:14.5px; line-height:2;",
    "            max-height:320px; overflow:auto; background:#f2f5f8; border-radius:12px;",
    "            padding:10px 12px; }",
    ".gb .gbno { color:#8795a5; margin-right:2px; }",
    ".gb .gbmv { cursor:pointer; border-radius:7px; padding:2px 6px; margin-right:3px;",
    "            display:inline-block; }",
    ".gb .gbmv:hover { background:#dce8f5; }",
    ".gb .gbmv.on { background:#1b4f72; color:#fff; font-weight:bold; }",
    ".gb .gbmv.starred { color:#7d3c98; font-weight:bold; }",
    ".gb .gbmv.on.starred { color:#ffe28a; }",
    ".gb .gbtail { margin-top:10px; padding-top:9px; border-top:2px dotted #ccd7e3;",
    "            font-family:'Trebuchet MS',sans-serif; font-size:13.5px;",
    "            color:#5b6b7c; }",
    "@media (max-width:430px) {",
    "  .gb { padding:12px 11px 11px; }",
    "  .gb .gbboard { grid-template-columns:13px repeat(8,1fr); }",
    "  .gb .gbrank, .gb .gbfile { font-size:9px; }",
    "  .gb .gbctl { gap:5px; }",
    "  .gb .gbctl button { font-size:13px; padding:7px 8px; }",
    "  .gb .gbmoves { max-height:210px; }",
    "}"
  ].join("\n");

  var FILES = "abcdefgh";
  var SYM = { k:"gb-k", q:"gb-q", r:"gb-r", b:"gb-b", n:"gb-n", p:"gb-p" };
  var NS = "http://www.w3.org/2000/svg";

  function once() {
    if (document.getElementById("gb-sprite")) return;
    var style = document.createElement("style");
    style.id = "gb-style";
    style.textContent = CSS;
    document.head.appendChild(style);
    var holder = document.createElement("div");
    holder.id = "gb-sprite";
    holder.setAttribute("aria-hidden", "true");
    holder.style.display = "none";
    holder.innerHTML = '<svg xmlns="' + NS + '"><defs>' + SPRITE + "</defs></svg>";
    document.body.appendChild(holder);
  }

  function gridFromFen(fen) {
    var rows = fen.split(" ")[0].split("/"), grid = {}, r, c, rk, ch, i, j;
    for (r = 0; r < 8; r++) {
      rk = 8 - r; c = 0;
      for (j = 0; j < rows[r].length; j++) {
        ch = rows[r][j];
        if (ch >= "1" && ch <= "8") { c += Number(ch); }
        else { grid[FILES[c] + rk] = ch; c++; }
      }
    }
    return grid;
  }

  function Board(data, host) {
    this.d = data;
    this.host = host;
    this.i = -1;                       // -1 = starting position
    this.flip = !!data.flip;
    this.timer = null;
    this.build();
    this.render();
  }

  Board.prototype.build = function () {
    var d = this.d;
    this.host.className = "gbwrap";
    this.host.innerHTML =
      '<div class="gb">' +
        '<div class="gbtop">' +
          (d.title ? '<div class="gbttl"></div>' : "") +
          (d.meta ? '<div class="gbmeta"></div>' : "") +
        "</div>" +
        '<div class="gbbody">' +
          '<div class="gbleft">' +
            '<div class="gbframe"><div class="gbboard"></div></div>' +
            '<div class="gbctl">' +
              '<button data-a="first" class="ghost" title="Back to the start">⏮</button>' +
              '<button data-a="prev" class="ghost" title="One move back">◀</button>' +
              '<button data-a="play">▶ Play</button>' +
              '<button data-a="next" class="ghost" title="One move on">▶|</button>' +
              '<button data-a="last" class="ghost" title="Jump to the end">⏭</button>' +
              '<button data-a="flip" class="ghost" title="Turn the board round">⤢</button>' +
            "</div>" +
            '<div class="gbsay"></div>' +
          "</div>" +
          '<div class="gbright">' +
            '<div class="gbmoves"></div>' +
            (d.tail ? '<div class="gbtail"></div>' : "") +
          "</div>" +
        "</div>" +
      "</div>";
    if (d.title) this.host.querySelector(".gbttl").textContent = d.title;
    if (d.meta) this.host.querySelector(".gbmeta").innerHTML = d.meta;
    if (d.tail) this.host.querySelector(".gbtail").innerHTML = d.tail;

    this.boardEl = this.host.querySelector(".gbboard");
    this.sayEl = this.host.querySelector(".gbsay");
    this.movesEl = this.host.querySelector(".gbmoves");
    this.playBtn = this.host.querySelector('[data-a="play"]');

    var self = this;
    this.host.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]");
      if (b) {
        var a = b.dataset.a;
        if (a !== "play") self.stop();
        if (a === "first") self.go(-1);
        else if (a === "prev") self.go(self.i - 1);
        else if (a === "next") self.go(self.i + 1);
        else if (a === "last") self.go(self.d.nodes.length - 1);
        else if (a === "flip") { self.flip = !self.flip; self.render(); }
        else if (a === "play") self.toggle();
        return;
      }
      var mv = e.target.closest(".gbmv");
      if (mv) { self.stop(); self.go(Number(mv.dataset.i)); }
    });

    this.drawMoves();
  };

  Board.prototype.fen = function () {
    return this.i < 0 ? (this.d.startFen || this.d.nodes[0].before)
                      : this.d.nodes[this.i].fen;
  };

  Board.prototype.render = function () {
    var grid = gridFromFen(this.fen());
    var node = this.i >= 0 ? this.d.nodes[this.i] : null;
    var ranks = this.flip ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    var files = this.flip ? FILES.split("").reverse() : FILES.split("");
    var b = this.boardEl;
    b.textContent = "";
    ranks.forEach(function (rk) {
      var lab = document.createElement("div");
      lab.className = "gbrank"; lab.textContent = rk;
      b.appendChild(lab);
      files.forEach(function (fl) {
        var name = fl + rk;
        var sq = document.createElement("div");
        var dark = (FILES.indexOf(fl) + rk) % 2 === 1;   // a1 is dark
        sq.className = "gbsq " + (dark ? "dark" : "light");
        if (node && node.from === name) sq.classList.add("from");
        if (node && node.to === name) sq.classList.add("to");
        var p = grid[name];
        if (p) {
          var svg = document.createElementNS(NS, "svg");
          svg.setAttribute("viewBox", "0 0 45 45");
          svg.setAttribute("class", "gbpc " + (p === p.toUpperCase() ? "w" : "b"));
          var use = document.createElementNS(NS, "use");
          use.setAttribute("href", "#" + SYM[p.toLowerCase()]);
          svg.appendChild(use);
          sq.appendChild(svg);
        }
        b.appendChild(sq);
      });
    });
    b.appendChild(document.createElement("div"));
    files.forEach(function (fl) {
      var lab = document.createElement("div");
      lab.className = "gbfile"; lab.textContent = fl.toUpperCase();
      b.appendChild(lab);
    });
    this.drawSay();
    this.mark();
    this.syncButtons();
  };

  Board.prototype.drawSay = function () {
    var d = this.d, n = this.i >= 0 ? d.nodes[this.i] : null;
    var say = this.sayEl;
    say.textContent = "";
    if (!n) {
      say.textContent = d.openingNote || "The starting position. Press ▶ Play to watch it, or step through one move at a time.";
      return;
    }
    var no = Math.ceil(n.ply / 2);
    var lead = no + (n.ply % 2 === 1 ? "." : "…");
    var head = document.createElement("span");
    head.innerHTML = "<b>" + lead + n.san + "</b>";
    say.appendChild(head);
    if (n.note) {
      var note = document.createElement("div");
      note.className = "gbnote";
      note.innerHTML = n.note;
      say.appendChild(note);
    }
  };

  Board.prototype.drawMoves = function () {
    var d = this.d, box = this.movesEl, frag = document.createDocumentFragment();
    d.nodes.forEach(function (n, i) {
      if (n.ply % 2 === 1) {
        var no = document.createElement("span");
        no.className = "gbno";
        no.textContent = Math.ceil(n.ply / 2) + ".";
        frag.appendChild(no);
      } else if (i === 0) {
        var no2 = document.createElement("span");
        no2.className = "gbno";
        no2.textContent = Math.ceil(n.ply / 2) + "…";
        frag.appendChild(no2);
      }
      var s = document.createElement("span");
      s.className = "gbmv" + (n.note ? " starred" : "");
      s.dataset.i = i;
      s.textContent = n.san;
      frag.appendChild(s);
    });
    box.textContent = "";
    box.appendChild(frag);
  };

  Board.prototype.mark = function () {
    var on = this.movesEl.querySelector(".gbmv.on");
    if (on) on.classList.remove("on");
    if (this.i < 0) return;
    var el = this.movesEl.querySelector('.gbmv[data-i="' + this.i + '"]');
    if (!el) return;
    el.classList.add("on");
    var br = this.movesEl.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top < br.top || r.bottom > br.bottom) {
      this.movesEl.scrollTop += r.top - br.top - br.height / 2 + r.height / 2;
    }
  };

  Board.prototype.syncButtons = function () {
    var last = this.d.nodes.length - 1;
    this.host.querySelector('[data-a="first"]').disabled = this.i < 0;
    this.host.querySelector('[data-a="prev"]').disabled = this.i < 0;
    this.host.querySelector('[data-a="next"]').disabled = this.i >= last;
    this.host.querySelector('[data-a="last"]').disabled = this.i >= last;
  };

  Board.prototype.go = function (i) {
    var last = this.d.nodes.length - 1;
    if (i < -1) i = -1;
    if (i > last) i = last;
    this.i = i;
    this.render();
    return i;
  };

  Board.prototype.toggle = function () { this.timer ? this.stop() : this.start(); };

  Board.prototype.start = function () {
    var self = this, last = this.d.nodes.length - 1;
    if (this.i >= last) this.go(-1);
    this.playBtn.textContent = "⏸ Pause";
    var tick = function () {
      if (self.i >= last) { self.stop(); return; }
      self.go(self.i + 1);
      // linger on the moves that have something to say about them
      var n = self.d.nodes[self.i];
      self.timer = setTimeout(tick, n && n.note ? 2600 : 950);
    };
    this.timer = setTimeout(tick, 250);
  };

  Board.prototype.stop = function () {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.playBtn.textContent = "▶ Play";
  };

  function mountAll() {
    once();
    var all = document.querySelectorAll("[data-board]");
    for (var i = 0; i < all.length; i++) {
      var host = all[i], id = host.dataset.board;
      var data = window.BOARDS && window.BOARDS[id];
      if (!data) { host.innerHTML = ""; continue; }
      new Board(data, host);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else { mountAll(); }
})();
