/* ==========================================================
   Top Bins Tipping League – app.js
   Structure: DATA → API (Supabase) → helpers → views → init
   ========================================================== */
'use strict';

/* ---------- 1. Data ---------- */
const DB = {
  competition: { name: 'Top Bins Tipping League', season: '2026/27', gameweek: 12, deadline: 0 },  // gameweek + deadline are set from the fixtures at startup
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
  // Real Premier League table snapshot after 10 matches each: [club, P, W, D, L, GF, GA] (points + GD are derived)
  table: [['ARS',10,9,0,1,15,5],['BHA',10,7,1,2,26,7],['MCI',10,7,0,3,21,13],['LIV',10,5,3,2,14,10],['CHE',10,5,1,4,19,16],
    ['EVE',10,4,4,2,12,10],['BOU',10,4,3,3,16,14],['BRE',10,3,5,2,16,11],['LEE',10,3,5,2,10,8],['AVL',10,3,4,3,14,17],
    ['TOT',10,3,3,4,10,11],['NEW',10,3,3,4,13,16],['HUL',10,2,5,3,11,11],['IPS',10,3,2,5,15,20],['FUL',10,2,4,4,10,12],
    ['NFO',10,2,3,5,9,13],['COV',10,3,0,7,10,19],['MUN',10,1,5,4,14,19],['SUN',10,2,2,6,8,17],['CRY',10,2,1,7,10,24]],
  fixtures: [], tips: [], results: []   // all loaded from Supabase (tips = the signed-in player's own tips)
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

/** Open round = first gameweek whose first kick-off is still in the future (falls back to the last round) */
function currentGameweek() {
  const first = {};
  DB.fixtures.forEach(f => first[f.gw] = Math.min(first[f.gw] ?? Infinity, Date.parse(f.kickoff)));
  const gws = Object.keys(first).map(Number).sort((a, b) => a - b);
  return gws.find(g => first[g] > Date.now()) ?? gws[gws.length - 1];
}
/** Tip deadline = first kick-off of the open round */
function setDeadline() {
  const gw = DB.competition.gameweek;
  DB.competition.deadline = Math.min(...DB.fixtures.filter(f => f.gw === gw).map(f => Date.parse(f.kickoff)));
}
/** Store the player's saved tips: this round fills the open form; a Joker in any other round uses it up */
function applySavedTips(saved) {
  DB.tips = saved;
  const gw = DB.competition.gameweek;
  saved.forEach(t => {
    const f = fixture(t.fixtureId);
    if (f && f.gw === gw) {
      state.tips[t.fixtureId] = { home: t.home, away: t.away };
      state.submitted = true;
      if (t.joker) state.joker = true;
    }
  });
  DB.jokerAvailable = !saved.some(t => t.joker && fixture(t.fixtureId)?.gw !== gw);
}

/* ---------- 2. Data access layer ---------- */
const SUPABASE_URL = 'https://bxaqrqiqnhyfpqjtdqyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OjceILHspZRsAtBu4vHbag_X2fZpnq6';
if (!window.supabase) {   // the Supabase script didn't load (slow network, blocked CDN, extension)
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app').innerHTML = '<p class="note" style="padding:24px">Couldn’t load a required script. Check your connection, disable any content blockers for this site, then refresh.</p>';
  });
  throw new Error('supabase-js failed to load');
}
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
  getResults: () => DB.results,
  getMyTips: () => DB.tips,

  /** The signed-in user's id, or null. Checks with the server so a deleted user's stale session is cleared. */
  getUserId: async () => {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { }
      return null;
    }
    return data.user.id;
  },
  /** Anonymous sign-in. Only called from the Join dialog, after the league code has been accepted. */
  ensureUser: async () => {
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    return session.user.id;
  },
  loadProfile: async () => {
    const { data, error } = await sb.from('profiles').select('id, display_name, fav_team').eq('id', state.userId).maybeSingle();
    if (error) throw error;
    return data;
  },
  checkLeagueCode: async (code) => {
    const { data, error } = await sb.rpc('league_code_ok', { p_code: code });
    if (error) throw error;
    return data === true;
  },
  claimProfile: async (name, code, team) => {
    const { data, error } = await sb.rpc('claim_profile', { p_name: name, p_code: code, p_team: team });
    if (error) throw error;
    return data;
  },
  loadProfiles: async () => {
    const { data, error } = await sb.from('profiles').select('id, display_name, fav_team').order('display_name');
    if (error) throw error;
    state.profiles = data;
  },
  /** Standings now, standings before the latest scored round (for movement), and points per player per gameweek */
  loadBoard: async () => {
    const lastGw = Math.max(0, ...DB.results.map(r => fixture(r.fixtureId)?.gw ?? 0));
    const [cur, prev, wk] = await Promise.all([
      sb.rpc('standings'),
      sb.rpc('standings', { p_through: Math.max(0, lastGw - 1) }),
      sb.from('weekly_points').select('user_id, gameweek, points, exact_count, correct_count')
    ]);
    for (const r of [cur, prev, wk]) if (r.error) throw r.error;
    const prevPos = Object.fromEntries(prev.data.map(r => [r.user_id, r.pos]));
    state.boardGw = lastGw;
    state.weekly = wk.data;
    state.board = cur.data.map(r => ({ ...r, prevPos: prevPos[r.user_id] }));
  },
  /** Load this player's saved tips, shaped like DB.tips entries */
  loadMyTips: async () => {
    const { data, error } = await sb.from('tips').select('fixture_id, home, away, joker').eq('user_id', state.userId);
    if (error) throw error;
    return data.map(r => ({ userId: state.userId, fixtureId: String(r.fixture_id), home: r.home, away: r.away, joker: r.joker }));
  },
  /** Everyone's tips for a round. The database only returns your own, plus others' for matches that have kicked off. */
  loadTipsForGw: async (gw) => {
    const ids = DB.fixtures.filter(f => f.gw === gw).map(f => Number(f.id));
    const { data, error } = await sb.from('tips').select('user_id, fixture_id, home, away, joker').in('fixture_id', ids);
    if (error) throw error;
    return data.map(r => ({ userId: r.user_id, fixtureId: String(r.fixture_id), home: r.home, away: r.away, joker: r.joker }));
  },
  /** Upsert one row per fixture; the database rejects it once the round has locked */
  saveTips: async (tips, joker) => {
    if (!state.userId) throw new Error('Not signed in');
    const rows = Object.entries(tips).map(([fixtureId, t]) => ({ user_id: state.userId, fixture_id: Number(fixtureId), home: t.home, away: t.away, joker }));
    const { error } = await sb.from('tips').upsert(rows, { onConflict: 'user_id,fixture_id' });
    if (error) throw error;
    Object.entries(tips).forEach(([fixtureId, t]) => {
      const row = { userId: state.userId, fixtureId, home: t.home, away: t.away, joker };
      const i = DB.tips.findIndex(x => x.fixtureId === fixtureId);
      if (i >= 0) DB.tips[i] = row; else DB.tips.push(row);
    });
    Object.assign(state.tips, tips); state.joker = joker;
    return true;
  }
};

