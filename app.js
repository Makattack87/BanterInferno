/* ==========================================================
   Top Bins Tipping League – app.js
   Structure: DATA → API (swap for Firebase/Supabase) → helpers → views → init
   ========================================================== */
'use strict';

/* ---------- 1. Data (shapes mirror future DB tables) ---------- */
const DB = {
  competition: { name: 'Top Bins Tipping League', season: '2026/27', gameweek: 11, deadline: 0 },  // deadline = first kick-off of the round (set below)
  currentUserId: 'u4',
  jokerAvailable: true,
  teams: {
    ARS: { name: 'Arsenal', color: '#EF0107' }, BHA: { name: 'Brighton', color: '#0057B8' }, MCI: { name: 'Manchester City', color: '#5a9fd0' },
    LIV: { name: 'Liverpool', color: '#C8102E' }, CHE: { name: 'Chelsea', color: '#034694' }, EVE: { name: 'Everton', color: '#003399' },
    BOU: { name: 'Bournemouth', color: '#c4161c' }, BRE: { name: 'Brentford', color: '#E30613' }, LEE: { name: 'Leeds United', color: '#1D428A' },
    AVL: { name: 'Aston Villa', color: '#670E36' }, TOT: { name: 'Tottenham', color: '#132257' }, NEW: { name: 'Newcastle', color: '#241F20' },
    HUL: { name: 'Hull City', color: '#d98a00' }, IPS: { name: 'Ipswich Town', color: '#0044AA' }, FUL: { name: 'Fulham', color: '#333333' },
    NFO: { name: 'Nottingham Forest', color: '#DD0000' }, COV: { name: 'Coventry City', color: '#2aa6c9' }, MUN: { name: 'Manchester United', color: '#DA291C' },
    SUN: { name: 'Sunderland', color: '#EB172B' }, CRY: { name: 'Crystal Palace', color: '#1B458F' },
    SWI: { name: 'Swindon Town', color: '#D71920', other: true }   // other = pickable club colours only, not in the PL table/fixtures
  },
  users: [
    { id: 'u1', name: 'Jamie Carragher-Fan' }, { id: 'u2', name: 'Priya Nair' }, { id: 'u3', name: 'Tom Hendry' },
    { id: 'u4', name: 'You' }, { id: 'u5', name: 'Mia Chen' }, { id: 'u6', name: 'Dan O\'Brien' },
    { id: 'u7', name: 'Sofia Rossi' }, { id: 'u8', name: 'Liam Walker' }, { id: 'u9', name: 'Ava Thompson' }, { id: 'u10', name: 'Noah Singh' }
  ],
  fixtures: [], tips: [], results: [],   // filled from FEED below
  // Real Premier League table snapshot after 10 matches each: [club, P, W, D, L, GF, GA] (points + GD are derived)
  table: [['ARS',10,9,0,1,15,5],['BHA',10,7,1,2,26,7],['MCI',10,7,0,3,21,13],['LIV',10,5,3,2,14,10],['CHE',10,5,1,4,19,16],
    ['EVE',10,4,4,2,12,10],['BOU',10,4,3,3,16,14],['BRE',10,3,5,2,16,11],['LEE',10,3,5,2,10,8],['AVL',10,3,4,3,14,17],
    ['TOT',10,3,3,4,10,11],['NEW',10,3,3,4,13,16],['HUL',10,2,5,3,11,11],['IPS',10,3,2,5,15,20],['FUL',10,2,4,4,10,12],
    ['NFO',10,2,3,5,9,13],['COV',10,3,0,7,10,19],['MUN',10,1,5,4,14,19],['SUN',10,2,2,6,8,17],['CRY',10,2,1,7,10,24]],
  leaderboard: [  // prev = position last round
    { userId: 'u1', weekly: 7, total: 74, prev: 1 }, { userId: 'u2', weekly: 9, total: 71, prev: 3 },
    { userId: 'u3', weekly: 4, total: 69, prev: 2 }, { userId: 'u4', weekly: 6, total: 66, prev: 5 },
    { userId: 'u5', weekly: 3, total: 64, prev: 4 }, { userId: 'u6', weekly: 5, total: 60, prev: 6 },
    { userId: 'u7', weekly: 2, total: 55, prev: 7 }, { userId: 'u8', weekly: 6, total: 53, prev: 9 },
    { userId: 'u9', weekly: 1, total: 49, prev: 8 }, { userId: 'u10', weekly: 3, total: 41, prev: 10 }
  ],
  activity: [
    { icon: 'fa-star', text: 'Priya Nair played their Joker in GW10', time: '2h ago' },
    { icon: 'fa-bullseye', text: 'Tom Hendry nailed Liverpool 2-1 Chelsea', time: '5h ago' },
    { icon: 'fa-arrow-trend-up', text: 'You climbed 1 place to 4th', time: '1d ago' },
    { icon: 'fa-user-plus', text: 'Noah Singh joined the league', time: '3d ago' }
  ],
  season: { me: [4, 6, 3, 7, 5, 9, 4, 6, 8, 5], avg: [4, 4, 5, 5, 4, 6, 5, 5, 6, 5] }  // points per GW
};

