import type { Mods } from '../core/mods';
import type { GameState } from '../core/state';

type L = [string, string];

export interface TreeNode {
  id: string;
  /** Branch, index into BRANCHES (4 per page of the tree view). */
  col: number;
  row: number;
  n: L;
  d: L;
  ops: number;
  /** Cost in quantum points (only the quantum computer makes them). */
  qp?: number;
  zl?: number;
  /** Cost in figurines (space phase). */
  wyd?: number;
  /** All of these must be researched first. */
  req?: string[];
  /** Alternative route: at least one of these must be researched (in addition to `req`). */
  reqAny?: string[];
  /** Entries of `req` added after saves existed (R3 joins). Old saves with the node already bought stay valid without them. */
  reqNew?: string[];
  need?: { label: L; value: (s: GameState) => number; target: number };
  /** Automation node: unlocking it enables the toggle with this id. */
  automation?: boolean;
  /** Node that switches the game phase (liftoff). The board never buys it. */
  liftoff?: boolean;
  /** One-time effect on buying (older nodes, automations, liftoff). */
  fx?: (s: GameState) => void;
  /** Lasting multipliers, read by formulas through core/mods.ts (newer nodes; preferred for new content). */
  mods?: Mods;
}

export const BRANCHES: [L, L][] = [
  [['Produkcja', 'szybciej i taniej'], ['Production', 'faster, cheaper']],
  [['Sprzedaż', 'więcej klientów'], ['Sales', 'more customers']],
  [['Automatyka', 'firma działa sama'], ['Automation', 'runs itself']],
  [['Kosmos', 'po locie w kosmos'], ['Space', 'after liftoff']],
  [['Materiały i jakość', 'taniej i mniej awarii'], ['Materials & quality', 'cheaper, fewer failures']],
  [['Projekty', 'lepsze modele'], ['Design', 'better models']],
  [['Zamówienia i logistyka', 'więcej z każdego zlecenia'], ['Orders & logistics', 'more from every order']],
  [['Energia i komputer', 'prąd i moc obliczeniowa'], ['Energy & computing', 'power and compute']],
  [['Kwantowe', 'za punkty kwantowe'], ['Quantum', 'paid in quantum points']],
];

/** The Quantum branch (index into BRANCHES): optional, paid in quantum points, shown once the machine is within reach. */
export const QUANTUM_BRANCH = 8;

/** Branches shown together on one page of the tree view. */
export const TREE_PAGES: number[][] = [[0, 1, 2, 3], [4, 5, 6, 7], [8]];

const auto = (id: string) => (s: GameState) => { s.amOn[id] = true; };

