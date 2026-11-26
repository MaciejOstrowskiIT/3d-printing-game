/** Wszystko, co zależy od miejsca uruchomienia gry. Lokalnie: localStorage. Na portalu: SDK Poki albo CrazyGames.
 *  Gra zna tylko ten interfejs, więc podmiana portalu to nowy plik w platform/, bez zmian w rdzeniu i UI. */
export interface Platform {
  name: string;
  loadGame(): string | null;
  saveGame(json: string): void;
  loadPrefs(): string | null;
  savePrefs(json: string): void;
  /** Reklama z nagrodą. Zwraca true, gdy gracz obejrzał ją do końca. */
  showRewardedAd(): Promise<boolean>;
  /** Zdarzenie analityczne (cele, zamówienia, lot w kosmos). */
  track(event: string, data?: Record<string, unknown>): void;
  /** Sygnały dla portalu: gracz zaczął albo przerwał rozgrywkę. */
  gameplayStart(): void;
  gameplayStop(): void;
}