/* ---------- 3. State & helpers ---------- */
const state = {
  view: 'dashboard', tips: {}, submitted: false, joker: false, tipsGw: null, team: null,
  userId: null, profile: null, profiles: [], board: [], boardGw: 0, weekly: []
};
const now = () => Date.now();
const $ = (s, el = document) => el.querySelector(s);
const fixture = id => DB.fixtures.find(f => f.id === id);
const initials = n => String(n).split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
/** Escape player-supplied text before it goes into innerHTML */
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const isLocked = () => now() >= DB.competition.deadline;
const fmtDate = iso => new Date(iso).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
/** Team lookup with a fallback, so one unknown code in the fixtures table can't blank the whole app */
const teamOf = code => DB.teams[code] ?? { name: String(code), color: '#555555' };
const badge = (code, sm) => `<span class="badge ${sm ? 'badge--sm' : ''}" style="background:${teamOf(code).color}" aria-hidden="true">${esc(code)}</span>`;

/** Scoring: exact = 3, correct result = 1, else 0. Joker doubles. (The database computes the official points; this is for display.) */
function scoreTip(tip, res, joker = false) {
  const sign = (h, a) => Math.sign(h - a);
  let kind = 'wrong', pts = 0;
  if (tip.home === res.home && tip.away === res.away) { kind = 'exact'; pts = 3; }
  else if (sign(tip.home, tip.away) === sign(res.home, res.away)) { kind = 'correct'; pts = 1; }
  return { kind, pts: joker ? pts * 2 : pts };
}

