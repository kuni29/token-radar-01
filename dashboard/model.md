# Token Radar: the model (radar-3)

The board ranks every protocol in the sealed DefiLlama snapshot that records no token and is not a
wrapped, staked, bridged or versioned product of one that trades: the snapshot's 40-protocol
watchlist is the floor, and the other 158 rows are pre-token protocols below that floor, found by
applying the watchlist's own exclusion rules at every size. Protocols whose token already trades
are never ranked; they are the evidence the board is priced from, and the page shows 24 of them
apart, with the market's own values.

## How an implied value is built

implied value = TVL x peer multiple x size factor x growth factor x maturity factor x breadth factor

- Peer multiple: the median market-cap / TVL of the snapshot's tokenised protocols in the
  protocol's own category, pulled toward the global median by sample size
  (mult = global + (category median - global) x n / (n + 20), clamped to [0.03, 2]). A category
  with no tokenised protocol is priced at the global median.
- Size factor: (TVL / median tokenised TVL) ^ gamma, clamped to [0.2, 5]. Gamma is the slope of
  log(market-cap / TVL) on log(TVL) fitted over the snapshot's 128 tokenised protocols; on this
  snapshot gamma is -0.48 and the reference TVL is $32,575,274, so the factor is x1 there, about
  x0.2 for a $2.75B protocol and about x3.3 for a $5M one. The market pays fewer dollars per TVL
  dollar the larger a protocol grows; a flat multiple misses that entirely.
- Growth factor: 1 + clamp(change_7d, -60, 150) / 100 x 0.3, from the protocol's own seven-day
  TVL change.
- Maturity factor: 0.6 + min(age in days, 1095) / 1095 x 0.4, from how long DefiLlama has tracked
  the protocol with no token (365 days assumed when no date is recorded).
- Breadth factor: 1 + 0.02 x min(chains - 1, 5).

Every figure is computed from the snapshot's own fields by the functions peerMultiples, sizeCurve
and impliedValue; no protocol name is special-cased anywhere. Each row also carries a confidence
(how much of the model's evidence the protocol's own record carries: a reported seven-day change,
a tracking date, TVL depth, chain count, peer sample size) and an estimated farmer pool of 5 to
10 per cent of the implied value, stated as the model's own assumption about a launch's community
allocation.

## How the model was checked

There is no ground truth for a launch that has not happened, so the model is checked against the
only pricing the snapshot does record: the market caps of its tokenised protocols. The check is
leave-one-out: for each of the 128 tokenised protocols, rebuild the peer multiples and the size
curve without it, price it as if it were pre-token, and compare with the market cap the market
actually gave it. The program runs this check on every run (validateModel) and the dashboard
states its result:

- radar-3 as shipped: median miss x4.15, 30.5 per cent of the 128 priced within x2.
- The same model with the size factor switched off: median miss x5.04, 24.2 per cent within x2.
- The previous model (radar-2: flat multiple, shrinkage n / (n + 10), growth at full weight):
  median miss x5.30, 21 per cent within x2, measured the same way during development.

The size curve is the single change that moves the check; the halved growth weight and the
stronger shrinkage are kept because the check could not hear them at their old settings, not
because they promise accuracy. What the check cannot remove is also stated plainly: token prices
carry float, unlock schedules and speculation that no field of the snapshot records, so a median
miss of x4 against live market prices is what an honest snapshot-only model looks like. That is
why the board ranks by the model but shows its working, and its confidence, on every row.

## Farm plans

Each row's plan is eight steps built from the protocol's own record by farmSteps: a fresh wallet,
the category's core action with a capital sized to the protocol's TVL, a second surface that
separates a user from a one-click deposit, a weekly qualifying action, a hold matched to the
protocol's age, a monthly standing check, a log with an exit rule, and a budget step that totals
the plan from its own figures: the capital, plus the network fees the earlier steps' chain gas
ranges add up to over the hold. Costs and times are stated in every step, in board.json and on
the page in the same words.
