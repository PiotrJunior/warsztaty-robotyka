/* Dema do wykładu 4 (kamery i transformacje).
 *  demoOtworkowa(el)  - model otworkowy z boku + obraz: rozmiar na obrazie = f·s/Z
 *  demoRzut(el)       - marker ArUco widziany przez kamerę: 6 suwaków pozy -> 4 rogi w pikselach (to odwraca solvePnP)
 *  demoUklady(el)     - układy współrzędnych w 2D: robot z kamerą widzi marker; łańcuch transformacji
 * Konwencje jak w zadaniach: K z kąta widzenia, marker: x w prawo, y w górę, z "z markera" (wizja.py).
 */

// Bity markera ID 0 ze słownika DICT_4X4_50 (1 = białe pole), wiersz po wierszu od góry.
const ARUCO_ID0 = "1011010100110010";

function macierzK(fovPoziomyDeg, szer, wys) {
  const f = szer / 2 / Math.tan((fovPoziomyDeg * Math.PI) / 360);
  return { f, cx: szer / 2, cy: wys / 2 };
}

// ====================================================================== model otworkowy
function demoOtworkowa(el) {
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: minmax(0, 1fr) 360px">
      <canvas class="bok"></canvas><canvas class="obraz"></canvas></div>
      <div class="sterowanie"></div><div class="wyniki"></div></div>`;
  const bok = przygotujPlotno(el.querySelector(".bok"), 300);
  const obr = przygotujPlotno(el.querySelector(".obraz"), 300);
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const k = { Z: 1.0, fov: 60, s: 0.1, Y: 0.0 };
  const r = () => rysuj();
  suwak(ster, { etykieta: "odległość Z [m]", min: 0.25, max: 2.2, krok: 0.05, wartosc: k.Z }, (v) => { k.Z = v; r(); });
  suwak(ster, { etykieta: "kąt widzenia [°]", min: 30, max: 110, krok: 1, wartosc: k.fov }, (v) => { k.fov = v; r(); });
  suwak(ster, { etykieta: "bok markera [cm]", min: 3, max: 20, krok: 1, wartosc: k.s * 100 }, (v) => { k.s = v / 100; r(); });
  suwak(ster, { etykieta: "wysokość Y [m]", min: -0.4, max: 0.4, krok: 0.01, wartosc: 0 }, (v) => { k.Y = v; r(); });

  const SZER = 640, WYS = 480; // obraz kamery w pikselach
  function rysuj() {
    const { f } = macierzK(k.fov, SZER, WYS);
    // --- widok z boku: otworek w (ox, oy), oś optyczna w prawo; 1 m = skala px
    let { ctx, w, h } = bok;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    const ekranPol = 45;                          // połowa wysokości matrycy na rysunku [px]
    const glebokosc = (ekranPol * f) / (WYS / 2); // matryca w odległości f (w skali rysunku)
    const ox = glebokosc + 40, oy = h / 2, skala = (w - ox - 40) / 2.2;
    // oś optyczna
    ctx.strokeStyle = "#ced4da"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, oy); ctx.lineTo(w - 10, oy); ctx.stroke(); ctx.setLineDash([]);
    // pudełko kamery
    ctx.fillStyle = "#f1f3f5"; ctx.strokeStyle = "#343a40"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(ox - glebokosc - 8, oy - ekranPol - 14, glebokosc + 8, 2 * ekranPol + 28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillRect(ox - 3, oy - 5, 7, 10);     // otworek
    // matryca
    ctx.strokeStyle = KOLORY.niebieski; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ox - glebokosc, oy - ekranPol); ctx.lineTo(ox - glebokosc, oy + ekranPol); ctx.stroke();
    // marker (pionowy odcinek) w odległości Z
    const mx = ox + k.Z * skala, gora = oy - (k.Y + k.s / 2) * skala, dol = oy - (k.Y - k.s / 2) * skala;
    ctx.strokeStyle = "#1d2433"; ctx.lineWidth = 8; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(mx, gora); ctx.lineTo(mx, dol); ctx.stroke();
    // promienie przez otworek aż do matrycy (obraz odwrócony)
    const ig = oy + ((oy - gora) * glebokosc) / (mx - ox), id = oy + ((oy - dol) * glebokosc) / (mx - ox);
    ctx.lineWidth = 2;
    for (const [y0, y1, kol] of [[gora, ig, KOLORY.dron], [dol, id, KOLORY.fiolet]]) {
      ctx.strokeStyle = kol; ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(ox - glebokosc, y1); ctx.stroke();
    }
    ctx.strokeStyle = KOLORY.zielony; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ox - glebokosc + 6, ig); ctx.lineTo(ox - glebokosc + 6, id); ctx.stroke();
    // podpisy
    ctx.font = "15px system-ui"; ctx.fillStyle = "#5f6b7a"; ctx.textAlign = "center";
    ctx.fillText("matryca", ox - glebokosc, oy + ekranPol + 34);
    ctx.fillText("otworek", ox + 4, oy - ekranPol - 22);
    ctx.fillText(`marker ${Math.round(k.s * 100)} cm`, mx, Math.min(gora, oy - 30) - 10);
    // wymiary: f i Z
    ctx.strokeStyle = "#868e96"; ctx.lineWidth = 1.5; ctx.fillStyle = "#1d2433"; ctx.font = "bold 16px system-ui";
    const yw = h - 18;
    ctx.beginPath(); ctx.moveTo(ox, yw); ctx.lineTo(mx, yw); ctx.stroke();
    ctx.fillText(`Z = ${k.Z.toFixed(2)} m`, (ox + mx) / 2, yw - 6);
    ctx.beginPath(); ctx.moveTo(ox - glebokosc, yw); ctx.lineTo(ox, yw); ctx.stroke();
    ctx.fillText("f", ox - glebokosc / 2, yw - 6);

    // --- obraz z kamery (640 x 480, przeskalowany)
    ({ ctx, w, h } = obr);
    const sk = Math.min(w / SZER, h / WYS), x0 = (w - SZER * sk) / 2, y0 = (h - WYS * sk) / 2;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#dee2e6"; ctx.fillRect(x0, y0, SZER * sk, WYS * sk);
    const hpx = (f * k.s) / k.Z, vpx = WYS / 2 - (f * k.Y) / k.Z;
    rysujMarkerProsty(ctx, x0 + (SZER / 2) * sk, y0 + vpx * sk, hpx * sk);
    ctx.strokeStyle = KOLORY.zielony; ctx.lineWidth = 2; ctx.strokeRect(x0 + (SZER / 2 - hpx / 2) * sk, y0 + (vpx - hpx / 2) * sk, hpx * sk, hpx * sk);
    ctx.fillStyle = "#5f6b7a"; ctx.font = "13px system-ui"; ctx.textAlign = "left";
    ctx.fillText("obraz z kamery 640 × 480 (już odwrócony)", x0 + 6, y0 + 16);

    const bladZ = (k.Z * k.Z) / (f * k.s), bladX = k.Z / f;
    wyniki.textContent =
      `f = ${f.toFixed(0)} px    marker na obrazie: h = f·s/Z = ${f.toFixed(0)}·${k.s.toFixed(2)}/${k.Z.toFixed(2)} = ${hpx.toFixed(1)} px\n` +
      `odwrotnie: Z = f·s/h      pomyłka o 1 px → w bok ${(bladX * 1000).toFixed(1)} mm, w głąb ${(bladZ * 1000).toFixed(1)} mm (${(bladZ / bladX).toFixed(0)}× gorzej)`;
  }
  rysuj();
  return { start: rysuj, stop() {} };
}

function rysujMarkerProsty(ctx, cx, cy, bok) {
  const c = bok / 6;
  ctx.fillStyle = "#fff"; ctx.fillRect(cx - bok / 2 - c, cy - bok / 2 - c, bok + 2 * c, bok + 2 * c);
  ctx.fillStyle = "#000"; ctx.fillRect(cx - bok / 2, cy - bok / 2, bok, bok);
  ctx.fillStyle = "#fff";
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++)
    if (ARUCO_ID0[r * 4 + k] === "1") ctx.fillRect(cx - bok / 2 + (k + 1) * c - 0.3, cy - bok / 2 + (r + 1) * c - 0.3, c + 0.6, c + 0.6);
}

// ====================================================================== marker w kamerze (rzutowanie 3D)
function mnoz3(A, B) { return A.map((w) => [0, 1, 2].map((j) => w[0] * B[0][j] + w[1] * B[1][j] + w[2] * B[2][j])); }
function obrX(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
function obrY(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
function obrZ(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }

function demoRzut(el) {
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: 600px minmax(0, 1fr)">
      <canvas class="obraz"></canvas><div style="min-width:0"><div class="sterowanie" style="flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px"></div>
      <div class="wyniki" style="margin-top:10px;font-size:16px;line-height:1.4;white-space:pre"></div></div></div></div>`;
  const sc = przygotujPlotno(el.querySelector(".obraz"), 450);
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const p = { X: 0.03, Y: -0.01, Z: 0.3, a: 20, b: -25, c: 10, fov: 70 };
  const r = () => rysuj();
  const opcje = [
    ["X → [m]", "X", -0.15, 0.15, 0.005, "p"], ["Y ↓ [m]", "Y", -0.1, 0.1, 0.005, "i"], ["Z (odległość) [m]", "Z", 0.1, 1.0, 0.01, "d"],
    ["pochylenie [°]", "a", -70, 70, 1, ""], ["obrót w bok [°]", "b", -120, 120, 1, ""], ["obrót [°]", "c", -180, 180, 1, ""],
  ];
  for (const [et, key, min, max, krok, kl] of opcje)
    suwak(ster, { etykieta: et, min, max, krok, wartosc: p[key], klasa: kl }, (v) => { p[key] = v; r(); });
  ster.querySelectorAll("label.suwak").forEach((l) => { l.style.gridTemplateColumns = "185px minmax(0, 1fr) 64px"; l.querySelector("input").style.width = "100%"; });

  const SZER = 640, WYS = 480, S = 0.05; // marker 5 cm jak na wydruku
  function rysuj() {
    const { f, cx, cy } = macierzK(p.fov, SZER, WYS);
    const rad = Math.PI / 180;
    // R_kamera_marker: marker zwrócony do kamery (x w prawo, y w górę, z do kamery) + obroty wokół osi markera
    const R0 = [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
    const R = mnoz3(mnoz3(mnoz3(R0, obrY(p.b * rad)), obrX(p.a * rad)), obrZ(p.c * rad));
    const t = [p.X, p.Y, p.Z];
    const doKamery = (q) => [0, 1, 2].map((i) => R[i][0] * q[0] + R[i][1] * q[1] + R[i][2] * q[2] + t[i]);
    const rzut = (q) => { const c = doKamery(q); return [f * (c[0] / c[2]) + cx, f * (c[1] / c[2]) + cy, c[2]]; };
    const { ctx, w, h } = sc;
    const sk = Math.min(w / SZER, h / WYS), ox = (w - SZER * sk) / 2, oy = (h - WYS * sk) / 2;
    const E = ([u, v]) => [ox + u * sk, oy + v * sk];
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#c9cdd2"; ctx.fillRect(ox, oy, SZER * sk, WYS * sk);
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, SZER * sk, WYS * sk); ctx.clip();
    // pola markera: 8x8 (z białą ramką), komórka = S/6
    const c = S / 6, wielokat = (x0, y0, x1, y1, kolor) => {
      const pts = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]].map(rzut);
      if (pts.some((q) => q[2] < 0.02)) return;
      ctx.fillStyle = kolor; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...E(q)) : ctx.moveTo(...E(q)))); ctx.closePath(); ctx.fill();
    };
    const normalna = doKamery([0, 0, 1]).map((v, i) => v - t[i]);
    const przodem = normalna[0] * t[0] + normalna[1] * t[1] + normalna[2] * t[2] < 0;
    wielokat(-4 * c, 4 * c, 4 * c, -4 * c, przodem ? "#fff" : "#868e96");
    if (przodem) {
      wielokat(-3 * c, 3 * c, 3 * c, -3 * c, "#000");
      for (let rr = 0; rr < 4; rr++) for (let kk = 0; kk < 4; kk++)
        if (ARUCO_ID0[rr * 4 + kk] === "1") wielokat(-2 * c + kk * c - 1e-4, 2 * c - rr * c + 1e-4, -c + kk * c + 1e-4, c - rr * c - 1e-4, "#fff");
    }
    // osie markera (jak cv2.drawFrameAxes)
    const o0 = rzut([0, 0, 0]);
    [[S / 2, 0, 0, "#e03131"], [0, S / 2, 0, "#2f9e44"], [0, 0, S / 2, "#1c7ed6"]].forEach(([x, y, z, kol]) => {
      const q = rzut([x, y, z]);
      if (q[2] > 0.02 && o0[2] > 0.02) { ctx.strokeStyle = kol; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...E(o0)); ctx.lineTo(...E(q)); ctx.stroke(); }
    });
    // rogi: kolejność jak w detect_markers (lewy-górny, prawy-górny, prawy-dolny, lewy-dolny)
    const rogi = [[-S / 2, S / 2, 0], [S / 2, S / 2, 0], [S / 2, -S / 2, 0], [-S / 2, -S / 2, 0]].map(rzut);
    ctx.font = "bold 16px system-ui"; ctx.textAlign = "center";
    rogi.forEach((q, i) => {
      if (q[2] < 0.02) return;
      const [u, v] = E(q);
      ctx.fillStyle = KOLORY.dron; ctx.beginPath(); ctx.arc(u, v, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1d2433"; ctx.lineWidth = 3;
      ctx.strokeText(String(i), u + 12, v - 8); ctx.fillText(String(i), u + 12, v - 8);
    });
    ctx.restore();
    ctx.fillStyle = "#1d2433"; ctx.font = "13px system-ui"; ctx.textAlign = "left";
    ctx.fillText(`obraz 640 × 480, f = ${f.toFixed(0)} px`, ox + 8, oy + 18);

    const linie = rogi.map((q, i) => `róg ${i}: (${q[0].toFixed(0).padStart(4)}, ${q[1].toFixed(0).padStart(4)})`);
    const cm = (v) => (Math.abs(v) * 100).toFixed(1).padStart(5) + " cm";
    wyniki.textContent =
      `Kamera widzi tylko 4 rogi (8 liczb):\n${linie.join("\n")}\n\n` +
      `solvePnP odzyskuje z nich, gdzie jest marker:\n` +
      `${cm(t[0])} ${t[0] >= 0 ? "w prawo" : "w lewo"}\n${cm(t[1])} ${t[1] >= 0 ? "w dół" : "w górę"}\n${cm(t[2])} przed kamerą\n` +
      `i jak jest obrócony.\n(w kodzie: jedna macierz T_kamera_marker)`;
  }
  rysuj();
  return { start: rysuj, stop() {} };
}

