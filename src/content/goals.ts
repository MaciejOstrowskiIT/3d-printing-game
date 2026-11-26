import { has, type GameState } from '../core/state';

type L = [string, string];
export interface Goal { t: L; h: L; p: (s: GameState) => [number, number] }

/** Goal path guiding the player through the whole game. Order matters: s.goal is an index into this array. */
export const GOALS: Goal[] = [
  { t: ['Wydrukuj 10 figurek', 'Print 10 figurines'], h: ['Klikaj „Drukuj figurkę”. Każda zużywa 20 g filamentu.', 'Click “Print a figurine”. Each uses 20 g of filament.'], p: s => [s.total, 10] },
  { t: ['Sprzedaj 30 figurek', 'Sell 30 figurines'], h: ['Pojawił się panel Sprzedaż. Klienci kupują sami. Im niższa cena, tym więcej ich przychodzi.', 'The Sales panel is open. Customers buy on their own; a lower price brings more of them.'], p: s => [s.sold, 30] },
  { t: ['Kup drukarkę automatyczną', 'Buy an auto printer'], h: ['Uzbieraj na drukarkę i kup ją w panelu Produkcja. Będzie drukować za ciebie.', 'Save up and buy a printer in Production. It prints for you.'], p: s => [s.auto, 1] },
  { t: ['Zrealizuj pierwsze zamówienie', 'Deliver your first order'], h: ['Co jakiś czas klient zamawia większą partię. Przyjmij ją w Warsztacie i drukuj, zanim minie czas.', 'Now and then a client wants a big batch. Accept it in the Workshop and print before time runs out.'], p: s => [s.ordDone, 1] },
  { t: ['Zdobądź punkt reputacji', 'Earn a reputation point'], h: ['Reputację dają kolejne figurki. Pilnuj filamentu, a gdy zapas rośnie, obniż cenę.', 'More figurines bring reputation. Keep filament stocked and lower the price if stock piles up.'], p: s => [s.total, 500] },
  { t: ['Odblokuj pierwszy węzeł', 'Unlock your first node'], h: ['Otwórz zakładkę Rozwój. Moc obliczeniowa rośnie sama. Wydaj ją na węzeł podświetlony na pomarańczowo.', 'Open Research. Compute grows by itself; spend it on an orange node.'], p: s => [s.done.length, 1] },
  { t: ['Rozbuduj warsztat do 5 drukarek', 'Grow to 5 printers'], h: ['Więcej drukarek to więcej figurek. Uwaga na awarie: klikaj Napraw albo kup Kamerę w gałęzi Automatyka.', 'More printers, more figurines. Watch for breakdowns: hit Repair, or buy the Camera in Automation.'], p: s => [s.auto, 5] },
  { t: ['Pierwsza automatyzacja', 'First automation'], h: ['Automatyka → Auto-zakup filamentu. Koniec z ręcznym kupowaniem szpul.', 'Automation → Filament auto-buy. No more buying spools by hand.'], p: s => [+has(s, 'autobuy'), 1] },
  { t: ['Wydrukuj 10 tys. figurek', 'Print 10K figurines'], h: ['Rozdawaj punkty reputacji: procesory przyspieszają moc, pamięć podnosi jej limit dla droższych węzłów.', 'Spend reputation: processors speed up compute, memory raises its cap for pricier nodes.'], p: s => [s.total, 1e4] },
  { t: ['Algorytm cenowy', 'Pricing algorithm'], h: ['Automatyka → Dynamiczne ceny. Wymaga też Własnego sklepu z gałęzi Sprzedaż.', 'Automation → Dynamic pricing. Also needs the Own online store from Sales.'], p: s => [+has(s, 'autocena'), 1] },
  { t: ['Pierwsza farma drukarek', 'First printer farm'], h: ['Produkcja → Projekt farmy, potem zbuduj farmę w Warsztacie.', 'Production → Printer farm design, then build a farm in the Workshop.'], p: s => [s.farm, 1] },
  { t: ['Zasil farmy: 3 panele', 'Power the farms: 3 panels'], h: ['Farmy biorą prąd. Bez paneli zwalniają. Kupuj je w panelu Energia.', 'Farms draw power and slow down without panels. Buy them in Power.'], p: s => [s.panels, 3] },
  { t: ['Autonomiczny zarząd', 'Autonomous board'], h: ['Domknij gałąź Automatyka. Od tej chwili firma rośnie sama.', 'Finish the Automation branch. From then on the company grows itself.'], p: s => [+has(s, 'zarzad'), 1] },
  { t: ['Wyjdź poza Ziemię', 'Leave Earth'], h: ['Ostatni węzeł Produkcji: 40 tys. mocy, 600 tys. zł i 5 farm. Menedżer zakupów wstrzyma wtedy zakupy, żeby oszczędzać.', 'The last Production node: 40K compute, 600K funds and 5 farms. The purchasing manager pauses to save up.'], p: s => [+has(s, 'replik'), 1] },
  { t: ['Samoreplikacja', 'Self-replication'], h: ['Wydrukuj 3 drony, a potem odblokuj Samoreplikację w gałęzi Kosmos.', 'Print 3 drones, then unlock Self-replication in the Space branch.'], p: s => [+has(s, 'autobud'), 1] },
  { t: ['Przetwórz 1% pasa asteroid', 'Process 1% of the belt'], h: ['Pilnuj równowagi: drony kopią, fabryki drukują. Węzły Kosmosu mnożą oba tempa.', 'Keep balance: drones mine, factories print. Space nodes multiply both.'], p: s => [s.mat0 - s.mat, s.mat0 * 0.01] },
  { t: ['Przetwórz cały pas', 'Process the whole belt'], h: ['Ostatnia prosta.', 'The home stretch.'], p: s => [s.mat0 - s.mat, s.mat0] },
];
