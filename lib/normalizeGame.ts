// Shared game normalizer for scorpanion API format
// The API returns: { seattleTeam, opponent, isHome, seattleScore, opponentScore, status, sport, league, kickoff, ... }

export type NormalizedGame = {
  gameId: string;
  sport: string;
  sportLabel: string;
  status: string;
  period?: string;
  gameTime?: string;
  kickoff?: string;
  seattleTeamId?: string;   // e.g. 'seahawks', 'mariners' — raw API id
  seattleEspnId?: string;   // seattleTeam.espnId — matches allProTeams.espnId reliably
  awayTeam: { id: string; name: string; abbreviation: string; logo?: string };
  homeTeam: { id: string; name: string; abbreviation: string; logo?: string };
  awayScore?: number | string;
  homeScore?: number | string;
};

// Logo map for Seattle teams
const SEATTLE_LOGOS: Record<string, string> = {
  seahawks:     'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
  mariners:     'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png',
  kraken:       'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png',
  sounders:     'https://a.espncdn.com/i/teamlogos/soccer/500/9726.png',
  reign:        'https://a.espncdn.com/i/teamlogos/soccer/500/15363.png',
  storm:        'https://a.espncdn.com/i/teamlogos/wnba/500/sea.png',
  torrent:      'https://res.cloudinary.com/pwhl-low/image/upload/v1744984265/Seattle-MockLogo_SEATTLE.png',
  thunderbirds: 'https://assets.leaguestat.com/whl/logos/214.png',
  silvertips:   'https://assets.leaguestat.com/whl/logos/226.png',
  'uw-football':    'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-basketball':  'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-wbb':         'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-volleyball':  'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-baseball':    'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-lacrosse':    'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-softball':    'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'uw-soccer':      'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'wsu-football':   'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/265.png',
  'wsu-mbb':        'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/265.png',
  'wsu-wbb':        'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/265.png',
  'wsu-baseball':   'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/265.png',
  'wsu-volleyball': 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/265.png',
};

export function getSeattleTeamLogo(teamId: string): string | undefined {
  return SEATTLE_LOGOS[teamId];
}

export function getSportLabel(sportOrLeague: string): string {
  const s = (sportOrLeague || '').toLowerCase();
  if (s.includes('wnba'))                         return 'WNBA';
  if (s.includes('nhl') || s.includes('hockey'))  return 'NHL';
  if (s.includes('nba') || (s.includes('basketball') && !s.includes('wnba'))) return 'NBA';
  if (s.includes('nfl') || s.includes('football')) return 'NFL';
  if (s.includes('mlb') || s.includes('baseball')) return 'MLB';
  if (s.includes('mls') || s.includes('soccer'))   return 'MLS';
  if (s.includes('pwhl'))  return 'PWHL';
  if (s.includes('whl'))   return 'WHL';
  if (s.includes('ncaa'))  return 'NCAA';
  return sportOrLeague.toUpperCase();
}

// Normalize a status string from scorpanion format → display string
export function normalizeStatus(status: string): string {
  if (!status) return 'Scheduled';
  const s = status.toLowerCase();
  if (s === 'ft' || s === 'final') return 'Final';
  if (s === 'live' || s === 'in progress') return 'In Progress';
  if (s === 'upcoming' || s === 'scheduled') return 'Scheduled';
  return status;
}

export function isLiveStatus(status: string): boolean {
  const s = (status || '').toLowerCase();
  return (
    s === 'live' ||
    s === 'in progress' ||
    s.includes('progress') ||
    s.includes('inning') ||
    s.includes('quarter') ||
    s.includes('period') ||
    s.includes('half')
  );
}

/** Multi-day tour events (PGA, LPGA, etc.) should only show LIVE on the day of the actual round. */
export function isTourSport(sport: string): boolean {
  const s = (sport || '').toLowerCase();
  return s.includes('golf') || s.includes('pga') || s.includes('lpga');
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Returns true if this game should be shown as LIVE.
 * For tour sports (PGA/LPGA), only live if the round is scheduled TODAY.
 * For all other sports, just checks the status string.
 */
export function isEffectivelyLive(status: string, sport: string, kickoff?: string): boolean {
  if (!isLiveStatus(status)) return false;
  if (isTourSport(sport)) {
    if (!kickoff) return false;
    const roundDate = kickoff.split('T')[0];
    return roundDate === todayDateStr();
  }
  return true;
}

// Parse a kickoff to a local time string like "7:10 PM"
function parseGameTime(kickoff: string): string | undefined {
  if (!kickoff) return undefined;
  try {
    return new Date(kickoff).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return undefined;
  }
}

/**
 * Validate a parsed score. Returns the score if it's a valid non-negative integer,
 * or undefined if it looks like bad/placeholder data.
 * Baseball can go high in bad games (e.g. 20+), so we only reject truly absurd values.
 */
function validateScore(val: number | string | undefined): number | string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  if (isNaN(n) || n < 0 || n > 150) return undefined;
  return val;
}