/** Completed fixtures joined with the player's tip + points */
function myResults() {
  const mine = API.getMyTips();
  return API.getResults().flatMap(r => {
    const t = mine.find(t => t.fixtureId === r.fixtureId);
    return t ? [{ fixture: fixture(r.fixtureId), result: r, tip: t, joker: !!t.joker, ...scoreTip(t, r, !!t.joker) }] : [];
  });
}
const myRow = () => state.board.find(r => r.user_id === state.userId);
/** Points per scored gameweek: the player vs the average of everyone who tipped that round */
function seasonSeries() {
  const rows = state.weekly || [];
  const gws = [...new Set(rows.map(r => r.gameweek))].sort((a, b) => a - b);
  const me = gws.map(g => rows.find(r => r.gameweek === g && r.user_id === state.userId)?.points ?? 0);
  const avg = gws.map(g => {
    const pts = rows.filter(r => r.gameweek === g).map(r => r.points);
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length * 10) / 10;
  });
  return { gws, me, avg };
}
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
  const f = r.fixture, w = (h, a) => h > a ? `${teamOf(f.home).name} win` : h < a ? `${teamOf(f.away).name} win` : 'a draw';
  const jk = r.joker ? ', Joker doubled' : '';
  if (r.kind === 'exact') return `Exact score: you called ${r.tip.home}–${r.tip.away} spot on (+${r.pts}${jk}).`;
  if (r.kind === 'correct') return `Right result (${w(r.result.home, r.result.away)}) but not the score (+${r.pts}${jk}).`;
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
    if (club) { setTeam(club.dataset.team); toggleClubMenu(false); toast(state.team ? `${teamOf(state.team).name} colours on` : 'Premier League colours on'); return; }
    if (!e.target.closest('#clubMenu')) toggleClubMenu(false);   // click-away closes the picker
    const go = e.target.closest('[data-go]');
    if (go) {
      location.hash = go.dataset.go;
      if (go.dataset.focus) setTimeout(() => {   // jump to my row and flash it
        const me = $('.row--me'); if (!me) return;
        me.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
  const c = DB.competition;
  $('#brandName').textContent = c.name;
  $('#seasonLabel').textContent = `${c.name} · Season ${c.season}`;
  $('#gwTitle').textContent = `Gameweek ${c.gameweek}`;
  renderJoker();
  $('#quickStats').innerHTML = dashTiles();
  $('#podium').innerHTML = state.board.slice(0, 3).map(r =>
    `<div class="podium-row">${r.total_points > 0 ? trophy(r.pos) : ''}<span class="name">${esc(r.display_name)}</span><b>${r.total_points}</b></div>`).join('')
    || '<p class="note">No players yet</p>';
}
/* ---------- Dashboard tiles: each answers a different question (where am I / what do I do / how did I go / what's next) ---------- */
const first = n => String(n).split(' ')[0];
/** Compact countdown text, e.g. "2d 5h" */
const rel = ms => { const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m`; };
function dashTile({ icon, label, go, focus, body, urgent }) {
  return `<button type="button" class="card stat stat--link dt ${urgent ? 'dt--urgent' : ''}" data-go="${go}"${focus ? ' data-focus="me"' : ''}>
    <i class="fa-solid ${icon}"></i><small>${label}</small>${body}<i class="fa-solid fa-chevron-right stat__go"></i></button>`;
}
function dashTiles() {
  const c = DB.competition.gameweek, tiles = [];

  // 1. Rank: position, movement and the gaps that matter
  const board = state.board, me = myRow();
  if (me) {
    const i = board.indexOf(me), above = board[i - 1], below = board[i + 1];
    const d = state.boardGw && me.prevPos ? me.prevPos - me.pos : 0;
    const move = d > 0 ? `<span class="up">▲ ${d}</span>` : d < 0 ? `<span class="down">▼ ${-d}</span>` : '';
    const lines = [];
    if (above) lines.push(above.total_points === me.total_points ? `Level on points with ${esc(first(above.display_name))}` : `${above.total_points - me.total_points} pts behind ${esc(first(above.display_name))}`);
    if (below) lines.push(below.total_points === me.total_points ? `Level on points with ${esc(first(below.display_name))}` : `${me.total_points - below.total_points} pts ahead of ${esc(first(below.display_name))}`);
    if (!above && !below) lines.push('You’re the only player so far');
    tiles.push(dashTile({ icon: 'fa-ranking-star', label: 'Your rank', go: 'leaderboard', focus: true,
      body: `<strong>${me.pos}${ord(me.pos)}<span class="dt__of">of ${board.length}</span>${move}</strong>${lines.map(l => `<em>${l}</em>`).join('')}` }));
  }

  // 2. Tips status for the open round, with urgency as the deadline nears
  const fx = API.getFixtures(c), filled = fx.filter(f => state.tips[f.id]).length, left = DB.competition.deadline - now();
  const urgent = !isLocked() && left < 864e5 && filled < fx.length;
  tiles.push(dashTile({ icon: 'fa-pen-to-square', label: 'Tips this round', go: 'fixtures', urgent,
    body: `<strong>${filled}<span class="dt__of">of ${fx.length} tipped</span></strong>
      <span class="bar"><span style="width:${filled / fx.length * 100}%"></span></span>
      <em>${isLocked() ? 'Tips are locked' : filled === fx.length ? 'All in. Edit until lock' : `${fx.length - filled} to go · locks in ${rel(left)}`}</em>` }));

  // 3. Last scored round vs the average of everyone who tipped, with a mini trend
  const s = seasonSeries(), n = s.gws.length;
  if (n) {
    const last = s.me[n - 1], avgLast = s.avg[n - 1], diff = Math.round((last - avgLast) * 10) / 10, top = Math.max(10, ...s.me);
    const bars = s.me.slice(-6).map((v, i, a) => `<span class="spark__bar ${i === a.length - 1 ? 'on' : ''}" style="height:${Math.max(10, v / top * 100)}%" title="GW${s.gws[n - a.length + i]}: ${v} pts"></span>`).join('');
    tiles.push(dashTile({ icon: 'fa-chart-simple', label: 'Last scored round', go: 'stats',
      body: `<strong>${last} pts<span class="dt__of">GW${s.gws[n - 1]}</span></strong><span class="spark">${bars}</span>
        <em>${diff ? `<span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff}</span> vs league avg (${avgLast})` : `On the league average (${avgLast})`}</em>` }));
  } else {
    tiles.push(dashTile({ icon: 'fa-chart-simple', label: 'Last scored round', go: 'stats', body: '<strong>–</strong><em>No results scored yet</em>' }));
  }

  // 4. Next kick-off in local time, plus your tip for it
  const nx = DB.fixtures.filter(f => Date.parse(f.kickoff) > now()).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  if (nx) {
    const tip = nx.gw === c ? state.tips[nx.id] : null;
    tiles.push(dashTile({ icon: 'fa-clock', label: 'Next kick-off', go: 'fixtures',
      body: `<span class="dt__match">${badge(nx.home, 1)}<b>${teamOf(nx.home).name}</b></span>
        <span class="dt__match">${badge(nx.away, 1)}<b>${teamOf(nx.away).name}</b></span>
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
    const input = (side, v) => `<input type="number" min="0" max="20" inputmode="numeric" data-f="${f.id}" data-side="${side}" value="${v ?? ''}" ${locked ? 'disabled' : ''} aria-label="${teamOf(f[side]).name} goals">`;
    return `<article class="card fixture">
      <div class="fixture__meta"><span><i class="fa-regular fa-clock"></i> ${fmtDate(f.kickoff)}</span><button type="button" class="mini" data-pick="draw" data-f="${f.id}" ${locked ? 'disabled' : ''}>Pick draw</button></div>
      <button type="button" class="team team--home" data-pick="home" data-f="${f.id}" ${locked ? 'disabled' : ''} title="Pick a home win">${badge(f.home)}<span>${teamOf(f.home).name}</span></button>
      <div class="score-in">${input('home', t.home)}<span>–</span>${input('away', t.away)}</div>
      <button type="button" class="team" data-pick="away" data-f="${f.id}" ${locked ? 'disabled' : ''} title="Pick an away win">${badge(f.away)}<span>${teamOf(f.away).name}</span></button>
    </article>`;
  }).join('');
  document.querySelectorAll('.fixture').forEach(markPicks);
  const btn = $('#submitBtn');
  btn.disabled = locked;
  btn.innerHTML = submitLabel();
  $('#submitMsg').textContent = locked ? 'Predictions are locked for this round.'
    : state.submitted ? 'Saved. You can edit until the lockout.' : 'Enter a score for every match.';
}