/* Club colour themes: b = brand (buttons, highlights), a = accent (on dark header), t = deep tint (backgrounds) */
const THEMES = {
  default: { b: '#e90052', a: '#00ff85', t: '#38003c' },   // Premier League look
  ARS: { b: '#EF0107', a: '#f6c453', t: '#8a0a10' }, BHA: { b: '#0057B8', a: '#e8f1ff', t: '#0a3f8a' },
  MCI: { b: '#6CABDD', a: '#ffffff', t: '#1f5f8f' }, LIV: { b: '#C8102E', a: '#f6eb61', t: '#8a0a1f' },
  CHE: { b: '#034694', a: '#DBA111', t: '#034694' }, EVE: { b: '#003399', a: '#ffffff', t: '#003399' },
  BOU: { b: '#DA291C', a: '#ffffff', t: '#7a1710' }, BRE: { b: '#E30613', a: '#FBB800', t: '#8f0610' },
  LEE: { b: '#FFCD00', a: '#ffffff', t: '#1D428A' }, AVL: { b: '#b5245f', a: '#95BFE5', t: '#670E36' },
  TOT: { b: '#2b4aa8', a: '#ffffff', t: '#132257' }, NEW: { b: '#e6e6e6', a: '#9a9a9a', t: '#241F20' },
  HUL: { b: '#F5A12D', a: '#ffffff', t: '#7a4f06' }, IPS: { b: '#0044AA', a: '#ffffff', t: '#0044AA' },
  FUL: { b: '#f2f2f2', a: '#ff4d4d', t: '#2a2a2a' }, NFO: { b: '#DD0000', a: '#ffffff', t: '#8f0000' },
  COV: { b: '#59CBE8', a: '#ffffff', t: '#1b6e85' }, MUN: { b: '#DA291C', a: '#FBE122', t: '#8f1a12' },
  SUN: { b: '#EB172B', a: '#ffffff', t: '#9a0f1d' }, CRY: { b: '#1B458F', a: '#e8334f', t: '#1B458F' },
  SWI: { b: '#D71920', a: '#ffffff', t: '#8a0f14' }
};

/* Fixture feed: "gameweek kickoff(UTC) home away [homeGoals awayGoals]". GW11+ are the real schedule;
   GW9-10 are SAMPLE results so the Results/Tips pages have history. Replace with an API later. */
const FEED = `
9 2026-10-31T15:00Z BHA FUL 3 0
9 2026-10-31T17:30Z MUN LEE 1 1
9 2026-11-01T14:00Z EVE NFO 2 1
9 2026-11-01T16:30Z CRY BRE 0 2
10 2026-11-07T15:00Z LIV CHE 2 1
10 2026-11-07T17:30Z MCI BOU 3 1
10 2026-11-08T14:00Z NEW AVL 1 1
10 2026-11-08T16:30Z ARS TOT 2 0
11 2026-11-21T12:30Z MCI FUL
11 2026-11-21T15:00Z TOT IPS
11 2026-11-21T15:00Z COV CRY
11 2026-11-21T15:00Z CHE LEE
11 2026-11-21T15:00Z AVL SUN
11 2026-11-21T15:00Z BOU NFO
11 2026-11-21T17:30Z NEW ARS
11 2026-11-22T14:00Z HUL BHA
11 2026-11-22T16:30Z LIV MUN
11 2026-11-23T20:00Z BRE EVE
12 2026-11-27T20:00Z NFO CHE
12 2026-11-28T15:00Z MUN BRE
12 2026-11-28T15:00Z LEE COV
12 2026-11-28T17:30Z IPS AVL
12 2026-11-29T12:00Z EVE LIV
12 2026-11-29T14:05Z SUN TOT
12 2026-11-29T14:05Z FUL BOU
12 2026-11-29T14:05Z CRY HUL
12 2026-11-29T14:05Z BHA NEW
12 2026-11-29T16:30Z ARS MCI
13 2026-12-01T20:00Z COV IPS
13 2026-12-02T19:30Z MCI LEE
13 2026-12-02T19:30Z CHE CRY
13 2026-12-02T19:30Z LIV SUN
13 2026-12-02T19:30Z HUL NFO
13 2026-12-02T20:15Z NEW MUN
13 2026-12-02T20:15Z BRE ARS
13 2026-12-02T20:15Z AVL EVE
13 2026-12-02T20:15Z BOU BHA
13 2026-12-03T20:00Z TOT FUL
14 2026-12-05T12:30Z CHE LIV
14 2026-12-05T15:00Z LEE IPS
14 2026-12-05T15:00Z BOU HUL
14 2026-12-05T15:00Z AVL CRY
14 2026-12-05T15:00Z MUN COV
14 2026-12-05T17:30Z NFO BHA
14 2026-12-05T20:00Z BRE MCI
14 2026-12-06T14:00Z NEW SUN
14 2026-12-06T14:00Z EVE FUL
14 2026-12-06T16:30Z TOT ARS
15 2026-12-12T15:00Z LIV LEE
15 2026-12-12T15:00Z FUL BRE
15 2026-12-12T15:00Z IPS NEW
15 2026-12-12T17:30Z MCI CHE
15 2026-12-13T14:00Z SUN NFO
15 2026-12-13T14:00Z BHA EVE
15 2026-12-13T14:00Z ARS BOU
15 2026-12-13T16:30Z COV AVL
15 2026-12-13T19:00Z CRY MUN
15 2026-12-14T20:00Z HUL TOT
16 2026-12-19T12:30Z BRE NEW
16 2026-12-19T15:00Z LEE FUL
16 2026-12-19T15:00Z BOU COV
16 2026-12-19T15:00Z MCI HUL
16 2026-12-19T17:30Z LIV TOT
16 2026-12-20T14:00Z SUN CRY
16 2026-12-20T14:00Z NFO EVE
16 2026-12-20T14:00Z BHA IPS
16 2026-12-20T16:30Z ARS MUN
16 2026-12-21T20:00Z CHE AVL
17 2026-12-26T12:30Z AVL LEE
17 2026-12-26T15:00Z TOT BOU
17 2026-12-26T15:00Z EVE SUN
17 2026-12-26T15:00Z IPS BRE
17 2026-12-26T15:00Z FUL BHA
17 2026-12-26T17:30Z HUL LIV
17 2026-12-26T20:00Z NEW MCI
17 2026-12-27T14:00Z COV CHE
17 2026-12-27T16:30Z MUN NFO
17 2026-12-27T19:00Z CRY ARS
18 2026-12-29T19:30Z HUL LEE
18 2026-12-29T19:30Z TOT BHA
18 2026-12-29T20:15Z EVE MCI
18 2026-12-30T19:30Z NEW NFO
18 2026-12-30T19:30Z MUN SUN
18 2026-12-30T19:30Z FUL ARS
18 2026-12-30T19:30Z CRY BOU
18 2026-12-30T19:30Z COV BRE
18 2026-12-30T20:15Z IPS CHE
18 2026-12-30T20:15Z AVL LIV`;

