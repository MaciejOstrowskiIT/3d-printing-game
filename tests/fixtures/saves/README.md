# Save compatibility fixtures

These are raw saves written by the game at the listed revisions. They use a fixed snapshot timestamp and deterministic randomness for repeatability. Keep old fixtures as they were originally saved so the migration tests can catch compatibility regressions.

| File | Source | Checkpoint |
|---|---|---|
| `v3.json` | `caa3242`, single-file game | Printed and sold 20 figurines, bought the first printer, and saved via the pagehide handler. The legacy format has no version field. |
| `v4.json` | `80751c4` | Printed for 35 seconds, bought the first printer and saved after a production tick. |
| `v5.json` | `4e447f8` | Bot run with a bust selected and a manual print in progress. |
| `v6.json` | `ecd30b3` | Bot run with two auto printers assigned to a secondary keychain model using the old fleet actions. |
| `v7.json` | `8627280` | Bot run at the ninth goal with the keychain selected. |
| `mid-space.json` | `8627280` | Bot run around halfway through the asteroid belt. |
| `after-prestige.json` | `8627280` | One tick into the new line after the bot completed the asteroid belt and took prestige. |
