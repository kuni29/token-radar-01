// Token Radar's pricing model (radar-5), as a single self-contained script.
//
// This is the real pricing computation, shipped inside the dashboard's own source so it can
// be inspected without running the program: the same joint fit, the same five factors and
// the same leave-one-out check that lib/model.ts implements in the repository (the program
// that builds the board). Nothing here touches the page, the network or any other file.
//
// The model: implied value = TVL x peer multiple x size factor x growth factor x maturity
// factor, where the peer multiple and the size factor come from one joint fit over the
// snapshot's tokenised protocols (the EVIDENCE table below, taken from the sealed snapshot
// of 2026-11-14: category, TVL, seven-day TVL change in per cent, days since first tracked,
// market cap). Those protocols are the evidence and are never ranked; the board the program
// builds prices pre-token protocols from this fit.
//
// Run it in any JavaScript console:
//   var fit = PRICING.fit(PRICING.EVIDENCE);
//   PRICING.impliedValue({ category: 'Lending', tvl_usd: 50000000, change_7d: 4.2, age_days: 800 }, fit);
//   PRICING.validate(PRICING.EVIDENCE);   // the leave-one-out check, both runs
var PRICING = (function () {
  'use strict';

  // The model's constants, identical to lib/model.ts.
  var MODEL = {
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
  };

  // [category, tvl_usd, change_7d, age_days, mcap_usd] for every protocol in the snapshot
  // whose token already trades (mcap > 0 and TVL > 0): the pricing evidence, 128 rows.
  var EVIDENCE = [
  ["Lending",90919562,-7.8689,null,1723499485],
  ["Cross Chain Bridge",13897958,-9.5894,1772,30644040],
  ["Liquidity Manager",10529600,0.0381,null,158430],
  ["Liquid Staking",20855587,-12.522,null,34514051],
  ["Collateral Management",13125243,-8.6811,591,159606035],
  ["Risk Curators",11776271,-11.1115,1747,35031165],
  ["Dexs",37172687,-2.231,814,10897579],
  ["Chain",14189397,-8.4416,1750,42943403],
  ["Yield",7933344,-11.5799,1576,1518557],
  ["Canonical Bridge",53957600,-10.1405,1000,17089636],
  ["Restaking",2790066912,-9.9953,753,48746633],
  ["CEX",473943961,-9.1581,null,210972043],
  ["Yield Aggregator",10650997,-10.5684,null,5104554],
  ["Yield Aggregator",88242646,-9.1681,null,4446468],
  ["Yield",11828381,-7.6894,null,471137],
  ["Lending",95008001,-5.3184,null,12244356],
  ["CEX",89837790,-8.5238,799,581751],
  ["Lending",8116884,-4.1991,null,101615],
  ["CEX",37937448,26.7014,401,2351618],
  ["CEX",1219276691,-11.0521,695,33120071],
  ["Basis Trading",33419734,-0.4055,247,1208793873],
  ["NFT Marketplace",9556892,-22.4718,1408,19130162],
  ["RWA",42545788,0.2948,1025,5951929],
  ["Lending",159772077,-12.0202,457,166714858],
  ["Bridge",11042622,-5.6492,1833,16860215],
  ["Decentralized AI",40658464,-10.3038,284,83774453],
  ["Yield",61654134,-9.3095,1706,79509],
  ["Onchain Capital Allocator",1097985819,-9.2218,645,20992334],
  ["Yield",461947766,-9.0571,null,148210942],
  ["Canonical Bridge",17033550,-5.2354,null,6246345],
  ["Lending",128252575,-10.6273,1489,10516958],
  ["Restaking",4903633832,-14.3731,1249,155971221],
  ["Dexs",22628585,-15.1741,1163,7748814],
  ["Indexes",79509819,-10.9966,null,4089825],
  ["Yield",8396549,-10.5288,1254,8872092],
  ["Lending",7022402,2.6879,989,7210372],
  ["Lending",11075107,-8.8443,1421,456289],
  ["Dexs",13050097,-40.0977,80,889485],
  ["Basis Trading",1557707205,-6.1005,410,318146200],
  ["Token Locker",10045588,-10.5477,1410,190621074],
  ["Lending",10077743,-9.7513,292,51699732],
  ["CDP",49977940,-15.954,1096,8431344],
  ["Bridge",7085071,-7.7571,null,7003273],
  ["Dual-Token Stablecoin",79817906,-13.8004,1198,2523453],
  ["Derivatives",5999311,-11.8791,1797,8257733],
  ["CEX",5458552782,-7.5143,1447,919670267],
  ["Lending",19646374,-11.0715,1783,3312621],
  ["Bridge",6040499,-15.919,1207,48331],
  ["Onchain Capital Allocator",1105503667,-0.5937,233,6477692],
  ["Yield",5258119,-9.0042,859,634108],
  ["Yield Aggregator",14464506,-17.3268,null,3638254],
  ["Options",8160658,-11.2398,null,12359368],
  ["Liquid Staking",9655113,-6.9344,1110,3712184],
  ["RWA",369103931,0.6476,171,13257716],
  ["Dexs",20870492,-12.4906,1179,36596424],
  ["Cross Chain Bridge",65978518,-7.8409,261,15570424],
  ["Indexes",10414124,-17.8558,null,1537936],
  ["Liquid Staking",11409175,-9.4336,639,391774],
  ["CDP",27257098,-13.9395,1401,6704911],
  ["RWA",34656970,0.0026,654,14364555],
  ["Lending",7291374,-3.0013,null,60672],
  ["Lending",25055189,-16.8278,844,286940],
  ["Liquid Restaking",10265592,-9.3181,746,209941],
  ["Liquid Staking",18721539391,-13.9722,null,251037363],
  ["Lending",8390942,-4.757,1380,3547973],
  ["Yield",5045118,-15.0918,617,5042491],
  ["RWA",5502874,-6.015,432,5538701],
  ["Canonical Bridge",19883796,-11.2859,null,22390680],
  ["Canonical Bridge",91611319,-14.5449,null,1332654362],
  ["Bridge",350240199,-10.5131,1009,43782431],
  ["Dexs",7296111,-5.2731,990,159377],
  ["Lending",27341274,-11.4519,1710,8876695],
  ["Liquid Staking",455231965,-13.0122,1076,1823351],
  ["CEX",3847796100,-13.6162,1256,129118224],
  ["AI Agents",7577571,-34.0333,927,6729517],
  ["CEX",10168509,-37.0695,1400,705918665],
  ["Staking Pool",1146359386,-7.5657,375,717446],
  ["CEX",26324198228,-7.5149,1464,1969858392],
  ["Dexs",7960647,-15.4451,null,24209676],
  ["Launchpad",138597079,-6.9917,1622,18098374],
  ["Canonical Bridge",2561365424,-4.6646,null,901671433],
  ["Bridge",1285806408,-5.8427,1707,66593224],
  ["Bridge",23447007,-9.8582,842,37592530],
  ["Dexs",41723251,-4.6394,null,2086559],
  ["Privacy",107702928,0.4841,1752,104378062],
  ["Prediction Market",6612528,-36.6488,382,2646363290],
  ["RWA",487561390,0.581,327,39968695],
  ["Liquid Restaking",85927581,-14.3955,1061,29651025],
  ["Indexes",43278603,-6.3309,null,89351713],
  ["CDP",91691917,2.1377,733,728976],
  ["Basis Trading",6085254,-1.1353,660,6786418],
  ["Lending",42980278,-10.611,596,1434821],
  ["Liquid Staking",930898234,-14.4232,1816,30147126],
  ["Yield",37353080,-0.8074,1135,37389910],
  ["Dexs",14959585,-4.1564,null,1519676],
  ["Basis Trading",8727712,0.4793,571,5711574],
  ["Basis Trading",201014549,-0.0245,410,8870078],
  ["Staking Pool",10193945903,-12.6251,null,29460958],
  ["Liquid Staking",154377360,-17.1139,1792,7359993],
  ["Canonical Bridge",213051107,-10.4613,null,286418424],
  ["Dexs",20854866,-0.3978,1439,30102154],
  ["Payments",8841188,-15.8161,1355,1236716],
  ["RWA",47373718,-15.7563,1229,9707096],
  ["Payments",5131538,-4.0617,1850,1142803],
  ["Dexs",31730814,-10.5038,null,48362138],
  ["CEX",724872836,-10.5877,1457,131787774],
  ["Cross Chain Bridge",7930429,-3.5529,1690,1549406],
  ["Cross Chain Bridge",7139951,-7.0179,null,25847462],
  ["Canonical Bridge",10785829,-10.8456,900,15467736],
  ["Token Locker",51190122,-10.0371,1599,3337137],
  ["Lending",13421078,-26.4637,1783,1776879],
  ["Dexs",56421343,-7.662,null,179551766],
  ["Privacy",662508266,-15.0925,null,22508774],
  ["DOR",52470276,-12.5652,795,4710002],
  ["RWA",10406697,-0.9698,582,9051242],
  ["RWA",157258085,-0.5488,544,63408224],
  ["RWA",79306636,-3.2534,852,21791881],
  ["Liquid Staking",28264700,-7.3043,1412,1147339],
  ["Derivatives",10839155,1.8121,1012,31945934],
  ["Liquid Staking",5926765,0.8789,843,1100868],
  ["Yield",54446633,-14.4385,88,9205988],
  ["Canonical Bridge",223431568,-10.7348,null,56296],
  ["Basis Trading",12995829,0.0822,424,12974827],
  ["Leveraged Farming",81947316,-12.4313,415,14132031],
  ["Yield Aggregator",11725362,-8.3768,null,367627],
  ["Privacy",90279448,-17.4161,194,147586329],
  ["Basis Trading",60029438,-0.6743,528,18611233],
  ["AI Agents",8281620,-6.4429,569,2660574]
  ];

  function median(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // The growth factor: the share of a protocol's seven-day TVL change the price pays for.
  function growthFactor(change7d) {
    if (change7d === null) return 1;
    var clamped = Math.min(MODEL.growth_clamp_high, Math.max(MODEL.growth_clamp_low, change7d));
    return 1 + (MODEL.growth_weight * clamped) / 100;
  }

  // The maturity factor: what running with no token is worth, rising over 1095 days.
  function maturityFactor(ageDays) {
    if (ageDays === null) return MODEL.maturity_floor;
    var run = Math.min(Math.max(ageDays, 0), MODEL.maturity_days) / MODEL.maturity_days;
    return MODEL.maturity_floor + (1 - MODEL.maturity_floor) * run;
  }

  // The joint fit: one pricing line in log-log terms with one offset per category, fitted by
  // alternating the line on offset-adjusted caps with each offset reset to the median of its
  // residuals, pulled toward the market-wide line by the category's sample size, until the
  // two agree. Every cap is first divided by its own growth and maturity factors, so the
  // line prices a protocol standing still and newly listed; with flatTerms set, the two
  // factors are left out everywhere (the validation's comparison run).
  function fit(evidence, flatTerms) {
    var ref = median(evidence.map(function (r) { return r[1]; }));
    var rows = evidence.map(function (r) {
      var g = flatTerms ? 1 : growthFactor(r[2]);
      var a = flatTerms ? 1 : maturityFactor(r[3]);
      return { r: r, x: Math.log(Math.max(r[1], 1)), y: Math.log(r[4] / (g * a)) };
    });
    var offsets = {};
    var intercept = 0;
    var slope = 1;
    for (var iter = 0; iter < 1000; iter++) {
      var off = function (cat) { return cat !== null && offsets[cat] !== undefined ? offsets[cat] : 0; };
      var mx = 0;
      var my = 0;
      rows.forEach(function (row) { mx += row.x; my += row.y - off(row.r[0]); });
      mx /= rows.length;
      my /= rows.length;
      var sxy = 0;
      var sxx = 0;
      rows.forEach(function (row) {
        sxy += (row.x - mx) * (row.y - off(row.r[0]) - my);
        sxx += (row.x - mx) * (row.x - mx);
      });
      var nextSlope = sxx > 0 ? sxy / sxx : 1;
      var nextIntercept = my - nextSlope * mx;
      var residuals = {};
      rows.forEach(function (row) {
        if (row.r[0] === null) return;
        if (!residuals[row.r[0]]) residuals[row.r[0]] = [];
        residuals[row.r[0]].push(row.y - nextIntercept - nextSlope * row.x);
      });
      var delta = Math.abs(nextIntercept - intercept) + Math.abs(nextSlope - slope);
      var next = {};
      Object.keys(residuals).forEach(function (cat) {
        var arr = residuals[cat];
        var o = median(arr) * (arr.length / (arr.length + MODEL.shrink_k));
        next[cat] = o;
        delta += Math.abs(o - off(cat));
      });
      intercept = nextIntercept;
      slope = nextSlope;
      offsets = next;
      if (delta < 1e-12) break;
    }
    var gamma = slope - 1;
    var clampMultiple = function (v) {
      return Math.min(MODEL.multiple_cap, Math.max(MODEL.multiple_floor, v));
    };
    var atRef = function (offset) {
      return Math.exp(intercept + offset + gamma * Math.log(Math.max(ref, 1)));
    };
    var sizeOf = function (tvl) {
      return Math.min(MODEL.size_clamp_high, Math.max(MODEL.size_clamp_low, Math.pow(tvl / Math.max(ref, 1), gamma)));
    };
    var restated = {};
    rows.forEach(function (row) {
      if (row.r[0] === null) return;
      var g = flatTerms ? 1 : growthFactor(row.r[2]);
      var a = flatTerms ? 1 : maturityFactor(row.r[3]);
      if (!restated[row.r[0]]) restated[row.r[0]] = [];
      restated[row.r[0]].push(row.r[4] / (row.r[1] * sizeOf(row.r[1]) * g * a));
    });
    var byCategory = {};
    Object.keys(restated).forEach(function (cat) {
      byCategory[cat] = {
        sample: restated[cat].length,
        median: median(restated[cat]),
        applied: clampMultiple(atRef(offsets[cat] !== undefined ? offsets[cat] : 0)),
      };
    });
    return {
      slope: slope,
      gamma: gamma,
      ref_tvl_usd: ref,
      sample: evidence.length,
      global_multiple: clampMultiple(atRef(0)),
      byCategory: byCategory,
      flatTerms: !!flatTerms,
    };
  }

  // A protocol's implied value under a fit: its TVL at its category's peer multiple, carried
  // to its own size, then paid its own growth and maturity factors. protocol is
  // { category, tvl_usd, change_7d, age_days }; under a flatTerms fit the two factors are 1.
  function impliedValue(protocol, fitted) {
    var peer = protocol.category !== null && fitted.byCategory[protocol.category]
      ? fitted.byCategory[protocol.category]
      : null;
    var multiple = peer ? peer.applied : fitted.global_multiple;
    var sizeMult = Math.min(
      MODEL.size_clamp_high,
      Math.max(MODEL.size_clamp_low, Math.pow(protocol.tvl_usd / Math.max(fitted.ref_tvl_usd, 1), fitted.gamma))
    );
    var growthMult = fitted.flatTerms ? 1 : growthFactor(protocol.change_7d);
    var maturityMult = fitted.flatTerms ? 1 : maturityFactor(protocol.age_days);
    var implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * sizeMult * growthMult * maturityMult));
    return {
      implied: implied,
      multiple: multiple,
      sample: peer ? peer.sample : 0,
      sizeMult: sizeMult,
      growthMult: growthMult,
      maturityMult: maturityMult,
    };
  }

  // The leave-one-out check: every evidence protocol priced as if pre-token, from a fit
  // that excludes it, against the market cap the market actually gave it. Run with the
  // growth and maturity factors in, and again with them switched off.
  function validate(evidence) {
    var run = function (flatTerms) {
      var errs = [];
      evidence.forEach(function (t, i) {
        var rest = evidence.filter(function (_, j) { return j !== i; });
        var fitted = fit(rest, flatTerms);
        var s = impliedValue({ category: t[0], tvl_usd: t[1], change_7d: t[2], age_days: t[3] }, fitted);
        errs.push(Math.abs(Math.log(s.implied / t[4])));
      });
      errs.sort(function (a, b) { return a - b; });
      var mid = Math.floor(errs.length / 2);
      var medianErr = errs.length % 2 === 1 ? errs[mid] : (errs[mid - 1] + errs[mid]) / 2;
      var within = errs.filter(function (e) { return e < Math.LN2; }).length;
      return { median_miss_x: Math.exp(medianErr), within_2x_pct: (within / errs.length) * 100 };
    };
    return { sample: evidence.length, full: run(false), flat: run(true) };
  }

  // On this snapshot the fit states: slope 0.5152, gamma -0.4848, reference TVL $32,575,274,
  // market-wide multiple x0.3536 at the reference size; the check states a median miss of
  // x3.51 with 32.0% within x2 for the full model, and x3.34 with 33.6% with the growth and
  // maturity factors switched off. The program recomputes all of these on every run; this
  // file's validate() reproduces the check from the evidence table above.
  return {
    MODEL: MODEL,
    EVIDENCE: EVIDENCE,
    growthFactor: growthFactor,
    maturityFactor: maturityFactor,
    fit: fit,
    impliedValue: impliedValue,
    validate: validate,
  };
})();
