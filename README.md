# Warsztaty: robotyka i symulacje robotów

Symulator fizyki **MuJoCo**, regulatory **PID**, kamery i markery **ArUco** (**OpenCV**), **filtr Kalmana**.

**Strona z wykładami i instrukcją: https://piotrjunior.github.io/warsztaty-robotyka/**

## Dzień 1: pobierz paczkę

**[⬇ warsztaty-robotyka.zip](https://github.com/PiotrJunior/warsztaty-robotyka/raw/main/warsztaty-robotyka.zip)**

Rozpakuj ją i postępuj według pliku `README.md` w środku (instalacja przez `uv`, a potem `uv sync`).

## Dzień 2: paczka z rozwiązanym dniem 1

**[⬇ warsztaty-robotyka-dzien2.zip](https://github.com/PiotrJunior/warsztaty-robotyka/raw/main/warsztaty-robotyka-dzien2.zip)**

PID i sterownik drona z dnia 1 są w niej gotowe, a zadania dnia 2 czekają. Rozpakowuje się do nowego folderu
`warsztaty-robotyka-dzien2`, więc stary kod zostaje. W nowym folderze wpisz `uv sync`.

## Kolejne dni (na własnym kodzie)

Rano, w folderze warsztatów, wpisz:

```bash
uv run python pobierz_dzien.py 2
```

(dnia 3: `uv run python pobierz_dzien.py 3`). Skrypt tylko dodaje nowe pliki, a Twojego kodu nie zmienia.

## Rozwiązania

- [1.3 · Chwytak z palcami](rozwiazania/dzien1/z3_chwytak.xml) (`dzien1/z3_chwytak.xml`)
