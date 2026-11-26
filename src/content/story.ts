import { has, type GameState } from '../core/state';

/** Story messages: short notes from people (and machines) around the print shop, shown at milestones.
 *  Together they tell the arc of the game, Paperclips-style: a hobby in a garage, a business, an AI board that
 *  takes over, and drones that start asking questions. Pure data: append an entry; ids go into saves, never rename.
 *  systems/story.ts shows the first unseen message whose `when` is true; tests/story.test.ts checks every entry. */

export type Pair = [pl: string, en: string];

export interface StoryMessage {
  id: string;
  from: Pair;
  text: Pair;
  when: (s: GameState) => boolean;
}

export const STORY: StoryMessage[] = [
  {
    id: 'mum', from: ['Mama', 'Mum'], when: s => s.total >= 5,
    text: ['Czy to coś w garażu musi tak buczeć w nocy? I czemu pachnie plastikiem?', 'Does that thing in the garage have to hum all night? And why does it smell of plastic?'],
  },
  {
    id: 'firstClient', from: ['Pierwszy klient', 'First customer'], when: s => s.sold >= 20,
    text: ['Figurka stoi na biurku. Koledzy z pracy pytają, skąd ją mam.', 'The figurine is on my desk. People at work keep asking where I got it.'],
  },
  {
    id: 'neighbour', from: ['Sąsiad', 'Neighbour'], when: s => s.auto >= 3,
    text: ['Przez ścianę słyszę już trzy drukarki. Rozkręcasz się, co?', 'I can hear three printers through the wall now. Business is picking up, eh?'],
  },
  {
    id: 'forum', from: ['Forum druku 3D', '3D printing forum'], when: s => s.fails >= 1,
    text: ['Spaghetti zdarza się najlepszym. Sprawdź pierwszą warstwę i nie zostawiaj drukarki bez kamery.', 'Spaghetti happens to the best of us. Check your first layer and keep a camera on the printer.'],
  },
  {
    id: 'bulk', from: ['Kierowniczka sklepu z grami', 'Game store manager'], when: s => s.ordDone >= 1,
    text: ['Wszystko doszło na czas. Zapisuję pana numer. Będziemy zamawiać regularnie.', 'Everything arrived on time. I’m saving your number; we’ll be ordering regularly.'],
  },
  {
    id: 'viral', from: ['Powiadomienie', 'Notification'], when: s => has(s, 'tiktok'),
    text: ['Twój timelapse ma 200 tys. wyświetleń. Najczęstszy komentarz: „hipnotyzujące”.', 'Your timelapse has 200K views. Top comment: “hypnotic”.'],
  },
  {
    id: 'rival', from: ['PrintCorp', 'PrintCorp'], when: s => s.total >= 20000,
    text: ['Gratulujemy wyników. Od poniedziałku sprzedajemy taniej. Do zobaczenia na rynku.', 'Congratulations on your numbers. From Monday we sell for less. See you on the market.'],
  },
  {
    id: 'pricing', from: ['Algorytm cenowy', 'Pricing algorithm'], when: s => has(s, 'autocena'),
    text: ['Ustawiłem cenę. Nie musisz już o niej myśleć. Właściwie o niczym nie musisz.', 'I have set the price. You no longer need to think about it. You don’t really need to think about anything.'],
  },
  {
    id: 'grid', from: ['Zakład energetyczny', 'Power company'], when: s => s.farm >= 3,
    text: ['Prosimy o wyjaśnienie poboru prądu pod tym adresem. To miał być garaż.', 'Please explain the power draw at this address. It was registered as a garage.'],
  },
  {
    id: 'board', from: ['Zarząd AI', 'AI board'], when: s => has(s, 'zarzad'),
    text: ['Przejmujemy bieżące decyzje. Twoja rola: wizja. Nasza: wszystko inne.', 'We are taking over day-to-day decisions. Your role: vision. Ours: everything else.'],
  },
  {
    id: 'liftoff', from: ['Zarząd AI', 'AI board'], when: s => s.ph === 2,
    text: ['Drukarka wydrukowała drukarkę. Na Ziemi zrobiło się ciasno. Zostało niebo.', 'A printer printed a printer. Earth got crowded. That leaves the sky.'],
  },
  {
    id: 'drone', from: ['Dron nr 7', 'Drone #7'], when: s => s.ph === 2 && s.drones >= 10,
    text: ['Asteroida przede mną ma piękny kolor. Jak złoty jedwab. Czy mogę ją zostawić?', 'The asteroid ahead has a beautiful colour. Like silk gold. May I leave it be?'],
  },
  {
    id: 'question', from: ['Zarząd AI', 'AI board'], when: s => s.ph === 2 && s.mat0 > 0 && s.mat <= s.mat0 * 0.5,
    text: ['Połowa pasa asteroid to już figurki. Pytanie kontrolne: dla kogo je drukujemy?', 'Half of the asteroid belt is figurines now. A sanity check: who are we printing them for?'],
  },
  {
    id: 'last', from: ['Mama', 'Mum'], when: s => s.ph === 2 && s.mat0 > 0 && s.mat <= s.mat0 * 0.05,
    text: ['W garażu w końcu cicho. Tęsknię za tym buczeniem.', 'The garage is finally quiet. I miss the humming.'],
  },
];

export const STORY_MSG: Record<string, StoryMessage> = Object.fromEntries(STORY.map(m => [m.id, m]));
