/* Wspólny kod slajdów: uruchomienie reveal.js, cykl życia dem, wykresy i suwaki. */

// ------------------------------------------------------------------ dema
// Demo rejestrujemy funkcją Dema.dodaj(element, fabryka). Fabryka dostaje element i zwraca
// obiekt { start(), stop() }. Demo jest tworzone przy pierwszym pokazaniu slajdu,
// a animacja działa tylko na aktualnym slajdzie.
const Dema = {
  lista: [],
  dodaj(el, fabryka) {
    if (typeof el === "string") el = document.querySelector(el);
    this.lista.push({ el, fabryka, obiekt: null, dziala: false });
  },
  odswiez(slajd) {
    for (const d of this.lista) {
      const widoczne = slajd && slajd.contains(d.el);
      if (widoczne && !d.dziala) {
        if (!d.obiekt) d.obiekt = d.fabryka(d.el);
        d.obiekt.start();
        d.dziala = true;
      } else if (!widoczne && d.dziala) {
        d.obiekt.stop();
        d.dziala = false;
      }
    }
  },
};

// Pętla animacji z krokiem fizyki dt (domyślnie 0.01 s), w czasie rzeczywistym.
function petla(krok, rysuj, dt = 0.01) {
  let id = null, ostatni = null, zapas = 0, predkosc = 1;
  function klatka(t) {
    if (ostatni !== null) {
      zapas += Math.min((t - ostatni) / 1000, 0.05) * predkosc;
      while (zapas >= dt) { krok(dt); zapas -= dt; }
    }
    ostatni = t;
    rysuj();
    id = requestAnimationFrame(klatka);
  }
  return {
    start() { if (id === null) { ostatni = null; id = requestAnimationFrame(klatka); } },
    stop() { if (id !== null) cancelAnimationFrame(id); id = null; },
    ustawPredkosc(p) { predkosc = p; },
  };
}

// ------------------------------------------------------------------ suwaki
// suwak(rodzic, {etykieta, min, max, krok, wartosc, klasa, format}, przyZmianie)
function suwak(rodzic, o, przyZmianie) {
  const l = document.createElement("label");
  l.className = "suwak " + (o.klasa || "");
  l.innerHTML = `<span>${o.etykieta}</span><input type="range" min="${o.min}" max="${o.max}" step="${o.krok}" value="${o.wartosc}"><span class="wartosc"></span>`;
  const inp = l.querySelector("input"), w = l.querySelector(".wartosc");
  const fmt = o.format || ((v) => (+v).toFixed(o.krok < 0.01 ? 3 : o.krok < 0.1 ? 2 : o.krok < 1 ? 1 : 0));
  const pokaz = () => { w.textContent = fmt(+inp.value); };
  inp.addEventListener("input", () => { pokaz(); przyZmianie && przyZmianie(+inp.value); });
  // po puszczeniu suwaka oddajemy klawiaturę slajdom (strzałki / pilot)
  inp.addEventListener("pointerup", () => inp.blur());
  inp.addEventListener("change", () => inp.blur());
  pokaz();
  rodzic.appendChild(l);
  return {
    get wartosc() { return +inp.value; },
    set wartosc(v) { inp.value = v; pokaz(); przyZmianie && przyZmianie(+v); },
    el: l,
  };
}

function przelacznik(rodzic, etykieta, wartosc, przyZmianie) {
  const l = document.createElement("label");
  l.className = "przelacznik";
  l.innerHTML = `<input type="checkbox" ${wartosc ? "checked" : ""}><span>${etykieta}</span>`;
  const inp = l.querySelector("input");
  inp.addEventListener("change", () => { inp.blur(); przyZmianie && przyZmianie(inp.checked); });
  rodzic.appendChild(l);
  return { get wartosc() { return inp.checked; }, set wartosc(v) { inp.checked = v; przyZmianie && przyZmianie(v); }, el: l };
}

function przycisk(rodzic, tekst, akcja, klasa = "") {
  const b = document.createElement("button");
  b.textContent = tekst;
  b.className = klasa;
  b.addEventListener("click", (e) => { e.stopPropagation(); b.blur(); akcja(); });
  rodzic.appendChild(b);
  return b;
}

// ------------------------------------------------------------------ płótno
function przygotujPlotno(canvas, wysokosc) {
  const dpr = window.devicePixelRatio || 1;
  const szer = canvas.clientWidth || 600;
  canvas.style.height = wysokosc + "px";
  canvas.width = Math.round(szer * dpr);
  canvas.height = Math.round(wysokosc * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: szer, h: wysokosc };
}

