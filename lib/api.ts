const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://scorpanion.vercel.app';

export async function fetchLiveScores(sport?: string, date?: string) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (date) params.set('date', date);
  const url = `${API_BASE}/api/live-scores?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSchedule(sport?: string, date?: string) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (date) params.set('date', date);
  const url = `${API_BASE}/api/schedule?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStandings(sport?: string, league?: string) {
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  if (league) params.set('league', league);
  const url = `${API_BASE}/api/standings?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  const params = new URLSearchParams();
  if (sport) params.set('sport', sport);
  const url = `${API_BASE}/api/teams?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTeamDetail(teamId: string, sport?: string) {
  const params = new URLSearchParams({ teamId });
  if (sport) params.set('sport', sport);
  const url = `${API_BASE}/api/team-detail?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
