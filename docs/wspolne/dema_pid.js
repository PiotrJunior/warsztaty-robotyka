/* Interaktywne dema do wykładu o PID.
 *  demoWysokosc(el, opcje) - dron porusza się tylko w pionie (jak zadanie 1.4)
 *  demoMikser(el)          - jak 4 śmigła dają ciąg, roll, pitch i yaw (jak DroneSim.step)
 *  demoKaskada(el)         - dron w 2D: pozycja -> kąt -> śmigła (jak zadanie 2.1)
 * Fizyka i liczby są takie same jak w symulatorze z zadań (masa 1.325 kg, 4 x 13 N).
 */

const MASA = 1.325, G = 9.81, CIAG_MAX = 52, ZAWIS = MASA * G;

class PIDjs {
  constructor(kp, ki, kd, dt, limit = null) { Object.assign(this, { kp, ki, kd, dt, limit }); this.reset(); }
  reset() { this.calka = 0; this.poprzedni = null; this.skl = { p: 0, i: 0, d: 0 }; }
  update(cel, pomiar) {
    const e = cel - pomiar;
    const p = this.kp * e;
    this.calka += e * this.dt;
    const i = this.ki * this.calka;
    const d = this.poprzedni === null ? 0 : (this.kd * (e - this.poprzedni)) / this.dt;
    this.poprzedni = e;
    let u = p + i + d;
    if (this.limit !== null && Math.abs(u) > this.limit) { u = Math.sign(u) * this.limit; this.calka -= e * this.dt; }
    this.skl = { p, i, d };
    return u;
  }
}

