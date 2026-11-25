# token-radar-01 entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kuni29/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kuni29/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (model radar-5): a token launch radar built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC. The program reads a sealed snapshot of the DefiLlama protocol universe and ranks every pre-token protocol by an implied launch value priced from the market itself: one pricing line (log market cap against log TVL) with one offset per category is fitted over the snapshot's tokenised protocols, line and offsets together, so each protocol is priced by its category's multiple read at one common size, carried to its own size by the fitted size curve (the multiple paid per TVL dollar falls as TVL grows). Two further factors are fitted inside the same fit: a growth factor paying for the protocol's seven-day TVL change (weight 0.5, the change clamped between −60% and +150%) and a maturity factor rising from ×0.6 to ×1 over three years of running with no token. The model is checked leave-one-out against the snapshot's own tokenised protocols on every run, and the dashboard states the result. Wrapped, staked and bridged products of tokens that already trade are excluded at every size. Every row carries a confidence score, an estimated farmer pool, and an eight-step farm plan with costs, times and a budget total; the dashboard shows the board, the model behind it, a detail view per protocol, and the live-token protocols the multiples are priced from. The full method and its validation are written up in dashboard/model.md.

## Run it

```sh
node main.ts --input <snapshot.json>   # writes board.json, data.js, dashboard/, screenshots/, dossier.json to /output (or $MAKEFUN_OUTPUT_DIR)
```

MIT, see LICENSE.
