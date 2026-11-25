// Token Radar's dashboard (model radar-5). It reads window.RADAR, written beside dashboard/ by
// main.ts, and renders the ranked board, the value model behind it, a filterable and sortable table,
// a per-protocol detail view with the model's own arithmetic and the protocol's farm plan, and the
// live-token protocols the peer multiples are priced from. No network: every byte it shows is in
// data.js, and the farm plans are the board's own rows, shown verbatim.
(function () {
  'use strict';
  var DATA = window.RADAR;
  var main = document.getElementById('board');

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    return days.toLocaleString('en-US') + ' d';
  }
  function mult(n) { return '×' + n.toFixed(2); }

  var state = {
    q: '',
    chain: '',
    category: '',
    watchOnly: false,
    sort: 'implied_value_usd',
    dir: -1,
  };

  /* ---------- header ---------- */
  var header = el('header', { class: 'top' }, [
    el('div', { class: 'brand' }, [
      el('div', { class: 'mark', 'aria-hidden': 'true' }),
      el('div', null, [
        el('h1', null, ['TOKEN ', el('span', { class: 'thin', text: 'RADAR' })]),
        el('p', { class: 'tagline', text: 'Pre-token protocols, ranked by what a launch would be worth — and what to do about each one.' }),
      ]),
    ]),
    el('div', { class: 'meta' }, [
      el('div', null, ['Snapshot ', el('b', { text: DATA.as_of }), ' · DefiLlama protocol universe']),
      el('div', null, ['Model ', el('b', { text: DATA.model_version }), ' · figures are the model\u2019s claims, not a forecast of a launch']),
    ]),
  ]);
  main.appendChild(header);

  /* ---------- stat strip ---------- */
  function stat(k, v, s, hot) {
    return el('div', { class: 'stat' + (hot ? ' hot' : '') }, [
      el('div', { class: 'k', text: k }),
      el('b', { text: v }),
      el('div', { class: 's', text: s }),
    ]);
  }
  main.appendChild(el('section', { class: 'stats', 'aria-label': 'Headline figures' }, [
    stat('Protocols scanned', String(DATA.scanned_size), 'every protocol at $5M TVL or more'),
    stat('Pre-token tracked', String(DATA.board_size), DATA.early_size + ' found below the watchlist floor', true),
    stat('Watchlist covered', DATA.watchlist_size + ' of ' + DATA.watchlist_size, 'the $' + (DATA.floor_usd / 1e6) + 'M floor, every one ranked'),
    stat('Total implied value', money(DATA.total_implied_usd), 'if every board protocol launched at par'),
    stat('Est. farmer pool', money(DATA.total_pool_low_usd) + '–' + money(DATA.total_pool_high_usd), 'a 5–10% community allocation, board-wide'),
  ]));

  /* ---------- model panel ---------- */
  var boardCats = {};
  DATA.rows.forEach(function (r) { if (r.category) boardCats[r.category] = true; });
  var chips = DATA.multiples.filter(function (m) { return boardCats[m.category]; }).slice(0, 12).map(function (m) {
    return el('span', { class: 'chip' }, [m.category + ' ', el('b', { text: mult(m.applied) }), ' · n=' + m.sample]);
  });
  main.appendChild(el('section', { class: 'model', 'aria-label': 'How the value is built' }, [
    el('h2', { text: 'How the value is built' }),
    el('div', { class: 'formula', text: 'implied value = TVL \u00D7 peer multiple \u00D7 size factor \u00D7 growth factor \u00D7 maturity factor' }),
    el('p', { text: 'The peer multiple and the size factor are one fit, not two: over this snapshot\u2019s tokenised protocols the model fits a single pricing line \u2014 log market cap against log TVL \u2014 with one offset per category, the line and the offsets fitted together until they agree. The peer multiple is the multiple the protocol\u2019s own category prices at when every peer is first read at one common size, the median tokenised TVL of ' + money(DATA.size_curve.ref_tvl_usd) + ' (the market-wide line states \u00D7' + DATA.global_multiple.toFixed(2) + ' there), with each category\u2019s offset pulled toward that line by its sample size so a thin category cannot shout. The size factor then carries a protocol from that common size to its own: the multiple paid per TVL dollar falls as TVL grows (slope ' + DATA.size_curve.gamma.toFixed(2) + ' in log-log terms), so the factor is \u00D71 at the reference TVL, below it for the giants and above it for the small. Reading peers at a common size first is what keeps a category of giants from being charged the size discount twice. The growth and maturity factors are fitted inside the same fit, not pasted on: every peer\u2019s cap is first divided by its own two factors, and a protocol being priced has its own multiplied back. The growth factor pays for motion: 1 + ' + DATA.model.growth_weight + ' \u00D7 the seven-day TVL change, clamped between ' + DATA.model.growth_clamp_low + '% and +' + DATA.model.growth_clamp_high + '%, so a protocol growing 20% in a week is priced a tenth higher than an identical one standing still. The maturity factor pays for time run with no token: \u00D7' + DATA.model.maturity_floor.toFixed(1) + ' for a protocol listed today, rising to \u00D71 at ' + DATA.model.maturity_days + ' days. Nothing is priced from a list of names: change the snapshot and every figure moves.' }),
    el('p', { text: 'Checked against the market itself: pricing each of the snapshot\u2019s ' + DATA.validation.sample + ' tokenised protocols as if it had no token, from peers that exclude it, this model\u2019s typical miss against the market cap the market actually gave it is \u00D7' + DATA.validation.median_miss_x.toFixed(1) + ', with ' + DATA.validation.within_2x_pct.toFixed(0) + '% priced within \u00D72. Without the growth and maturity factors the same check misses by \u00D7' + DATA.validation.flat_median_miss_x.toFixed(1) + ' with ' + DATA.validation.flat_within_2x_pct.toFixed(0) + '% within \u00D72: the two factors cost a little on this check, and they stay because a launch value that ignores a protocol\u2019s growth and its years run with no token is not the model this board states. The rest of the miss is real: token prices carry float and speculation no snapshot field records, which is why every row also carries a confidence.' }),
    el('div', { class: 'chips' }, chips),
  ]));

  /* ---------- controls ---------- */
  var chains = [];
  var categories = [];
  DATA.rows.forEach(function (r) {
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
    if (r.category && categories.indexOf(r.category) < 0) categories.push(r.category);
  });
  chains.sort();
  categories.sort();

  var search = el('input', { type: 'search', placeholder: 'Search name, category, chain…', 'aria-label': 'Search protocols' });
  search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); renderRows(); });
  function selectBox(label, values, allLabel, onPick) {
    var sel = el('select', { 'aria-label': label }, [el('option', { value: '', text: allLabel })].concat(values.map(function (v) {
      return el('option', { value: v, text: v });
    })));
    sel.addEventListener('change', function () { onPick(sel.value); renderRows(); });
    return sel;
  }
  var chainSel = selectBox('Filter by chain', chains, 'All chains', function (v) { state.chain = v; });
  var catSel = selectBox('Filter by category', categories, 'All categories', function (v) { state.category = v; });
  var watchBox = el('input', { type: 'checkbox', id: 'watchonly' });
  watchBox.addEventListener('change', function () { state.watchOnly = watchBox.checked; renderRows(); });
  var sortSel = el('select', { 'aria-label': 'Sort the board' }, [
    el('option', { value: 'implied_value_usd', text: 'Sort: implied value' }),
    el('option', { value: 'tvl_usd', text: 'Sort: TVL' }),
    el('option', { value: 'change_7d', text: 'Sort: 7d change' }),
    el('option', { value: 'confidence', text: 'Sort: confidence' }),
    el('option', { value: 'age_days', text: 'Sort: age' }),
    el('option', { value: 'name', text: 'Sort: name' }),
  ]);
  sortSel.addEventListener('change', function () {
    state.sort = sortSel.value;
    state.dir = state.sort === 'name' ? 1 : -1;
    renderRows();
  });
  var count = el('span', { class: 'count' });
  main.appendChild(el('div', { class: 'controls' }, [
    search, chainSel, catSel,
    el('label', { class: 'check', for: 'watchonly' }, [watchBox, 'Watchlist only']),
    sortSel, count,
  ]));

  /* ---------- board table ---------- */
  var tbody = el('tbody');
  function th(label, key, cls) {
    var node = el('th', { class: (cls || '') + (key ? ' sortable' : ''), text: label });
    if (key) node.addEventListener('click', function () {
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
      sortSel.value = ['implied_value_usd', 'tvl_usd', 'change_7d', 'confidence', 'age_days', 'name'].indexOf(key) >= 0 ? key : 'implied_value_usd';
      renderRows();
    });
    return node;
  }
  var table = el('table', null, [
    el('caption', { text: 'The board: every pre-token protocol the snapshot carries, strongest implied value first. Select a row for its model and farm plan.' }),
    el('thead', null, [el('tr', null, [
      th('#'), th('Protocol', 'name'), th('Category'), th('Chains'),
      th('TVL', 'tvl_usd', 'n'), th('7d', 'change_7d', 'n'), th('Age', 'age_days', 'n'),
      th('Peer ×', null, 'n hide-m'), th('Implied value', 'implied_value_usd', 'n'), th('Confidence', 'confidence', 'n'), th(''),
    ])]),
    tbody,
  ]);
  main.appendChild(el('section', { class: 'boardwrap', 'aria-label': 'The ranked board' }, [table]));

  function filtered() {
    var rows = DATA.rows.filter(function (r) {
      if (state.watchOnly && !r.watchlist) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(state.q) < 0) return false;
      }
      return true;
    });
    rows.sort(function (a, b) {
      var x = a[state.sort];
      var y = b[state.sort];
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'string') return state.dir * x.localeCompare(y);
      return state.dir * (x - y);
    });
    return rows;
  }

  function renderRows() {
    var rows = filtered();
    count.textContent = 'Showing ' + rows.length + ' of ' + DATA.board_size + ' protocols';
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    if (rows.length === 0) {
      tbody.appendChild(el('tr', null, [el('td', { colspan: '11', text: 'No protocol matches those filters. Loosen one and the radar sweeps again.' })]));
      return;
    }
    rows.forEach(function (r) {
      var change = r.change_7d === null ? el('span', { class: 'flat', text: '—' })
        : el('span', { class: r.change_7d > 0 ? 'up' : r.change_7d < 0 ? 'down' : 'flat', text: pct(r.change_7d) });
      var confBar = el('span', { class: 'conf' }, [
        el('span', { class: 'bar' }, [el('i', { style: 'width:' + r.confidence + '%' })]),
        el('span', { class: 'num', text: String(r.confidence) }),
      ]);
      var tr = el('tr', { tabindex: '0', 'aria-label': r.name + ' details' }, [
        el('td', { class: 'rank num', text: String(r.rank) }),
        el('td', null, [
          el('span', { class: 'name' }, [r.name, r.watchlist
            ? el('span', { class: 'tag watch', text: 'WATCHLIST' })
            : el('span', { class: 'tag early', text: 'EARLY' })]),
        ]),
        el('td', { text: r.category || '—' }),
        el('td', { class: 'chains', text: r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') }),
        el('td', { class: 'n num', text: money(r.tvl_usd) }),
        el('td', { class: 'n' }, [change]),
        el('td', { class: 'n num', text: ageText(r.age_days) }),
        el('td', { class: 'n num hide-m', text: mult(r.peer_multiple) }),
        el('td', { class: 'n num implied', text: money(r.implied_value_usd) }),
        el('td', { class: 'n' }, [confBar]),
        el('td', null, [el('span', { class: 'farm-link', text: 'Farm plan →' })]),
      ]);
      tr.addEventListener('click', function () { openDetail(r); });
      tr.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') openDetail(r); });
      tbody.appendChild(tr);
    });
  }

  /* ---------- detail dialog ---------- */
  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  main.appendChild(dialog);

  function stepParts(step) {
    var ci = step.indexOf(' Cost: ');
    if (ci < 0) return { text: step, ct: '' };
    return { text: step.slice(0, ci), ct: step.slice(ci + 1) };
  }
  function brow(label, value, shown, frac) {
    return el('div', { class: 'brow' }, [
      el('span', { class: 'k', text: label }),
      el('span', { class: 'track' }, [el('i', { style: 'width:' + Math.max(3, Math.min(100, frac * 100)) + '%' })]),
      el('span', { class: 'v num', text: shown !== undefined ? shown : value }),
    ]);
  }
  function openDetail(r) {
    while (dialog.firstChild) dialog.removeChild(dialog.firstChild);
    var peerNote = r.peer_sample === 0
      ? 'Priced at the global peer multiple: this snapshot carries no tokenised protocol in its category to price from.'
      : r.peer_multiple <= DATA.global_multiple * 1.25
        ? 'Priced mostly at the global peer multiple: this snapshot carries only ' + r.peer_sample + ' tokenised ' + (r.category || '') + ' protocol' + (r.peer_sample === 1 ? '' : 's') + ' to price from, too thin a sample to move the multiple far.'
        : 'Priced at the ' + (r.category || 'market') + ' peer multiple: what ' + r.peer_sample + ' tokenised ' + (r.category || '') + ' protocol' + (r.peer_sample === 1 ? '' : 's') + ' in this snapshot price at when each is read at the reference size, pulled toward the market-wide line by its sample size' + (r.peer_sample < 3 ? '; the sample is thin, so read the exact figure with the confidence below' : '') + '.';
    dialog.appendChild(el('div', { class: 'detail-head' }, [
      el('div', null, [
        el('h2', { id: 'detail-title', text: r.name }),
        el('div', { class: 'sub', text: 'Rank #' + r.rank + ' of ' + DATA.board_size + ' · ' + (r.category || 'uncategorised') + ' · ' + (r.watchlist ? 'on the watchlist (above the $' + (DATA.floor_usd / 1e6) + 'M floor)' : 'an early find below the watchlist floor') + ' · records no token' }),
      ]),
      el('button', { class: 'close', type: 'button', text: 'Close' }),
    ]));
    dialog.querySelector('.close').addEventListener('click', function () { dialog.close(); });
    var body = el('div', { class: 'detail-body' });
    body.appendChild(el('div', { class: 'figs' }, [
      el('div', { class: 'fig' }, [el('div', { class: 'k', text: 'Implied value' }), el('b', { text: money(r.implied_value_usd) })]),
      el('div', { class: 'fig' }, [el('div', { class: 'k', text: 'TVL' }), el('b', { text: money(r.tvl_usd) })]),
      el('div', { class: 'fig' }, [el('div', { class: 'k', text: 'Est. farmer pool' }), el('b', { text: money(r.est_pool_low_usd) + '–' + money(r.est_pool_high_usd) })]),
      el('div', { class: 'fig' }, [el('div', { class: 'k', text: 'Confidence' }), el('b', { text: r.confidence + ' / 100' })]),
    ]));
    body.appendChild(el('h3', { text: 'How this value is built' }));
    var bd = el('div', { class: 'breakdown' });
    bd.appendChild(brow('TVL (the base)', money(r.tvl_usd), money(r.tvl_usd), Math.min(1, Math.log10(Math.max(r.tvl_usd, 1)) / 11)));
    bd.appendChild(brow('Peer multiple', mult(r.peer_multiple), mult(r.peer_multiple), r.peer_multiple / 2));
    bd.appendChild(brow('Size factor (TVL vs the ' + money(DATA.size_curve.ref_tvl_usd) + ' median)', mult(r.size_multiplier), mult(r.size_multiplier), r.size_multiplier / 10));
    bd.appendChild(brow('Growth factor (seven-day TVL change)', mult(r.growth_factor), mult(r.growth_factor), r.growth_factor / 2));
    bd.appendChild(brow('Maturity factor (time run with no token)', mult(r.maturity_factor), mult(r.maturity_factor), r.maturity_factor));
    body.appendChild(bd);
    body.appendChild(el('p', { class: 'note', text: peerNote + ' The farmer pool is the model\u2019s own assumption: a launch at the implied value that allocates 5 to 10 per cent to its community puts that much in farmers\u2019 hands, before any split among them.' }));
    body.appendChild(el('h3', { text: 'The farm plan' }));
    var list = el('ol', { class: 'steps' });
    r.farm_steps.forEach(function (s) {
      var parts = stepParts(s);
      list.appendChild(el('li', null, [parts.text, parts.ct ? el('span', { class: 'ct', text: parts.ct }) : null]));
    });
    body.appendChild(list);
    body.appendChild(el('h3', { text: 'The record' }));
    body.appendChild(el('p', { class: 'note', text: 'Chains: ' + (r.chains.join(', ') || 'none recorded') + '. First tracked ' + (r.listed_at || 'on an unrecorded date') + ', ' + ageText(r.age_days) + ' before the snapshot. Seven-day TVL change ' + pct(r.change_7d) + '. The snapshot records no token for this protocol; that is DefiLlama\u2019s record, not proof none exists.' }));
    dialog.appendChild(body);
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  /* ---------- live section ---------- */
  var liveBody = el('tbody');
  DATA.live.forEach(function (p) {
    liveBody.appendChild(el('tr', null, [
      el('td', null, [el('span', { class: 'name', text: p.name })]),
      el('td', { text: p.category || '—' }),
      el('td', { class: 'n num', text: money(p.tvl_usd) }),
      el('td', { class: 'n num', text: money(p.mcap_usd) }),
      el('td', { class: 'n num', text: p.mcap_tvl === null ? '—' : mult(p.mcap_tvl) }),
      el('td', { class: 'n' }, [p.change_7d === null ? el('span', { class: 'flat', text: '—' }) : el('span', { class: p.change_7d > 0 ? 'up' : 'down', text: pct(p.change_7d) })]),
    ]));
  });
  main.appendChild(el('section', { class: 'live', 'aria-label': 'Already trading' }, [
    el('h2', { text: 'Already trading — the peer evidence' }),
    el('p', { text: 'These protocols\u2019 tokens already trade, so the radar never ranks them: it prices the board from them instead. Each one\u2019s market-cap / TVL is a vote on what a launch in its category is worth, and the board\u2019s peer multiples are read off votes like these \u2014 every voter first restated at one common size and stripped of its own week of growth and its years of survival, so none of them is paid for twice.' }),
    el('table', null, [
      el('thead', null, [el('tr', null, [th('Protocol'), th('Category'), th('TVL', null, 'n'), th('Market cap', null, 'n'), th('Cap / TVL', null, 'n'), th('7d', null, 'n')])]),
      liveBody,
    ]),
  ]));

  /* ---------- footer ---------- */
  main.appendChild(el('footer', null, [
    el('p', { text: 'Method: one sealed snapshot of the DefiLlama protocol universe (' + DATA.as_of + '), scored by one stated model (' + DATA.model_version + '). A protocol is on the board when the snapshot records no token for it and it is not a wrapped, staked or versioned product of one that trades; the watchlist\u2019s 40 are the floor, and the other ' + DATA.early_size + ' rows are the radar\u2019s early finds below it.' }),
    el('p', { text: 'An implied value is this model\u2019s claim about what a launch would be worth if the protocol\u2019s record stayed as it is. It is not a prediction that a token will be issued, and no farm plan is financial advice: costs are the ranges a farmer should expect to pay, and positions can be lost.' }),
  ]));

  /* ---------- hash routes (deep links the screenshots use) ---------- */
  var hash = window.location.hash.replace(/^#/, '');
  if (hash === 'watchlist') {
    state.watchOnly = true;
    watchBox.checked = true;
  }
  renderRows();
  if (hash.indexOf('detail=') === 0) {
    var slug = decodeURIComponent(hash.slice('detail='.length));
    var found = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) found = r; });
    if (found) openDetail(found);
  }
  main.setAttribute('aria-busy', 'false');
})();