const KOLORY = {
  cel: "#868e96", dron: "#e8590c", p: "#c92a2a", i: "#2b8a3e", d: "#1c7ed6",
  niebieski: "#1c7ed6", zielony: "#2b8a3e", fiolet: "#7048e8", tekst: "#1d2433", siatka: "#e9ecef",
};

// Wykres przebiegów w czasie (ostatnie `okno` sekund).
// serie: [{nazwa, kolor, kreska: [6,4] | null, grubosc, kropki: true (same punkty, bez linii)}]
// auto: true - zakres osi y dobierany do widocznych danych (yMin/yMax = zakres minimalny)
// dodatki(ctx, X, Y, t0, t1) - własne rysowanie pod seriami (np. pasy, tunele)
class Wykres {
  constructor(canvas, { wysokosc = 200, okno = 10, yMin = 0, yMax = 2, serie = [], tytul = "", jednostka = "", poziome = [], auto = false, dodatki = null }) {
    this.canvas = canvas;
    this.o = { wysokosc, okno, yMin, yMax, serie, tytul, jednostka, poziome, auto, dodatki };
    this.dane = Object.fromEntries(serie.map((s) => [s.nazwa, []]));
    this.t = 0;
    this.rozmiar();
  }
  rozmiar() { Object.assign(this, przygotujPlotno(this.canvas, this.o.wysokosc)); }
  wyczysc() { for (const k in this.dane) this.dane[k] = []; }
  dodaj(t, wartosci) {
    this.t = t;
    for (const k in wartosci) {
      const arr = this.dane[k];
      if (!arr) continue;
      arr.push([t, wartosci[k]]);
      while (arr.length && arr[0][0] < t - this.o.okno - 0.5) arr.shift();
    }
  }
  rysuj() {
    const { ctx, w, h } = this, o = this.o;
    const L = 52, R = 10, T = 26, B = 22;
    const t1 = Math.max(this.t, o.okno), t0 = t1 - o.okno;
    let yMin = o.yMin, yMax = o.yMax;
    if (o.auto) {
      for (const k in this.dane) for (const [t, v] of this.dane[k]) if (t >= t0 && isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
      const krok = niceKrok((yMax - yMin) / 4);
      yMin = Math.floor(yMin / krok) * krok; yMax = Math.ceil(yMax / krok) * krok;
      // płynnie: zakres tylko rośnie, a maleje powoli
      if (this._zakres) { yMin = Math.min(yMin, this._zakres[0] * 0.98 + yMin * 0.02); yMax = Math.max(yMax, this._zakres[1] * 0.98 + yMax * 0.02); }
      this._zakres = [yMin, yMax];
    }
    const X = (t) => L + ((t - t0) / o.okno) * (w - L - R);
    const Y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (h - T - B);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "13px system-ui, sans-serif";
    // siatka
    ctx.strokeStyle = KOLORY.siatka; ctx.fillStyle = "#868e96"; ctx.lineWidth = 1;
    // podziałka: przy auto co "ładny" krok, inaczej 4 równe części
    const krokY = o.auto ? niceKrok((yMax - yMin) / 4) : (yMax - yMin) / 4;
    const kroki = Math.round((yMax - yMin) / krokY);
    for (let k = 0; k <= kroki; k++) {
      const v = (o.auto ? Math.ceil(yMin / krokY) * krokY : yMin) + k * krokY;
      if (v > yMax + 1e-9) break;
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(+v.toFixed(2) + "", L - 6, Y(v) + 4);
    }
    ctx.textAlign = "center";
    for (let s = Math.ceil(t0); s <= t1; s += 2) ctx.fillText(s + " s", X(s), h - 5);
    // linie poziome (np. "zawis")
    for (const p of o.poziome) {
      ctx.strokeStyle = p.kolor || "#adb5bd"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(L, Y(p.y)); ctx.lineTo(w - R, Y(p.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = p.kolor || "#868e96"; ctx.textAlign = "left"; ctx.fillText(p.etykieta, L + 6, Y(p.y) - 5);
    }
    // serie
    ctx.save(); ctx.beginPath(); ctx.rect(L, T - 2, w - L - R, h - T - B + 4); ctx.clip();
    if (o.dodatki) { ctx.save(); o.dodatki(ctx, X, Y, t0, t1); ctx.restore(); }
    for (const s of o.serie) {
      const arr = this.dane[s.nazwa];
      if (!arr.length) continue;
      if (s.kropki) {
        ctx.fillStyle = s.kolor;
        for (const [t, v] of arr) { ctx.beginPath(); ctx.arc(X(t), Y(v), s.promien || 3, 0, 2 * Math.PI); ctx.fill(); }
        continue;
      }
      ctx.strokeStyle = s.kolor; ctx.lineWidth = s.grubosc || 2.5; ctx.setLineDash(s.kreska || []);
      ctx.beginPath();
      // NaN przerywa linię (np. brak pomiarów)
      let przerwa = true;
      for (const [t, v] of arr) {
        if (!isFinite(v)) { przerwa = true; continue; }
        if (przerwa) ctx.moveTo(X(t), Y(v)); else ctx.lineTo(X(t), Y(v));
        przerwa = false;
      }
      ctx.stroke();
    }
    ctx.restore(); ctx.setLineDash([]);
    // tytuł i legenda
    ctx.textAlign = "left"; ctx.fillStyle = KOLORY.tekst; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(o.tytul + (o.jednostka ? ` [${o.jednostka}]` : ""), L, 16);
    let x = w - R;
    ctx.font = "14px system-ui, sans-serif"; ctx.textAlign = "right";
    for (const s of [...o.serie].reverse()) {
      ctx.fillStyle = s.kolor; ctx.fillText(s.nazwa, x, 16);
      x -= ctx.measureText(s.nazwa).width + 6;
      if (s.kropki) { ctx.beginPath(); ctx.arc(x - 9, 11.5, 3.5, 0, 2 * Math.PI); ctx.fill(); }
      else ctx.fillRect(x - 16, 10, 14, 3);
      x -= 30;
    }
  }
}

function niceKrok(x) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9)))), m = x / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

