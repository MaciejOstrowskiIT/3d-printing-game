import type { GameState } from '../core/state';

type L = [string, string];

export interface TreeNode {
  id: string;
  /** Branch: 0 Production, 1 Sales, 2 Automation, 3 Space. */
  col: 0 | 1 | 2 | 3;
  row: number;
  n: L;
  d: L;
  ops: number;
  zl?: number;
  /** Cost in figurines (space phase). */
  wyd?: number;
  req?: string[];
  need?: { label: L; value: (s: GameState) => number; target: number };
  /** Automation node: unlocking it enables the toggle with this id. */
  automation?: boolean;
  /** Node that switches the game phase (liftoff). The board never buys it. */
  liftoff?: boolean;
  fx: (s: GameState) => void;
}

export const BRANCHES: [L, L][] = [
  [['Produkcja', 'szybciej i taniej'], ['Production', 'faster, cheaper']],
  [['Sprzedaż', 'więcej klientów'], ['Sales', 'more customers']],
  [['Automatyka', 'firma działa sama'], ['Automation', 'runs itself']],
  [['Kosmos', 'po locie w kosmos'], ['Space', 'after liftoff']],
];

const auto = (id: string) => (s: GameState) => { s.amOn[id] = true; };

export const TREE: TreeNode[] = [
  { id: 'dysza', col: 0, row: 1, n: ['Dysza ze stali hartowanej', 'Hardened steel nozzle'], d: ['Figurka zużywa 25% mniej filamentu.', 'Figurines use 25% less filament.'], ops: 500, need: { label: ['100 figurek', '100 figurines'], value: s => s.total, target: 100 }, fx: s => { s.g *= 0.75; } },
  { id: 'fw', col: 0, row: 2, n: ['Nowy firmware', 'New firmware'], d: ['Drukarki automatyczne +25% szybciej.', 'Auto printers +25% faster.'], ops: 1200, req: ['dysza'], need: { label: ['5 drukarek', '5 printers'], value: s => s.auto, target: 5 }, fx: s => { s.spd *= 1.25; } },
  { id: 'hurt', col: 0, row: 3, n: ['Umowa z hurtownią', 'Wholesale deal'], d: ['Filament w paczkach po 5 kg, 15% taniej.', 'Filament in 5 kg packs, 15% cheaper.'], ops: 2500, zl: 1000, req: ['fw'], fx: s => { s.spoolG = 5000; } },
  { id: 'shaping', col: 0, row: 4, n: ['Input shaping', 'Input shaping'], d: ['Drukarki +50% szybciej.', 'Printers +50% faster.'], ops: 5000, req: ['hurt'], need: { label: ['12 drukarek', '12 printers'], value: s => s.auto, target: 12 }, fx: s => { s.spd *= 1.5; } },
  { id: 'farma', col: 0, row: 5, n: ['Projekt farmy drukarek', 'Printer farm design'], d: ['Odblokowuje farmy (60 drukarek) i zasilanie.', 'Unlocks farms (60 printers) and power.'], ops: 8000, zl: 5000, req: ['shaping'], need: { label: ['20 drukarek', '20 printers'], value: s => s.auto, target: 20 }, fx: s => { s.farmOn = true; } },
  { id: 'slicer', col: 0, row: 6, n: ['Slicer z AI', 'AI slicer'], d: ['Lepsze ścieżki: drukarki 2× szybsze.', 'Better paths: printers 2× faster.'], ops: 15000, req: ['farma'], need: { label: ['1 farma', '1 farm'], value: s => s.farm, target: 1 }, fx: s => { s.spd *= 2; } },
  { id: 'replik', col: 0, row: 7, liftoff: true, n: ['Drukarka, która drukuje drukarki', 'A printer that prints printers'], d: ['Koniec pieniędzy. Lecisz w kosmos.', 'Money stops mattering. Into space.'], ops: 40000, zl: 600000, req: ['slicer'], need: { label: ['5 farm', '5 farms'], value: s => s.farm, target: 5 }, fx: s => { s.ph = 2; s.drones = 1; s.fabs = 1; s.tab = 'w'; s.ord = null; s.brk = 0; } },

  { id: 'profil', col: 1, row: 1, n: ['Profil sprzedawcy', 'Seller profile'], d: ['Opinie i zdjęcia: popyt +30%.', 'Reviews and photos: demand +30%.'], ops: 300, need: { label: ['50 sprzedanych', '50 sold'], value: s => s.sold, target: 50 }, fx: s => { s.dem *= 1.3; } },
  { id: 'tiktok', col: 1, row: 2, n: ['Timelapse’y w sieci', 'Timelapse videos'], d: ['Filmiki z druku: popyt +50%.', 'Print videos: demand +50%.'], ops: 1500, req: ['profil'], need: { label: ['2 tys. figurek', '2K figurines'], value: s => s.total, target: 2000 }, fx: s => { s.dem *= 1.5; } },
  { id: 'sklep', col: 1, row: 3, n: ['Własny sklep internetowy', 'Own online store'], d: ['Popyt rośnie 2×.', 'Demand 2×.'], ops: 3500, zl: 2500, req: ['tiktok'], need: { label: ['10 tys. figurek', '10K figurines'], value: s => s.total, target: 1e4 }, fx: s => { s.dem *= 2; } },
  { id: 'pudelka', col: 1, row: 4, n: ['Ładne opakowania', 'Nice packaging'], d: ['Figurka w pudełku: popyt +60%.', 'Boxed figurines: demand +60%.'], ops: 5000, zl: 8000, req: ['sklep'], fx: s => { s.dem *= 1.6; } },
  { id: 'marka', col: 1, row: 5, n: ['Rozpoznawalna marka', 'Known brand'], d: ['Popyt rośnie 3×.', 'Demand 3×.'], ops: 12000, zl: 50000, req: ['pudelka'], need: { label: ['2 farmy', '2 farms'], value: s => s.farm, target: 2 }, fx: s => { s.dem *= 3; } },
  { id: 'eksport', col: 1, row: 6, n: ['Eksport za granicę', 'Export abroad'], d: ['Nowe rynki: popyt 2×.', 'New markets: demand 2×.'], ops: 20000, zl: 150000, req: ['marka'], fx: s => { s.dem *= 2; } },
  { id: 'b2b', col: 1, row: 7, automation: true, n: ['Dział B2B', 'B2B team'], d: ['Sam przyjmuje zamówienia, płacą 50% więcej.', 'Accepts orders itself, they pay 50% more.'], ops: 15000, req: ['eksport'], need: { label: ['10 zamówień', '10 orders'], value: s => s.ordDone, target: 10 }, fx: auto('b2b') },

  { id: 'kamera', col: 2, row: 1, automation: true, n: ['Kamera nad drukarkami', 'Printer camera'], d: ['Awarie naprawiają się same po 5 s.', 'Breakdowns fix themselves in 5 s.'], ops: 800, need: { label: ['1 awaria', '1 breakdown'], value: s => s.fails, target: 1 }, fx: auto('kamera') },
  { id: 'autobuy', col: 2, row: 2, automation: true, n: ['Auto-zakup filamentu', 'Filament auto-buy'], d: ['Sam zamawia filament, gdy się kończy.', 'Orders filament when it runs low.'], ops: 1000, req: ['dysza'], need: { label: ['3 drukarki', '3 printers'], value: s => s.auto, target: 3 }, fx: auto('autobuy') },
  { id: 'autocena', col: 2, row: 3, automation: true, n: ['Dynamiczne ceny', 'Dynamic pricing'], d: ['Ustawia cenę tak, by sprzedać produkcję i powoli zbić zapas.', 'Prices to sell what you make and slowly clear extra stock.'], ops: 3500, zl: 3000, req: ['autobuy', 'sklep'], fx: auto('autocena') },
  { id: 'automkt', col: 2, row: 4, automation: true, n: ['Agencja marketingowa', 'Marketing agency'], d: ['Sama kupuje kampanie (do 20% środków).', 'Buys campaigns (up to 20% of funds).'], ops: 4000, zl: 2000, req: ['autocena', 'sklep'], fx: auto('automkt') },
  { id: 'autodruk', col: 2, row: 5, automation: true, n: ['Menedżer zakupów', 'Purchasing manager'], d: ['Sam kupuje drukarki, farmy i panele (do 25% środków).', 'Buys printers, farms and panels (up to 25% of funds).'], ops: 8000, req: ['automkt'], need: { label: ['25 drukarek', '25 printers'], value: s => s.auto, target: 25 }, fx: auto('autodruk') },
  { id: 'autopkt', col: 2, row: 6, automation: true, n: ['Doradca AI', 'AI advisor'], d: ['Sam rozdaje punkty reputacji.', 'Spends reputation points.'], ops: 10000, req: ['autodruk'], fx: auto('autopkt') },
  { id: 'zarzad', col: 2, row: 7, automation: true, n: ['Autonomiczny zarząd', 'Autonomous board'], d: ['Sam kupuje węzły drzewka (oprócz lotu w kosmos).', 'Buys tree nodes (except liftoff).'], ops: 15000, req: ['autopkt', 'slicer'], fx: auto('zarzad') },

  { id: 'autobud', col: 3, row: 1, automation: true, n: ['Samoreplikacja', 'Self-replication'], d: ['Drony i fabryki budują się same.', 'Drones and factories build themselves.'], ops: 15000, req: ['replik'], need: { label: ['3 drony', '3 drones'], value: s => s.drones, target: 3 }, fx: auto('autobud') },
  { id: 'roje', col: 3, row: 2, n: ['Roje dronów', 'Drone swarms'], d: ['Drony wydobywają 5× więcej.', 'Drones mine 5× more.'], ops: 20000, req: ['autobud'], need: { label: ['10 dronów', '10 drones'], value: s => s.drones, target: 10 }, fx: s => { s.dMul *= 5; } },
  { id: 'regolit', col: 3, row: 3, n: ['Druk z regolitu', 'Regolith printing'], d: ['Fabryki przerabiają 5× więcej.', 'Factories process 5× more.'], ops: 40000, req: ['roje'], need: { label: ['5 fabryk', '5 factories'], value: s => s.fabs, target: 5 }, fx: s => { s.fMul *= 5; } },
  { id: 'nano', col: 3, row: 4, n: ['Nanodysze', 'Nano-nozzles'], d: ['Drony i fabryki 10× wydajniejsze.', 'Drones and factories 10× better.'], ops: 80000, wyd: 2e8, req: ['regolit'], fx: s => { s.dMul *= 10; s.fMul *= 10; } },
  { id: 'sondy', col: 3, row: 5, n: ['Sondy samoreplikujące', 'Self-replicating probes'], d: ['Drony 10× wydajniejsze.', 'Drones 10× better.'], ops: 150000, wyd: 2e9, req: ['nano'], fx: s => { s.dMul *= 10; } },
  { id: 'grawi', col: 3, row: 6, n: ['Kowadło grawitacyjne', 'Gravity anvil'], d: ['Fabryki 10× wydajniejsze.', 'Factories 10× better.'], ops: 250000, wyd: 2e10, req: ['sondy'], fx: s => { s.fMul *= 10; } },
];

export const NODE: Record<string, TreeNode> = Object.fromEntries(TREE.map(n => [n.id, n]));

/** Automations in the order shown in the Automation panel. */
export const AUTOMATIONS = ['kamera', 'autobuy', 'autocena', 'automkt', 'autodruk', 'autopkt', 'zarzad', 'b2b', 'autobud'];
