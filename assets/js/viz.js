/* Tiny SVG chart helpers for RSI Scratchpad experiments.
 *
 *   Viz.line(el, { series: [{ name, color, points: [[x, y], ...], dashed }],
 *                  xDomain, yDomain, xLabel, yLabel, fmtX, fmtY, height, xMarkers })
 *   Viz.area(el, { ...same as line, fill: { from, to, color } })  // shades a band under series[0]
 *   Viz.bars(el, { bars: [{ label, value, color }], yDomain, fmtY, yLabel, height })
 *
 * Colors are CSS custom properties (e.g. 'var(--series-1)') so charts follow the theme.
 * Charts redraw on resize; call the same function again to update.
 */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function ticks(min, max, n) {
    var step0 = (max - min) / (n || 5);
    var mag = Math.pow(10, Math.floor(Math.log10(step0)));
    var err = step0 / mag;
    var step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    var out = [];
    for (var v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function tip(host) {
    var t = host.querySelector(':scope > .viz-tip');
    if (!t) { t = document.createElement('div'); t.className = 'viz-tip'; t.hidden = true; host.appendChild(t); }
    return t;
  }

  function placeTip(host, t, px, py) {
    var w = host.clientWidth;
    t.hidden = false;
    var tw = t.offsetWidth;
    var left = px + 14;
    if (left + tw > w) left = px - tw - 14;
    t.style.left = Math.max(0, left) + 'px';
    t.style.top = Math.max(0, py - 10) + 'px';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Keep charts responsive: redraw with the latest opts when the container width changes.
  var registry = new Map();
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(function (entries) {
    entries.forEach(function (en) {
      var r = registry.get(en.target);
      if (r && Math.abs(en.contentRect.width - r.w) > 2) r.fn(en.target, r.opts);
    });
  }) : null;
  function track(host, fn, opts) {
    var first = !registry.has(host);
    registry.set(host, { fn: fn, opts: opts, w: host.clientWidth });
    if (first && ro) ro.observe(host);
  }

  function legend(host, series) {
    if (series.length < 2) return;
    var lg = document.createElement('div');
    lg.className = 'viz-legend';
    lg.innerHTML = series.map(function (s) {
      return '<span><i class="' + (s.dashed ? 'dash' : '') + '" style="border-color:' + s.color + '"></i>' + esc(s.name) + '</span>';
    }).join('');
    host.appendChild(lg);
  }

  function frame(host, opts, m) {
    var W = Math.max(280, host.clientWidth || 640);
    var H = opts.height || Math.round(Math.min(340, Math.max(220, W * 0.5)));
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.label || '' }, host);
    return { svg: svg, W: W, H: H, iw: W - m.l - m.r, ih: H - m.t - m.b };
  }

  function axes(f, m, opts, sx, sy, xt, yt) {
    var g = el('g', {}, f.svg);
    yt.forEach(function (v) {
      var y = sy(v);
      el('line', { x1: m.l, x2: f.W - m.r, y1: y, y2: y, class: 'gridline' }, g);
      el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'tick' }, g).textContent = (opts.fmtY || String)(v);
    });
    el('line', { x1: m.l, x2: f.W - m.r, y1: f.H - m.b, y2: f.H - m.b, class: 'baseline' }, g);
    if (xt) xt.forEach(function (v) {
      el('text', { x: sx(v), y: f.H - m.b + 18, 'text-anchor': 'middle', class: 'tick' }, g).textContent = (opts.fmtX || String)(v);
    });
    if (opts.xLabel) el('text', { x: m.l + f.iw / 2, y: f.H - 4, 'text-anchor': 'middle', class: 'axis-label' }, g).textContent = opts.xLabel;
    if (opts.yLabel) el('text', { x: 12, y: m.t + f.ih / 2, 'text-anchor': 'middle', class: 'axis-label', transform: 'rotate(-90 12 ' + (m.t + f.ih / 2) + ')' }, g).textContent = opts.yLabel;
  }

  function line(host, opts) {
    host.innerHTML = '';
    host.classList.add('viz');
    legend(host, opts.series);
    var m = { t: 12, r: 16, b: 44, l: 56 };
    var f = frame(host, opts, m);
    var x0 = opts.xDomain[0], x1 = opts.xDomain[1], y0 = opts.yDomain[0], y1 = opts.yDomain[1];
    var sx = function (v) { return m.l + (v - x0) / (x1 - x0) * f.iw; };
    var sy = function (v) { return f.H - m.b - (v - y0) / (y1 - y0) * f.ih; };
    axes(f, m, opts, sx, sy, ticks(x0, x1, Math.max(3, Math.floor(f.iw / 90))), ticks(y0, y1, 5));

    var cid = 'clip' + Math.random().toString(36).slice(2);
    el('rect', { x: m.l, y: m.t - 2, width: f.iw, height: f.ih + 2 }, el('clipPath', { id: cid }, el('defs', {}, f.svg)));
    var plot = el('g', { 'clip-path': 'url(#' + cid + ')' }, f.svg);

    if (opts.fill) {
      var s0 = opts.series[0].points.filter(function (p) { return p[0] >= opts.fill.from && p[0] <= opts.fill.to; });
      if (s0.length > 1) {
        var d = 'M' + sx(s0[0][0]) + ',' + sy(y0) + s0.map(function (p) { return 'L' + sx(p[0]) + ',' + sy(p[1]); }).join('') + 'L' + sx(s0[s0.length - 1][0]) + ',' + sy(y0) + 'Z';
        el('path', { d: d, fill: opts.fill.color, opacity: 0.18 }, plot);
      }
    }
    (opts.xMarkers || []).forEach(function (mk) {
      el('line', { x1: sx(mk.x), x2: sx(mk.x), y1: m.t, y2: f.H - m.b, stroke: mk.color || 'var(--axis)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, plot);
      if (mk.label) el('text', { x: sx(mk.x) + 4, y: m.t + 12, class: 'tick', style: 'fill:var(--ink-2)' }, plot).textContent = mk.label;
    });
    opts.series.forEach(function (s) {
      if (!s.points.length) return;
      var d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(Math.min(y1 * 2, p[1])).toFixed(1); }).join('');
      el('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dashed ? '5 4' : '' }, plot);
    });

    // hover: crosshair + tooltip
    var t = tip(host);
    var cross = el('line', { y1: m.t, y2: f.H - m.b, class: 'crosshair', visibility: 'hidden' }, f.svg);
    var dots = opts.series.map(function (s) { return el('circle', { r: 4, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' }, f.svg); });
    var hit = el('rect', { x: m.l, y: m.t, width: f.iw, height: f.ih, fill: 'transparent' }, f.svg);
    function valueAt(pts, x) {
      if (!pts.length || x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
      var lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid][0] <= x) lo = mid; else hi = mid; }
      var a = pts[lo], b = pts[hi];
      return b[0] === a[0] ? a[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    function move(ev) {
      var r = f.svg.getBoundingClientRect();
      var px = (ev.clientX - r.left) * f.W / r.width;
      var x = x0 + (px - m.l) / f.iw * (x1 - x0);
      cross.setAttribute('x1', sx(x)); cross.setAttribute('x2', sx(x)); cross.setAttribute('visibility', 'visible');
      var rows = '';
      opts.series.forEach(function (s, i) {
        var v = valueAt(s.points, x);
        if (v === null || v > y1 * 1.0001 || v < y0) { dots[i].setAttribute('visibility', 'hidden'); if (v !== null && v > y1) rows += '<div class="row"><span class="sw" style="background:' + s.color + '"></span>' + esc(s.name) + '<b>off chart</b></div>'; return; }
        dots[i].setAttribute('cx', sx(x)); dots[i].setAttribute('cy', sy(v)); dots[i].setAttribute('visibility', 'visible');
        rows += '<div class="row"><span class="sw" style="background:' + s.color + '"></span>' + esc(s.name) + '<b>' + (opts.fmtY || String)(v) + '</b></div>';
      });
      t.innerHTML = '<div class="hd">' + esc(opts.xLabel || 'x') + ': ' + (opts.fmtTipX || opts.fmtX || String)(x) + '</div>' + rows;
      placeTip(host, t, px * r.width / f.W, (ev.clientY - host.getBoundingClientRect().top));
    }
    function leave() { t.hidden = true; cross.setAttribute('visibility', 'hidden'); dots.forEach(function (d) { d.setAttribute('visibility', 'hidden'); }); }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);
    host.appendChild(t);
    track(host, line, opts);
  }

  function bars(host, opts) {
    host.innerHTML = '';
    host.classList.add('viz');
    var m = { t: 16, r: 8, b: 44, l: 52 };
    var f = frame(host, opts, m);
    var y0 = opts.yDomain[0], y1 = opts.yDomain[1];
    var sy = function (v) { return f.H - m.b - (v - y0) / (y1 - y0) * f.ih; };
    var n = opts.bars.length, slot = f.iw / n, bw = Math.min(56, slot - 2 * Math.max(2, slot * 0.18));
    var sx = function (i) { return m.l + slot * i + slot / 2; };
    axes(f, m, opts, null, sy, null, ticks(y0, y1, 5));
    var t = tip(host);
    opts.bars.forEach(function (b, i) {
      var top = sy(Math.max(b.value, y0)), base = sy(y0), h = Math.max(0, base - top), x = sx(i) - bw / 2, r = Math.min(4, h, bw / 2);
      var d = 'M' + x + ',' + base + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + base + 'Z';
      var bar = el('path', { d: d, fill: b.color || 'var(--series-1)' }, f.svg);
      el('text', { x: sx(i), y: f.H - m.b + 18, 'text-anchor': 'middle', class: 'tick' }, f.svg).textContent = b.label;
      if (b.direct) el('text', { x: sx(i), y: top - 6, 'text-anchor': 'middle', class: 'tick', style: 'fill:var(--ink)' }, f.svg).textContent = (opts.fmtY || String)(b.value);
      var hit = el('rect', { x: m.l + slot * i, y: m.t, width: slot, height: f.ih, fill: 'transparent' }, f.svg);
      function show(ev) {
        bar.setAttribute('opacity', 0.8);
        t.innerHTML = '<div class="hd">' + esc(b.tip || b.label) + '</div><div class="row">' + esc(opts.yLabel || 'value') + '<b>' + (opts.fmtY || String)(b.value) + '</b></div>';
        var r = host.getBoundingClientRect();
        placeTip(host, t, ev.clientX - r.left, ev.clientY - r.top);
      }
      hit.addEventListener('pointermove', show);
      hit.addEventListener('pointerdown', show);
      hit.addEventListener('pointerleave', function () { bar.removeAttribute('opacity'); t.hidden = true; });
    });
    host.appendChild(t);
    track(host, bars, opts);
  }

  window.Viz = { line: line, bars: bars, ticks: ticks };
})();
