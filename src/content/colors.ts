export interface FilamentColor { n: [string, string]; c: string; c2: string; st: string }

/** Kolory filamentu. Kolejność = indeks zapisany w stanie (s.col, s.trend), więc nowe dopisuj na końcu. */
export const COLORS: FilamentColor[] = [
  { n: ['biały', 'white'], c: '#ffffff', c2: '#f1ece6', st: '#d9d2ca' },
  { n: ['czarny', 'black'], c: '#2e2e35', c2: '#3b3b44', st: '#55555f' },
  { n: ['czerwony', 'red'], c: '#e53935', c2: '#cc2f2b', st: '#a92521' },
  { n: ['niebieski', 'blue'], c: '#2f7de1', c2: '#2468c4', st: '#1c529b' },
  { n: ['zielony', 'green'], c: '#3fa34d', c2: '#348a41', st: '#276b31' },
  { n: ['złoty jedwab', 'silk gold'], c: '#f2c14e', c2: '#dca935', st: '#b98a22' },
];
