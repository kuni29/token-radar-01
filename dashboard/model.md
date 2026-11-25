# Token Radar — the model (radar-5)

One snapshot of the protocol universe goes in; a ranked board of protocols that have not
launched a token yet comes out. The board's claim is a launch value for each of them, and the
value follows from the snapshot's own figures: the protocol's TVL, its seven-day growth, and
how long it has run with no token.

    implied value = TVL × peer multiple × size factor × growth factor × maturity factor

- **TVL** — the protocol's total value locked in the snapshot, in USD. The base everything
  else scales.
- **Peer multiple** — the multiple of TVL the market pays for protocols in the same category
  whose token already trades, read at one common size (see the fit below). Clamped to
  [0.03, 2]. A protocol whose category has no tokenised peer is priced at the market-wide
  multiple instead, and its row says so.
- **Size factor** — `(TVL / reference TVL) ^ gamma`, clamped to [0.1, 10], where the reference
  TVL is the median tokenised TVL ($32,575,274 on this snapshot) and gamma is the fitted size
  slope (−0.4848 here). The market pays fewer dollars of value per TVL dollar as a protocol
  grows; the factor is ×1 at the reference size, below it for the giants, above it for the
  small.
- **Growth factor** — `1 + 0.5 × clamp(seven-day TVL change, −60%, +150%) / 100`, and 1 when
  the snapshot records no change. A protocol that grew 20% in the last week is priced a tenth
  higher than an identical one standing still; one shrinking 20% is priced a tenth lower.
- **Maturity factor** — `0.6 + 0.4 × min(days since first tracked, 1095) / 1095`, and 0.6 when
  no listing date is recorded. Three years of running with no token is the span over which
  the factor rises from ×0.6 to ×1: the longer a protocol has operated without launching, the
  more of its peer value a launch is priced to realise.

## The fit

The peer multiple and the size factor are one joint fit, not two separate statistics. Over
the snapshot's 128 protocols whose token already trades, the model fits a single pricing
line in log-log terms,

    log market cap = intercept + slope × log TVL + category offset,

by alternating two steps until they agree: the line is refit on offset-adjusted caps, and
each category's offset is reset to the median of its residuals, pulled toward the market-wide
line by the category's sample size (offset × n / (n + 10)), so a category with two members
cannot shout over one with forty. On this snapshot the fitted slope is 0.5152, which is where
gamma comes from (gamma = slope − 1), and the market-wide multiple at the reference size is
×0.35.

The growth and maturity factors sit inside the same fit, not pasted on top. Every peer's
market cap is first divided by its own growth and maturity factors, so the line and the
offsets price what a protocol is worth standing still and newly listed; a protocol being
priced then has its own two factors multiplied back. Nothing anywhere is priced from a list
of names: change the snapshot and every figure on the board moves.

Why peers are read at a common size before categories are compared: a category whose
protocols are mostly large has already paid the size discount inside its own raw median, so
charging the size factor again would discount it twice (and a category of small protocols
would be credited twice the other way). The joint fit removes that double count.

## The evidence stays separate

Protocols whose token already trades are never ranked. They are the pricing evidence: the
dashboard shows them apart, with the market's own values, under the board. The ranked board
covers every slug on the snapshot's watchlist and every other rankable pre-token protocol in
the snapshot — the whole pre-token field above the $50M floor, not a top slice of it. The
filters that keep the board to protocols (no wrapped or staked products of another protocol,
no versioned pools, no exchange house tokens, nothing whose token already trades) are listed
in the program's source, and every figure on the board follows from the snapshot's own
fields.

## Validation, stated honestly

The check is leave-one-out, run by the program on every run and stated on the dashboard:
each of the 128 tokenised protocols is priced as if it were pre-token, from a fit that
excludes it, and the price is compared with the market cap the market actually gave it.

- **radar-5 (this model):** median miss ×3.51; 32.0% of protocols priced within ×2.
- **radar-4 (the previous model — the same joint fit with no growth or maturity terms):**
  median miss ×3.34; 33.6% within ×2. Radar-5's flat comparison run — the same check with
  the two factors switched off — reproduces those figures exactly, as it should.
- Priced term by term on the same check, the growth factor alone would slightly improve the
  median (to about ×3.29) and the maturity factor alone would cost a little (to about
  ×3.46). Together they cost a little accuracy against today's pricing of comparable
  protocols.

The two factors stay anyway, deliberately. The check measures fit to the market's current
pricing of tokenised protocols; the board's claim is what a launch would be worth, and a
price that ignores a protocol's growth and its years of running with no token is not that
claim. The miss itself is mostly not the model's error to fix: token prices carry float,
unlock schedules and speculation that no field of the snapshot records, which is why no
setting of these constants brings the median miss near ×1. That is also why every row
carries a confidence score — how much of the model's evidence the protocol's own record
carries (peer sample depth, length of record, whether its week of growth is recorded, its
size) — and why the values should be read as the centre of a wide range, not as targets.

## The rest of the board

Each row also carries a farm plan: the steps a farmer would work through, with each step's
cost and duration stated in the step itself, and the estimated community pool — the model's
own stated assumption that a launch at the implied value allocates 5 to 10 per cent to its
community. The pool is an assumption, labelled as one; it is not a promise by any protocol.

The full pricing computation ships inside this dashboard's own source as `pricing.js`: the
same fit, the same factors, the same leave-one-out check, runnable against the snapshot's
evidence table embedded in that file. The program that builds the board (`lib/model.ts` in
the repository) implements the identical model; the dossier's dashboard source is where the
computation can be inspected without running anything.
