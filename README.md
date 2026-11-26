# Drukarnia / Printworks

Przeglądarkowa gra incremental w stylu Universal Paperclips, osadzona w świecie druku 3D. Zaczynasz od jednej drukarki w garażu, a kończysz na przerabianiu pasa asteroid na figurki.

## Uruchomienie

```bash
npm install
npm run dev        # serwer deweloperski z hot reload
npm test           # testy jednostkowe + bot przechodzący całą grę
npm run build      # dist/index.html: jeden samodzielny plik (portale, GitHub Pages)
```

## Architektura

Trzy warstwy. Rdzeń nie wie nic o przeglądarce, widok tylko czyta stan i wysyła akcje, a wszystko zależne od miejsca uruchomienia siedzi za interfejsem platformy.

```
src/
  core/        rdzeń gry, czysty TypeScript bez DOM
    state.ts     GameState: zwykły obiekt zapisywany jako JSON
    formulas.ts  czyste wzory: koszty, popyt, tempo, energia
    game.ts      pętla (lista SYSTEMS), akcje gracza, nadrabianie offline
    ctx.ts       kontekst ticku: losowość, zdarzenia, dziennik, dźwięki
    save.ts      wersje zapisu i migracje
  systems/     jedna mechanika = jeden plik, sygnatura (state, dt, ctx) => void
  content/     dane gry: balance.ts (wszystkie liczby), tree.ts, goals.ts, colors.ts, i18n/
  ui/          Preact + @preact/signals
    store.ts     instancja gry, pętla 10 Hz, useS() (selektor stanu), zapis
    components/  App, Side, Hud, Workshop, Research, common
    scene/       hala izometryczna i animacja drukarki (imperatywne SVG)
  platform/    interfejs Platform + adapter local (localStorage); tu dojdą Poki i CrazyGames
legacy/        poprzednia wersja jednoplikowa, do porównania
tests/         testy systemów i bot balansu
```

### Jak dodać nową mechanikę

1. Nowy plik w `src/systems/` z funkcją `(s, dt, ctx) => void`.
2. Wpis na liście `SYSTEMS` w `src/core/game.ts`.
3. Nowe pola stanu w `GameState` i `createState()`. Jeśli zmieniasz znaczenie istniejących pól, podbij `SAVE_VERSION` i dopisz migrację w `save.ts`.
4. Liczby do `content/balance.ts`, teksty do `content/i18n/pl.ts` i `en.ts`.
5. Odpal `npm test`: bot balansu pokaże, czy tempo gry się nie rozjechało.

### Zasady

- **UI nie zmienia stanu gry samo.** Wysyła akcje przez `act('...')`. Wyjątek: stan czysto widokowy (zakładka, gałąź drzewka) przez `ui(fn)`.
- **Losowość tylko przez `ctx.rng()`**, dzięki temu testy są powtarzalne.
- **Zdarzenia zamiast wywołań na krzyż.** Rdzeń emituje `log`, `sfx`, `printed`, `goal`, `order`, `phase`, `end`. Słuchają ich dziennik, dźwięk, animacja i analityka (`platform.track`).
- **Zapis zgodny wstecz.** Klucz `drukarnia-v3` w localStorage, stare zapisy wczytują się przez migracje.

## Co jest w grze

- Ręczny druk (klik, przytrzymanie albo spacja), sprzedaż z ceną i popytem, filament z ceną zmieniającą się co ok. 10 s.
- Kolory filamentu i modny kolor (+30% klientów).
- Zamówienia specjalne, awarie drukarek, energia dla farm.
- Komputer: punkty reputacji, procesory, pamięć, moc obliczeniowa.
- Drzewko rozwoju: Produkcja, Sprzedaż, Automatyka, Kosmos.
- 17 celów prowadzących przez całą grę.
- Faza kosmiczna: drony, orbitalne fabryki, pas asteroid.
- Scena izometryczna (garaż → pracownia → hala → orbita) z okienkiem zbliżenia na drukarkę i animacją warstw.
- PL / EN, dźwięk (WebAudio), postęp offline do 8 h.

## Balans

Bot z `tests/bot.ts` przechodzi grę w ok. 78–89 minut (lot w kosmos po 42–52 min). Człowiek gra wolniej, szacunkowo 2–3 godziny. Test `balance.sim.test.ts` pilnuje, żeby te czasy nie wyszły poza ustalone widełki.