function hydrateFromFixtures() {
  const gw = DB.competition.gameweek;
  DB.competition.deadline = Math.min(...DB.fixtures.filter(f => f.gw === gw).map(f => Date.parse(f.kickoff)));
  DB.tips = [];
  let s = 42; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const goals = () => [0, 0, 1, 1, 1, 2, 2, 3][Math.floor(rnd() * 8)];
  DB.fixtures.filter(f => f.gw <= gw).forEach(f => DB.users.forEach(u => {
    if (u.id === DB.currentUserId && f.gw === gw) return;
    DB.tips.push({ userId: u.id, fixtureId: f.id, home: goals(), away: goals() });
  }));
}

/* ---------- 2. Data access layer ---------- */
const SUPABASE_URL = 'https://bxaqrqiqnhyfpqjtdqyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OjceILHspZRsAtBu4vHbag_X2fZpnq6';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fixtureFromRow = r => ({
  id: String(r.id),
  gw: r.gameweek,
  kickoff: new Date(r.kickoff).toISOString(),
  home: r.home,
  away: r.away
});

const API = {
  loadFixtures: async () => {
    const { data, error } = await sb.from('fixtures')
      .select('id, gameweek, kickoff, home, away, home_goals, away_goals')
      .order('gameweek').order('kickoff').order('id');
    if (error) throw error;
    DB.fixtures = data.map(fixtureFromRow);
    DB.results = data.filter(r => r.home_goals !== null && r.away_goals !== null)
      .map(r => ({ fixtureId: String(r.id), home: r.home_goals, away: r.away_goals }));
    return DB.fixtures;
  },
  getFixtures: (gw) => DB.fixtures.filter(f => f.gw === gw),
  getLeaderboard: () => DB.leaderboard,
  getResults: () => DB.results,
  getMyTips: () => DB.tips.filter(t => t.userId === DB.currentUserId),
  saveTips: async (tips, joker) => { Object.assign(state.tips, tips); state.joker = joker; return true; }
};

/* ---------- 3. State & helpers ---------- */
const state = { view: 'dashboard', tips: {}, submitted: false, joker: false, skip: 0, tipsGw: null, team: null };
/** App clock (the demo button can fast-forward it) */
const now = () => Date.now() + state.skip;
const $ = (s, el = document) => el.querySelector(s);
const user = id => DB.users.find(u => u.id === id);
const fixture = id => DB.fixtures.find(f => f.id === id);
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const isLocked = () => now() >= DB.competition.deadline;
const fmtDate = iso => new Date(iso).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const badge = (code, sm) => `<span class="badge ${sm ? 'badge--sm' : ''}" style="background:${DB.teams[code].color}" aria-hidden="true">${code}</span>`;

/** Scoring: exact = 3, correct result = 1, else 0. Joker doubles. */
function scoreTip(tip, res, joker = false) {
  const sign = (h, a) => Math.sign(h - a);
  let kind = 'wrong', pts = 0;
  if (tip.home === res.home && tip.away === res.away) { kind = 'exact'; pts = 3; }
  else if (sign(tip.home, tip.away) === sign(res.home, res.away)) { kind = 'correct'; pts = 1; }
  return { kind, pts: joker ? pts * 2 : pts };
}