/** A goals value must be a whole number from 0 to 20 (matches the database check) */
const validGoals = v => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 20;
const submitLabel = () => `<i class="fa-solid fa-paper-plane"></i> ${state.submitted ? 'Update predictions' : 'Submit predictions'}`;
/** Turn a database error into something a player can act on */
function saveErrorMessage(err) {
  const msg = err?.message ?? '';
  if (err?.code === '42501' || /row-level security/i.test(msg)) return 'Tips are locked for this round.';
  if (/joker/i.test(msg)) return 'You’ve already used your Joker in another round.';
  return 'Couldn’t save your tips. Please try again.';
}

async function submitTips() {
  const btn = $('#submitBtn');
  if (btn.disabled) return;   // already saving, or locked
  const fx = API.getFixtures(DB.competition.gameweek), draft = {};
  for (const f of fx) {   // validate every input before saving
    const h = $(`input[data-f="${f.id}"][data-side="home"]`).value, a = $(`input[data-f="${f.id}"][data-side="away"]`).value;
    if (!validGoals(h) || !validGoals(a)) { toast('Scores must be whole numbers from 0 to 20'); return; }
    draft[f.id] = { home: Number(h), away: Number(a) };
  }
  if (isLocked()) return toast('Tips are locked');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
  try { await API.saveTips(draft, state.joker); }
  catch (err) {
    console.error('Could not save tips:', err);
    btn.disabled = isLocked(); btn.innerHTML = submitLabel();   // keep what the player typed
    return toast(saveErrorMessage(err));
  }
  const was = state.submitted; state.submitted = true;
  renderFixtures(); toast(was ? 'Predictions updated' : 'Predictions submitted');
  renderDashboard();
}

