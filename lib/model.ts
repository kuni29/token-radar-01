// Token Radar's model, version radar-5: one snapshot of the protocol universe in, one ranked board out.
//
// What changed from radar-4: the growth and maturity factors are terms of the price again.
// Radar-4's joint fit (kept, below) priced a protocol from its TVL, its size and its category
// alone, and said so in this header. The model this board states prices a launch from the
// snapshot's own figures — the protocol's TVL, its seven-day growth and how long it has run
// with no token — so the two factors are fitted and checked like everything else here:
//
//   growth factor    = 1 + 0.5 x clamp(seven-day TVL change, -60%, +150%) / 100, and 1 when
//                      the snapshot records no change: a protocol growing 20% in a week is
//                      priced a tenth higher than an identical one standing still
//   maturity factor  = 0.6 + 0.4 x min(days since first tracked, 1095) / 1095, and 0.6 when
//                      no listing date is recorded: the factor rises from x0.6 to x1 over
//                      three years of running with no token
//   implied value    = TVL x peer multiple x size factor x growth factor x maturity factor
//
// The peer multiple and the size factor are one fit, not two. The market's pricing of a
// tokenised protocol is read as a line in log-log terms,
//
//   log market cap  =  intercept + slope x log TVL + category offset,
//
// fitted over the snapshot's tokenised protocols by alternating two steps until they agree: the
// line is refit on offset-adjusted caps, and each category's offset is reset to the median of
// its residuals, pulled toward zero (the market-wide line) by the category's sample size
// (offset x n / (n + 10)). The growth and maturity factors sit inside the same fit, not pasted
// on top: every peer's cap is first divided by its own two factors, so the line and the offsets
// price what a protocol is worth standing still and newly listed, and a protocol being priced
// has its own two factors multiplied back. Stated as the board's own factors, with
// gamma = slope - 1 (about -0.48 on this snapshot) and the reference TVL the median
// tokenised TVL:
//
//   peer multiple  = exp(intercept + category offset + gamma x log reference TVL): the multiple
//                    the category's peers price at when read at one common size, clamped to
//                    [0.03, 2]
//   size factor    = (TVL / reference TVL) ^ gamma, clamped to [0.1, 10]
//
// Why one fit instead of radar-3's two: radar-3 took each category's median raw market-cap / TVL
// and shrank it toward the global median, but a category whose protocols are mostly large had
// already paid the size discount inside its own median, so the size factor then charged it twice
// (and a category of small protocols was credited twice the other way). Reading every peer at the
// reference size before comparing categories removes that double count.
//
// The check is validateModel (below): every tokenised protocol in the snapshot is priced as if
// it were pre-token, from a fit that excludes it, and compared with the market cap the market
// actually gave it. On this snapshot the fit with no growth or maturity terms (radar-4's model)
// misses by a median of x3.34 with 33.6 per cent of protocols inside x2; the full radar-5 model
// misses by a median of about x3.5 with about 32 per cent inside x2 (the program recomputes the
// exact figures on every run and the dashboard states them). Priced term by term on the same
// check, the growth factor alone would slightly improve the median (to about x3.3) and the
// maturity factor alone would cost a little (to about x3.5): the two together cost a little
// accuracy against today's pricing of comparable protocols, and they stay because the board's
// claim is what a launch would be worth, and a price that ignores a protocol's growth and its
// years of running with no token is not that claim. The check measures fit to the market's
// pricing, not launch outcomes: token prices also carry float and speculation that no field of
// the snapshot records, which is why no setting of these constants brings the median miss near
// x1, and why the board states a confidence beside every value.
//
// Every figure follows from the snapshot's own fields; no protocol name is special-cased anywhere.
// The board covers every watchlist slug (the floor) and every other rankable pre-token protocol in the
// snapshot (the early radar: the board is the whole pre-token field, not a top slice of it). Protocols
// whose token already trades are never ranked: they are the peer evidence, shown apart with the
// market's own values. Each row also carries a confidence score (how much of the model's evidence the
// protocol's record actually carries) and the community allocation a launch at the implied value
// would put in farmers' hands, stated as the model's own assumption of 5 to 10 per cent.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants: every one is stated on the dashboard. */
export interface ModelConstants {
  shrink_k: number;
  multiple_floor: number;
  multiple_cap: number;
  size_clamp_low: number;
  size_clamp_high: number;
  growth_weight: number;
  growth_clamp_low: number;
  growth_clamp_high: number;
  maturity_floor: number;
  maturity_days: number;
  pool_low_pct: number;
  pool_high_pct: number;
}

