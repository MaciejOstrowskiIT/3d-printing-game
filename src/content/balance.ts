/** All balance numbers in one place. Change them here and the bot test in tests/balance.sim.test.ts
 *  shows right away how pacing is affected. */
export const BAL = {
  /** Global game length knob. 1 = the original pacing (bot finishes in ~1.5 h), 5 = a game 5× longer (the shipped value).
   *  It divides every flow rate (printers, clicks, demand, compute, space), so money, research and the
   *  goals that depend on them stretch together. Real-time timers (events, offers, spool drift) are untouched. */
  pace: 5,
  onboardingSeconds: 5 * 60, // at the baseline game pace
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
  printerCost: 275,          // Keep the first printer attainable with manual sales.
  printerCostGrowth: 1.22,   // Delay workshop expansion more than the first purchase.
  farmCost: 50000,           // a farm is 60 printers: cheap per printer, so the price climbs fast to avoid a
  farmCostGrowth: 1.3,       // runaway (was 20,000 x 1.1: 77 -> 4,700 figurines/s within 7 minutes)
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

  // print quality
  qualityUnlockGoal: 5,
  bedCalibrationCost: 300,
  filamentDryerCost: 650,
  precisionSpeed: 0.75,
  precisionPremium: 0.4,

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

  // realistic mode: a challenge chosen when starting a new production line (core/prestige.ts)
  realisticSlow: 10,               // printing takes 10× longer (printers and clicks; the space phase is unchanged)
  realisticPatentMult: 3,          // patents for finishing such a line
  realisticSpoolMul: 2,          // filament costs this much more
  realisticDemandMul: 0.4,         // customers are harder to win
  realisticCostMul: 2.5,           // printers and farms cost this much more
  realisticSpeedMul: 0.35,          // printers (not clicks) run at this extra fraction of speed, on top of realisticSlow
  realisticBreakdownMul: 2.5,      // breakdowns come this much more often
  realisticOfflineMax: 24 * 3600,  // longer offline progress, made for playing in the background

  // order of the day (systems/dailyOrder.ts)
  dailyFromGoal: 3,        // shows up once regular orders are known
  dailySeconds: 180,       // size: this many seconds of current production
  dailyMinSize: 30,
  dailyPayMultiplier: 3,   // × the current price per figurine
  dailyStreakStep: 0.15,   // +15% pay per day in a row…
  dailyStreakMax: 7,       // …up to the 7th day (×1.9)

  // running out of filament (systems/filament.ts)
  filamentWarnSeconds: 30,         // warn when the active spool lasts less than this
  filamentSwitchMinFigurines: 10,  // another material counts as "in stock" from this many figurines' worth
  offlineIdleNoteSeconds: 60,      // the away report mentions idle printers from this long

  // quantum computer (systems/quantum.ts): bought with compute, makes quantum points (QP)
  quantumCost: 60000,              // compute; above the 40,000 liftoff node, so it needs memory beyond the early game
  quantumMaxLevel: 5,              // qubit levels
  quantumUpgradeBase: 25000,       // compute for level 1 -> 2, then x quantumUpgradeGrowth per level
  quantumUpgradeGrowth: 1.7,
  quantumQpPerSecond: 0.02,        // per level, at full power (level 5 = 0.1/s = 360 QP per hour)
  quantumDraw: 10,                 // power per level, shared with the farms (garage 40, panel 25)
} as const;

/** Multiplier applied to flow rates: 1 / pace. A live binding, so setPace() takes effect everywhere. */
export let SPEED = 1 / BAL.pace;
/** Override the pace at runtime (tests and dev tools). The shipped value is BAL.pace. */
export const setPace = (pace: number = BAL.pace) => { SPEED = 1 / pace; };