function losNormalny() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ====================================================================== dron w pionie
function demoWysokosc(el, op = {}) {
  const o = Object.assign({
    tryb: "pid",              // "pilot" | "wlwyl" | "pid"
    kp: 6, ki: 0, kd: 3, ff: true,
    pokaz: ["kp", "ki", "kd", "ff"],   // które kontrolki pokazać: kp ki kd ff paczka szum kopnij
    cele: [1.0, 1.5, 0.5], okres: 6,
    skladowe: true,           // drugi wykres: składowe P, I, D
    limit: 20,
  }, op);
  const dt = 0.01;
  el.innerHTML = `<div class="demo">
      <div class="uklad"><canvas class="scena"></canvas><div class="wykresy"><canvas class="w1"></canvas><canvas class="w2"></canvas></div></div>
      <div class="sterowanie"></div><div class="wyniki"></div></div>`;
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const scena = przygotujPlotno(el.querySelector(".scena"), 396);
  const wz = new Wykres(el.querySelector(".w1"), { wysokosc: 194, okno: 12, yMin: 0, yMax: 2, tytul: "wysokość", jednostka: "m",
    serie: [{ nazwa: "cel", kolor: KOLORY.cel, kreska: [6, 4], grubosc: 2 }, { nazwa: "dron", kolor: KOLORY.dron, grubosc: 3 }] });
  const serie2 = o.tryb === "pid" && o.skladowe
    ? [{ nazwa: "ciąg", kolor: KOLORY.dron, grubosc: 3 }, { nazwa: "P", kolor: KOLORY.p, grubosc: 1.8 }, { nazwa: "I", kolor: KOLORY.i, grubosc: 1.8 }, { nazwa: "D", kolor: KOLORY.d, grubosc: 1.8 }]
    : [{ nazwa: "ciąg", kolor: KOLORY.dron, grubosc: 3 }];
  const wc = new Wykres(el.querySelector(".w2"), { wysokosc: 194, okno: 12, yMin: o.tryb === "pid" && o.skladowe ? -20 : 0, yMax: o.tryb === "pilot" ? 30 : 40,
    tytul: "ciąg", jednostka: "N", serie: serie2, poziome: o.tryb === "pilot" ? [] : [{ y: ZAWIS, etykieta: "zawis (m·g)" }] });

  let s; // stan
  const pid = new PIDjs(o.kp, o.ki, o.kd, dt, o.limit);
  const ust = { ff: o.ff, paczka: false, szum: false, ciagPilota: 0, ciagWl: 20, pokazZawis: false };
  function reset() {
    s = { t: 0, z: 0, v: 0, ciag: 0, cel: o.cele[0], segment: [], startSeg: 0, oceny: [], wPasie: 0, koniec: false, pilotDziala: o.tryb !== "pilot" };
    pid.reset(); wz.wyczysc(); wc.wyczysc(); wyniki.textContent = o.tryb === "pilot" ? "Naciśnij START i utrzymaj drona w zielonym pasie suwakiem ciągu." : "";
  }

  // --- kontrolki
  if (o.tryb === "pilot") {
    const sp = suwak(ster, { etykieta: "ciąg [N]", min: 0, max: 30, krok: 0.1, wartosc: 0 }, (v) => (ust.ciagPilota = v));
    sp.el.querySelector("input").style.width = "420px";
    sp.el.style.gridTemplateColumns = "auto 420px 64px";
    przycisk(ster, "START", () => { reset(); s.pilotDziala = true; sp.wartosc = 0; }, "glowny");
    przelacznik(ster, "pokaż zawis", false, (v) => { ust.pokazZawis = v; wc.o.poziome = v ? [{ y: ZAWIS, etykieta: "zawis (m·g)" }] : []; });
  } else if (o.tryb === "wlwyl") {
    suwak(ster, { etykieta: "ciąg „wł” [N]", min: 14, max: 40, krok: 1, wartosc: ust.ciagWl }, (v) => (ust.ciagWl = v));
  } else {
    if (o.pokaz.includes("kp")) suwak(ster, { etykieta: "kp", min: 0, max: 30, krok: 0.5, wartosc: o.kp, klasa: "p" }, (v) => (pid.kp = v));
    if (o.pokaz.includes("ki")) suwak(ster, { etykieta: "ki", min: 0, max: 15, krok: 0.1, wartosc: o.ki, klasa: "i" }, (v) => (pid.ki = v));
    if (o.pokaz.includes("kd")) suwak(ster, { etykieta: "kd", min: 0, max: 10, krok: 0.1, wartosc: o.kd, klasa: "d" }, (v) => (pid.kd = v));
    if (o.pokaz.includes("ff")) przelacznik(ster, "feedforward m·g", o.ff, (v) => (ust.ff = v));
  }
  if (o.pokaz.includes("paczka")) przelacznik(ster, "paczka +300 g", false, (v) => (ust.paczka = v));
  if (o.pokaz.includes("szum")) przelacznik(ster, "szum pomiaru", false, (v) => (ust.szum = v));
  if (o.pokaz.includes("kopnij")) przycisk(ster, "kopnij ↓", () => (s.v -= 2.0));
  if (o.tryb !== "pilot") przycisk(ster, "od nowa", reset);

  // --- fizyka
  function krok() {
    if (s.koniec || !s.pilotDziala) return;
    const nowyCel = o.cele[Math.floor(s.t / o.okres) % o.cele.length];
    if (nowyCel !== s.cel) {
      if (o.tryb !== "pilot") {
        const oc = ocenaSkoku(s.segment, s.cel, s.startSeg);
        s.oceny.push(formatOceny(oc, s.cel)); s.oceny = s.oceny.slice(-2);
        wyniki.textContent = s.oceny.join("\n");
      }
      s.startSeg = s.cel; s.cel = nowyCel; s.segment = [];
    }
    const pomiar = s.z + (ust.szum ? 0.03 * losNormalny() : 0);
    let ciag;
    if (o.tryb === "pilot") ciag = ust.ciagPilota;
    else if (o.tryb === "wlwyl") ciag = pomiar < s.cel ? ust.ciagWl : 0;
    else ciag = (ust.ff ? ZAWIS : 0) + pid.update(s.cel, pomiar);
    s.ciag = Math.min(Math.max(ciag, 0), CIAG_MAX);
    const m = MASA + (ust.paczka ? 0.3 : 0);
    const a = s.ciag / m - G - 0.15 * s.v;
    s.v += a * dt; s.z += s.v * dt;
    if (s.z < 0) { s.z = 0; s.v = Math.max(s.v, 0); }
    s.t += dt;
    s.segment.push([s.t, s.z]);
    wz.dodaj(s.t, { cel: s.cel, dron: s.z });
    if (o.tryb === "pid" && o.skladowe) wc.dodaj(s.t, { "ciąg": s.ciag, P: pid.skl.p, I: pid.skl.i, D: pid.skl.d });
    else wc.dodaj(s.t, { "ciąg": s.ciag });
    if (o.tryb === "pilot") {
      if (Math.abs(s.z - s.cel) < 0.1) s.wPasie += dt;
      const czas = o.cele.length * o.okres;
      wyniki.textContent = `czas: ${s.t.toFixed(1)} / ${czas} s     w pasie: ${s.wPasie.toFixed(1)} s  (${((100 * s.wPasie) / czas).toFixed(0)}%)`;
      if (s.t >= czas) { s.koniec = true; wyniki.textContent += "   KONIEC!"; }
    }
  }

  // --- rysowanie sceny: dron, cel, siły
  function rysujScene() {
    const { ctx, w, h } = scena;
    const Y = (z) => h - 30 - (z / 2.0) * (h - 60);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#eef5ff"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c5d3e3"; ctx.fillRect(0, Y(0), w, h - Y(0));
    ctx.font = "13px system-ui"; ctx.fillStyle = "#868e96"; ctx.textAlign = "left";
    for (let z = 0; z <= 2; z += 0.5) { ctx.fillRect(0, Y(z), 8, 1); ctx.fillText(z.toFixed(1) + " m", 10, Y(z) + 4); }
    // cel
    if (o.tryb === "pilot") { ctx.fillStyle = "rgba(43,138,62,.18)"; ctx.fillRect(0, Y(s.cel + 0.1), w, Y(s.cel - 0.1) - Y(s.cel + 0.1)); }
    ctx.strokeStyle = KOLORY.zielony; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, Y(s.cel)); ctx.lineTo(w, Y(s.cel)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = KOLORY.zielony; ctx.fillText("cel", w - 30, Y(s.cel) - 6);
    // dron
    const cx = w / 2 + 20, cy = Y(s.z) - 12;
    ctx.fillStyle = "#343a40"; ctx.fillRect(cx - 50, cy - 4, 100, 8); ctx.fillRect(cx - 14, cy - 10, 28, 18);
    ctx.fillStyle = "rgba(73,80,87,.35)";
    for (const dx of [-50, 50]) { ctx.beginPath(); ctx.ellipse(cx + dx, cy - 8, 30, 5, 0, 0, 2 * Math.PI); ctx.fill(); }
    // siły: ciąg w górę, ciężar w dół (1 N = 3 px)
    const sk = 3;
    strzalka(ctx, cx - 18, cy - 12, cx - 18, cy - 12 - s.ciag * sk, KOLORY.dron, `ciąg ${s.ciag.toFixed(1)} N`, "right");
    const m = MASA + (ust.paczka ? 0.3 : 0);
    strzalka(ctx, cx + 18, cy + 10, cx + 18, cy + 10 + m * G * sk, "#495057", `m·g ${(m * G).toFixed(1)} N`, "left");
    if (ust.paczka) { ctx.fillStyle = "#a07a4a"; ctx.fillRect(cx - 12, cy + 8, 24, 16); }
  }

  const anim = petla(krok, () => { rysujScene(); wz.rysuj(); wc.rysuj(); }, dt);
  reset();
  return { start: anim.start, stop: anim.stop };
}

