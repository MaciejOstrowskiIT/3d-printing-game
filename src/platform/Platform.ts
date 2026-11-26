/** Everything that depends on where the game runs. Locally: localStorage. On a portal: the Poki or CrazyGames SDK.
 *  The game only knows this interface, so supporting a new portal means a new file in platform/, with no changes to core or UI. */
export interface Platform {
  name: string;
  loadGame(): string | null;
  saveGame(json: string): void;
  loadPrefs(): string | null;
  savePrefs(json: string): void;
  /** Rewarded ad. Resolves to true when the player watched it to the end. */
  showRewardedAd(): Promise<boolean>;
  /** Analytics event (goals, orders, liftoff). */
  track(event: string, data?: Record<string, unknown>): void;
  /** Portal signals: gameplay started or stopped. */
  gameplayStart(): void;
  gameplayStop(): void;
}
