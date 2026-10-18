'use strict';
// Estate Empire - game engine. Pure rules, no networking.
const crypto = require('crypto');

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41', '#d81b60'];
const TOKENS = ['🚗', '🎩', '🐕', '🚢', '👢', '🐈', '🛵', '🦆'];

const S_ = (name, group, price, rent, house) => ({ type: 'prop', name, group, price, rent, house });
const ST = (name) => ({ type: 'station', name, price: 200 });
const UT = (name) => ({ type: 'utility', name, price: 150 });

const BOARD = [
  { type: 'go', name: 'START' },
  S_('Mossy Alley', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
  { type: 'chest', name: 'Community Fund' },
  S_('Pebble Court', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
  { type: 'tax', name: 'Income Tax', amount: 200 },
  ST('Northline Rail'),
  S_('Harbor View', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  { type: 'chance', name: 'Surprise' },
  S_('Lantern Quay', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  S_('Seagull Pier', 'lightblue', 120, [8, 40, 100, 300, 450, 600], 50),
  { type: 'jail', name: 'Jail / Just Visiting' },
  S_('Orchard Street', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  UT('Sunrise Power'),
  S_('Cider Lane', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  S_('Blossom Avenue', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
  ST('Eastern Express'),
  S_('Maple Terrace', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  { type: 'chest', name: 'Community Fund' },
  S_('Birch Boulevard', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  S_('Cedar Crescent', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
  { type: 'parking', name: 'Free Parking' },
  S_('Ruby Row', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  { type: 'chance', name: 'Surprise' },
  S_('Crimson Court', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  S_('Scarlet Square', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
  ST('Southgate Rail'),
  S_('Gold Street', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  S_('Amber Avenue', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  UT('Clearwater Utility'),
  S_('Saffron Plaza', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
  { type: 'gotojail', name: 'Go To Jail' },
  S_('Emerald Heights', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  S_('Jade Gardens', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  { type: 'chest', name: 'Community Fund' },
  S_('Fern Promenade', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  ST('Westbound Line'),
  { type: 'chance', name: 'Surprise' },
  S_('Sapphire Tower', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { type: 'tax', name: 'Luxury Levy', amount: 100 },
  S_('Royal Crest', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

const GROUPS = {};
BOARD.forEach((s, i) => { if (s.group) (GROUPS[s.group] = GROUPS[s.group] || []).push(i); });
const STATION_IDX = BOARD.map((s, i) => (s.type === 'station' ? i : -1)).filter((i) => i >= 0);
const UTILITY_IDX = BOARD.map((s, i) => (s.type === 'utility' ? i : -1)).filter((i) => i >= 0);

const CARDS = {
  chest: [
    { text: 'Bank error in your favour. Collect $200.', money: 200 },
    { text: "Doctor's fee. Pay $50.", money: -50 },
    { text: 'Stock sale pays you $50.', money: 50 },
    { text: 'Holiday fund matures. Collect $100.', money: 100 },
    { text: 'Tax refund. Collect $20.', money: 20 },
    { text: 'Hospital bill. Pay $100.', money: -100 },
    { text: 'School fees. Pay $50.', money: -50 },
    { text: 'You inherit $100.', money: 100 },
    { text: 'Second prize in a bake-off. Collect $10.', money: 10 },
    { text: 'Advance to START. Collect $200.', goto: 0 },
    { text: 'Go directly to Jail. Do not pass START.', jail: true },
    { text: 'Get Out of Jail Free. Keep this card until needed.', jailcard: true },
    { text: "It's your birthday! Collect $10 from every player.", collectEach: 10 },
    { text: 'You sell old furniture. Collect $45.', money: 45 },
    { text: 'Street repairs: pay $40 per house and $115 per hotel.', repairs: [40, 115] },
    { text: 'Consultancy fee. Collect $25.', money: 25 },
  ],
  chance: [
    { text: 'Advance to START. Collect $200.', goto: 0 },
    { text: 'Take a trip to Royal Crest.', goto: 39 },
    { text: 'Advance to Orchard Street. If you pass START, collect $200.', goto: 11 },
    { text: 'Advance to Ruby Row. If you pass START, collect $200.', goto: 21 },
    { text: 'Advance to the nearest utility. If unowned you may buy it; otherwise pay the owner 10x a dice roll.', nearest: 'utility' },
    { text: 'Advance to the nearest station. If owned, pay the owner double rent.', nearest: 'station' },
    { text: 'Advance to the nearest station. If owned, pay the owner double rent.', nearest: 'station' },
    { text: 'The bank pays you a dividend of $50.', money: 50 },
    { text: 'Get Out of Jail Free. Keep this card until needed.', jailcard: true },
    { text: 'Go back three spaces.', back: 3 },
    { text: 'Go directly to Jail. Do not pass START.', jail: true },
    { text: 'General repairs: pay $25 per house and $100 per hotel.', repairs: [25, 100] },
    { text: 'Speeding fine. Pay $15.', money: -15 },
    { text: 'Take a ride on Northline Rail. If you pass START, collect $200.', goto: 5 },
    { text: 'You have been elected chairperson. Pay each player $50.', payEach: 50 },
    { text: 'Your building loan matures. Collect $150.', money: 150 },
  ],
};

const rnd = () => crypto.randomInt(1, 7);
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function newGame(settings = {}) {
  const g = {
    settings: {
      startCash: clamp(Math.round(+settings.startCash || 1500), 500, 10000),
      jackpot: !!settings.jackpot,
    },
    phase: 'lobby',
    players: [],
    hostId: 1,
    turn: 0,
    dice: [1, 1],
    rollSeq: 0,
    doubles: 0,
    rolledDoubles: false,
    props: {},
    pot: 0,
    housesLeft: 32,
    hotelsLeft: 12,
    pendingBuy: null,
    auction: null,
    debt: null,
    trade: null,
    tradeSeq: 0,
    lastCard: null,
    cardSeq: 0,
    winner: null,
    log: [],
    decks: { chest: shuffle([...Array(16).keys()]), chance: shuffle([...Array(16).keys()]) },
  };
  BOARD.forEach((s, i) => {
    if (s.price) g.props[i] = { owner: null, houses: 0, mortgaged: false };
  });
  log(g, 'Room created. Waiting for players...');
  return g;
}

function log(g, text, extra) {
  g.log.push(Object.assign({ t: text }, extra || {}));
  if (g.log.length > 300) g.log.shift();
}
const cur = (g) => g.players[g.turn];
const P = (g, id) => g.players.find((p) => p.id === id);
const alive = (g) => g.players.filter((p) => !p.bankrupt);
const ownedBy = (g, pid) => Object.keys(g.props).map(Number).filter((i) => g.props[i].owner === pid);
const $ = (n) => '$' + n;

function addPlayer(g, name) {
  if (g.phase !== 'lobby') return { error: 'Game already started' };
  if (g.players.length >= 8) return { error: 'Room is full (8 players max)' };
  name = String(name || '').trim().slice(0, 16) || 'Player';
  let base = name, n = 2;
  while (g.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) name = base + ' ' + n++;
  const used = g.players.map((p) => p.color);
  const ci = COLORS.findIndex((c) => !used.includes(c));
  const p = {
    id: g.players.length ? Math.max(...g.players.map((x) => x.id)) + 1 : 1,
    name, color: COLORS[ci], token: TOKENS[ci],
    money: 0, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, connected: true,
  };
  g.players.push(p);
  log(g, `${name} joined.`);
  return { player: p };
}

// ---------- rent & ownership ----------
const ownsGroup = (g, pid, group) => GROUPS[group].every((i) => g.props[i].owner === pid);

function calcRent(g, idx, diceSum, stationMult) {
  const sq = BOARD[idx], st = g.props[idx], owner = st.owner;
  if (sq.type === 'prop') {
    if (st.houses > 0) return sq.rent[st.houses];
    return ownsGroup(g, owner, sq.group) ? sq.rent[0] * 2 : sq.rent[0];
  }
  if (sq.type === 'station') {
    const n = STATION_IDX.filter((i) => g.props[i].owner === owner).length;
    return 25 * Math.pow(2, n - 1) * (stationMult || 1);
  }
  const n = UTILITY_IDX.filter((i) => g.props[i].owner === owner).length;
  return diceSum * (n === 2 ? 10 : 4);
}

// ---------- money ----------
function creditTo(g, cred, amt) {
  if (cred.type === 'player') { const o = P(g, cred.id); if (o) o.money += amt; }
  else if (cred.type === 'split') { const each = amt / cred.ids.length; cred.ids.forEach((i) => { const o = P(g, i); if (o) o.money += each; }); }
  else if (cred.type === 'pot') g.pot += amt;
}
// Returns true if paid. Otherwise creates a debt the player must resolve.
function pay(g, p, amt, cred, reason) {
  if (amt <= 0) return true;
  if (p.money >= amt) { p.money -= amt; creditTo(g, cred, amt); return true; }
  g.debt = { pid: p.id, amount: amt, cred, reason: reason || '', resume: null };
  log(g, `${p.name} owes ${$(amt)}${reason ? ' (' + reason + ')' : ''} but only has ${$(p.money)}. Raise cash or go bankrupt!`);
  return false;
}

// ---------- movement ----------
function sendToJail(g, p) {
  p.pos = 10; p.inJail = true; p.jailTurns = 0;
  g.rolledDoubles = false; g.doubles = 0;
  log(g, `${p.name} goes to Jail.`);
}
function moveBy(g, p, steps) {
  const np = p.pos + steps;
  if (np >= 40) { p.money += 200; log(g, `${p.name} passes START and collects $200.`); }
  p.pos = np % 40;
  log(g, `${p.name} lands on ${BOARD[p.pos].name}.`);
  land(g, p);
}
function moveTo(g, p, idx) {
  if (idx < p.pos || idx === 0) { p.money += 200; log(g, `${p.name} passes START and collects $200.`); }
  p.pos = idx;
  log(g, `${p.name} moves to ${BOARD[idx].name}.`);
  land(g, p);
}
function land(g, p, special) {
  const sq = BOARD[p.pos];
  switch (sq.type) {
    case 'prop': case 'station': case 'utility': {
      const st = g.props[p.pos];
      if (!st.owner) { g.phase = 'buy'; g.pendingBuy = p.pos; }
      else if (st.owner !== p.id && !st.mortgaged) {
        const o = P(g, st.owner);
        let rent;
        if (special === 'utility') {
          const d1 = rnd(), d2 = rnd();
          g.dice = [d1, d2]; g.rollSeq++;
          rent = (d1 + d2) * 10;
          log(g, `${p.name} rolls ${d1} + ${d2} for the utility.`);
        } else rent = calcRent(g, p.pos, g.dice[0] + g.dice[1], special === 'station' ? 2 : 1);
        log(g, `${p.name} pays ${$(rent)} rent to ${o.name}.`);
        pay(g, p, rent, { type: 'player', id: o.id }, 'rent to ' + o.name);
      }
      break;
    }
    case 'tax':
      log(g, `${p.name} pays ${sq.name}: ${$(sq.amount)}.`);
      pay(g, p, sq.amount, g.settings.jackpot ? { type: 'pot' } : { type: 'bank' }, sq.name);
      break;
    case 'chest': case 'chance': drawCard(g, p, sq.type); break;
    case 'gotojail': sendToJail(g, p); break;
    case 'parking':
      if (g.settings.jackpot && g.pot > 0) { p.money += g.pot; log(g, `${p.name} wins the Free Parking jackpot of ${$(g.pot)}!`); g.pot = 0; }
      break;
  }
}

function drawCard(g, p, deck) {
  const defs = CARDS[deck];
  const ci = g.decks[deck].shift();
  const c = defs[ci];
  g.lastCard = { deck, text: c.text, pid: p.id, seq: ++g.cardSeq };
  log(g, `${p.name} draws ${deck === 'chest' ? 'Community Fund' : 'Surprise'}: "${c.text}"`);
  if (c.jailcard) { p.jailCards.push({ deck, ci }); return; }
  g.decks[deck].push(ci);
  if (c.money) { if (c.money > 0) p.money += c.money; else pay(g, p, -c.money, { type: 'bank' }, 'card'); }
  else if (c.goto !== undefined) moveTo(g, p, c.goto);
  else if (c.back) { p.pos = (p.pos - c.back + 40) % 40; log(g, `${p.name} moves back to ${BOARD[p.pos].name}.`); land(g, p); }
  else if (c.jail) sendToJail(g, p);
  else if (c.collectEach) {
    alive(g).filter((q) => q.id !== p.id).forEach((q) => {
      const amt = Math.min(q.money, c.collectEach);
      q.money -= amt; p.money += amt;
    });
  } else if (c.payEach) {
    const others = alive(g).filter((q) => q.id !== p.id);
    if (others.length) pay(g, p, c.payEach * others.length, { type: 'split', ids: others.map((q) => q.id) }, 'card');
  } else if (c.repairs) {
    let h = 0, ho = 0;
    ownedBy(g, p.id).forEach((i) => { const hh = g.props[i].houses; if (hh === 5) ho++; else h += hh; });
    const cost = h * c.repairs[0] + ho * c.repairs[1];
    if (cost > 0) pay(g, p, cost, { type: 'bank' }, 'repairs');
  } else if (c.nearest) {
    const list = c.nearest === 'station' ? STATION_IDX : UTILITY_IDX;
    let idx = list.find((i) => i > p.pos);
    if (idx === undefined) idx = list[0];
    if (idx < p.pos) { p.money += 200; log(g, `${p.name} passes START and collects $200.`); }
    p.pos = idx;
    log(g, `${p.name} moves to ${BOARD[idx].name}.`);
    land(g, p, c.nearest);
  }
}

// ---------- turn flow ----------
function postPhase(g) {
  const p = cur(g);
  return g.rolledDoubles && !p.inJail && !p.bankrupt ? 'roll' : 'end';
}
function settle(g) {
  if (g.phase === 'over') return;
  if (g.debt) { g.phase = 'debt'; return; }
  if (g.phase === 'buy') return;
  g.phase = postPhase(g);
}
function nextTurn(g) {
  if (checkWinner(g)) return;
  do { g.turn = (g.turn + 1) % g.players.length; } while (cur(g).bankrupt);
  g.doubles = 0; g.rolledDoubles = false; g.phase = 'roll'; g.pendingBuy = null;
  log(g, `It's ${cur(g).name}'s turn.`);
}
function checkWinner(g) {
  const a = alive(g);
  if (a.length <= 1 && g.phase !== 'lobby') {
    g.phase = 'over'; g.winner = a[0] ? a[0].id : null;
    if (a[0]) log(g, `🏆 ${a[0].name} wins the game!`);
    return true;
  }
  return false;
}

function doRoll(g, p) {
  const d1 = rnd(), d2 = rnd(), sum = d1 + d2, dbl = d1 === d2;
  g.dice = [d1, d2]; g.rollSeq++; g.lastCard = null;
  log(g, `${p.name} rolled ${d1} + ${d2}${dbl ? ' (doubles!)' : ''}.`);
  if (p.inJail) {
    if (dbl) {
      p.inJail = false; p.jailTurns = 0; g.doubles = 0; g.rolledDoubles = false;
      log(g, `${p.name} rolls doubles and escapes Jail!`);
      moveBy(g, p, sum); settle(g); return;
    }
    p.jailTurns++;
    g.rolledDoubles = false;
    if (p.jailTurns >= 3) {
      log(g, `${p.name} must pay $50 to leave Jail.`);
      p.inJail = false; p.jailTurns = 0;
      if (!pay(g, p, 50, { type: 'bank' }, 'jail fine')) { g.debt.resume = { type: 'move', steps: sum }; settle(g); return; }
      moveBy(g, p, sum); settle(g);
    } else { log(g, `${p.name} stays in Jail.`); g.phase = 'end'; }
    return;
  }
  if (dbl) {
    g.doubles++;
    if (g.doubles >= 3) { log(g, `${p.name} rolled doubles three times - straight to Jail!`); sendToJail(g, p); settle(g); return; }
  } else g.doubles = 0;
  g.rolledDoubles = dbl;
  moveBy(g, p, sum); settle(g);
}

// ---------- auctions ----------
function startAuction(g, idx) {
  g.pendingBuy = null;
  g.auction = { idx, bid: 0, bidder: null, passed: [] };
  g.phase = 'auction';
  log(g, `Auction started for ${BOARD[idx].name}.`);
  checkAuction(g);
}
function checkAuction(g) {
  const a = g.auction; if (!a) return;
  alive(g).forEach((p) => { if (!a.passed.includes(p.id) && p.id !== a.bidder && p.money <= a.bid) a.passed.push(p.id); });
  const active = alive(g).filter((p) => !a.passed.includes(p.id) && p.connected !== false);
  const others = active.filter((p) => p.id !== a.bidder);
  let done = false;
  if (a.bidder !== null && others.length === 0) done = true;
  if (a.bidder === null && active.length === 0) done = true;
  if (!done) return;
  if (a.bidder !== null) {
    const w = P(g, a.bidder);
    w.money -= a.bid; g.props[a.idx].owner = w.id;
    log(g, `${w.name} wins ${BOARD[a.idx].name} for ${$(a.bid)}.`);
  } else log(g, `Nobody bid on ${BOARD[a.idx].name}. It stays with the bank.`);
  g.auction = null;
  g.phase = cur(g).bankrupt ? 'end' : postPhase(g);
  if (cur(g).bankrupt) nextTurn(g);
}

// ---------- buildings & mortgages ----------
function buildErr(g, p, idx) {
  const sq = BOARD[idx], st = g.props[idx];
  if (!sq || sq.type !== 'prop') return 'Only streets can be built on';
  if (st.owner !== p.id) return 'You do not own that';
  const grp = GROUPS[sq.group];
  if (!grp.every((i) => g.props[i].owner === p.id)) return 'You need the whole colour set';
  if (grp.some((i) => g.props[i].mortgaged)) return 'Unmortgage the whole set first';
  if (st.houses >= 5) return 'Already has a hotel';
  if (st.houses > Math.min(...grp.map((i) => g.props[i].houses))) return 'Build evenly across the set';
  if (p.money < sq.house) return 'Not enough cash';
  if (st.houses < 4 ? g.housesLeft < 1 : g.hotelsLeft < 1) return 'The bank has run out';
  return null;
}
function sellErr(g, p, idx) {
  const sq = BOARD[idx], st = g.props[idx];
  if (!sq || sq.type !== 'prop') return 'Not a street';
  if (st.owner !== p.id) return 'You do not own that';
  if (st.houses < 1) return 'No buildings to sell';
  if (st.houses < Math.max(...GROUPS[sq.group].map((i) => g.props[i].houses))) return 'Sell evenly across the set';
  if (st.houses === 5 && g.housesLeft < 4) return 'Not enough houses in the bank to replace the hotel';
  return null;
}
function mortgageErr(g, p, idx) {
  const sq = BOARD[idx], st = g.props[idx];
  if (!st) return 'Not a property';
  if (st.owner !== p.id) return 'You do not own that';
  if (st.mortgaged) return 'Already mortgaged';
  if (sq.group && GROUPS[sq.group].some((i) => g.props[i].houses > 0)) return 'Sell all buildings in the set first';
  return null;
}
const unmortgageCost = (idx) => Math.ceil(BOARD[idx].price / 2 * 1.1);
function unmortgageErr(g, p, idx) {
  const st = g.props[idx];
  if (!st) return 'Not a property';
  if (st.owner !== p.id) return 'You do not own that';
  if (!st.mortgaged) return 'Not mortgaged';
  if (p.money < unmortgageCost(idx)) return 'Not enough cash';
  return null;
}

// ---------- trading ----------
function normSide(s) {
  s = s || {};
  return {
    money: Math.max(0, Math.floor(+s.money || 0)),
    props: Array.isArray(s.props) ? [...new Set(s.props.map(Number))].filter((i) => Number.isInteger(i)) : [],
    cards: Math.max(0, Math.floor(+s.cards || 0)),
  };
}
function tradeErr(g, t) {
  const a = P(g, t.from), b = P(g, t.to);
  if (!a || !b || a.bankrupt || b.bankrupt || a.id === b.id) return 'Invalid trade partners';
  const empty = (s) => !s.money && !s.props.length && !s.cards;
  if (empty(t.offer) && empty(t.request)) return 'Trade is empty';
  const side = (s, p, name) => {
    if (s.money > p.money) return `${name} does not have that much cash`;
    if (s.cards > p.jailCards.length) return `${name} does not have that many jail cards`;
    for (const i of s.props) {
      const st = g.props[i];
      if (!st || st.owner !== p.id) return `${name} does not own ${BOARD[i] ? BOARD[i].name : 'that'}`;
      const grp = BOARD[i].group;
      if (grp && GROUPS[grp].some((j) => g.props[j].houses > 0)) return `Sell buildings in the ${grp} set before trading it`;
    }
    return null;
  };
  return side(t.offer, a, a.name) || side(t.request, b, b.name);
}
function execTrade(g, t) {
  const a = P(g, t.from), b = P(g, t.to);
  a.money += t.request.money - t.offer.money;
  b.money += t.offer.money - t.request.money;
  t.offer.props.forEach((i) => { g.props[i].owner = b.id; });
  t.request.props.forEach((i) => { g.props[i].owner = a.id; });
  b.jailCards.push(...a.jailCards.splice(a.jailCards.length - t.offer.cards, t.offer.cards));
  a.jailCards.push(...b.jailCards.splice(b.jailCards.length - t.request.cards, t.request.cards));
  log(g, `🤝 ${a.name} and ${b.name} completed a trade.`);
}

// ---------- bankruptcy ----------
function releaseAll(g, p) {
  ownedBy(g, p.id).forEach((i) => {
    const st = g.props[i];
    if (st.houses === 5) { g.hotelsLeft++; } else g.housesLeft += st.houses;
    st.houses = 0; st.owner = null; st.mortgaged = false;
  });
  p.jailCards.forEach((c) => g.decks[c.deck].push(c.ci));
  p.jailCards = [];
}
function goBankrupt(g, p) {
  const d = g.debt && g.debt.pid === p.id ? g.debt : null;
  const cred = d && d.cred.type === 'player' ? P(g, d.cred.id) : null;
  if (cred && !cred.bankrupt) {
    log(g, `💥 ${p.name} is bankrupt! Everything goes to ${cred.name}.`);
    cred.money += p.money;
    cred.jailCards.push(...p.jailCards); p.jailCards = [];
    ownedBy(g, p.id).forEach((i) => {
      const st = g.props[i];
      if (st.houses === 5) g.hotelsLeft++; else g.housesLeft += st.houses;
      st.houses = 0; st.owner = cred.id;
    });
  } else {
    log(g, `💥 ${p.name} is bankrupt! Their properties return to the bank.`);
    releaseAll(g, p);
  }
  p.money = 0; p.bankrupt = true; p.inJail = false;
  if (g.debt && g.debt.pid === p.id) g.debt = null;
  if (g.trade && (g.trade.from === p.id || g.trade.to === p.id)) g.trade = null;
  if (g.auction) { g.auction.passed.push(p.id); if (g.auction.bidder === p.id) { g.auction.bidder = null; g.auction.bid = 0; } }
  if (checkWinner(g)) return;
  if (g.auction) { checkAuction(g); return; }
  if (cur(g).id === p.id) nextTurn(g);
}

// ---------- main action dispatcher ----------
const manageOk = (g, p) => !p.bankrupt && g.phase !== 'lobby' && g.phase !== 'over' && g.phase !== 'auction';

function act(g, pid, m) {
  const p = P(g, pid);
  if (!p) return 'Unknown player';
  const isTurn = g.phase !== 'lobby' && cur(g) && cur(g).id === pid;
  const a = m.a;

  if (a === 'chat') {
    const text = String(m.text || '').trim().slice(0, 200);
    if (text) log(g, text, { chat: true, name: p.name, color: p.color });
    return null;
  }
  if (g.phase === 'over') return 'The game is over';

  if (g.phase === 'lobby') {
    if (a === 'settings') {
      if (pid !== g.hostId) return 'Only the host can change settings';
      if (m.startCash !== undefined) g.settings.startCash = clamp(Math.round(+m.startCash || 1500), 500, 10000);
      if (m.jackpot !== undefined) g.settings.jackpot = !!m.jackpot;
      return null;
    }
    if (a === 'start') {
      if (pid !== g.hostId) return 'Only the host can start the game';
      if (g.players.length < 2) return 'Need at least 2 players';
      g.players = shuffle(g.players);
      g.players.forEach((q) => { q.money = g.settings.startCash; });
      g.turn = 0; g.phase = 'roll';
      log(g, `Game started! ${cur(g).name} goes first.`);
      return null;
    }
    if (a === 'kick' && pid === g.hostId && m.id !== pid) {
      const i = g.players.findIndex((q) => q.id === m.id);
      if (i >= 0) { log(g, `${g.players[i].name} was removed.`); g.players.splice(i, 1); }
      return null;
    }
    return 'Game has not started';
  }

  if (a === 'kick') {
    if (pid !== g.hostId) return 'Only the host can remove players';
    const q = P(g, m.id);
    if (!q || q.bankrupt || q.id === pid) return 'Cannot remove that player';
    log(g, `${q.name} was removed by the host.`);
    goBankrupt(g, q);
    return null;
  }

  switch (a) {
    case 'roll':
      if (!isTurn || g.phase !== 'roll') return 'Not your roll';
      doRoll(g, p); return null;
    case 'payJail':
      if (!isTurn || g.phase !== 'roll' || !p.inJail) return 'Not in jail';
      if (p.money < 50) return 'Not enough cash';
      p.money -= 50; p.inJail = false; p.jailTurns = 0;
      log(g, `${p.name} pays $50 to leave Jail.`); return null;
    case 'useJailCard': {
      if (!isTurn || g.phase !== 'roll' || !p.inJail) return 'Not in jail';
      if (!p.jailCards.length) return 'No Get Out of Jail Free card';
      const c = p.jailCards.pop(); g.decks[c.deck].push(c.ci);
      p.inJail = false; p.jailTurns = 0;
      log(g, `${p.name} uses a Get Out of Jail Free card.`); return null;
    }
    case 'buy': {
      if (!isTurn || g.phase !== 'buy') return 'Nothing to buy';
      const idx = g.pendingBuy, price = BOARD[idx].price;
      if (p.money < price) return 'Not enough cash';
      p.money -= price; g.props[idx].owner = p.id; g.pendingBuy = null;
      log(g, `${p.name} buys ${BOARD[idx].name} for ${$(price)}.`);
      g.phase = postPhase(g); return null;
    }
    case 'decline':
      if (!isTurn || g.phase !== 'buy') return 'Nothing to decline';
      startAuction(g, g.pendingBuy); return null;
    case 'endTurn':
      if (!isTurn || g.phase !== 'end') return 'You cannot end your turn yet';
      nextTurn(g); return null;
    case 'bid': {
      if (g.phase !== 'auction' || !g.auction) return 'No auction';
      const au = g.auction;
      if (p.bankrupt || au.passed.includes(pid)) return 'You have passed';
      const amt = Math.floor(+m.amount);
      if (!(amt > au.bid)) return 'Bid must be higher than the current bid';
      if (amt > p.money) return 'Not enough cash';
      if (au.bidder === pid) return 'You are already the highest bidder';
      au.bid = amt; au.bidder = pid;
      log(g, `${p.name} bids ${$(amt)}.`);
      checkAuction(g); return null;
    }
    case 'pass': {
      if (g.phase !== 'auction' || !g.auction) return 'No auction';
      const au = g.auction;
      if (au.bidder === pid) return 'You are the highest bidder';
      if (!au.passed.includes(pid)) au.passed.push(pid);
      checkAuction(g); return null;
    }
    case 'payDebt': {
      if (g.phase !== 'debt' || !g.debt || g.debt.pid !== pid) return 'No debt to pay';
      const d = g.debt;
      if (p.money < d.amount) return 'Not enough cash yet - mortgage or sell buildings';
      p.money -= d.amount; creditTo(g, d.cred, d.amount);
      log(g, `${p.name} settles the ${$(d.amount)} debt.`);
      g.debt = null;
      if (d.resume && d.resume.type === 'move') { moveBy(g, p, d.resume.steps); }
      settle(g); return null;
    }
    case 'bankrupt':
      if (g.phase !== 'debt' || !g.debt || g.debt.pid !== pid) return 'You are not in debt';
      goBankrupt(g, p); return null;
    case 'build': case 'sell': case 'mortgage': case 'unmortgage': {
      if (!manageOk(g, p)) return 'Not available right now';
      const idx = Math.floor(+m.idx);
      if (!g.props[idx]) return 'Not a property';
      if (a === 'build') {
        if (g.debt && g.debt.pid === pid) return 'Settle your debt first';
        const e = buildErr(g, p, idx); if (e) return e;
        const st = g.props[idx];
        p.money -= BOARD[idx].house;
        if (st.houses < 4) { st.houses++; g.housesLeft--; } else { st.houses = 5; g.hotelsLeft--; g.housesLeft += 4; }
        log(g, `${p.name} builds on ${BOARD[idx].name}.`);
      } else if (a === 'sell') {
        const e = sellErr(g, p, idx); if (e) return e;
        const st = g.props[idx];
        if (st.houses === 5) { st.houses = 4; g.hotelsLeft++; g.housesLeft -= 4; } else { st.houses--; g.housesLeft++; }
        p.money += BOARD[idx].house / 2;
        log(g, `${p.name} sells a building on ${BOARD[idx].name}.`);
      } else if (a === 'mortgage') {
        const e = mortgageErr(g, p, idx); if (e) return e;
        g.props[idx].mortgaged = true; p.money += BOARD[idx].price / 2;
        log(g, `${p.name} mortgages ${BOARD[idx].name}.`);
      } else {
        const e = unmortgageErr(g, p, idx); if (e) return e;
        p.money -= unmortgageCost(idx); g.props[idx].mortgaged = false;
        log(g, `${p.name} unmortgages ${BOARD[idx].name}.`);
      }
      return null;
    }
    case 'tradePropose': {
      if (!manageOk(g, p)) return 'Not available right now';
      if (g.trade) return 'Another trade is already in progress';
      const t = { id: ++g.tradeSeq, from: pid, to: Math.floor(+m.to), offer: normSide(m.offer), request: normSide(m.request) };
      const e = tradeErr(g, t); if (e) return e;
      g.trade = t;
      log(g, `${p.name} proposes a trade to ${P(g, t.to).name}.`);
      return null;
    }
    case 'tradeAccept': {
      const t = g.trade;
      if (!t || t.to !== pid) return 'No trade offer for you';
      const e = tradeErr(g, t);
      if (e) { g.trade = null; log(g, 'The trade is no longer valid and was cancelled.'); return e; }
      execTrade(g, t); g.trade = null; return null;
    }
    case 'tradeDecline':
      if (!g.trade || g.trade.to !== pid) return 'No trade offer for you';
      log(g, `${p.name} declines the trade.`); g.trade = null; return null;
    case 'tradeCancel':
      if (!g.trade || g.trade.from !== pid) return 'You have no trade to cancel';
      g.trade = null; return null;
  }
  return 'Unknown action';
}

// Called after connection changes (auto-pass disconnected players in auctions)
function tick(g) { if (g.auction) checkAuction(g); }

function netWorth(g, p) {
  let w = p.money;
  ownedBy(g, p.id).forEach((i) => {
    const s = BOARD[i], st = g.props[i];
    w += st.mortgaged ? s.price / 2 : s.price;
    if (s.house) w += st.houses * s.house;
  });
  return w;
}

function view(g, pid) {
  const { decks, ...rest } = g;
  const out = Object.assign({}, rest, { log: g.log.slice(-120), you: pid, can: {}, unmortgageCost: {} });
  out.players = g.players.map((q) => Object.assign({}, q, { worth: netWorth(g, q) }));
  const me = P(g, pid);
  if (me && manageOk(g, me)) {
    ownedBy(g, pid).forEach((i) => {
      out.can[i] = {
        build: !buildErr(g, me, i) && !(g.debt && g.debt.pid === pid),
        sell: !sellErr(g, me, i),
        mortgage: !mortgageErr(g, me, i),
        unmortgage: !unmortgageErr(g, me, i),
      };
      if (g.props[i].mortgaged) out.unmortgageCost[i] = unmortgageCost(i);
    });
  }
  return out;
}

module.exports = { BOARD, GROUPS, CARDS, newGame, addPlayer, act, tick, view, P, cur, alive, ownedBy, calcRent, netWorth };