/** Completed fixtures joined with the user's tip + points */
function myResults() {
  return API.getResults().map(r => {
    const f = fixture(r.fixtureId), t = API.getMyTips().find(t => t.fixtureId === r.fixtureId);
    return { fixture: f, result: r, tip: t, ...scoreTip(t, r) };
  });
}
const myPosition = () => sortedBoard().findIndex(r => r.userId === DB.currentUserId) + 1;
const sortedBoard = () => [...API.getLeaderboard()].sort((a, b) => b.total - a.total);
const trophy = p => p <= 3 ? `<i class="fa-solid fa-trophy trophy-${p}" title="Top 3"></i>` : '';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- Interactive tiles ---------- */
/** Stat tile. o.go = link to a view, o.detail = tap to expand extra info */
function tile(icon, label, value, sub, o = {}) {
  const interactive = o.go || o.detail;
  const attrs = o.go ? `data-go="${o.go}"${o.focus ? ' data-focus="me"' : ''}` : o.detail ? 'data-expand aria-expanded="false"' : '';
  const tag = interactive ? 'button type="button"' : 'div', end = interactive ? 'button' : 'div';
  const arrow = o.go ? 'fa-chevron-right' : 'fa-chevron-down';
  return `<${tag} class="card stat ${o.go ? 'stat--link' : o.detail ? 'stat--exp' : ''}" ${attrs}>
    <i class="fa-solid ${icon}"></i><small>${label}</small><strong>${value}</strong><em>${sub}</em>
    ${interactive ? `<i class="fa-solid ${arrow} stat__go"></i>` : ''}
    ${o.detail ? `<span class="stat__detail">${o.detail}</span>` : ''}</${end}>`;
}
/** Plain-English reason for a result's points */
function explain(r) {
  const f = r.fixture, w = (h, a) => h > a ? `${DB.teams[f.home].name} win` : h < a ? `${DB.teams[f.away].name} win` : 'a draw';
  if (r.kind === 'exact') return `Exact score: you called ${r.tip.home}–${r.tip.away} spot on (+3).`;
  if (r.kind === 'correct') return `Right result (${w(r.result.home, r.result.away)}) but not the score (+1).`;
  return `You tipped ${w(r.tip.home, r.tip.away)} but it finished as ${w(r.result.home, r.result.away)}. No points.`;
}
const outcome = (h, a) => h === '' || a === '' ? null : +h > +a ? 'home' : +h < +a ? 'away' : 'draw';
/** Highlight the outcome currently entered on a fixture card */
function markPicks(card) {
  if (!card) return;
  const [h, a] = [...card.querySelectorAll('input')].map(i => i.value), o = outcome(h, a);
  card.querySelectorAll('[data-pick]').forEach(b => b.classList.toggle('picked', b.dataset.pick === o));
}
/** Quick-pick a scoreline unless that outcome is already entered */
function quickPick(btn) {
  const card = btn.closest('.fixture'), [h, a] = card.querySelectorAll('input');
  if (outcome(h.value, a.value) !== btn.dataset.pick) {
    [h.value, a.value] = { home: [1, 0], away: [0, 1], draw: [1, 1] }[btn.dataset.pick];
  }
  markPicks(card);
}
/** One delegated listener set covers every interactive tile */
function bindInteractions() {
  document.addEventListener('click', e => {
    if (e.target.closest('#clubBtn')) { toggleClubMenu(); return; }
    const club = e.target.closest('[data-team]');
    if (club) { setTeam(club.dataset.team); toggleClubMenu(false); toast(state.team ? `${DB.teams[state.team].name} colours on` : 'Premier League colours on'); return; }
    if (!e.target.closest('#clubMenu')) toggleClubMenu(false);   // click-away closes the picker
    const go = e.target.closest('[data-go]');
    if (go) {
      location.hash = go.dataset.go;
      if (go.dataset.focus) setTimeout(() => {   // jump to my row and flash it
        const me = $('.row--me'); me.scrollIntoView({ block: 'center', behavior: 'smooth' });
        me.classList.remove('pop'); void me.offsetWidth; me.classList.add('pop');
      }, 80);
      return;
    }
    const tab = e.target.closest('[data-tab]');   // segmented tabs
    if (tab) {
      const g = tab.dataset.group;
      document.querySelectorAll(`[data-tab][data-group="${g}"]`).forEach(b => b.classList.toggle('on', b === tab));
      document.querySelectorAll(`[data-panel][data-group="${g}"]`).forEach(p => p.hidden = p.dataset.panel !== tab.dataset.tab);
      return;
    }
    const gwPill = e.target.closest('[data-gw]');
    if (gwPill) { state.tipsGw = +gwPill.dataset.gw; renderAllTips(); return; }
    if (e.target.closest('[data-skip]')) { toggleKickoffDemo(); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { if (!pick.disabled) quickPick(pick); return; }
    const ex = e.target.closest('[data-expand]');
    if (ex) ex.setAttribute('aria-expanded', ex.classList.toggle('open'));
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article[data-expand]')) { e.preventDefault(); e.target.click(); }
  });
  $('#fixtureList').addEventListener('input', e => markPicks(e.target.closest('.fixture')));
}

/* ---------- 4. Navigation ---------- */
const NAV = [
  ['dashboard', 'fa-house', 'Home'], ['fixtures', 'fa-pen-to-square', 'Tips'],
  ['leaderboard', 'fa-ranking-star', 'Table'], ['results', 'fa-clipboard-check', 'Results'], ['stats', 'fa-chart-line', 'Stats']
];
function buildNav() {
  const html = NAV.map(([id, icon, label]) => `<a href="#${id}" data-view="${id}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('');
  document.querySelectorAll('.nav').forEach(n => n.innerHTML = html);
}
function go(view) {
  if (!NAV.some(n => n[0] === view)) view = 'dashboard';
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== view);
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  if (view === 'stats') renderChart();   // replay line animation
  window.scrollTo({ top: 0 });
}

/* ---------- 5. Dashboard ---------- */
function renderDashboard() {
  const c = DB.competition, board = sortedBoard(), leader = board[0];
  $('#brandName').textContent = c.name;
  $('#seasonLabel').textContent = `${c.name} · Season ${c.season}`;
  $('#gwTitle').textContent = `Gameweek ${c.gameweek}`;
  renderJoker();
  $('#quickStats').innerHTML = dashTiles();
  $('#podium').innerHTML = board.slice(0, 3).map((r, i) =>
    `<div class="podium-row">${trophy(i + 1)}<span class="name">${user(r.userId).name}</span><b>${r.total}</b></div>`).join('');
  $('#activity').innerHTML = DB.activity.map(a => `<li><i class="fa-solid ${a.icon}"></i><div>${a.text}<small>${a.time}</small></div></li>`).join('');
}
/* ---------- Dashboard tiles: each answers a different question (where am I / what do I do / how did I go / what's next) ---------- */
const first = n => n.split(' ')[0];
/** Compact countdown text, e.g. "2d 5h" */
const rel = ms => { const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m`; };
function dashTile({ icon, label, go, focus, body, urgent }) {
  return `<button type="button" class="card stat stat--link dt ${urgent ? 'dt--urgent' : ''}" data-go="${go}"${focus ? ' data-focus="me"' : ''}>
    <i class="fa-solid ${icon}"></i><small>${label}</small>${body}<i class="fa-solid fa-chevron-right stat__go"></i></button>`;
}
function dashTiles() {
  const c = DB.competition.gameweek, tiles = [];

  // 1. Rank: position, movement and the gaps that matter
  const board = sortedBoard(), pos = myPosition(), me = board[pos - 1], above = board[pos - 2], below = board[pos];
  const d = me.prev - pos, move = d > 0 ? `<span class="up">▲ ${d}</span>` : d < 0 ? `<span class="down">▼ ${-d}</span>` : '';
  tiles.push(dashTile({ icon: 'fa-ranking-star', label: 'Your rank', go: 'leaderboard', focus: true,
    body: `<strong>${pos}${ord(pos)}<span class="dt__of">of ${board.length}</span>${move}</strong>
      <em>${above ? `${above.total - me.total} pts behind ${first(user(above.userId).name)}` : `You lead by ${me.total - below.total} pts`}</em>
      ${above && below ? `<em>${me.total - below.total} pts ahead of ${first(user(below.userId).name)}</em>` : ''}` }));

  // 2. Tips status for the open round, with urgency as the deadline nears
  const fx = API.getFixtures(c), filled = fx.filter(f => state.tips[f.id]).length, left = DB.competition.deadline - now();
  const urgent = !isLocked() && left < 864e5 && filled < fx.length;
  tiles.push(dashTile({ icon: 'fa-pen-to-square', label: 'Tips this round', go: 'fixtures', urgent,
    body: `<strong>${filled}<span class="dt__of">of ${fx.length} tipped</span></strong>
      <span class="bar"><span style="width:${filled / fx.length * 100}%"></span></span>
      <em>${isLocked() ? 'Tips are locked' : filled === fx.length ? 'All in. Edit until lock' : `${fx.length - filled} to go · locks in ${rel(left)}`}</em>` }));

  // 3. Last round vs the league average, with a mini trend
  const mine = DB.season.me, avg = DB.season.avg, n = mine.length, diff = mine[n - 1] - avg[n - 1];
  const bars = mine.slice(-6).map((v, i, a) => `<span class="spark__bar ${i === a.length - 1 ? 'on' : ''}" style="height:${Math.max(10, v * 10)}%" title="GW${n - a.length + 1 + i}: ${v} pts"></span>`).join('');
  tiles.push(dashTile({ icon: 'fa-chart-simple', label: 'Last round', go: 'stats',
    body: `<strong>${mine[n - 1]} pts<span class="dt__of">GW${c - 1}</span></strong><span class="spark">${bars}</span>
      <em>${diff ? `<span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff}</span> vs league avg (${avg[n - 1]})` : `On the league average (${avg[n - 1]})`}</em>` }));

  // 4. Next kick-off in local time, plus your tip for it
  const nx = DB.fixtures.filter(f => Date.parse(f.kickoff) > now()).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  if (nx) {
    const tip = nx.gw === c ? state.tips[nx.id] : null;
    tiles.push(dashTile({ icon: 'fa-clock', label: 'Next kick-off', go: 'fixtures',
      body: `<span class="dt__match">${badge(nx.home, 1)}<b>${DB.teams[nx.home].name}</b></span>
        <span class="dt__match">${badge(nx.away, 1)}<b>${DB.teams[nx.away].name}</b></span>
        <em>${fmtDate(nx.kickoff)}</em>
        <em class="${tip || nx.gw !== c ? '' : 'dt__warn'}">${tip ? `Your tip: ${tip.home}–${tip.away}` : nx.gw === c ? 'No tip yet' : 'Tips open later'}</em>` }));
  }
  return tiles.join('');
}

const ord = n => (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');

function renderJoker() {
  const b = $('#jokerBtn');
  b.classList.toggle('on', state.joker);
  $('span', b).textContent = state.joker ? 'Joker active – double points' : DB.jokerAvailable ? 'Play your Joker (double points)' : 'Joker used';
  b.disabled = !DB.jokerAvailable || isLocked();
}

/** Countdown to the tip deadline */
function tickCountdown() {
  let s = Math.max(0, Math.floor((DB.competition.deadline - now()) / 1000));
  const parts = [['Days', 86400], ['Hrs', 3600], ['Mins', 60], ['Secs', 1]].map(([l, d]) => {
    const v = Math.floor(s / d); s -= v * d;
    return `<div class="tick"><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`;
  });
  $('#countdown').innerHTML = parts.join('');
  const pill = $('#lockPill'), locked = isLocked();
  pill.className = 'lock-pill' + (locked ? ' locked' : '');
  pill.innerHTML = locked ? '<i class="fa-solid fa-lock"></i> Tips locked' : '<i class="fa-solid fa-lock-open"></i> Open until ' + fmtDate(DB.competition.deadline);
}

/* ---------- 6. Fixtures & predictions ---------- */
function renderFixtures() {
  const locked = isLocked();
  $('#fixtureList').innerHTML = API.getFixtures(DB.competition.gameweek).map(f => {
    const t = state.tips[f.id] || {};
    const input = (side, v) => `<input type="number" min="0" max="20" inputmode="numeric" data-f="${f.id}" data-side="${side}" value="${v ?? ''}" ${locked ? 'disabled' : ''} aria-label="${DB.teams[f[side]].name} goals">`;
    return `<article class="card fixture">
      <div class="fixture__meta"><span><i class="fa-regular fa-clock"></i> ${fmtDate(f.kickoff)}</span><button type="button" class="mini" data-pick="draw" data-f="${f.id}" ${locked ? 'disabled' : ''}>Pick draw</button></div>
      <button type="button" class="team team--home" data-pick="home" data-f="${f.id}" ${locked ? 'disabled' : ''} title="Pick a home win">${badge(f.home)}<span>${DB.teams[f.home].name}</span></button>
      <div class="score-in">${input('home', t.home)}<span>–</span>${input('away', t.away)}</div>
      <button type="button" class="team" data-pick="away" data-f="${f.id}" ${locked ? 'disabled' : ''} title="Pick an away win">${badge(f.away)}<span>${DB.teams[f.away].name}</span></button>
    </article>`;
  }).join('');
  document.querySelectorAll('.fixture').forEach(markPicks);
  const btn = $('#submitBtn');
  btn.disabled = locked;
  btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${state.submitted ? 'Update predictions' : 'Submit predictions'}`;
  $('#submitMsg').textContent = locked ? 'Predictions are locked for this round.'
    : state.submitted ? 'Saved. You can edit until the lockout.' : 'Enter a score for every match.';
}

async function submitTips() {
  const fx = API.getFixtures(DB.competition.gameweek), draft = {};
  for (const f of fx) {   // validate every input before saving
    const h = $(`input[data-f="${f.id}"][data-side="home"]`).value, a = $(`input[data-f="${f.id}"][data-side="away"]`).value;
    if (h === '' || a === '' || +h < 0 || +a < 0) { toast('Enter both scores for every match'); return; }
    draft[f.id] = { home: +h, away: +a };
  }
  if (isLocked()) return toast('Tips are locked');
  await API.saveTips(draft, state.joker);
  const was = state.submitted; state.submitted = true;
  renderFixtures(); toast(was ? 'Predictions updated' : 'Predictions submitted');
  DB.activity.unshift({ icon: 'fa-pen', text: `You ${was ? 'updated' : 'submitted'} your GW${DB.competition.gameweek} tips`, time: 'just now' });
  renderDashboard();
}

/* ---------- 7. Leaderboard (with FLIP animation) ---------- */
function renderLeaderboard(animate = false) {
  const list = $('#lbTable'), first = {};
  if (animate) list.querySelectorAll('[data-id]').forEach(el => first[el.dataset.id] = el.getBoundingClientRect().top);
  const rows = sortedBoard().map((r, i) => {
    const p = i + 1, d = r.prev - p, u = user(r.userId);
    const mv = d > 0 ? `<span class="move up"><i class="fa-solid fa-caret-up"></i>${d}</span>` : d < 0 ? `<span class="move down"><i class="fa-solid fa-caret-down"></i>${-d}</span>` : '<span class="move same">–</span>';
    return `<li class="row ${r.userId === DB.currentUserId ? 'row--me' : ''}" data-id="${r.userId}">
      <span class="pos">${trophy(p) || p}${mv}</span>
      <span class="who"><span class="avatar">${initials(u.name)}</span><span>${u.name}</span></span>
      <span class="num">${r.weekly}</span><span class="num tot">${r.total}</span></li>`;
  }).join('');
  list.innerHTML = `<li class="row row--head"><span>Pos</span><span>Player</span><span class="num">Week</span><span class="num">Total</span></li>${rows}`;
  if (animate) list.querySelectorAll('[data-id]').forEach(el => {   // FLIP: invert then play
    const dy = first[el.dataset.id] - el.getBoundingClientRect().top;
    if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
    el.classList.add('pop');
  });
}
/** Demo: random points arrive, ranks re-sort with animation */
function simulateUpdate() {
  DB.leaderboard.forEach(r => { r.prev = sortedBoard().findIndex(x => x.userId === r.userId) + 1; });
  DB.leaderboard.forEach(r => { const add = Math.floor(Math.random() * 7); r.weekly += add; r.total += add; });
  renderLeaderboard(true); renderDashboard(); toast('Leaderboard updated');
}

/* ---------- 8. Results ---------- */
function renderResults() {
  const rows = myResults(), gws = [...new Set(rows.map(r => r.fixture.gw))].sort((a, b) => b - a);
  const icon = { exact: '<i class="fa-solid fa-circle-check ok"></i>', correct: '<i class="fa-solid fa-square-check dot-warn"></i>', wrong: '<i class="fa-solid fa-circle-xmark bad"></i>' };
  $('#resultsList').innerHTML = gws.map(gw => `<h3 class="gw-title">Gameweek ${gw}</h3>` +
    rows.filter(r => r.fixture.gw === gw).map(r => {
      const f = r.fixture;
      return `<article class="card result ${r.kind}" role="button" tabindex="0" aria-expanded="false" data-expand>
        <div class="result__teams">
          <div>${badge(f.home, 1)}${DB.teams[f.home].name}<b>${r.result.home}</b></div>
          <div>${badge(f.away, 1)}${DB.teams[f.away].name}<b>${r.result.away}</b></div>
        </div>
        <div class="result__tip"><small>You: ${r.tip.home}–${r.tip.away}</small><span class="pts">${icon[r.kind]} +${r.pts}</span></div>
        <div class="result__detail">${explain(r)}</div>
      </article>`;
    }).join('')).join('');
}

/* ---------- 9. Statistics ---------- */
function renderStats() {
  const rows = myResults(), exact = rows.filter(r => r.kind === 'exact').length;
  const right = rows.filter(r => r.kind !== 'wrong').length;
  let streak = 0; for (const r of [...rows].sort((a, b) => b.fixture.kickoff.localeCompare(a.fixture.kickoff))) { if (r.kind === 'wrong') break; streak++; }  // newest first
  const best = Math.max(...DB.season.me), bestGw = DB.season.me.indexOf(best) + 1;
  const stat = tile;
  const nm = r => `${DB.teams[r.fixture.home].name} ${r.result.home}–${r.result.away} ${DB.teams[r.fixture.away].name}`;
  const top3 = DB.season.me.map((v, i) => [v, i + 1]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, g]) => `GW${g}: ${v} pts`).join('<br>');
  $('#statCards').innerHTML =
    stat('fa-bullseye', 'Exact scores', exact, 'in the last 2 rounds', { detail: rows.filter(r => r.kind === 'exact').map(nm).join('<br>') || 'None yet' }) +
    stat('fa-fire', 'Highest scoring round', `${best} pts`, `Gameweek ${bestGw}`, { detail: top3 }) +
    stat('fa-percent', 'Correct results', `${Math.round(right / rows.length * 100)}%`, `${right} of ${rows.length} tips`, { detail: `Exact ${exact} · Result only ${right - exact} · Miss ${rows.length - right}` }) +
    stat('fa-bolt', 'Current streak', streak, 'correct in a row', { detail: streak ? `Your last ${streak} tip${streak > 1 ? 's' : ''} scored points.` : 'Streak broken. Your next tip starts a new one.' });
}
/** Hand-rolled SVG line chart: me vs league average */
function renderChart() {
  const W = 640, H = 260, m = { l: 34, r: 12, t: 16, b: 28 }, max = 10, n = DB.season.me.length;
  const x = i => m.l + i * (W - m.l - m.r) / (n - 1), y = v => H - m.b - v / max * (H - m.t - m.b);
  const path = d => d.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [0, 2.5, 5, 7.5, 10].map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="4" y="${y(v) + 4}">${v}</text>`).join('');
  const xl = DB.season.me.map((_, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${i + 1}</text>`).join('');
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Points per gameweek, you versus league average">${grid}${xl}
    <path class="line" d="${path(DB.season.avg)}" stroke="var(--muted)" style="animation-delay:.15s"/>
    <path class="line" d="${path(DB.season.me)}" stroke="var(--hot)"/>
    ${DB.season.me.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--hot)"/>`).join('')}</svg>
    <p style="color:var(--muted);font-size:13px;margin-top:8px"><span style="color:var(--hot)">●</span> You &nbsp; <span>●</span> League average · points per gameweek</p>`;
}

/* ---------- 9b. Upcoming fixtures, PL table, everyone's tips ---------- */
function renderUpcoming() {
  const sel = $('#teamFilter'), c = DB.competition.gameweek;
  if (!sel.options.length) sel.innerHTML = '<option value="all">All clubs</option>' +
    Object.entries(DB.teams).filter(([, t]) => !t.other).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');
  $('#tzNote').textContent = `Times shown in your local time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
  const day = iso => new Date(iso).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = iso => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  const byGw = {};
  DB.fixtures.filter(f => f.gw > c && (sel.value === 'all' || f.home === sel.value || f.away === sel.value))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff)).forEach(f => (byGw[f.gw] ||= []).push(f));
  $('#upcomingList').innerHTML = Object.entries(byGw).map(([gw, list]) => {
    let last = '';
    const rows = list.map(f => {
      const d = day(f.kickoff), head = d !== last ? `<div class="up-day">${d}</div>` : ''; last = d;
      return `${head}<div class="up-row"><span class="up-time">${time(f.kickoff)}</span>
        <span class="up-t up-t--h">${DB.teams[f.home].name}${badge(f.home, 1)}</span><span class="up-vs">v</span>
        <span class="up-t">${badge(f.away, 1)}${DB.teams[f.away].name}</span></div>`;
    }).join('');
    return `<section class="card up-gw"><h3 class="card__title">Gameweek ${gw}</h3>${rows}</section>`;
  }).join('') || '<p class="note">No upcoming fixtures for that club.</p>';
}