/* ---------- 7. Leaderboard (with FLIP animation) ---------- */
function renderLeaderboard(animate = false) {
  const list = $('#lbTable'), first = {};
  if (animate) list.querySelectorAll('[data-id]').forEach(el => first[el.dataset.id] = el.getBoundingClientRect().top);
  const rows = state.board.map(r => {
    const d = state.boardGw && r.prevPos ? r.prevPos - r.pos : 0;
    const mv = d > 0 ? `<span class="move up"><i class="fa-solid fa-caret-up"></i>${d}</span>` : d < 0 ? `<span class="move down"><i class="fa-solid fa-caret-down"></i>${-d}</span>` : '<span class="move same">–</span>';
    const t = r.total_points > 0 ? trophy(r.pos) : '';
    return `<li class="row ${r.user_id === state.userId ? 'row--me' : ''}" data-id="${r.user_id}">
      <span class="pos">${t || r.pos}${mv}</span>
      <span class="who"><span class="avatar">${esc(initials(r.display_name))}</span><span>${esc(r.display_name)}</span></span>
      <span class="num tot">${r.total_points}</span><span class="num">${r.exact_count}</span><span class="num">${r.correct_count}</span></li>`;
  }).join('') || '<li class="row"><span></span><span>No players yet</span></li>';
  list.innerHTML = `<li class="row row--head"><span>Pos</span><span>Player</span><span class="num">Pts</span><span class="num">Exact</span><span class="num">Result</span></li>${rows}`;
  if (animate) list.querySelectorAll('[data-id]').forEach(el => {   // FLIP: invert then play
    const dy = first[el.dataset.id] - el.getBoundingClientRect().top;
    if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
    el.classList.add('pop');
  });
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
          <div>${badge(f.home, 1)}${teamOf(f.home).name}<b>${r.result.home}</b></div>
          <div>${badge(f.away, 1)}${teamOf(f.away).name}<b>${r.result.away}</b></div>
        </div>
        <div class="result__tip"><small>You: ${r.tip.home}–${r.tip.away}${r.joker ? ' · Joker' : ''}</small><span class="pts">${icon[r.kind]} +${r.pts}</span></div>
        <div class="result__detail">${explain(r)}</div>
      </article>`;
    }).join('')).join('') || '<p class="note">No scored results yet. They appear here once a match you tipped has a final score.</p>';
}

/* ---------- 9. Statistics ---------- */
function renderStats() {
  const rows = myResults(), exact = rows.filter(r => r.kind === 'exact').length;
  const right = rows.filter(r => r.kind !== 'wrong').length;
  let streak = 0; for (const r of [...rows].sort((a, b) => b.fixture.kickoff.localeCompare(a.fixture.kickoff))) { if (r.kind === 'wrong') break; streak++; }  // newest first
  const s = seasonSeries(), best = s.me.length ? Math.max(...s.me) : 0, bestGw = best ? s.gws[s.me.indexOf(best)] : null;
  const stat = tile;
  const nm = r => `${teamOf(r.fixture.home).name} ${r.result.home}–${r.result.away} ${teamOf(r.fixture.away).name}`;
  const top3 = s.me.map((v, i) => [v, s.gws[i]]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, g]) => `GW${g}: ${v} pts`).join('<br>') || 'No scored rounds yet';
  $('#statCards').innerHTML =
    stat('fa-bullseye', 'Exact scores', exact, 'so far this season', { detail: rows.filter(r => r.kind === 'exact').map(nm).join('<br>') || 'None yet' }) +
    stat('fa-fire', 'Highest scoring round', best ? `${best} pts` : '–', bestGw ? `Gameweek ${bestGw}` : 'No scored rounds yet', { detail: top3 }) +
    stat('fa-percent', 'Correct results', `${rows.length ? Math.round(right / rows.length * 100) : 0}%`, `${right} of ${rows.length} tips`, { detail: `Exact ${exact} · Result only ${right - exact} · Miss ${rows.length - right}` }) +
    stat('fa-bolt', 'Current streak', streak, 'correct in a row', { detail: streak ? `Your last ${streak} tip${streak > 1 ? 's' : ''} scored points.` : 'Streak broken. Your next tip starts a new one.' });
}
/** Hand-rolled SVG line chart: me vs league average */
function renderChart() {
  const s = seasonSeries(), n = s.gws.length;
  if (n < 2) { $('#chart').innerHTML = '<p class="note">Your chart appears once two gameweeks have been scored.</p>'; return; }
  const W = 640, H = 260, m = { l: 34, r: 12, t: 16, b: 28 }, max = Math.max(10, Math.ceil(Math.max(...s.me, ...s.avg) / 5) * 5);
  const x = i => m.l + i * (W - m.l - m.r) / (n - 1), y = v => H - m.b - v / max * (H - m.t - m.b);
  const path = d => d.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [0, .25, .5, .75, 1].map(f => f * max).map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="4" y="${y(v) + 4}">${Math.round(v * 10) / 10}</text>`).join('');
  const xl = s.gws.map((g, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${g}</text>`).join('');
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Points per gameweek, you versus league average">${grid}${xl}
    <path class="line" d="${path(s.avg)}" stroke="var(--muted)" style="animation-delay:.15s"/>
    <path class="line" d="${path(s.me)}" stroke="var(--hot)"/>
    ${s.me.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--hot)"/>`).join('')}</svg>
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
        <span class="up-t up-t--h">${teamOf(f.home).name}${badge(f.home, 1)}</span><span class="up-vs">v</span>
        <span class="up-t">${badge(f.away, 1)}${teamOf(f.away).name}</span></div>`;
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
      <span class="club">${badge(r.code, 1)}${teamOf(r.code).name}</span><span>${r.p}</span>${hm(r.w)}${hm(r.d)}${hm(r.l)}${hm(r.gf)}${hm(r.ga)}
      <span>${r.gd > 0 ? '+' : ''}${r.gd}</span><span>${r.pts}</span></div>`).join('');
}