/**
 * Normalize a game from the scorpanion /api/schedule response format.
 * The API returns Seattle-centric games: seattleTeam vs opponent.
 */
export function normalizeGame(raw: any): NormalizedGame {
  // ── Scorpanion format (from /api/schedule) ─────────────────────────────────
  if (raw.seattleTeam && raw.opponent) {
    const seattleTeam = raw.seattleTeam;
    const opponent    = raw.opponent;
    const isHome      = Boolean(raw.isHome);

    const seattleLogo   = getSeattleTeamLogo(seattleTeam.id) || seattleTeam.logoUrl;
    const opponentLogo  = opponent.logo || opponent.logoUrl;

    // isHome: Seattle is home, opponent is away
    const awayTeamData  = isHome ? opponent    : seattleTeam;
    const homeTeamData  = isHome ? seattleTeam : opponent;
    const awayLogoUrl   = isHome ? opponentLogo : seattleLogo;
    const homeLogoUrl   = isHome ? seattleLogo  : opponentLogo;

    // Status: scorpanion uses 'upcoming'|'live'|'ft', plus clock/period for live
    const status  = normalizeStatus(raw.status);
    const period  = raw.period
      ? raw.period
      : (raw.clock && raw.status === 'live')
        ? raw.clock
        : undefined;

    const sportLabel = getSportLabel(raw.league || raw.sport || '');

    return {
      gameId:        String(raw.id || Math.random()),
      sport:         raw.sport || '',
      sportLabel,
      status,
      period,
      gameTime:      parseGameTime(raw.kickoff),
      kickoff:       raw.kickoff || undefined,
      seattleTeamId: raw.seattleTeam?.id || undefined,
      seattleEspnId: raw.seattleTeam?.espnId || undefined,
      awayTeam: {
        id:           awayTeamData.espnId || awayTeamData.id || '',
        name:         awayTeamData.shortName || awayTeamData.name || 'Away',
        abbreviation: awayTeamData.abbr || '?',
        logo:         awayLogoUrl,
      },
      homeTeam: {
        id:           homeTeamData.espnId || homeTeamData.id || '',
        name:         homeTeamData.shortName || homeTeamData.name || 'Home',
        abbreviation: homeTeamData.abbr || '?',
        logo:         homeLogoUrl,
      },
      awayScore:     validateScore(isHome ? raw.opponentScore : raw.seattleScore),
      homeScore:     validateScore(isHome ? raw.seattleScore  : raw.opponentScore),
    };
  }

  // ── Fallback: ESPN scoreboard format ──────────────────────────────────────
  const comp   = raw.competitions?.[0] ?? raw;
  const comps  = comp.competitors ?? raw.competitors ?? [];
  const away   = comps.find((c: any) => c.homeAway === 'away') ?? comps[0] ?? {};
  const home   = comps.find((c: any) => c.homeAway === 'home') ?? comps[1] ?? {};

  const status = normalizeStatus(
    comp.status?.type?.description ??
    comp.status?.description ??
    raw.status?.type?.description ??
    raw.status?.description ??
    raw.statusText ??
    'Scheduled'
  );

  const period =
    comp.status?.type?.shortDetail ??
    raw.status?.type?.shortDetail ??
    undefined;

  const sport: string = (raw.sport ?? raw.league ?? '').toLowerCase();

  return {
    gameId:    String(raw.id ?? raw.gameId ?? Math.random()),
    sport,
    sportLabel: getSportLabel(sport),
    status,
    period:    period || undefined,
    gameTime:  parseGameTime(raw.date ?? comp.date),
    kickoff:   raw.date ?? comp.date ?? raw.kickoff ?? undefined,
    awayTeam: {
      id:           away.team?.id ?? '',
      name:         away.team?.shortDisplayName ?? away.team?.name ?? 'Away',
      abbreviation: away.team?.abbreviation ?? 'AWY',
      logo:         away.team?.logo,
    },
    homeTeam: {
      id:           home.team?.id ?? '',
      name:         home.team?.shortDisplayName ?? home.team?.name ?? 'Home',
      abbreviation: home.team?.abbreviation ?? 'HME',
      logo:         home.team?.logo,
    },
    awayScore: validateScore(away.score !== undefined ? away.score : undefined),
    homeScore: validateScore(home.score !== undefined ? home.score : undefined),
  };
}