/** Real Premier League table (points + GD derived from the raw columns) */
function renderTable() {
  const rows = DB.table.map(([code, p, w, d, l, gf, ga]) => ({ code, p, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const hm = v => `<span class="hm">${v}</span>`;
  $('#plTable').innerHTML = `<div class="pl pl--head"><span>#</span><span class="club">Club</span><span>P</span>${hm('W')}${hm('D')}${hm('L')}${hm('GF')}${hm('GA')}<span>GD</span><span>Pts</span></div>` +
    rows.map((r, i) => `<div class="pl ${i < 4 ? 'ucl' : i >= 17 ? 'rel' : ''}"><span>${i + 1}</span>
      <span class="club">${badge(r.code, 1)}${DB.teams[r.code].name}</span><span>${r.p}</span>${hm(r.w)}${hm(r.d)}${hm(r.l)}${hm(r.gf)}${hm(r.ga)}
      <span>${r.gd > 0 ? '+' : ''}${r.gd}</span><span>${r.pts}</span></div>`).join('');
}

/** Everyone's tips: hidden per match until kick-off, then revealed (coloured once a result exists) */
function renderAllTips() {
  const c = DB.competition.gameweek, me = DB.currentUserId;
  if (state.tipsGw == null) state.tipsGw = c;
  const gws = [...new Set(DB.fixtures.filter(f => f.gw <= c).map(f => f.gw))].sort((a, b) => b - a);
  $('#gwPills').innerHTML = gws.map(g => `<button class="pill ${g === state.tipsGw ? 'on' : ''}" data-gw="${g}">GW${g}</button>`).join('');
  const res = Object.fromEntries(API.getResults().map(r => [r.fixtureId, r]));
  $('#allTips').innerHTML = DB.fixtures.filter(f => f.gw === state.tipsGw).map(f => {
    const r = res[f.id], started = now() >= Date.parse(f.kickoff);
    const head = `<div class="at__head">${badge(f.home, 1)}<b>${DB.teams[f.home].name}</b>${r ? `<span class="at__score">${r.home}–${r.away}</span>` : '<span class="at__vs">v</span>'}<b>${DB.teams[f.away].name}</b>${badge(f.away, 1)}</div>`;
    if (!started) return `<article class="card at">${head}<p class="at__lock"><i class="fa-solid fa-lock"></i> Tips are hidden until kick-off (${fmtDate(f.kickoff)})</p></article>`;
    const chips = DB.users.map(u => {
      const t = u.id === me && f.gw === c ? state.tips[f.id] : DB.tips.find(t => t.userId === u.id && t.fixtureId === f.id);
      const kind = t && r ? scoreTip(t, r).kind : 'none';
      return `<span class="tipchip ${kind} ${u.id === me ? 'me' : ''}"><small>${u.name.split(' ')[0]}</small><b>${t ? `${t.home}–${t.away}` : '–'}</b></span>`;
    }).join('');
    return `<article class="card at">${head}<div class="at__chips">${chips}</div></article>`;
  }).join('');
}

/** Demo: fast-forward the app clock to 90 min after the first kick-off (and back) */
function toggleKickoffDemo() {
  state.skip = state.skip ? 0 : DB.competition.deadline - Date.now() + 90 * 60000;
  $('#skipBtn').innerHTML = `<i class="fa-solid fa-forward"></i> ${state.skip ? 'Demo: reset clock' : 'Demo: jump to kick-off'}`;
  renderFixtures(); renderAllTips(); renderJoker(); renderDashboard(); tickCountdown();
  toast(state.skip ? 'Clock moved past first kick-off' : 'Clock reset');
}

/* ---------- 9c. Club colours ---------- */
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const mixHex = (a, b, p) => '#' + hexRgb(a).map((v, i) => Math.round(v * (1 - p) + hexRgb(b)[i] * p).toString(16).padStart(2, '0')).join('');
const inkOn = h => (lum(h) + .05) / (lum('#12001a') + .05) > 1.05 / (lum(h) + .05) ? '#12001a' : '#ffffff';   // whichever of dark/white contrasts more

/** Push the chosen club's palette into CSS variables, adjusted for dark/light mode contrast */
function applyClubTheme(code) {
  const t = THEMES[code] || THEMES.default, dark = document.documentElement.dataset.theme !== 'light';
  let b = t.b, a = t.a;
  if (dark) while (lum(b) < .12) b = mixHex(b, '#ffffff', .2);     // navy/claret need lifting on dark surfaces
  else while (lum(b) > .3) b = mixHex(b, '#000000', .15);          // pale/yellow brands need darkening on white
  while (lum(a) < .25) a = mixHex(a, '#ffffff', .2);               // accent sits on the dark header
  const s = document.documentElement.style;
  s.setProperty('--brand', b); s.setProperty('--on-brand', inkOn(b));
  s.setProperty('--brand-2', a); s.setProperty('--on-brand-2', inkOn(a)); s.setProperty('--tint', t.t);
}
function setTeam(code) {
  state.team = THEMES[code] ? code : null;
  user(DB.currentUserId).favTeam = state.team;   // in a real backend: save to the user's profile
  try { state.team ? localStorage.setItem('team', state.team) : localStorage.removeItem('team'); } catch (e) { }
  applyClubTheme(state.team); renderClubButton(); renderClubMenu();
}
function renderClubButton() { $('#clubBtn').innerHTML = state.team ? badge(state.team, 1) : '<i class="fa-solid fa-shirt"></i>'; }
function renderClubMenu() {
  const items = Object.entries(DB.teams).sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([k, t]) => `<button class="club-item ${state.team === k ? 'on' : ''}" data-team="${k}">${badge(k, 1)}<span>${t.name}</span></button>`).join('');
  $('#clubMenu').innerHTML = `<p class="club-menu__title">Pick your club colours</p><div class="club-grid">
    <button class="club-item ${state.team ? '' : 'on'}" data-team=""><span class="badge badge--sm" style="background:#38003c"><i class="fa-solid fa-futbol"></i></span><span>Premier League</span></button>${items}</div>`;
}
function toggleClubMenu(show) {
  const m = $('#clubMenu'), open = show ?? m.hidden;
  m.hidden = !open; $('#clubBtn').setAttribute('aria-expanded', open);
}

/* ---------- 10. Theme ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  applyClubTheme(state.team);   // re-balance club colours for the new mode
  $('#themeToggle i').className = `fa-solid ${t === 'dark' ? 'fa-moon' : 'fa-sun'}`;
  try { localStorage.setItem('theme', t); } catch (e) { /* storage unavailable */ }
}

