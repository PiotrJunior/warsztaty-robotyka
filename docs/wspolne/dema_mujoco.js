/* Demo do wykładu o MuJoCo: jak krok czasowy wpływa na symulację.
 * Ciężarek na sprężynie (bez tarcia) liczony na trzy sposoby:
 *   - dokładnie (wzór),
 *   - "naiwnie" (jawny Euler: najpierw pozycja, potem prędkość),
 *   - jak MuJoCo (półjawny Euler: najpierw prędkość, potem pozycja z NOWĄ prędkością).
 */
function demoKrok(el) {
  const K = 40, M = 1, W0 = Math.sqrt(K / M), X0 = 0.5;
  el.innerHTML = `<div class="demo"><div class="uklad" style="grid-template-columns: 380px 1fr"><canvas class="scena"></canvas>
      <div class="wykresy"><canvas class="w1"></canvas></div></div><div class="sterowanie"></div><div class="wyniki"></div></div>`;
  const sc = przygotujPlotno(el.querySelector(".scena"), 360);
  const wy = new Wykres(el.querySelector(".w1"), { wysokosc: 360, okno: 8, yMin: -1.5, yMax: 1.5, tytul: "położenie ciężarka", jednostka: "m",
    serie: [{ nazwa: "dokładnie", kolor: KOLORY.cel, kreska: [6, 4], grubosc: 2.5 }, { nazwa: "naiwnie", kolor: KOLORY.p, grubosc: 2.5 }, { nazwa: "jak MuJoCo", kolor: KOLORY.niebieski, grubosc: 2.5 }] });
  const ster = el.querySelector(".sterowanie"), wyniki = el.querySelector(".wyniki");
  let dt = 0.02, s;
  const reset = () => { s = { t: 0, acc: 0, n: { x: X0, v: 0 }, m: { x: X0, v: 0 } }; wy.wyczysc(); };
  suwak(ster, { etykieta: "krok czasowy dt [s]", min: 0.002, max: 0.35, krok: 0.002, wartosc: dt, format: (v) => v.toFixed(3) }, (v) => { dt = v; reset(); });
  przycisk(ster, "od nowa", reset);
  const energia = (st) => 0.5 * M * st.v * st.v + 0.5 * K * st.x * st.x;
  const E0 = 0.5 * K * X0 * X0;
  function krokFizyki(h) {
    // czas rzeczywisty, ale fizyka liczona krokiem dt
    s.acc += h;
    while (s.acc >= dt) {
      s.acc -= dt;
      const n = s.n; const a = (-K / M) * n.x; n.x += n.v * dt; n.v += a * dt;               // jawny Euler
      const m = s.m; m.v += (-K / M) * m.x * dt; m.x += m.v * dt;                          // półjawny Euler
      s.t += dt;
      const lim = (v) => Math.max(-50, Math.min(50, v));
      wy.dodaj(s.t, { "dokładnie": X0 * Math.cos(W0 * s.t), naiwnie: lim(s.n.x), "jak MuJoCo": lim(s.m.x) });
    }
  }
  function rysuj() {
    const { ctx, w, h } = sc;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    const kol = [["dokładnie", X0 * Math.cos(W0 * s.t), KOLORY.cel], ["naiwnie", s.n.x, KOLORY.p], ["jak MuJoCo", s.m.x, KOLORY.niebieski]];
    kol.forEach(([nazwa, x, kolor], i) => {
      const cx = 70 + i * 120, y = 150 + Math.max(-1.4, Math.min(1.4, x)) * 120;
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(cx - 30, 10, 60, 6);
      ctx.strokeStyle = "#868e96"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 16);
      const zw = 12; for (let k = 1; k <= zw; k++) ctx.lineTo(cx + (k % 2 ? 12 : -12), 16 + ((y - 36) * k) / zw);
      ctx.lineTo(cx, y - 20); ctx.stroke();
      ctx.fillStyle = kolor; ctx.fillRect(cx - 22, y - 20, 44, 40);
      ctx.fillStyle = "#1d2433"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillText(nazwa, cx, h - 12);
    });
    const en = (st) => (100 * energia(st)) / E0;
    wyniki.textContent = `energia (powinna być stała = 100%):   naiwnie ${en(s.n).toFixed(0).padStart(6)}%   |   jak MuJoCo ${en(s.m).toFixed(0).padStart(6)}%`;
  }
  reset();
  const anim = petla(krokFizyki, rysuj, 1 / 120);
  return { start: anim.start, stop: anim.stop };
}
