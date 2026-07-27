import { getCached, setCached, TTL } from './cache';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://scorpanion.com';
const SCORPANION = 'https://scorpanion.com';

export async function fetchLiveScores(sport?: string, date?: string) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (date) params.set('date', date);
  const url = `${API_BASE}/api/live-scores?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSchedule(sport?: string, date?: string, cacheBust?: string) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (date) params.set('date', date);
  if (cacheBust) params.set('_cb', cacheBust.replace(/^_cb=/, ''));
  const url = `${API_BASE}/api/schedule?${params}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache, no-store' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStandings(sport?: string, league?: string) {
  const key = `standings:${sport ?? ''}:${league ?? ''}`;
  const cached = getCached(key);
  if (cached) return cached;

  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (league) params.set('league', league);
  const url = `${API_BASE}/api/standings?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  setCached(key, data, TTL.STANDINGS);
  return data;
}

export async function fetchBoxscore(gameId: string, sport?: string) {
  const params = new URLSearchParams({ gameId });
  if (sport) params.set('sport', sport);
  const url = `${API_BASE}/api/boxscore?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTeams(sport?: string) {
  const key = `teams:${sport ?? ''}`;
  const cached = getCached(key);
  if (cached) return cached;

  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  const url = `${API_BASE}/api/teams?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  setCached(key, data, TTL.TEAMS);
  return data;
}

export async function fetchTeamDetailByLeague(teamId: string, league: string) {
  const key = `team-detail:${teamId}:${league}`;
  const cached = getCached(key);
  if (cached) return cached;

  const params = new URLSearchParams({ teamId, league });
  const url = `${SCORPANION}/api/team-detail?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  setCached(key, data, TTL.TEAM_DETAIL);
  return data;
}

export async function fetchTeamDetail(teamId: string, sport?: string) {
  const key = `team-detail:${teamId}:${sport ?? ''}`;
  const cached = getCached(key);
  if (cached) return cached;

  const params = new URLSearchParams({ teamId });
  if (sport) params.set('sport', sport);
  const url = `${API_BASE}/api/team-detail?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  setCached(key, data, TTL.TEAM_DETAIL);
  return data;
}

/** Fetch PGA or LPGA tournaments from the webapp API.
 *  Returns PGATournament[] — active/upcoming/recent tournaments. */
export async function fetchGolf(tour: 'pga' | 'lpga') {
  const url = `${SCORPANION}/api/${tour}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Only cache when no live tournament is active to keep live scores fresh.
  const hasLive = Array.isArray(data) && data.some((t: any) => t.status === 'live');
  if (!hasLive) {
    setCached(`golf:${tour}`, data, TTL.GOLF);
  }
  return data;
}
