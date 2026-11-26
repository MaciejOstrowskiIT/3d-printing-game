/** Wszystkie liczby od balansu w jednym miejscu. Zmieniasz tutaj, a test bota w tests/balance.sim.test.ts
 *  od razu pokaże, jak to wpływa na tempo gry. */
export const BAL = {
  startPrice: 5,
  startFilament: 1000,
  filamentPerFigurine: 20,

  // filament
  spoolBasePrice: 60,
  spoolMin: 40,
  spoolMax: 85,
  spoolStep: 0.07,          // maks. zmiana ceny przy jednym skoku
  spoolEvery: [10, 13],     // co ile sekund zmienia się cena
  bulkPackDiscount: 0.85,   // paczka 5 kg

  // sprzedaż
  demandBase: 4,
  demandElasticity: 1.6,
  marketingGrowth: 1.15,
  marketingCost: 100,
  marketingCostGrowth: 1.8,
  penaltyDemand: 0.7,
  penaltySeconds: 60,
  trendBonus: 1.3,
  trendEvery: [150, 240],

  // produkcja
  printerCost: 50,
  printerCostGrowth: 1.12,
  farmCost: 20000,
  farmCostGrowth: 1.1,
  farmPrinters: 60,

  // energia
  garagePower: 40,
  panelPower: 25,
  farmDraw: 20,
  panelCost: 5000,
  panelCostGrowth: 1.1,

  // komputer
  opsPerProcessor: 10,
  opsPerMemory: 1000,
  repThreshold: 500,        // następny punkt przy repThreshold * (rep+1)^2 figurek

  // zamówienia
  orderFirstAt: 45,
  orderEvery: [60, 120],
  orderOffer: 30,
  orderPayMultiplier: 3,
  b2bBonus: 1.5,

  // awarie
  breakdownEvery: [90, 170],
  breakdownShare: [0.2, 0.35],
  cameraFix: 5,

  // kosmos
  beltMatter: 4e7,
  droneCost: 2e5,
  droneCostGrowth: 1.055,
  fabCost: 2e6,
  fabCostGrowth: 1.055,
  droneMining: 0.2,         // t/s
  fabThroughput: 1,         // t/s
  figurinesPerTon: 50000,

  // offline
  offlineMaxSeconds: 8 * 3600,
} as const;
