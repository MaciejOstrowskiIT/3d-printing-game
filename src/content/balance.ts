/** All balance numbers in one place. Change them here and the bot test in tests/balance.sim.test.ts
 *  shows right away how pacing is affected. */
export const BAL = {
  startPrice: 5,
  startFilament: 1000,
  filamentPerFigurine: 20,

  // filament
  spoolBasePrice: 60,
  spoolMin: 40,
  spoolMax: 85,
  spoolStep: 0.07,          // max price change per step
  spoolEvery: [10, 13],     // seconds between price changes
  bulkPackDiscount: 0.85,   // 5 kg pack

  // sales
  demandBase: 4,
  demandElasticity: 1.6,
  marketingGrowth: 1.15,
  marketingCost: 100,
  marketingCostGrowth: 1.8,
  penaltyDemand: 0.7,
  penaltySeconds: 60,
  trendBonus: 1.3,
  trendEvery: [150, 240],

  // production
  printerCost: 50,
  printerCostGrowth: 1.12,
  farmCost: 20000,
  farmCostGrowth: 1.1,
  farmPrinters: 60,

  // power
  garagePower: 40,
  panelPower: 25,
  farmDraw: 20,
  panelCost: 5000,
  panelCostGrowth: 1.1,

  // computer
  opsPerProcessor: 10,
  opsPerMemory: 1000,
  repThreshold: 500,        // next point at repThreshold * (rep+1)^2 figurines

  // orders
  orderFirstAt: 45,
  orderEvery: [60, 120],
  orderOffer: 30,
  orderPayMultiplier: 3,
  b2bBonus: 1.5,

  // breakdowns
  breakdownEvery: [90, 170],
  breakdownShare: [0.2, 0.35],
  cameraFix: 5,

  // space
  beltMatter: 4e7,
  droneCost: 2e5,
  droneCostGrowth: 1.055,
  fabCost: 2e6,
  fabCostGrowth: 1.055,
  droneMining: 0.2,         // t/s
  fabThroughput: 1,         // t/s
  figurinesPerTon: 50000,

  // rewarded boost ("overtime")
  boostSeconds: 300,
  boostMultiplier: 2,
  boostCooldown: 600,       // seconds from activation until the next ad can be watched

  // prestige: patents = floor(scale * log10(total / base)^1.5)
  prestigeBase: 1e5,
  prestigeScale: 2,

  // offline
  offlineMaxSeconds: 8 * 3600,
} as const;