export const TREE: TreeNode[] = [
  { id: 'dysza', col: 0, row: 1, n: ['Dysza ze stali hartowanej', 'Hardened steel nozzle'], d: ['Figurka zużywa 25% mniej filamentu.', 'Figurines use 25% less filament.'], ops: 500, need: { label: ['100 figurek', '100 figurines'], value: s => s.total, target: 100 }, fx: s => { s.g *= 0.75; } },
  { id: 'fw', col: 0, row: 2, n: ['Nowy firmware', 'New firmware'], d: ['Drukarki automatyczne +25% szybciej.', 'Auto printers +25% faster.'], ops: 1200, req: ['dysza'], need: { label: ['5 drukarek', '5 printers'], value: s => s.auto, target: 5 }, fx: s => { s.spd *= 1.25; } },
  { id: 'hurt', col: 0, row: 3, n: ['Umowa z hurtownią', 'Wholesale deal'], d: ['Filament w paczkach po 5 kg, 15% taniej.', 'Filament in 5 kg packs, 15% cheaper.'], ops: 2500, zl: 1000, req: ['fw'], fx: s => { s.spoolG = 5000; } },
  { id: 'shaping', col: 0, row: 4, n: ['Input shaping', 'Input shaping'], d: ['Drukarki +50% szybciej.', 'Printers +50% faster.'], ops: 5000, req: ['hurt'], need: { label: ['12 drukarek', '12 printers'], value: s => s.auto, target: 12 }, fx: s => { s.spd *= 1.5; } },
  { id: 'farma', col: 0, row: 6, n: ['Projekt farmy drukarek', 'Printer farm design'], d: ['Odblokowuje farmy (60 drukarek) i zasilanie.', 'Unlocks farms (60 printers) and power.'], ops: 8000, zl: 5000, req: ['shaping'], need: { label: ['20 drukarek', '20 printers'], value: s => s.auto, target: 20 }, fx: s => { s.farmOn = true; } },
  { id: 'slicer', col: 0, row: 8, n: ['Slicer z AI', 'AI slicer'], d: ['Lepsze ścieżki: drukarki 2× szybsze.', 'Better paths: printers 2× faster.'], ops: 15000, req: ['farma'], need: { label: ['1 farma', '1 farm'], value: s => s.farm, target: 1 }, fx: s => { s.spd *= 2; } },
  { id: 'replik', col: 0, row: 11, liftoff: true, n: ['Drukarka, która drukuje drukarki', 'A printer that prints printers'], d: ['Koniec pieniędzy. Lecisz w kosmos.', 'Money stops mattering. Into space.'], ops: 40000, zl: 600000, req: ['slicer'], need: { label: ['5 farm', '5 farms'], value: s => s.farm, target: 5 }, fx: s => { s.ph = 2; s.fleet = {}; s.modelStock = {}; s.orderStock = {}; s.drones = 1; s.fabs = 1; s.tab = 'w'; s.ord = null; s.brk = 0; } },

  { id: 'profil', col: 1, row: 1, n: ['Profil sprzedawcy', 'Seller profile'], d: ['Opinie i zdjęcia: popyt +30%.', 'Reviews and photos: demand +30%.'], ops: 300, need: { label: ['50 sprzedanych', '50 sold'], value: s => s.sold, target: 50 }, fx: s => { s.dem *= 1.3; } },
  { id: 'tiktok', col: 1, row: 2, n: ['Timelapse’y w sieci', 'Timelapse videos'], d: ['Filmiki z druku: popyt +50%.', 'Print videos: demand +50%.'], ops: 1500, req: ['profil'], need: { label: ['2 tys. figurek', '2K figurines'], value: s => s.total, target: 2000 }, fx: s => { s.dem *= 1.5; } },
  { id: 'sklep', col: 1, row: 4, n: ['Własny sklep internetowy', 'Own online store'], d: ['Popyt rośnie 2×.', 'Demand 2×.'], ops: 3500, zl: 2500, req: ['tiktok'], need: { label: ['10 tys. figurek', '10K figurines'], value: s => s.total, target: 1e4 }, fx: s => { s.dem *= 2; } },
  { id: 'pudelka', col: 1, row: 5, n: ['Ładne opakowania', 'Nice packaging'], d: ['Figurka w pudełku: popyt +60%.', 'Boxed figurines: demand +60%.'], ops: 5000, zl: 8000, req: ['sklep'], fx: s => { s.dem *= 1.6; } },
  { id: 'marka', col: 1, row: 7, n: ['Rozpoznawalna marka', 'Known brand'], d: ['Popyt rośnie 3×.', 'Demand 3×.'], ops: 12000, zl: 50000, req: ['pudelka'], need: { label: ['2 farmy', '2 farms'], value: s => s.farm, target: 2 }, fx: s => { s.dem *= 3; } },
  { id: 'eksport', col: 1, row: 8, n: ['Eksport za granicę', 'Export abroad'], d: ['Nowe rynki: popyt 2×.', 'New markets: demand 2×.'], ops: 20000, zl: 150000, req: ['marka', 'kurier'], reqNew: ['kurier'], fx: s => { s.dem *= 2; } },
  { id: 'b2b', col: 1, row: 10, automation: true, n: ['Dział B2B', 'B2B team'], d: ['Sam przyjmuje zamówienia, płacą 50% więcej.', 'Accepts orders itself, they pay 50% more.'], ops: 15000, req: ['eksport'], need: { label: ['20 zamówień', '20 orders'], value: s => s.ordDone, target: 20 }, fx: auto('b2b') },

  { id: 'kamera', col: 2, row: 1, automation: true, n: ['Kamera nad drukarkami', 'Printer camera'], d: ['Awarie naprawiają się same po 5 s.', 'Breakdowns fix themselves in 5 s.'], ops: 800, need: { label: ['1 awaria', '1 breakdown'], value: s => s.fails, target: 1 }, fx: auto('kamera') },
  { id: 'autobuy', col: 2, row: 2, automation: true, n: ['Auto-zakup filamentu', 'Filament auto-buy'], d: ['Sam zamawia filament, gdy się kończy.', 'Orders filament when it runs low.'], ops: 1000, req: ['dysza'], need: { label: ['3 drukarki', '3 printers'], value: s => s.auto, target: 3 }, fx: auto('autobuy') },
  { id: 'autocena', col: 2, row: 5, automation: true, n: ['Dynamiczne ceny', 'Dynamic pricing'], d: ['Ustawia cenę tak, by sprzedać produkcję i powoli zbić zapas.', 'Prices to sell what you make and slowly clear extra stock.'], ops: 3500, zl: 3000, req: ['autobuy', 'sklep'], fx: auto('autocena') },
  { id: 'automkt', col: 2, row: 6, automation: true, n: ['Agencja marketingowa', 'Marketing agency'], d: ['Sama kupuje kampanie (do 20% środków).', 'Buys campaigns (up to 20% of funds).'], ops: 4000, zl: 2000, req: ['autocena', 'sklep'], fx: auto('automkt') },
  { id: 'autodruk', col: 2, row: 7, automation: true, n: ['Menedżer zakupów', 'Purchasing manager'], d: ['Sam kupuje drukarki, farmy i panele (do 25% środków).', 'Buys printers, farms and panels (up to 25% of funds).'], ops: 8000, req: ['automkt'], need: { label: ['25 drukarek', '25 printers'], value: s => s.auto, target: 25 }, fx: auto('autodruk') },
  { id: 'autopkt', col: 2, row: 9, automation: true, n: ['Doradca AI', 'AI advisor'], d: ['Sam rozdaje punkty reputacji.', 'Spends reputation points.'], ops: 10000, req: ['autodruk'], need: { label: ['8 punktów reputacji', '8 reputation points'], value: s => s.rep, target: 8 }, fx: auto('autopkt') },
  { id: 'zarzad', col: 2, row: 12, automation: true, n: ['Autonomiczny zarząd', 'Autonomous board'], d: ['Sam kupuje węzły drzewka (oprócz lotu w kosmos).', 'Buys tree nodes (except liftoff).'], ops: 15000, req: ['autopkt', 'slicer'], fx: auto('zarzad') },

  { id: 'autobud', col: 3, row: 12, automation: true, n: ['Samoreplikacja', 'Self-replication'], d: ['Drony i fabryki budują się same.', 'Drones and factories build themselves.'], ops: 15000, req: ['replik'], need: { label: ['3 drony', '3 drones'], value: s => s.drones, target: 3 }, fx: auto('autobud') },
  { id: 'roje', col: 3, row: 13, n: ['Roje dronów', 'Drone swarms'], d: ['Drony wydobywają 5× więcej.', 'Drones mine 5× more.'], ops: 20000, req: ['autobud'], need: { label: ['10 dronów', '10 drones'], value: s => s.drones, target: 10 }, fx: s => { s.dMul *= 5; } },
  { id: 'regolit', col: 3, row: 14, n: ['Druk z regolitu', 'Regolith printing'], d: ['Fabryki przerabiają 5× więcej.', 'Factories process 5× more.'], ops: 40000, req: ['roje'], need: { label: ['5 fabryk', '5 factories'], value: s => s.fabs, target: 5 }, fx: s => { s.fMul *= 5; } },
  { id: 'nano', col: 3, row: 15, n: ['Nanodysze', 'Nano-nozzles'], d: ['Drony i fabryki 10× wydajniejsze.', 'Drones and factories 10× better.'], ops: 80000, wyd: 2e8, req: ['regolit'], fx: s => { s.dMul *= 10; s.fMul *= 10; } },
  { id: 'sondy', col: 3, row: 16, n: ['Sondy samoreplikujące', 'Self-replicating probes'], d: ['Drony 10× wydajniejsze.', 'Drones 10× better.'], ops: 150000, wyd: 2e9, req: ['nano'], fx: s => { s.dMul *= 10; } },
  { id: 'grawi', col: 3, row: 18, n: ['Kowadło grawitacyjne', 'Gravity anvil'], d: ['Fabryki 10× wydajniejsze.', 'Factories 10× better.'], ops: 250000, wyd: 2e10, req: ['sondy'], fx: s => { s.fMul *= 10; } },

  // ---- More Production (col 0) ----
  { id: 'leasing', col: 0, row: 5, n: ['Leasing drukarek', 'Printer leasing'], d: ['Drukarki automatyczne 15% taniej.', 'Auto printers 15% cheaper.'], ops: 1300, req: ['hurt'], need: { label: ['8 drukarek', '8 printers'], value: s => s.auto, target: 8 }, mods: { printerCost: 0.85 } },
  { id: 'hotend', col: 0, row: 7, n: ['Hotend wysokoprzepływowy', 'High-flow hotend'], d: ['Druk +20% szybciej.', 'Printing +20% faster.'], ops: 3900, zl: 15000, req: ['shaping'], mods: { speed: 1.2 } },
  { id: 'prefab', col: 0, row: 9, n: ['Hale prefabrykowane', 'Prefab halls'], d: ['Farmy 15% taniej.', 'Farms 15% cheaper.'], ops: 5800, req: ['farma', 'taryfa'], reqNew: ['taryfa'], need: { label: ['2 farmy', '2 farms'], value: s => s.farm, target: 2 }, mods: { farmCost: 0.85 } },
  { id: 'corexy', col: 0, row: 10, n: ['Kinematyka CoreXY', 'CoreXY motion'], d: ['Druk +25% szybciej.', 'Printing +25% faster.'], ops: 9100, zl: 80000, req: ['hotend', 'baterie'], reqNew: ['baterie'], need: { label: ['40 drukarek', '40 printers'], value: s => s.auto, target: 40 }, mods: { speed: 1.25 } },
  { id: 'nocna', col: 0, row: 12, n: ['Nocna zmiana', 'Night shift'], d: ['Farmy pracują całą dobę: druk +15%.', 'Farms run around the clock: printing +15%.'], ops: 14300, req: ['prefab', 'kamera'], reqNew: ['kamera'], need: { label: ['8 farm', '8 farms'], value: s => s.farm, target: 8 }, mods: { speed: 1.15 } },

  // ---- More Sales (col 1) ----
  { id: 'agencja', col: 1, row: 3, n: ['Stała agencja reklamowa', 'Retained ad agency'], d: ['Kampanie 20% taniej.', 'Campaigns 20% cheaper.'], ops: 1300, req: ['profil'], need: { label: ['3 kampanie', '3 campaigns'], value: s => s.mkt - 1, target: 3 }, mods: { marketingCost: 0.8 } },
  { id: 'marketplace', col: 1, row: 6, n: ['Platformy sprzedażowe', 'Online marketplaces'], d: ['Popyt +25%.', 'Demand +25%.'], ops: 2900, zl: 5000, req: ['sklep', 'chmura'], reqNew: ['chmura'], mods: { demand: 1.25 } },
  { id: 'kolekcja', col: 1, row: 9, n: ['Klub kolekcjonera', 'Collectors’ club'], d: ['Popyt +15%, zamówienie dnia płaci +25%.', 'Demand +15%, order of the day pays +25%.'], ops: 9100, reqAny: ['marka', 'studio'], need: { label: ['15 zamówień', '15 orders'], value: s => s.ordDone, target: 15 }, mods: { demand: 1.15, dailyPay: 1.25 } },
  { id: 'franczyza', col: 1, row: 11, n: ['Franczyza', 'Franchise'], d: ['Sklepy partnerskie w całym kraju: popyt +35%.', 'Partner shops across the country: demand +35%.'], ops: 19500, zl: 400000, req: ['eksport'], need: { label: ['4 farmy', '4 farms'], value: s => s.farm, target: 4 }, mods: { demand: 1.35 } },

  // ---- More Automation (col 2) ----
  { id: 'autooffer', col: 2, row: 8, automation: true, n: ['Agent rynkowy', 'Market agent'], d: ['Sam przyjmuje oferty rynkowe tańsze niż 1/3 środków.', 'Takes market offers that cost under a third of your funds.'], ops: 3900, reqAny: ['automkt', 'negocjator'], need: { label: ['8 kampanii', '8 campaigns'], value: s => s.mkt - 1, target: 8 }, fx: auto('autooffer') },
  { id: 'autodaily', col: 2, row: 10, automation: true, n: ['Spedytor', 'Dispatcher'], d: ['Sam wysyła zamówienie dnia, gdy starczy towaru.', 'Ships the order of the day once there is enough stock.'], ops: 4600, req: ['autooffer'], need: { label: ['12 zamówień', '12 orders'], value: s => s.ordDone, target: 12 }, fx: auto('autodaily') },
  { id: 'automodel', col: 2, row: 11, automation: true, n: ['Planista produkcji', 'Production planner'], d: ['Co 30 s wybiera najbardziej opłacalny model.', 'Every 30 s picks the most profitable model.'], ops: 7800, req: ['autodruk', 'parametr'], reqNew: ['parametr'], need: { label: ['3 modele', '3 models'], value: s => s.mdls.length, target: 3 }, fx: auto('automodel') },

  // ---- More Space (col 3) ----
  { id: 'stocznia', col: 3, row: 17, n: ['Stocznia orbitalna', 'Orbital shipyard'], d: ['Fabryki przerabiają 50% więcej.', 'Factories process 50% more.'], ops: 120000, wyd: 5e8, req: ['nano'], need: { label: ['8 fabryk', '8 factories'], value: s => s.fabs, target: 8 }, mods: { fab: 1.5 } },
  { id: 'rojai', col: 3, row: 19, n: ['Rój sterowany AI', 'AI-driven swarm'], d: ['Drony wydobywają 50% więcej.', 'Drones mine 50% more.'], ops: 200000, req: ['sondy', 'chmura'], reqNew: ['chmura'], need: { label: ['100 dronów', '100 drones'], value: s => s.drones, target: 100 }, mods: { mining: 1.5 } },
  { id: 'lustra', col: 3, row: 20, n: ['Lustra słoneczne', 'Solar mirrors'], d: ['Drony i fabryki 30% wydajniejsze.', 'Drones and factories 30% better.'], ops: 400000, req: ['grawi', 'stocznia'], mods: { mining: 1.3, fab: 1.3 } },

  // ---- Materials & quality (col 4) ----
  { id: 'recykling', col: 4, row: 1, n: ['Recykling nieudanych wydruków', 'Recycling failed prints'], d: ['Figurka zużywa 10% mniej filamentu.', 'Figurines use 10% less filament.'], ops: 500, need: { label: ['3 awarie', '3 breakdowns'], value: s => s.fails, target: 3 }, mods: { filament: 0.9 } },
  { id: 'serwis', col: 4, row: 2, n: ['Serwis prewencyjny', 'Preventive maintenance'], d: ['Awarie zdarzają się o 40% rzadziej.', 'Breakdowns happen 40% less often.'], ops: 1600, req: ['recykling'], need: { label: ['6 awarii', '6 breakdowns'], value: s => s.fails, target: 6 }, mods: { breakdown: 0.6 } },
  { id: 'mieszanki', col: 4, row: 3, n: ['Własne mieszanki filamentu', 'Own filament blends'], d: ['Filament 10% taniej.', 'Filament 10% cheaper.'], ops: 1300, req: ['recykling'], need: { label: ['5 tys. figurek', '5K figurines'], value: s => s.total, target: 5000 }, mods: { spool: 0.9 } },
  { id: 'czesci', col: 4, row: 4, n: ['Magazyn części zamiennych', 'Spare parts store'], d: ['Kamera naprawia awarie 2× szybciej.', 'The camera fixes breakdowns 2× faster.'], ops: 3200, req: ['serwis', 'kamera'], mods: { repair: 0.5 } },
  { id: 'kontrakt', col: 4, row: 5, n: ['Kontrakt z producentem', 'Manufacturer contract'], d: ['Filament 15% taniej.', 'Filament 15% cheaper.'], ops: 3900, zl: 20000, req: ['mieszanki'], need: { label: ['50 tys. figurek', '50K figurines'], value: s => s.total, target: 5e4 }, mods: { spool: 0.85 } },
  { id: 'chemia', col: 4, row: 6, n: ['Laboratorium materiałowe', 'Materials lab'], d: ['Figurka zużywa 15% mniej filamentu.', 'Figurines use 15% less filament.'], ops: 7800, req: ['kontrakt'], need: { label: ['200 tys. figurek', '200K figurines'], value: s => s.total, target: 2e5 }, mods: { filament: 0.85 } },
  { id: 'granulat', col: 4, row: 7, n: ['Druk z granulatu', 'Pellet printing'], d: ['Prosto z granulatu, bez szpul: filament 30% taniej.', 'Straight from pellets, no spools: filament 30% cheaper.'], ops: 16200, zl: 250000, req: ['chemia', 'baterie'], reqNew: ['baterie'], need: { label: ['6 farm', '6 farms'], value: s => s.farm, target: 6 }, mods: { spool: 0.7 } },

  // ---- Design (col 5) ----
  { id: 'skaner', col: 5, row: 1, n: ['Skaner 3D', '3D scanner'], d: ['Projekty modeli 20% taniej.', 'Model designs 20% cheaper.'], ops: 600, need: { label: ['500 figurek', '500 figurines'], value: s => s.total, target: 500 }, mods: { design: 0.8 } },
  { id: 'parametr', col: 5, row: 2, n: ['Projekty parametryczne', 'Parametric designs'], d: ['Figurki na życzenie: popyt +10%.', 'Made-to-order figurines: demand +10%.'], ops: 1600, req: ['skaner'], need: { label: ['2 modele', '2 models'], value: s => s.mdls.length, target: 2 }, mods: { demand: 1.1 } },
  { id: 'podpory', col: 5, row: 3, n: ['Projekty bez podpór', 'Support-free designs'], d: ['Druk +10% szybciej, filamentu 10% mniej.', 'Printing +10% faster, 10% less filament.'], ops: 3200, req: ['parametr'], need: { label: ['20 tys. figurek', '20K figurines'], value: s => s.total, target: 2e4 }, mods: { speed: 1.1, filament: 0.9 } },
  { id: 'licencje', col: 5, row: 4, n: ['Licencje od twórców', 'Creator licences'], d: ['Popyt +15%, projekty modeli 30% taniej.', 'Demand +15%, model designs 30% cheaper.'], ops: 4600, req: ['parametr'], need: { label: ['3 modele', '3 models'], value: s => s.mdls.length, target: 3 }, mods: { demand: 1.15, design: 0.7 } },
  { id: 'studio', col: 5, row: 5, n: ['Własne studio projektowe', 'In-house design studio'], d: ['Popyt +20%.', 'Demand +20%.'], ops: 10400, zl: 100000, req: ['licencje', 'agencja'], reqNew: ['agencja'], mods: { demand: 1.2 } },
  { id: 'genai', col: 5, row: 6, n: ['Projektowanie generatywne', 'Generative design'], d: ['AI projektuje z klientem: popyt +25%, druk +10%.', 'AI designs with the customer: demand +25%, printing +10%.'], ops: 19500, req: ['studio', 'podpory'], need: { label: ['1 mln figurek', '1M figurines'], value: s => s.total, target: 1e6 }, mods: { demand: 1.25, speed: 1.1 } },

  // ---- Orders & logistics (col 6) ----
  { id: 'kurier', col: 6, row: 1, n: ['Umowa z kurierem', 'Courier contract'], d: ['Zamówienia mają 30% więcej czasu.', 'Orders get 30% more time.'], ops: 400, need: { label: ['1 zamówienie', '1 order'], value: s => s.ordDone, target: 1 }, mods: { orderTime: 1.3 } },
  { id: 'magazyn', col: 6, row: 2, n: ['Mały magazyn', 'Small warehouse'], d: ['Zamówienia płacą +20%.', 'Orders pay +20%.'], ops: 1000, req: ['kurier'], need: { label: ['3 zamówienia', '3 orders'], value: s => s.ordDone, target: 3 }, mods: { orderPay: 1.2 } },
  { id: 'crm', col: 6, row: 3, n: ['System CRM', 'CRM system'], d: ['Zamówienia płacą +25%, kara za spóźnienie trwa o połowę krócej.', 'Orders pay +25%; late-order penalties last half as long.'], ops: 2600, req: ['magazyn'], need: { label: ['5 zamówień', '5 orders'], value: s => s.ordDone, target: 5 }, mods: { orderPay: 1.25, penalty: 0.5 } },
  { id: 'paczkomaty', col: 6, row: 4, n: ['Sieć paczkomatów', 'Parcel lockers'], d: ['Zamówienie dnia płaci +30%.', 'Order of the day pays +30%.'], ops: 3900, req: ['crm', 'agencja'], reqNew: ['agencja'], need: { label: ['10 zamówień', '10 orders'], value: s => s.ordDone, target: 10 }, mods: { dailyPay: 1.3 } },
  { id: 'negocjator', col: 6, row: 5, n: ['Negocjator', 'Negotiator'], d: ['Oferty rynkowe 25% taniej.', 'Market offers 25% cheaper.'], ops: 5200, req: ['crm'], need: { label: ['3 farmy', '3 farms'], value: s => s.farm, target: 3 }, mods: { offer: 0.75 } },
  { id: 'hub', col: 6, row: 6, n: ['Centrum logistyczne', 'Logistics hub'], d: ['Zamówienia płacą +40% i mają 30% więcej czasu.', 'Orders pay +40% and get 30% more time.'], ops: 9800, zl: 80000, req: ['paczkomaty'], need: { label: ['20 zamówień', '20 orders'], value: s => s.ordDone, target: 20 }, mods: { orderPay: 1.4, orderTime: 1.3 } },
  { id: 'dronydost', col: 6, row: 11, n: ['Dostawy dronami', 'Drone deliveries'], d: ['Szybka dostawa: popyt +15%.', 'Fast delivery: demand +15%.'], ops: 18200, req: ['hub', 'autodaily'], reqNew: ['autodaily'], need: { label: ['2 mln figurek', '2M figurines'], value: s => s.total, target: 2e6 }, mods: { demand: 1.15 } },

  // ---- Energy & computing (col 7) ----
  { id: 'chlodzenie', col: 7, row: 1, n: ['Chłodzenie procesorów', 'CPU cooling'], d: ['Moc obliczeniowa rośnie o 25% szybciej.', 'Compute grows 25% faster.'], ops: 500, mods: { ops: 1.25 } },
  { id: 'serwer', col: 7, row: 2, n: ['Serwerownia w piwnicy', 'Basement server room'], d: ['Pamięć mieści 50% więcej mocy.', 'Memory holds 50% more compute.'], ops: 1300, req: ['chlodzenie'], need: { label: ['2 punkty pamięci', '2 memory points'], value: s => s.mem, target: 2 }, mods: { opsCap: 1.5 } },
  { id: 'taryfa', col: 7, row: 3, n: ['Taryfa nocna', 'Night tariff'], d: ['Prąd +20%.', 'Power +20%.'], ops: 2600, req: ['serwer'], need: { label: ['1 farma', '1 farm'], value: s => s.farm, target: 1 }, mods: { power: 1.2 } },
  { id: 'baterie', col: 7, row: 5, n: ['Magazyn energii', 'Battery storage'], d: ['Prąd +30%.', 'Power +30%.'], ops: 5800, req: ['taryfa'], need: { label: ['2 farmy', '2 farms'], value: s => s.farm, target: 2 }, mods: { power: 1.3 } },
  { id: 'chmura', col: 7, row: 4, n: ['Moc w chmurze', 'Cloud compute'], d: ['Moc rośnie +50% szybciej, pamięć +50%.', 'Compute +50% faster, memory +50%.'], ops: 7800, req: ['serwer'], need: { label: ['20 tys. figurek', '20K figurines'], value: s => s.total, target: 2e4 }, mods: { ops: 1.5, opsCap: 1.5 } },
  { id: 'neuro', col: 7, row: 6, n: ['Sieci neuronowe', 'Neural networks'], d: ['Punkty reputacji przychodzą 15% szybciej.', 'Reputation points come 15% sooner.'], ops: 13000, req: ['chmura'], need: { label: ['100 tys. figurek', '100K figurines'], value: s => s.total, target: 1e5 }, mods: { rep: 0.85 } },
  { id: 'offline', col: 7, row: 7, n: ['Zdalny nadzór', 'Remote monitoring'], d: ['Postęp offline trwa 50% dłużej.', 'Offline progress lasts 50% longer.'], ops: 6500, reqAny: ['chmura', 'kamera'], need: { label: ['50 tys. figurek', '50K figurines'], value: s => s.total, target: 5e4 }, mods: { offline: 1.5 } },

  // ---- Quantum (col 8): optional, paid in quantum points only. Joins: qlogi, qtop. Links to regular nodes: qoffline, qpower, qrep. ----
  { id: 'qstart', col: 8, row: 1, n: ['Kwantowy optymalizator', 'Quantum optimiser'], d: ['Druk +25% szybciej.', 'Printing +25% faster.'], ops: 0, qp: 15, need: { label: ['komputer kwantowy', 'quantum computer'], value: s => (s.qOn ? 1 : 0), target: 1 }, mods: { speed: 1.25 } },
  { id: 'qdemand', col: 8, row: 2, n: ['Prognozy kwantowe', 'Quantum forecasts'], d: ['Popyt +50%.', 'Demand +50%.'], ops: 0, qp: 40, req: ['qstart'], mods: { demand: 1.5 } },
  { id: 'qspeed', col: 8, row: 3, n: ['Harmonogram kubitów', 'Qubit scheduling'], d: ['Druk +30% szybciej, filamentu 10% mniej.', 'Printing +30% faster, 10% less filament.'], ops: 0, qp: 50, req: ['qstart'], mods: { speed: 1.3, filament: 0.9 } },
  { id: 'qorders', col: 8, row: 4, n: ['Optymalizator zamówień', 'Order optimiser'], d: ['Zamówienia płacą +50%, zamówienie dnia +30%.', 'Orders pay +50%, order of the day +30%.'], ops: 0, qp: 80, req: ['qdemand'], mods: { orderPay: 1.5, dailyPay: 1.3 } },
  { id: 'qcompute', col: 8, row: 5, n: ['Splątane procesory', 'Entangled processors'], d: ['Moc obliczeniowa 2× szybciej, pamięć 2× większa.', 'Compute 2× faster, memory 2× larger.'], ops: 0, qp: 100, req: ['qspeed'], mods: { ops: 2, opsCap: 2 } },
  { id: 'qoffline', col: 8, row: 6, n: ['Kriostat zdalny', 'Remote cryostat'], d: ['Postęp offline trwa 2× dłużej.', 'Offline progress lasts 2× longer.'], ops: 0, qp: 120, req: ['qcompute', 'chmura'], mods: { offline: 2 } },
  { id: 'qpower', col: 8, row: 7, n: ['Nadprzewodniki', 'Superconductors'], d: ['Prąd +50%, awarie 30% rzadziej.', 'Power +50%, breakdowns 30% less often.'], ops: 0, qp: 120, req: ['qspeed', 'baterie'], mods: { power: 1.5, breakdown: 0.7 } },
  { id: 'qrep', col: 8, row: 8, n: ['Wgląd kwantowy', 'Quantum insight'], d: ['Punkty reputacji przychodzą 25% szybciej.', 'Reputation points come 25% sooner.'], ops: 0, qp: 150, req: ['qdemand', 'neuro'], mods: { rep: 0.75 } },
  { id: 'qlogi', col: 8, row: 9, n: ['Logistyka wyżarzana', 'Annealed logistics'], d: ['Zamówienia mają 50% więcej czasu, kara za spóźnienie trwa o połowę krócej.', 'Orders get 50% more time; late-order penalties last half as long.'], ops: 0, qp: 200, req: ['qorders', 'qcompute'], mods: { orderTime: 1.5, penalty: 0.5 } },
  { id: 'qtop', col: 8, row: 10, n: ['Przewaga kwantowa', 'Quantum advantage'], d: ['Popyt +50%, druk +25% szybciej.', 'Demand +50%, printing +25% faster.'], ops: 0, qp: 400, req: ['qlogi', 'qpower'], mods: { demand: 1.5, speed: 1.25 } },
];

/** Every node this one depends on, from `req` and `reqAny`. */
export const prereqs = (n: Pick<TreeNode, 'req' | 'reqAny'>) => [...(n.req ?? []), ...(n.reqAny ?? [])];

export const NODE: Record<string, TreeNode> = Object.fromEntries(TREE.map(n => [n.id, n]));

/** Automations in the order shown in the Automation panel. */
export const AUTOMATIONS = ['kamera', 'autobuy', 'autocena', 'automkt', 'autodruk', 'autopkt', 'zarzad', 'b2b', 'autooffer', 'autodaily', 'automodel', 'autobud'];