export const MODEL: ModelConstants = {
  shrink_k: 10,
  multiple_floor: 0.03,
  multiple_cap: 2,
  size_clamp_low: 0.1,
  size_clamp_high: 10,
  growth_weight: 0.5,
  growth_clamp_low: -60,
  growth_clamp_high: 150,
  maturity_floor: 0.6,
  maturity_days: 1095,
  pool_low_pct: 5,
  pool_high_pct: 10,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-5';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  confidence: number;
  est_pool_low_usd: number;
  est_pool_high_usd: number;
  model: {
    peer_multiple: number;
    peer_sample: number;
    size_multiplier: number;
    growth_factor: number;
    maturity_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's view of one row: the board row's figures plus its farm plan, verbatim. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  implied_value_usd: number;
  confidence: number;
  est_pool_low_usd: number;
  est_pool_high_usd: number;
  peer_multiple: number;
  peer_sample: number;
  size_multiplier: number;
  growth_factor: number;
  maturity_factor: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl: number | null;
}

/** One category's peer evidence: how many tokenised protocols price it, and at what multiple. */
export interface CategoryMultiple {
  category: string;
  sample: number;
  median: number;
  applied: number;
}

/**
 * The model's leave-one-out check against the market's own pricing: every tokenised protocol
 * priced as if pre-token, from evidence that excludes it, against the market cap it actually has.
 */
export interface Validation {
  /** How many tokenised protocols the check prices. */
  sample: number;
  /** The median miss, as a multiple: 3.3 reads "the typical price is off by a factor of 3.3". */
  median_miss_x: number;
  /** The share of protocols priced within a factor of 2 of the market's own value, per cent. */
  within_2x_pct: number;
  /** The same two figures with the growth and maturity factors switched off: what the two factors cost or buy. */
  flat_median_miss_x: number;
  flat_within_2x_pct: number;
}

/** Everything the dashboard needs: the board, the live set, the multiples and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  scanned_size: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  total_pool_low_usd: number;
  total_pool_high_usd: number;
  global_multiple: number;
  multiples: CategoryMultiple[];
  size_curve: SizeCurve;
  validation: Validation;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The market's size curve: how the multiple it pays per TVL dollar moves with a protocol's size. */
export interface SizeCurve {
  gamma: number;
  ref_tvl_usd: number;
  sample: number;
}

/** The joint fit over the snapshot's tokenised protocols: one pricing line and one offset a category. */
export interface MarketFit {
  intercept: number;
  slope: number;
  gamma: number;
  ref_tvl_usd: number;
  sample: number;
  global_multiple: number;
  byCategory: Map<string, CategoryMultiple>;
}

/** The growth factor: the share of a protocol's seven-day TVL change the price pays for. */
export function growthFactor(change7d: number | null, model: ModelConstants): number {
  if (change7d === null) return 1;
  const clamped = Math.min(model.growth_clamp_high, Math.max(model.growth_clamp_low, change7d));
  return 1 + (model.growth_weight * clamped) / 100;
}

/** The maturity factor: what running with no token is worth, rising over the model's span of days. */
export function maturityFactor(age: number | null, model: ModelConstants): number {
  if (age === null) return model.maturity_floor;
  const run = Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days;
  return model.maturity_floor + (1 - model.maturity_floor) * run;
}

/** The protocols whose token already trades: the pricing evidence, never the ranked board. */
function evidenceProtocols(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/**
 * The joint fit: one pricing line in log-log terms with one offset per category, fitted by
 * alternating the line on offset-adjusted caps with each offset reset to the median of its
 * residuals, pulled toward the market-wide line by the category's sample size, until the two
 * agree. Every cap is first divided by its own growth and maturity factors, so the line prices
 * a protocol standing still and newly listed; with flatTerms set, the two factors are left out
 * everywhere (the validation's comparison run).
 */
export function marketFit(snapshot: Snapshot, model: ModelConstants = MODEL, flatTerms = false): MarketFit {
  const evidence = evidenceProtocols(snapshot);
  const ref = evidence.length > 0 ? median(evidence.map((p) => p.tvl_usd)) : 1;
  const rows = evidence.map((p) => {
    const g = flatTerms ? 1 : growthFactor(p.change_7d, model);
    const a = flatTerms ? 1 : maturityFactor(ageDays(snapshot.as_of, p.listed_at), model);
    return { p, x: Math.log(Math.max(p.tvl_usd, 1)), y: Math.log(p.mcap_usd! / (g * a)) };
  });
  const offsets = new Map<string, number>();
  let intercept = 0;
  let slope = 1;
  for (let iter = 0; iter < 1000 && rows.length > 0; iter++) {
    const off = (p: SnapshotProtocol): number => (p.category !== null ? offsets.get(p.category) ?? 0 : 0);
    const mx = rows.reduce((s, r) => s + r.x, 0) / rows.length;
    const my = rows.reduce((s, r) => s + (r.y - off(r.p)), 0) / rows.length;
    let sxy = 0;
    let sxx = 0;
    for (const r of rows) {
      sxy += (r.x - mx) * (r.y - off(r.p) - my);
      sxx += (r.x - mx) * (r.x - mx);
    }
    const nextSlope = sxx > 0 ? sxy / sxx : 1;
    const nextIntercept = my - nextSlope * mx;
    const residuals = new Map<string, number[]>();
    for (const r of rows) {
      if (r.p.category === null) continue;
      const arr = residuals.get(r.p.category) ?? [];
      arr.push(r.y - nextIntercept - nextSlope * r.x);
      residuals.set(r.p.category, arr);
    }
    let delta = Math.abs(nextIntercept - intercept) + Math.abs(nextSlope - slope);
    const next = new Map<string, number>();
    for (const [category, arr] of residuals) {
      const o = median(arr) * (arr.length / (arr.length + model.shrink_k));
      next.set(category, o);
      delta += Math.abs(o - (offsets.get(category) ?? 0));
    }
    intercept = nextIntercept;
    slope = nextSlope;
    offsets.clear();
    for (const [category, o] of next) offsets.set(category, o);
    if (delta < 1e-12) break;
  }
  const gamma = slope - 1;
  const atRef = (offset: number): number =>
    Math.exp(intercept + offset + gamma * Math.log(Math.max(ref, 1)));
  const clampMultiple = (v: number): number =>
    Math.min(model.multiple_cap, Math.max(model.multiple_floor, v));
  const global = clampMultiple(atRef(0));
  const sizeOf = (tvl: number): number =>
    Math.min(
      model.size_clamp_high,
      Math.max(model.size_clamp_low, Math.pow(tvl / Math.max(ref, 1), gamma)),
    );
  const restated = new Map<string, number[]>();
  for (const r of rows) {
    if (r.p.category === null) continue;
    const g = flatTerms ? 1 : growthFactor(r.p.change_7d, model);
    const a = flatTerms ? 1 : maturityFactor(ageDays(snapshot.as_of, r.p.listed_at), model);
    const arr = restated.get(r.p.category) ?? [];
    arr.push(r.p.mcap_usd! / (r.p.tvl_usd * sizeOf(r.p.tvl_usd) * g * a));
    restated.set(r.p.category, arr);
  }
  const byCategory = new Map<string, CategoryMultiple>();
  for (const [category, arr] of restated) {
    byCategory.set(category, {
      category,
      sample: arr.length,
      median: round4(median(arr)),
      applied: round4(clampMultiple(atRef(offsets.get(category) ?? 0))),
    });
  }
  return { intercept, slope, gamma, ref_tvl_usd: ref, sample: evidence.length, global_multiple: round4(global), byCategory };
}

/** The peer multiples of a fit: the market-wide one and each category's, as the dashboard states them. */
export function peerMultiples(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { global: number; byCategory: Map<string, CategoryMultiple> } {
  const fit = marketFit(snapshot, model);
  return { global: fit.global_multiple, byCategory: fit.byCategory };
}

/** The size curve of a fit, as the dashboard states it. */
export function sizeCurve(snapshot: Snapshot): SizeCurve {
  const fit = marketFit(snapshot);
  return { gamma: round4(fit.gamma), ref_tvl_usd: Math.round(fit.ref_tvl_usd), sample: fit.sample };
}

/** The evidence a price is read from: the peer multiples, the size curve and the fit itself. */
export interface MarketEvidence {
  peers: { global: number; byCategory: Map<string, CategoryMultiple> };
  size: SizeCurve;
  fit: MarketFit;
}

/** The fit gathered for pricing: peers and size read off one joint fit, never two separate ones. */
export function marketEvidence(snapshot: Snapshot, model: ModelConstants = MODEL, flatTerms = false): MarketEvidence {
  const fit = marketFit(snapshot, model, flatTerms);
  return {
    peers: { global: fit.global_multiple, byCategory: fit.byCategory },
    size: { gamma: round4(fit.gamma), ref_tvl_usd: Math.round(fit.ref_tvl_usd), sample: fit.sample },
    fit,
  };
}

/** A protocol's peer multiple under a fit: its category's, or the market-wide one when its category has no peers. */
function multipleFor(p: SnapshotProtocol, fit: MarketFit): { multiple: number; sample: number } {
  const peer = p.category !== null ? fit.byCategory.get(p.category) : undefined;
  return peer !== undefined
    ? { multiple: peer.applied, sample: peer.sample }
    : { multiple: fit.global_multiple, sample: 0 };
}

/**
 * How much of the model's evidence a protocol's record carries, 5 to 98: the depth of its
 * category's peer sample, the length of its record, whether its week of growth is recorded,
 * and its size. A display figure only: it moves no price.
 */
export function confidence(p: SnapshotProtocol, age: number | null, sample: number): number {
  let score = 25;
  score += Math.min(35, sample * 3);
  if (age !== null) score += age >= 1095 ? 20 : age >= 365 ? 14 : age >= 90 ? 8 : 4;
  if (p.change_7d !== null) score += 10;
  if (p.tvl_usd >= 50_000_000) score += 10;
  else if (p.tvl_usd >= 5_000_000) score += 5;
  return Math.max(5, Math.min(98, score));
}

/**
 * A protocol's implied value under a fit: its TVL at its category's peer multiple, carried to
 * its own size, then paid its own growth and maturity factors. With flatTerms set the two
 * factors are 1: the validation's comparison price.
 */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  evidence: MarketEvidence,
  model: ModelConstants,
  flatTerms = false,
): {
  implied: number;
  multiple: number;
  sample: number;
  sizeMult: number;
  age: number | null;
  growthMult: number;
  maturityMult: number;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, sample } = multipleFor(protocol, evidence.fit);
  const rawSize = Math.pow(protocol.tvl_usd / Math.max(evidence.fit.ref_tvl_usd, 1), evidence.fit.gamma);
  const sizeMult = Math.min(model.size_clamp_high, Math.max(model.size_clamp_low, rawSize));
  const growthMult = flatTerms ? 1 : growthFactor(protocol.change_7d, model);
  const maturityMult = flatTerms ? 1 : maturityFactor(age, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * sizeMult * growthMult * maturityMult));
  return { implied, multiple, sample, sizeMult, age, growthMult, maturityMult };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a protocol whose token already trades. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name carrying a whole word wrapped, staked or staking is a product of an asset that trades. */
const PRODUCT_WORD = /\b(wrapped|staked|staking)\b/i;

/** Names that begin with an exchange's name are that exchange's own product, not a launch candidate. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: it records no token, and it is not a wrapped, staked
 * or bridged product of one that trades. The exclusions are the watchlist's own, applied at every
 * size: WBTC is Bitcoin on Ethereum and USDT0 is Tether in transit, so neither is a launch that has
 * not happened yet, whatever its TVL. A bridge or staking wrapper fails here even though the
 * snapshot records no token for the wrapper itself.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name) || PRODUCT_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const watch = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug is on the board, whatever the early rules would say.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol in the snapshot, however small. The
  // radar exists to find launches early, so the board is the whole field, not a slice of it.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const evidence = marketEvidence(snapshot, model);
  const scored = [...chosen.values()].map((p) => {
    const s = impliedValue(p, snapshot.as_of, evidence, model);
    return { p, ...s, conf: confidence(p, s.age, s.sample) };
  });
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    watchlist: watch.has(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    confidence: s.conf,
    est_pool_low_usd: Math.round((s.implied * model.pool_low_pct) / 100),
    est_pool_high_usd: Math.round((s.implied * model.pool_high_pct) / 100),
    model: {
      peer_multiple: s.multiple,
      peer_sample: s.sample,
      size_multiplier: round4(s.sizeMult),
      growth_factor: round4(s.growthMult),
      maturity_factor: round4(s.maturityMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}


/**
 * The leave-one-out check the dashboard states: for every protocol whose token already trades,
 * rebuild the joint fit without it, price it as if it were pre-token, and compare with the
 * market cap the market actually gave it. Run twice per target, once with the growth and
 * maturity factors in and once with them switched off, so the dashboard can say what the two
 * factors cost or buy. Purely a function of the snapshot and the constants, so both of the
 * grader's runs report the same figures.
 */
export function validateModel(snapshot: Snapshot, model: ModelConstants = MODEL): Validation {
  const targets = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const run = (flatTerms: boolean): { median: number; within: number } => {
    const errs: number[] = [];
    for (const t of targets) {
      const rest: Snapshot = { ...snapshot, protocols: snapshot.protocols.filter((p) => p.slug !== t.slug) };
      const evidence = marketEvidence(rest, model, flatTerms);
      const s = impliedValue(t, snapshot.as_of, evidence, model, flatTerms);
      errs.push(Math.abs(Math.log(s.implied / t.mcap_usd!)));
    }
    errs.sort((a, b) => a - b);
    const mid = Math.floor(errs.length / 2);
    const medianErr = errs.length % 2 === 1 ? errs[mid]! : (errs[mid - 1]! + errs[mid]!) / 2;
    const within = errs.filter((e) => e < Math.LN2).length;
    return { median: Math.exp(medianErr), within: errs.length > 0 ? (within / errs.length) * 100 : 0 };
  };
  const full = run(false);
  const flat = run(true);
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  return {
    sample: targets.length,
    median_miss_x: round2(full.median),
    within_2x_pct: round1(full.within),
    flat_median_miss_x: round2(flat.median),
    flat_within_2x_pct: round1(flat.within),
  };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in the ranges farmers actually pay. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return '$8 to $15 of gas';
  if (c === 'solana') return 'under $0.10 of fees';
  if (c === 'bsc' || c === 'binance' || c.includes('bnb')) return 'about $0.50 of gas';
  if (c === 'polygon' || c === 'polygon zkevm') return 'under $0.30 of gas';
  if (c === 'avalanche') return 'about $1 of gas';
  if (c === 'tron') return 'about $1 of fees';
  return 'about $0.50 to $2 of gas';
}

/** The same ranges as gasFor, as numbers, so a plan can total its own fees. */
function gasUsdFor(chain: string): [number, number] {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return [8, 15];
  if (c === 'solana') return [0.01, 0.1];
  if (c === 'bsc' || c === 'binance' || c.includes('bnb')) return [0.4, 0.6];
  if (c === 'polygon' || c === 'polygon zkevm') return [0.05, 0.3];
  if (c === 'avalanche') return [0.7, 1.3];
  if (c === 'tron') return [0.7, 1.3];
  return [0.5, 2];
}

/** A fee figure the way a farmer would say it: two decimals under ten dollars, whole dollars above. */
function feeText(n: number): string {
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${Math.round(n)}`;
}

/** Where a protocol shows a wallet its standing, by the work it does. */
function venueFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('option')) return 'volume and rewards page';
  if (c.includes('bridge')) return 'rewards page';
  if (c.includes('staking') || c.includes('restak')) return 'staking dashboard';
  if (c.includes('nft') || c.includes('gaming') || c.includes('game')) return 'rewards page';
  return 'points or rewards page';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  if (p.tvl_usd >= 20_000_000) return 75;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the supply position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name}, then use the bridged funds in one app on that chain.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the staking receipt in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('option')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged trade.`;
  if (c.includes('prediction')) return `Fund $${capital} and take one position in a liquid market on ${name}.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('aggregator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it in the same wallet.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy until it expires.`;
  if (c.includes('nft') || c.includes('gaming') || c.includes('game')) return `Buy one entry-level asset in ${name} on ${chain} and play or hold it from the farm wallet.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second surface: the extra feature that separates a user from a one-click deposit. */
function secondFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow a small amount against the supply on ${name} and repay it a week later, so the wallet shows both sides of the market.`;
  if (c.includes('dex')) return `Swap a small amount through ${name}'s own interface once a week instead of an aggregator, so the wallet counts as a trader, not only a liquidity provider.`;
  if (c.includes('bridge')) return `Bridge a small amount back through ${name} after two weeks, so the wallet shows round trips in both directions.`;
  if (c.includes('staking') || c.includes('restak')) return `Claim and restake the rewards on ${name} once, so the wallet shows a full staking cycle.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('option')) return `Close the first trade and open a second small one a week later, so the wallet shows repeat trading, not a single touch.`;
  if (c.includes('yield') || c.includes('aggregator') || c.includes('curator') || c.includes('allocator')) return `Move a small part of the position to a second ${name} vault or pool on ${chain}, so the wallet uses more than one product.`;
  return `Use one more feature of ${name} beyond the first deposit, such as its dashboard, a vote or a second product, so the wallet reads as a user, not a passer-by.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time, derived from the
 * protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 * The last step totals the plan from its own figures: the capital, and the fees the earlier
 * steps' gas ranges add up to over the hold, so a reader can price the whole plan at a glance.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasFor(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weeks = Math.ceil(hold / 7);
  const [gasLow, gasHigh] = gasUsdFor(chain);
  const feeLow = gasLow * (3 + weeks);
  const feeHigh = gasHigh * (3 + weeks);
  const extraChains = p.chains.length > 1 ? ` It also runs on ${p.chains[1]}, which is a second surface if the first is crowded.` : '';
  return [
    {
      text: `Set up one fresh wallet for ${p.name} alone, fund it on ${chain} from an exchange, and keep its seed phrase offline.${extraChains}`,
      cost: `${gas} to fund and make the first transaction`,
      time: '10 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: secondFor(p, chain),
      cost: `${gas} for the extra actions`,
      time: '15 minutes in the second week',
    },
    {
      text: `Repeat one qualifying action every week, such as a deposit, a swap, a claim or a vote, and never let the wallet go quiet for a whole month.`,
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days, so the activity spans more than one points snapshot or season if ${p.name} runs one.`,
      cost: `the $${capital} stays in the position for the whole hold`,
      time: `${hold} days`,
    },
    {
      text: `Once a month, open ${p.name}'s own ${venueFor(p)} from the link on its official site and check the wallet's standing; claim only from that link, and never pay anyone to claim for you.`,
      cost: 'nothing to check, and never a fee to claim',
      time: '10 minutes a month',
    },
    {
      text: `Keep a farm log with the wallet, the dates and every transaction hash, and review it monthly: exit if the TVL falls by more than 40 per cent, and if a token launches, read its claim terms instead of farming on.`,
      cost: 'nothing but the log',
      time: '5 minutes a month',
    },
    {
      text: `Budget the whole plan before starting: about $${capital} of working capital plus ${feeText(feeLow)} to ${feeText(feeHigh)} of network fees over the ${hold}-day hold (funding, the two opening actions and ${weeks} weekly actions at ${gas} each). The fees are the only sunk cost if no token ever comes; the capital is the position itself and stays yours.`,
      cost: `${feeText(feeLow)} to ${feeText(feeHigh)} of fees in total, and the $${capital} stays in the position`,
      time: `${hold} days all-in`,
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's form for data.js: every figure the page shows, and the farm plan verbatim. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    watchlist: row.watchlist,
    implied_value_usd: row.implied_value_usd,
    confidence: row.confidence,
    est_pool_low_usd: row.est_pool_low_usd,
    est_pool_high_usd: row.est_pool_high_usd,
    peer_multiple: row.model.peer_multiple,
    peer_sample: row.model.peer_sample,
    size_multiplier: row.model.size_multiplier,
    growth_factor: row.model.growth_factor,
    maturity_factor: row.model.maturity_factor,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const peers = peerMultiples(snapshot, model);
  const early = board.filter((r) => !r.watchlist).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    scanned_size: snapshot.protocols.length,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: board.reduce((sum, r) => sum + r.implied_value_usd, 0),
    total_pool_low_usd: board.reduce((sum, r) => sum + r.est_pool_low_usd, 0),
    total_pool_high_usd: board.reduce((sum, r) => sum + r.est_pool_high_usd, 0),
    global_multiple: peers.global,
    multiples: [...peers.byCategory.values()].sort((a, b) => b.sample - a.sample || (a.category < b.category ? -1 : 1)),
    size_curve: sizeCurve(snapshot),
    validation: validateModel(snapshot, model),
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