function strzalka(ctx, x0, y0, x1, y1, kolor, tekst, strona = "right") {
  const dl = Math.hypot(x1 - x0, y1 - y0);
  ctx.strokeStyle = kolor; ctx.fillStyle = kolor; ctx.lineWidth = 4;
  if (dl > 2) {
    const ux = (x1 - x0) / dl, uy = (y1 - y0) / dl, gr = Math.min(12, dl * 0.5);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * gr, y1 - uy * gr); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * gr - uy * gr * 0.6, y1 - uy * gr + ux * gr * 0.6); ctx.lineTo(x1 - ux * gr + uy * gr * 0.6, y1 - uy * gr - ux * gr * 0.6); ctx.closePath(); ctx.fill();
  }
  if (tekst) {
    ctx.font = "bold 14px system-ui"; ctx.textAlign = strona === "right" ? "right" : "left";
    ctx.fillText(tekst, x1 + (strona === "right" ? -8 : 8), (y0 + y1) / 2);
  }
}

// Łuk (a0 -> a1, kąty canvasa) z grotem pokazującym obrót: ccw = przeciwnie do zegara (na ekranie).
function lukStrzalka(ctx, x, y, r, a0, a1, ccw, kolor, grubosc = 3) {
  ctx.strokeStyle = kolor; ctx.fillStyle = kolor; ctx.lineWidth = grubosc; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(x, y, r, a0, a1, false); ctx.stroke();
  // ruch zgodny z zegarem = rosnący kąt canvasa -> grot na a1; przeciwnie -> grot na a0
  const a = ccw ? a0 : a1, kier = ccw ? -1 : 1;
  const ex = x + r * Math.cos(a), ey = y + r * Math.sin(a);
  const tx = -Math.sin(a) * kier, ty = Math.cos(a) * kier;   // styczna w kierunku ruchu
  const g = 4 + grubosc * 2;
  ctx.beginPath(); ctx.moveTo(ex + tx * g, ey + ty * g);
  ctx.lineTo(ex - tx * 2 + Math.cos(a) * g * 0.6, ey - ty * 2 + Math.sin(a) * g * 0.6);
  ctx.lineTo(ex - tx * 2 - Math.cos(a) * g * 0.6, ey - ty * 2 - Math.sin(a) * g * 0.6);
  ctx.closePath(); ctx.fill();
}

