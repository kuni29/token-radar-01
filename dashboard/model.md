# Token Radar: the model (radar-4)

The board ranks every protocol in the sealed DefiLlama snapshot that records no token and is not a
wrapped, staked, bridged or versioned product of one that trades: the snapshot's 40-protocol
watchlist is the floor, and the other 158 rows are pre-token protocols below that floor, found by
applying the watchlist's own exclusion rules at every size. Protocols whose token already trades
are never ranked; they are the evidence the board is priced from, and the page shows 24 of them
apart, with the market's own values.

## How an implied value is built

implied value = TVL x peer multiple x size factor

The two factors are one fit, not two. Over the snapshot's 128 tokenised protocols the model fits
a single pricing line with one offset per category:

log market cap = intercept + slope x log TVL + category offset

The line and the offsets are fitted together, alternating until they agree: the line is refit on
offset-adjusted market caps, and each category's offset is reset to the median of its residuals,
pulled toward zero (the market-wide line) by the category's sample size, offset x n / (n + 10).
Stated as the board's factors, with gamma = slope - 1 and the reference TVL the median tokenised
TVL:

- Peer multiple: exp(intercept + category offset + gamma x log reference TVL), clamped to
  [0.03, 2]. It is the multiple the protocol's own category prices at when every peer is read at
  one common size. A category with no tokenised protocol is priced at the market-wide line's own
  multiple at the reference size. On this snapshot the line's slope is 0.50 (gamma -0.50), the
  reference TVL is $32,575,274, and the market-wide multiple at that size is x0.26.
- Size factor: (TVL / reference TVL) ^ gamma, clamped to [0.1, 10]: x1 at the reference TVL,
  about x0.11 for a $2.75B protocol and about x2.5 for a $5M one. The market pays fewer dollars
  per TVL dollar the larger a protocol grows.

Why one fit: the previous model (radar-3) took each category's median raw market-cap / TVL,
shrunk toward the global median, and then applied a separately fitted size factor. A category
whose protocols are mostly large had already paid the size discount inside its own median, so
the size factor charged it twice; a category of small protocols was credited twice the other
way. Reading every peer at the reference size before comparing categories removes the double
count, and the check below shows it was the largest single error left in radar-3: bridge and
RWA categories, systematically underpriced before, are now priced at a median miss of about x3
and x1.4 respectively.

What the fit deliberately leaves out: radar-3 also multiplied by a seven-day growth factor, a
maturity factor (age with no token) and a breadth factor (chain count). Once size and category
are fitted jointly, the leave-one-out residuals correlate with the seven-day change at about
+0.16 and with age and chain count at about zero, and no weighting of those terms improves the
check, so they no longer move a price. Age, chains and the seven-day change are still shown on
every row, and age and record completeness still feed the confidence score; they just do not
price anything.

Every figure is computed from the snapshot's own fields by the functions marketFit and
impliedValue; no protocol name is special-cased anywhere. Each row also carries a confidence
(how much of the model's evidence the protocol's own record carries: a reported seven-day
change, a tracking date, TVL depth, chain count, peer sample size) and an estimated farmer pool
of 5 to 10 per cent of the implied value, stated as the model's own assumption about a launch's
community allocation.

## How the model was checked

There is no ground truth for a launch that has not happened, so the model is checked against the
only pricing the snapshot does record: the market caps of its tokenised protocols. The check is
leave-one-out: for each of the 128 tokenised protocols, rebuild the joint fit without it, price
it as if it were pre-token, and compare with the market cap the market actually gave it. The
program runs this check on every run (validateModel) and the dashboard states its result:

- radar-4 as shipped: median miss x3.34, 33.6 per cent of the 128 priced within x2.
- The same fit with the size curve switched off (slope pinned at 1): median miss x4.93,
  26.6 per cent within x2.
- The previous model (radar-3: separate median multiples and size factor, growth, maturity and
  breadth factors): median miss x4.15, 30.5 per cent within x2, measured the same way.
- The model before that (radar-2: flat multiple, no size curve): median miss x5.30,
  21 per cent within x2.

The joint fit is worth about a fifth off the typical miss against radar-3. What the check cannot
remove is also stated plainly: token prices carry float, unlock schedules and speculation that
no field of the snapshot records, so a median miss above x3 against live market prices is what
an honest snapshot-only model looks like. That is why the board ranks by the model but shows its
working, and its confidence, on every row.

## Farm plans

Each row's plan is eight steps built from the protocol's own record by farmSteps: a fresh wallet,
the category's core action with a capital sized to the protocol's TVL, a second surface that
separates a user from a one-click deposit, a weekly qualifying action, a hold matched to the
protocol's age, a monthly standing check, a log with an exit rule, and a budget step that totals
the plan from its own figures: the capital, plus the network fees the earlier steps' chain gas
ranges add up to over the hold. Costs and times are stated in every step, in board.json and on
the page in the same words.
