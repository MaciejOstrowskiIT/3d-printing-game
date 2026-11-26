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
  printerCost: 200,          // first printer ~1 min of clicking for a person, ~30 s for the bot
  printerCostGrowth: 1.15,
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

  // market events (content/events.ts): first one after the first order goal, then every 90-150 s
  marketEventFirst: 60,
  marketEventEvery: [90, 150],
  marketEventOffer: 25,       // seconds to decide on an offer
  marketMulRange: [0.5, 4],   // stacked effects are clamped to this demand/price multiplier range
  marketMinMoney: 50,         // smallest price of a money offer
  clearanceDiscount: 0.5,

  // manual printing (systems/models.ts): a click adds clickWork figurines of work; each tool level adds clickStep
  clickWork: 1,
  clickStep: 0.25,
  clickCost: 30,
  clickGrowth: 2.2,
  clickMaxLevel: 40,

  // dynamic pricing (automation 'autocena'): steers toward the price that sells production plus a slow stock drain
  autoPriceStockSeconds: 20,  // stock it aims to keep, in seconds of production
  autoPriceMaxDrain: 1.5,     // sells at most this × production while the stock is above target
  autoPriceStep: 0.02,        // max price change per second

  // rewarded "double offline earnings" (systems/offlineBonus.ts)
  offlineBonusMinSeconds: 120,     // shorter absences get no offer
  offlineBonusMult: 1,             // the ad adds this × what was earned while away
  offlineBonusClaimSeconds: 600,   // the offer stays for 10 minutes of play
} as const;