/** Everyone's tips: hidden per match until kick-off (enforced by the database), then revealed */
async function renderAllTips() {
  const c = DB.competition.gameweek;
  if (state.tipsGw == null) {
    const started = DB.fixtures.filter(f => Date.parse(f.kickoff) <= Date.now()).map(f => f.gw);
    state.tipsGw = started.length ? Math.max(...started) : c;   // open on the latest round that has kicked off
  }
  const gw = state.tipsGw;
  const gws = [...new Set(DB.fixtures.filter(f => f.gw <= c).map(f => f.gw))].sort((a, b) => b - a);
  $('#gwPills').innerHTML = gws.map(g => `<button class="pill ${g === gw ? 'on' : ''}" data-gw="${g}">GW${g}</button>`).join('');
  let tips = [];
  try { tips = await API.loadTipsForGw(gw); } catch (err) { console.warn('Could not load tips:', err); }
  if (gw !== state.tipsGw) return;   // the player switched round while this was loading
  const byFixture = {};
  tips.forEach(t => (byFixture[t.fixtureId] ||= {})[t.userId] = t);
  const res = Object.fromEntries(API.getResults().map(r => [r.fixtureId, r]));
  $('#allTips').innerHTML = DB.fixtures.filter(f => f.gw === gw).map(f => {
    const r = res[f.id], started = now() >= Date.parse(f.kickoff);
    const head = `<div class="at__head">${badge(f.home, 1)}<b>${teamOf(f.home).name}</b>${r ? `<span class="at__score">${r.home}–${r.away}</span>` : '<span class="at__vs">v</span>'}<b>${teamOf(f.away).name}</b>${badge(f.away, 1)}</div>`;
    if (!started) return `<article class="card at">${head}<p class="at__lock"><i class="fa-solid fa-lock"></i> Tips are hidden until kick-off (${fmtDate(f.kickoff)})</p></article>`;
    const chips = state.profiles.map(p => {
      const t = (byFixture[f.id] || {})[p.id];
      const kind = t && r ? scoreTip(t, r).kind : 'none';
      return `<span class="tipchip ${kind} ${p.id === state.userId ? 'me' : ''}"><small>${esc(first(p.display_name))}</small><b>${t ? `${t.home}–${t.away}` : '–'}</b></span>`;
    }).join('');
    return `<article class="card at">${head}<div class="at__chips">${chips}</div></article>`;
  }).join('');
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
function setTeam(code, persist = true) {
  state.team = THEMES[code] ? code : null;
  try { state.team ? localStorage.setItem('team', state.team) : localStorage.removeItem('team'); } catch (e) { }
  applyClubTheme(state.team); renderClubButton(); renderClubMenu();
  if (persist && state.userId) {   // remember the club on the player's profile
    sb.from('profiles').update({ fav_team: state.team }).eq('id', state.userId)
      .then(({ error }) => { if (error) console.warn('Could not save club colours:', error); });
  }
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

/* ---------- 11. Join the league ---------- */
/** Shows the Join dialog until the player has a profile. The league code is checked before any account is created. */
async function joinFlow() {
  const dlg = $('#joinDlg'), btn = $('#joinBtn');
  const name = $('#joinName'), code = $('#joinCode'), club = $('#joinClub');
  const fields = { name: $('#joinNameField'), code: $('#joinCodeField') };
  const errs = { name: $('#joinNameErr'), code: $('#joinCodeErr'), general: $('#joinErr') };
  let busy = false;

  club.innerHTML = '<option value="">Premier League colours</option>' +
    Object.entries(DB.teams).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('');
  club.value = state.team ?? '';
  club.onchange = () => setTeam(club.value, false);   // preview the club colours straight away

  const clearErrors = () => {
    Object.values(errs).forEach(e => e.textContent = '');
    Object.values(fields).forEach(f => f.classList.remove('is-invalid'));
    name.removeAttribute('aria-invalid'); code.removeAttribute('aria-invalid');
  };
  const fail = (where, msg) => {
    errs[where].textContent = msg;
    if (where !== 'general') {
      fields[where].classList.add('is-invalid');
      const input = where === 'name' ? name : code;
      input.setAttribute('aria-invalid', 'true'); input.focus();
    }
  };
  const sync = () => {
    $('#joinCount').textContent = `${name.value.length}/20`;
    btn.disabled = busy || name.value.trim().length < 2 || code.value.trim() === '';
  };
  const setBusy = on => {
    busy = on;
    [name, code, club].forEach(el => el.disabled = on);
    btn.innerHTML = on ? '<i class="fa-solid fa-spinner fa-spin"></i> Joining…' : 'Join the league';
    sync();
  };

  dlg.addEventListener('cancel', e => e.preventDefault());   // no Esc to skip
  dlg.showModal();
  sync();

  await new Promise(done => {
    const submit = async () => {
      if (btn.disabled) return;
      clearErrors(); setBusy(true);
      let problem = null;   // [field, message]; shown after the inputs are re-enabled so focus can move to the right one
      try {
        const n = name.value.trim(), c = code.value.trim();
        if (!(await API.checkLeagueCode(c))) {
          problem = ['code', 'That league code isn’t right. Check with whoever invited you.'];
        } else {
          state.userId = await API.ensureUser();
          state.profile = await API.claimProfile(n, c, state.team);
          dlg.close(); done();
        }
      } catch (e) {
        console.error('Join failed:', e);
        if (e.code === '23505') problem = ['name', 'That name is already taken. Try another.'];
        else if (/league code/i.test(e.message || '')) problem = ['code', 'That league code isn’t right. Check with whoever invited you.'];
        else problem = ['general', 'Something went wrong. Check your connection and try again.'];
      } finally {
        if (dlg.open) { setBusy(false); if (problem) fail(...problem); }
      }
    };
    btn.onclick = submit;
    [name, code].forEach(el => {
      const which = el === name ? 'name' : 'code';
      el.oninput = () => {   // typing clears that field's error
        errs[which].textContent = ''; errs.general.textContent = '';
        fields[which].classList.remove('is-invalid'); el.removeAttribute('aria-invalid');
        sync();
      };
      el.onkeydown = e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (el === name && code.value.trim() === '') code.focus(); else submit();
      };
    });
  });
}

/* ---------- 12. Init ---------- */
async function init() {
  let saved; try { saved = localStorage.getItem('theme'); } catch (e) { }
  let team; try { team = localStorage.getItem('team'); } catch (e) { }
  state.team = THEMES[team] ? team : null;
  buildNav(); renderClubMenu(); setTheme(saved || 'dark'); renderClubButton();
  $('#themeToggle').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  try {
    await API.loadFixtures();
    DB.competition.gameweek = currentGameweek();
    if (!API.getFixtures(DB.competition.gameweek).length) throw new Error(`No fixtures for GW${DB.competition.gameweek}`);
    setDeadline();
  } catch (err) {
    console.error('Could not load fixtures from Supabase:', err);
    $('#app').innerHTML = '<p class="note" style="padding:24px">Couldn’t load fixtures. Please refresh to try again.</p>';
    return;
  }
  try {
    state.userId = await API.getUserId();
    state.profile = state.userId ? await API.loadProfile() : null;
    if (!state.profile) await joinFlow();
    if (!state.team && THEMES[state.profile.fav_team]) setTeam(state.profile.fav_team, false);
    await Promise.all([API.loadProfiles(), API.loadBoard()]);
    applySavedTips(await API.loadMyTips());
  } catch (err) {
    console.error('Could not load your data:', err);
    $('#app').innerHTML = '<p class="note" style="padding:24px">Couldn’t load your data. Please refresh to try again.</p>';
    return;
  }
  renderDashboard(); renderFixtures(); renderLeaderboard(); renderResults(); renderStats(); renderUpcoming(); renderTable(); renderAllTips();
  bindInteractions();
  tickCountdown(); setInterval(tickCountdown, 1000);

  $('#submitBtn').onclick = submitTips;
  $('#teamFilter').onchange = renderUpcoming;
  $('#jokerBtn').onclick = () => { state.joker = !state.joker; renderJoker(); toast(state.joker ? 'Joker armed for this round' : 'Joker removed'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleClubMenu(false); });
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  go(location.hash.slice(1));
}
document.addEventListener('DOMContentLoaded', init);