// ====================================================================== mikser śmigieł
function demoMikser(el) {
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: 420px minmax(0, 1fr)"><canvas class="scena"></canvas>
      <div style="min-width:0"><div class="sterowanie" style="flex-direction:column;align-items:stretch;flex-wrap:nowrap"></div>
      <div class="wyniki" style="margin-top:12px;white-space:pre-wrap;font-size:16px;line-height:1.45;height:9.2em;overflow:hidden"></div></div></div></div>`;
  const sc = przygotujPlotno(el.querySelector(".scena"), 430);
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const k = { ciag: ZAWIS, roll: 0, pitch: 0, yaw: 0 };
  const rys = () => rysuj();
  suwak(ster, { etykieta: "ciąg [N]", min: 0, max: 52, krok: 0.1, wartosc: k.ciag }, (v) => { k.ciag = v; rys(); });
  suwak(ster, { etykieta: "roll", min: -1.2, max: 1.2, krok: 0.05, wartosc: 0, klasa: "p" }, (v) => { k.roll = v; rys(); });
  suwak(ster, { etykieta: "pitch", min: -1.2, max: 1.2, krok: 0.05, wartosc: 0, klasa: "d" }, (v) => { k.pitch = v; rys(); });
  suwak(ster, { etykieta: "yaw", min: -0.6, max: 0.6, krok: 0.05, wartosc: 0, klasa: "i" }, (v) => { k.yaw = v; rys(); });
  ster.querySelectorAll("label.suwak").forEach((l) => { l.style.gridTemplateColumns = "78px minmax(0, 1fr) 62px"; l.querySelector("input").style.width = "100%"; });

  // pozycje śmigieł w układzie drona (x, y) - jak w assets/x2.xml; przód drona = -x
  const smigla = [
    { n: 1, x: -0.14, y: -0.18, obrot: +1 },  // obrot: +1 = przeciwnie do wskazówek zegara (patrząc z góry)
    { n: 2, x: -0.14, y: 0.18, obrot: -1 },
    { n: 3, x: 0.14, y: 0.18, obrot: +1 },
    { n: 4, x: 0.14, y: -0.18, obrot: -1 },
  ];
  function rysuj() {
    const b = k.ciag / 4;
    const surowe = [b - k.roll + k.pitch - k.yaw, b + k.roll + k.pitch + k.yaw, b + k.roll - k.pitch - k.yaw, b - k.roll - k.pitch + k.yaw];
    const f = surowe.map((v) => Math.min(Math.max(v, 0), 13));
    const { ctx, w, h } = sc;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    const cx = w / 2 + 10, cy = h / 2 + 14, S = 680;
    // ekran: przód drona (-x) do góry, +y w prawo
    const P = (x, y) => [cx + y * S, cy + x * S];
    // ramiona i korpus
    ctx.strokeStyle = "#343a40"; ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(...P(-0.14, -0.18)); ctx.lineTo(...P(0.14, 0.18)); ctx.moveTo(...P(-0.14, 0.18)); ctx.lineTo(...P(0.14, -0.18)); ctx.stroke();
    ctx.fillStyle = "#343a40"; ctx.fillRect(cx - 22, cy - 32, 44, 64);
    ctx.fillStyle = "#e8590c"; ctx.beginPath(); ctx.moveTo(cx, cy - 48); ctx.lineTo(cx - 12, cy - 32); ctx.lineTo(cx + 12, cy - 32); ctx.fill();
    ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillText("PRZÓD", cx, cy - 56);
    smigla.forEach((s, i) => {
      const [px, py] = P(s.x, s.y);
      const r = 54, pelne = f[i] / 13;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = surowe[i] < 0 || surowe[i] > 13 ? "rgba(201,42,42,.3)" : `rgba(232,89,12,${0.1 + 0.55 * pelne})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = surowe[i] < 0 || surowe[i] > 13 ? KOLORY.p : "#adb5bd"; ctx.lineWidth = 2; ctx.stroke();
      // kierunek obrotu śmigła
      lukStrzalka(ctx, px, py, r - 10, -0.6, 1.4, s.obrot > 0, "#495057", 2.5);
      ctx.fillStyle = "#1d2433"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center"; ctx.fillText(f[i].toFixed(2) + " N", px - 4, py + 8);
      ctx.font = "13px system-ui"; ctx.fillStyle = "#5f6b7a"; ctx.fillText(`śmigło ${s.n}`, px - 4, py - 20);
    });
    // osie świata (przy yaw = 0) - lewy górny róg
    const ox = 20, oy = 20;
    strzalka(ctx, ox, oy, ox, oy + 48, KOLORY.p, ""); ctx.font = "bold 15px system-ui"; ctx.fillStyle = KOLORY.p; ctx.textAlign = "left"; ctx.fillText("+x", ox + 8, oy + 50);
    strzalka(ctx, ox, oy, ox + 48, oy, KOLORY.zielony, ""); ctx.fillStyle = KOLORY.zielony; ctx.fillText("+y", ox + 52, oy + 5);
    // efekt: w którą stronę poleci (fiolet) i w którą się obróci (zielony łuk)
    const ruchX = k.pitch, ruchY = -k.roll;   // dodatni pitch -> +x, dodatni roll -> -y
    const dl = Math.hypot(ruchX, ruchY);
    if (dl > 0.01) {
      const L = 40 + 50 * Math.min(dl / 1.2, 1);
      const ex = cx + (ruchY / dl) * L, ey = cy + (ruchX / dl) * L;
      ctx.lineCap = "butt";
      strzalka(ctx, cx, cy, ex, ey, KOLORY.fiolet, "");
    }
    if (Math.abs(k.yaw) > 0.01) lukStrzalka(ctx, cx, cy, 46, 0.85, 2.3, k.yaw > 0, KOLORY.zielony, 4);
    const suma = f.reduce((a, b) => a + b, 0);
    const opis = [];
    opis.push(`suma ciągu: ${suma.toFixed(1)} N  ` + (suma > ZAWIS + 0.2 ? "→ wznosi się" : suma < ZAWIS - 0.2 ? "→ opada" : "→ wisi (zawis)"));
    if (Math.abs(k.roll) > 0.01) opis.push(`roll ${k.roll > 0 ? "+" : "−"}: leci w ${k.roll > 0 ? "−y" : "+y"}`);
    if (Math.abs(k.pitch) > 0.01) opis.push(`pitch ${k.pitch > 0 ? "+" : "−"}: leci w ${k.pitch > 0 ? "+x (do tyłu!)" : "−x (do przodu)"}`);
    if (Math.abs(k.yaw) > 0.01) opis.push(`yaw ${k.yaw > 0 ? "+" : "−"}: obrót ${k.yaw > 0 ? "w lewo ↺" : "w prawo ↻"}`);
    if (surowe.some((v) => v < 0 || v > 13)) opis.push("UWAGA: śmigło poza 0–13 N, obcięte!");
    wyniki.textContent = opis.join("\n");
  }
  rysuj();
  return { start() { rysuj(); }, stop() {} };
}