// ------------------------------------------------------------------ ocena skoku (jak narzedzia/ocena.py)
function ocenaSkoku(punkty, cel, start, pas = 0.05) {
  if (punkty.length < 2) return null;
  const t0 = punkty[0][0];
  const kier = Math.sign(cel - start) || 1;
  let przereg = 0, ostatniPoza = -1;
  punkty.forEach(([t, y], i) => {
    przereg = Math.max(przereg, kier * (y - cel));
    if (Math.abs(y - cel) > pas) ostatniPoza = i;
  });
  const ustalanie = ostatniPoza === punkty.length - 1 ? Infinity : ostatniPoza < 0 ? 0 : punkty[ostatniPoza + 1][0] - t0;
  const tk = punkty[punkty.length - 1][0];
  const koniec = punkty.filter(([t]) => t >= tk - 1);
  const blad = koniec.reduce((s, [, y]) => s + y, 0) / koniec.length - cel;
  return { przereg, ustalanie, blad };
}

function formatOceny(o, cel) {
  if (!o) return "";
  const u = isFinite(o.ustalanie) ? o.ustalanie.toFixed(2).padStart(5) + " s" : "  nie ustalił się";
  return `skok do ${cel.toFixed(2)} m:  przeregulowanie ${(o.przereg * 100).toFixed(1).padStart(5)} cm | ` +
         `czas ustalania (±5 cm) ${u} | błąd ustalony ${(o.blad * 100 >= 0 ? "+" : "") + (o.blad * 100).toFixed(1)} cm`;
}

// ------------------------------------------------------------------ start reveal.js
function uruchomSlajdy() {
  Reveal.initialize({
    hash: true,
    width: 1280,
    height: 720,
    margin: 0.04,
    center: false,
    slideNumber: "c/t",
    transition: "fade",
    transitionSpeed: "fast",
    pdfSeparateFragments: false,
    plugins: [RevealNotes, RevealMath.KaTeX, RevealHighlight],
    katex: {
      local: "lib/katex",
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    },
  });
  const odswiez = () => Dema.odswiez(Reveal.getCurrentSlide());
  Reveal.on("ready", odswiez);
  Reveal.on("slidechanged", odswiez);
  // filmy: odtwarzaj tylko na bieżącym slajdzie
  Reveal.on("slidechanged", (e) => {
    document.querySelectorAll("video").forEach((v) => { if (!e.currentSlide.contains(v)) v.pause(); });
    e.currentSlide.querySelectorAll("video[data-autoplay]").forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
  });
}