/* ---------- 11. Init ---------- */
async function init() {
  let saved; try { saved = localStorage.getItem('theme'); } catch (e) { }
  let team; try { team = localStorage.getItem('team'); } catch (e) { }
  state.team = THEMES[team] ? team : null; user(DB.currentUserId).favTeam = state.team;
  buildNav(); renderClubMenu(); setTheme(saved || 'dark'); renderClubButton();
  $('#themeToggle').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  try {
    await API.loadFixtures();
    if (!API.getFixtures(DB.competition.gameweek).length) throw new Error(`No fixtures for GW${DB.competition.gameweek}`);
    hydrateFromFixtures();
  } catch (err) {
    console.error('Could not load fixtures from Supabase:', err);
    $('#app').innerHTML = '<p class="note" style="padding:24px">Couldn’t load fixtures. Please refresh to try again.</p>';
    return;
  }

  renderDashboard(); renderFixtures(); renderLeaderboard(); renderResults(); renderStats(); renderUpcoming(); renderTable(); renderAllTips();
  bindInteractions();
  tickCountdown(); setInterval(tickCountdown, 1000);

  $('#submitBtn').onclick = submitTips;
  $('#teamFilter').onchange = renderUpcoming;
  $('#simBtn').onclick = simulateUpdate;
  $('#jokerBtn').onclick = () => { state.joker = !state.joker; renderJoker(); toast(state.joker ? 'Joker armed for this round' : 'Joker removed'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleClubMenu(false); });
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  go(location.hash.slice(1));
}
document.addEventListener('DOMContentLoaded', init);
