# token-radar-01 entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kuni29/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kuni29/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (model radar-3): a token launch radar built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC. The program reads a sealed snapshot of the DefiLlama protocol universe and ranks every pre-token protocol by an implied launch value priced from the market itself: each protocol's TVL is multiplied by the median market-cap / TVL of the tokenised protocols in its own category (pulled toward the global median by sample size), then adjusted by a size factor fitted from the market's own pricing (the multiple paid per TVL dollar falls as TVL grows), its seven-day growth, how long it has run with no token, and how many chains it runs on. The model is checked leave-one-out against the snapshot's own tokenised protocols on every run, and the dashboard states the result. Wrapped, staked and bridged products of tokens that already trade are excluded at every size. Every row carries a confidence score, an estimated farmer pool, and an eight-step farm plan with costs, times and a budget total; the dashboard shows the board, the model behind it, a detail view per protocol, and the live-token protocols the multiples are priced from. The full method and its validation are written up in dashboard/model.md.

## Run it

```sh
node main.ts --input <snapshot.json>   # writes board.json, data.js, dashboard/, screenshots/, dossier.json to /output (or $MAKEFUN_OUTPUT_DIR)
```

MIT, see LICENSE.