// ====================================================================== układy współrzędnych 2D
// Macierze 3x3 (2D): [[c, -s, x], [s, c, y], [0, 0, 1]]
function T2(x, y, th) { const c = Math.cos(th), s = Math.sin(th); return [[c, -s, x], [s, c, y], [0, 0, 1]]; }
function mnozT2(A, B) { return A.map((w) => [0, 1, 2].map((j) => w[0] * B[0][j] + w[1] * B[1][j] + w[2] * B[2][j])); }
function odwrocT2(T) { const c = T[0][0], s = T[1][0], x = T[0][2], y = T[1][2]; return [[c, s, -c * x - s * y], [-s, c, s * x - c * y], [0, 0, 1]]; }
const katT2 = (T) => Math.atan2(T[1][0], T[0][0]);

function demoUklady(el) {
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: 640px minmax(0, 1fr)">
      <canvas class="scena" style="cursor:crosshair"></canvas><div style="min-width:0">
      <div class="sterowanie" style="flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px"></div>
      <div class="wyniki" style="margin-top:10px;font-size:16px;line-height:1.4;white-space:pre"></div></div></div></div>`;
  const sc = przygotujPlotno(el.querySelector(".scena"), 440);
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  const st = { x: 0.8, y: 0.7, th: 20, marker: [2.6, 1.5, -30], blad: "dobrze" };
  const r = () => rysuj();
  suwak(ster, { etykieta: "robot x [m]", min: 0.2, max: 3.6, krok: 0.05, wartosc: st.x, klasa: "p" }, (v) => { st.x = v; r(); });
  suwak(ster, { etykieta: "robot y [m]", min: 0.2, max: 2.4, krok: 0.05, wartosc: st.y, klasa: "i" }, (v) => { st.y = v; r(); });
  suwak(ster, { etykieta: "robot obrót [°]", min: -180, max: 180, krok: 1, wartosc: st.th, klasa: "d" }, (v) => { st.th = v; r(); });
  ster.querySelectorAll("label.suwak").forEach((l) => { l.style.gridTemplateColumns = "150px minmax(0, 1fr) 60px"; l.querySelector("input").style.width = "100%"; });
  const wybor = document.createElement("div");
  wybor.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:4px";
  ster.appendChild(wybor);
  const przyciski = {};
  for (const [klucz, tekst] of [["dobrze", "dobrze"], ["bez", "bez T_robot_kamera"], ["kolejnosc", "zła kolejność"]]) {
    przyciski[klucz] = przycisk(wybor, tekst, () => { st.blad = klucz; r(); });
  }

  // Kamera na robocie: 0.25 m przed środkiem, obrócona o 30° w lewo (jak kamera z boku)
  const T_robot_kamera = T2(0.25, 0.0, (30 * Math.PI) / 180);
  const FOV = (70 * Math.PI) / 180, ZASIEG = 3.0;
  const SWIAT = [4.0, 2.75];

  el.querySelector(".scena").addEventListener("click", (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * sc.w, py = ((e.clientY - b.top) / b.height) * sc.h;
    const [mx, my] = zEkranu(px, py);
    st.marker = [mx, my, st.marker[2]];
    r();
  });

  let skala, ox, oy;
  const naEkran = (x, y) => [ox + x * skala, oy - y * skala];
  const zEkranu = (px, py) => [(px - ox) / skala, (oy - py) / skala];

  function osie(ctx, T, dl, grub, podpis, dx = 6, dy = 18) {
    const [x0, y0] = naEkran(T[0][2], T[1][2]);
    for (const [k, kol] of [[0, "#e03131"], [1, "#2f9e44"]]) {
      const [x1, y1] = naEkran(T[0][2] + T[0][k] * dl, T[1][2] + T[1][k] * dl);
      strzalka(ctx, x0, y0, x1, y1, kol, "");
    }
    ctx.lineWidth = grub;
    if (podpis) { ctx.font = "bold 14px system-ui"; ctx.fillStyle = "#1d2433"; ctx.textAlign = "left"; ctx.fillText(podpis, x0 + dx, y0 + dy); }
  }

  function rysujMarker(ctx, T, duch) {
    const [x, y] = naEkran(T[0][2], T[1][2]), th = katT2(T);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-th);
    if (duch) { ctx.strokeStyle = KOLORY.fiolet; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(-16, -16, 32, 32); }
    else { ctx.fillStyle = "#fff"; ctx.fillRect(-18, -18, 36, 36); rysujMarkerProsty(ctx, 0, 0, 27); }
    ctx.restore();
  }

  function rysuj() {
    const { ctx, w, h } = sc;
    skala = Math.min((w - 40) / SWIAT[0], (h - 40) / SWIAT[1]); ox = 24; oy = h - 24;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    // siatka co 0.5 m
    ctx.strokeStyle = KOLORY.siatka; ctx.lineWidth = 1;
    for (let x = 0; x <= SWIAT[0] + 1e-6; x += 0.5) { const [a, b] = naEkran(x, 0), [, d] = naEkran(x, SWIAT[1]); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a, d); ctx.stroke(); }
    for (let y = 0; y <= SWIAT[1] + 1e-6; y += 0.5) { const [a, b] = naEkran(0, y), [c] = naEkran(SWIAT[0], y); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, b); ctx.stroke(); }

    const rad = Math.PI / 180;
    const T_swiat_robot = T2(st.x, st.y, st.th * rad);
    const T_swiat_kamera = mnozT2(T_swiat_robot, T_robot_kamera);
    const T_swiat_marker = T2(st.marker[0], st.marker[1], st.marker[2] * rad);
    const T_kamera_marker = mnozT2(odwrocT2(T_swiat_kamera), T_swiat_marker); // "pomiar" kamery
    const mk = T_kamera_marker, kat = Math.atan2(mk[1][2], mk[0][2]), odl = Math.hypot(mk[0][2], mk[1][2]);
    const widzi = Math.abs(kat) < FOV / 2 && odl < ZASIEG && mk[0][2] > 0;

    // pole widzenia kamery
    const [kx, ky] = naEkran(T_swiat_kamera[0][2], T_swiat_kamera[1][2]);
    const kk = katT2(T_swiat_kamera);
    ctx.fillStyle = widzi ? "rgba(43,138,62,.10)" : "rgba(134,142,150,.10)";
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.arc(kx, ky, ZASIEG * skala, -(kk + FOV / 2), -(kk - FOV / 2)); ctx.closePath(); ctx.fill();

    osie(ctx, T2(0, 0, 0), 0.5, 3, "świat", 10, -10);
    rysujMarker(ctx, T_swiat_marker, false);
    osie(ctx, T_swiat_marker, 0.3, 3, "");
    // robot
    const [rx, ry] = naEkran(st.x, st.y);
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(-st.th * rad);
    ctx.fillStyle = "#343a40"; ctx.beginPath(); ctx.roundRect(-0.22 * skala, -0.15 * skala, 0.44 * skala, 0.3 * skala, 8); ctx.fill();
    ctx.restore();
    osie(ctx, T_swiat_robot, 0.35, 3, "");
    ctx.font = "bold 14px system-ui"; ctx.fillStyle = "#1d2433"; ctx.textAlign = "center"; ctx.fillText("robot", rx, ry + 0.15 * skala + 34);
    // kamera
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(-kk);
    ctx.fillStyle = KOLORY.niebieski; ctx.fillRect(-8, -7, 16, 14); ctx.restore();
    osie(ctx, T_swiat_kamera, 0.25, 2, "kamera", 10, -12);

    // oszacowanie położenia markera w świecie z łańcucha
    let T_est = null;
    if (widzi) {
      if (st.blad === "dobrze") T_est = mnozT2(mnozT2(T_swiat_robot, T_robot_kamera), T_kamera_marker);
      else if (st.blad === "bez") T_est = mnozT2(T_swiat_robot, T_kamera_marker);
      else T_est = mnozT2(mnozT2(T_kamera_marker, T_robot_kamera), T_swiat_robot);
      rysujMarker(ctx, T_est, true);
      const [ex, ey] = naEkran(T_est[0][2], T_est[1][2]);
      ctx.font = "bold 14px system-ui"; ctx.fillStyle = KOLORY.fiolet; ctx.textAlign = "left";
      ctx.fillText("policzony", ex + 22, ey - 10);
      // linia "widzenia"
      ctx.strokeStyle = "rgba(43,138,62,.6)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      const [mx, my] = naEkran(st.marker[0], st.marker[1]);
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.font = "13px system-ui"; ctx.fillStyle = "#868e96"; ctx.textAlign = "right"; ctx.fillText("kliknij, żeby przestawić marker", w - 8, 18);

    for (const k in przyciski) przyciski[k].className = k === st.blad ? "glowny" : "";
    const st_ = (T) => `(${T[0][2].toFixed(2)}, ${T[1][2].toFixed(2)}), obrót ${Math.round((katT2(T) * 180) / Math.PI)}°`;
    let tekst = `robot w świecie: ${st_(T_swiat_robot)}\nkamera na robocie: 0.25 m z przodu, obrót 30°`;
    if (!widzi) tekst += `\n\nkamera: nie widzę markera`;
    if (widzi) {
      tekst += `\n\nkamera widzi marker: ${mk[0][2].toFixed(2)} m przed sobą, ${Math.abs(mk[1][2]).toFixed(2)} m ${mk[1][2] >= 0 ? "w lewo" : "w prawo"}`;
      const blad = Math.hypot(T_est[0][2] - st.marker[0], T_est[1][2] - st.marker[1]);
      tekst += `\npoliczony marker w świecie: (${T_est[0][2].toFixed(2)}, ${T_est[1][2].toFixed(2)})  błąd ${(blad * 100).toFixed(0)} cm`;
    }
    wyniki.textContent = tekst;
  }
  rysuj();
  return { start: rysuj, stop() {} };
}
