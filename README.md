# Drukarnia / Printworks

Przeglądarkowa gra incremental w stylu Universal Paperclips, osadzona w świecie druku 3D. Zaczynasz od jednej drukarki w garażu, a kończysz na przerabianiu pasa asteroid na figurki.

## Uruchomienie

Gra to jeden plik `index.html` bez zależności i bez budowania. Otwórz go w przeglądarce albo wystaw dowolnym serwerem statycznym:

```bash
npx serve .
# albo
python3 -m http.server 8080
```

Działa też od razu na GitHub Pages (Settings → Pages → branch `main`, folder `/`).

## Co jest w grze

- Ręczny druk (klik, przytrzymanie albo spacja), sprzedaż z ceną i popytem, filament z ceną zmieniającą się co ok. 10 s.
- Kolory filamentu i modny kolor (+30% klientów).
- Zamówienia specjalne, awarie drukarek, energia dla farm.
- Komputer: punkty reputacji, procesory, pamięć, moc obliczeniowa.
- Drzewko rozwoju: Produkcja, Sprzedaż, Automatyka, Kosmos.
- 17 celów prowadzących przez całą grę.
- Faza kosmiczna: drony, orbitalne fabryki, pas asteroid.
- Scena izometryczna (garaż → pracownia → hala → orbita) z okienkiem zbliżenia na drukarkę i animacją warstw (kliknięcie okienka zamienia widoki).
- PL / EN, dźwięk (WebAudio), postęp offline do 8 h, zapis w `localStorage`.

## Notatki techniczne

- Cały kod jest w jednym `<script>` na końcu `index.html`: stan `S`, ekonomia, drzewko `T`, cele `G`, `tick()`, `render()`, animacje.
- Zapis: klucz `drukarnia-v3` (stan gry) i `drukarnia-pref` (język, dźwięk, widok).
- `window.__drk` udostępnia stan i funkcje do testów i symulacji balansu. **Usuń przed wydaniem na portal**, bo pozwala oszukiwać z konsoli.
- Balans sprawdzany botem: ok. 75–90 min gry dla bota, szacunkowo 2–3 h dla człowieka.

## Plan

Zobacz dokument „Drukarnia: plan rozwoju i monetyzacji”. Najbliższe kroki: test na 5 osobach, integracja SDK portalu (reklamy z nagrodą, zapis w chmurze), zgłoszenie do Poki lub CrazyGames.
