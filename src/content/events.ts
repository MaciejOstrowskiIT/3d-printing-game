import type { GameState } from '../core/state';

/** Market events: short, random swings in the garage-to-liftoff stretch so the wait for the next purchase has decisions in it.
 *  Texts live here (PL/EN pairs) rather than in i18n/, so adding an event touches one file. {0} = the offer's price. */

export type Pair = [pl: string, en: string];

/** What an event costs if the player takes it: N seconds of sales income, so it stays relevant at any stage.
 *  (Paying in figurines does not work: dynamic pricing keeps stock near zero.) */
export interface Offer {
  seconds: number;
  /** Button label. */
  btn: Pair;
}

export interface MarketEvent {
  id: string;
  name: Pair;
  /** Shown while the event is offered or running. */
  desc: Pair;
  /** Relative chance to be picked. */
  weight: number;
  /** Effect length in seconds (0 for instant effects). */
  seconds: number;
  /** Multipliers while the effect runs. */
  demand?: number;
  spool?: number;
  /** Instant reward on accept: spools of filament at the event's price. */
  spools?: number;
  /** Optional choice. Without one, the effect starts right away. */
  offer?: Offer;
  /** true: the effect starts at once and accepting the offer cancels it (bad news you can pay to avoid). */
  counter?: boolean;
  /** Extra condition to be picked. */
  when?: (s: GameState) => boolean;
}

export const MARKET_EVENTS: MarketEvent[] = [
  {
    id: 'holiday', weight: 3, seconds: 75, demand: 2,
    name: ['Gorączka świąteczna', 'Holiday rush'],
    desc: ['Wszyscy szukają prezentów. Popyt ×2. Dobry moment, żeby mieć towar na stanie.', 'Everyone is shopping for gifts. Demand ×2. A good time to have stock.'],
  },
  {
    id: 'viral', weight: 1, seconds: 30, demand: 3,
    name: ['Wiralowy filmik', 'Viral video'],
    desc: ['Ktoś nagrał twoją figurkę i film obiegł sieć. Popyt ×3, ale tylko przez chwilę.', 'Someone filmed your figurine and it went viral. Demand ×3, but not for long.'],
  },
  {
    id: 'shortage', weight: 2, seconds: 90, spool: 1.4,
    name: ['Kłopoty u dostawcy', 'Supplier trouble'],
    desc: ['Fabryka filamentu stoi. Szpule drożeją o 40%. Kupuj tylko tyle, ile musisz.', 'The filament plant is down. Spools cost 40% more. Buy only what you need.'],
  },
  {
    id: 'clearance', weight: 2, seconds: 0, spools: 5,
    name: ['Wyprzedaż magazynu', 'Warehouse clearance'],
    desc: ['Hurtownia czyści magazyn: 5 szpul PLA za pół ceny, płacisz {0}.', 'A wholesaler is clearing stock: 5 spools of PLA at half price, for {0}.'],
    offer: { seconds: 0, btn: ['Kupuję', 'Buy'] },
  },
  {
    id: 'influencer', weight: 2, seconds: 120, demand: 1.8,
    name: ['Influencerka pisze', 'An influencer writes in'],
    desc: ['Pokaże twoje figurki, jeśli opłacisz próbki i wysyłkę ({0}). Potem popyt ×1,8 przez 2 minuty.', 'She will feature your figurines if you cover samples and shipping ({0}). Then demand ×1.8 for 2 minutes.'],
    offer: { seconds: 25, btn: ['Wyślij próbki', 'Send samples'] },
  },
  {
    id: 'dumping', weight: 2, seconds: 80, demand: 0.6, counter: true,
    name: ['Konkurencja tnie ceny', 'A competitor undercuts you'],
    desc: ['Popyt spada o 40%. Kontrkampania za {0} zatrzyma odpływ klientów.', 'Demand drops by 40%. A counter-campaign for {0} stops the bleeding.'],
    offer: { seconds: 20, btn: ['Kontrkampania', 'Counter-campaign'] },
    when: s => s.goal >= 5,
  },
  {
    id: 'expo', weight: 1, seconds: 180, demand: 1.5,
    name: ['Targi druku 3D', '3D printing expo'],
    desc: ['Stoisko na targach kosztuje {0}. Popyt ×1,5 przez 3 minuty.', 'A booth at the expo costs {0}. Demand ×1.5 for 3 minutes.'],
    offer: { seconds: 45, btn: ['Wynajmij stoisko', 'Rent a booth'] },
    when: s => s.goal >= 6,
  },
  {
    id: 'makerMeetup', weight: 1, seconds: 90, demand: 1.35,
    name: ['Zlot majsterkowiczów', 'Maker meetup'],
    desc: ['Uczestnicy zlotu kupują lokalne wydruki. Popyt ×1,35.', 'Meetup visitors are buying local prints. Demand ×1.35.'],
  },
  {
    id: 'filamentSurplus', weight: 1, seconds: 100, spool: 0.85,
    name: ['Nadwyżka filamentu', 'Filament surplus'],
    desc: ['Dostawca zwalnia miejsce na nową dostawę. Szpule tanieją o 15%.', 'The supplier is making room for a new shipment. Spools are 15% cheaper.'],
  },
  {
    id: 'postalDelay', weight: 1, seconds: 60, demand: 0.85,
    name: ['Opóźnione przesyłki', 'Shipping delays'],
    desc: ['Klienci odkładają zakupy, aż przesyłki znów będą dochodzić na czas. Popyt spada o 15%.', 'Customers hold off until deliveries are back on schedule. Demand drops by 15%.'],
    when: s => s.goal >= 5,
  },
  {
    id: 'giftGuide', weight: 1, seconds: 90, demand: 1.5,
    name: ['Poradnik prezentowy', 'Gift guide'],
    desc: ['Za {0} twoje wydruki trafią do poradnika prezentowego. Popyt ×1,5 przez 90 sekund.', 'For {0}, your prints get a spot in a gift guide. Demand ×1.5 for 90 seconds.'],
    offer: { seconds: 18, btn: ['Wykup miejsce', 'Book a spot'] },
    when: s => s.goal >= 5,
  },
  {
    id: 'carrierSurcharge', weight: 1, seconds: 75, spool: 1.2, counter: true,
    name: ['Dopłata za transport', 'Freight surcharge'],
    desc: ['Szpule drożeją o 20%. Zmień przewoźnika za {0}, aby znieść dopłatę.', 'Spools cost 20% more. Switch carriers for {0} to remove the surcharge.'],
    offer: { seconds: 12, btn: ['Zmień przewoźnika', 'Switch carriers'] },
    when: s => s.goal >= 6,
  },
  {
    id: 'sampleStock', weight: 1, seconds: 0, spools: 2,
    name: ['Szpule pokazowe', 'Demo spools'],
    desc: ['Dostawca sprzedaje dwie pokazowe szpule PLA za pół ceny. Zapłacisz {0}.', 'The supplier has two demo spools of PLA at half price, for {0}.'],
    offer: { seconds: 0, btn: ['Kup szpule', 'Buy spools'] },
  },
];

export const MARKET_EVENT: Record<string, MarketEvent> = Object.fromEntries(MARKET_EVENTS.map(e => [e.id, e]));