// ====================================================================== kaskada w 2D (widok z boku)
function demoKaskada(el) {
  const dt = 0.01, I = 0.03, RAMIE = 0.56;   // pitch_cmd [N] -> moment 0.56 * cmd (jak w X2)
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: 560px 1fr"><canvas class="scena"></canvas>
      <div class="wykresy"><canvas class="w1"></canvas><canvas class="w2"></canvas></div></div>
      <div class="sterowanie"></div><div class="wyniki"></div></div>`;
  const sc = przygotujPlotno(el.querySelector(".scena"), 380);
  const wx = new Wykres(el.querySelector(".w1"), { wysokosc: 186, okno: 10, yMin: -2, yMax: 2, tytul: "pozycja x", jednostka: "m",
    serie: [{ nazwa: "cel", kolor: KOLORY.cel, kreska: [6, 4], grubosc: 2 }, { nazwa: "dron", kolor: KOLORY.dron, grubosc: 3 }] });
  const wk = new Wykres(el.querySelector(".w2"), { wysokosc: 186, okno: 10, yMin: -30, yMax: 30, tytul: "kąt pitch", jednostka: "°",
    serie: [{ nazwa: "zadany (z pętli pozycji)", kolor: KOLORY.fiolet, kreska: [6, 4], grubosc: 2 }, { nazwa: "rzeczywisty", kolor: KOLORY.dron, grubosc: 3 }] });
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const px = new PIDjs(10, 0, 12, dt, 20), pk = new PIDjs(0.08, 0, 0.02, dt, 1.2), pz = new PIDjs(6, 0, 3, dt, 20);
  suwak(ster, { etykieta: "pozycja kp", min: 0, max: 40, krok: 0.5, wartosc: 10, klasa: "p" }, (v) => (px.kp = v));
  suwak(ster, { etykieta: "pozycja kd", min: 0, max: 30, krok: 0.5, wartosc: 12, klasa: "d" }, (v) => (px.kd = v));
  suwak(ster, { etykieta: "kąt kp", min: 0, max: 0.3, krok: 0.005, wartosc: 0.08, klasa: "p" }, (v) => (pk.kp = v));
  suwak(ster, { etykieta: "kąt kd", min: 0, max: 0.06, krok: 0.002, wartosc: 0.02, klasa: "d" }, (v) => (pk.kd = v));
  let s, auto = true;
  const reset = () => { s = { t: 0, x: -1, z: 1, vx: 0, vz: 0, th: 0, w: 0, celX: -1, celZ: 1, zadany: 0, rozbity: false }; [px, pk, pz].forEach((p) => p.reset()); wx.wyczysc(); wk.wyczysc(); };
  przycisk(ster, "od nowa", () => { reset(); auto = true; });
  wyniki.textContent = "Kliknij w scenę, żeby ustawić nowy cel. Bez klikania cel skacze co 5 s.";
  el.querySelector(".scena").addEventListener("click", (e) => {
    const r = e.target.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    s.celX = Math.max(-2, Math.min(2, (fx - 0.5) * 5)); s.celZ = Math.max(0.3, Math.min(2.2, (1 - fy) * 2.6)); auto = false;
  });
  function krok() {
    if (s.rozbity) return;
    if (auto) s.celX = Math.floor(s.t / 5) % 2 === 0 ? 1 : -1;
    s.zadany = px.update(s.celX, s.x);                                   // pętla zewnętrzna: pozycja -> kąt [°]
    const cmd = pk.update(s.zadany, (s.th * 180) / Math.PI);             // pętla wewnętrzna: kąt -> śmigła [N]
    const ciag = Math.min(Math.max((ZAWIS + pz.update(s.celZ, s.z)) / Math.max(Math.cos(s.th), 0.5), 0), CIAG_MAX);
    s.w += ((RAMIE * cmd) / I) * dt; s.th += s.w * dt;
    s.vx += ((ciag * Math.sin(s.th)) / MASA) * dt; s.vz += ((ciag * Math.cos(s.th)) / MASA - G) * dt;
    s.x += s.vx * dt; s.z += s.vz * dt; s.t += dt;
    if (Math.abs(s.th) > 1.4 || s.z < 0 || Math.abs(s.x) > 6) { s.rozbity = true; wyniki.textContent = "Dron się rozbił! Popraw nastawy i kliknij „od nowa”."; }
    wx.dodaj(s.t, { cel: s.celX, dron: s.x });
    wk.dodaj(s.t, { "zadany (z pętli pozycji)": s.zadany, rzeczywisty: (s.th * 180) / Math.PI });
  }
  function rysuj() {
    const { ctx, w, h } = sc;
    const X = (x) => w / 2 + (x / 5) * w, Y = (z) => h - (z / 2.6) * h;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#eef5ff"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c5d3e3"; ctx.fillRect(0, Y(0), w, h);
    ctx.fillStyle = "#868e96"; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    for (let x = -2; x <= 2; x++) ctx.fillText(x + " m", X(x), h - 4);
    // cel
    ctx.strokeStyle = KOLORY.zielony; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(s.celX), Y(s.celZ), 10, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(s.celX) - 16, Y(s.celZ)); ctx.lineTo(X(s.celX) + 16, Y(s.celZ)); ctx.moveTo(X(s.celX), Y(s.celZ) - 16); ctx.lineTo(X(s.celX), Y(s.celZ) + 16); ctx.stroke();
    // dron (obrót o pitch: dodatni kąt -> ciąg w stronę +x, czyli w prawo)
    const rysujDrona = (th, kolor, alfa) => {
      ctx.save(); ctx.globalAlpha = alfa; ctx.translate(X(s.x), Y(s.z)); ctx.rotate(th);
      ctx.fillStyle = kolor; ctx.fillRect(-40, -4, 80, 8); ctx.fillRect(-12, -9, 24, 16);
      ctx.fillRect(-44, -12, 8, 10); ctx.fillRect(36, -12, 8, 10);
      ctx.restore();
    };
    rysujDrona((s.zadany * Math.PI) / 180, KOLORY.fiolet, 0.3);
    rysujDrona(s.th, "#343a40", 1);
    ctx.save(); ctx.translate(X(s.x), Y(s.z)); ctx.rotate(s.th); strzalka(ctx, 0, -10, 0, -60, KOLORY.dron, ""); ctx.restore();
    ctx.fillStyle = KOLORY.fiolet; ctx.textAlign = "left"; ctx.font = "13px system-ui"; ctx.fillText("półprzezroczysty = kąt zadany przez pętlę pozycji", 8, 18);
  }
  reset();
  const anim = petla(krok, () => { rysuj(); wx.rysuj(); wk.rysuj(); }, dt);
  return { start: anim.start, stop: anim.stop };
}
