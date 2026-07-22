export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  displayName?: string;
  shortDisplayName?: string;
  logo?: string;
  color?: string;
  alternateColor?: string;
}

export interface GameScore {
  awayScore: number | string;
  homeScore: number | string;
}

export interface GameStatus {
  description: string;
  type: {
    id: string;
    name: string;
    state: string;
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
  period?: number;
  displayClock?: string;
}

export interface Competitor {
  id: string;
  homeAway: 'home' | 'away';
  score?: string | number;
  team: TeamInfo;
  records?: Array<{ name: string; summary: string; type: string }>;
}

export interface Competition {
  id: string;
  competitors: Competitor[];
  venue?: { fullName: string; city: string };
  status: GameStatus;
}

export interface Game {
  id: string;
  name?: string;
  sport?: string;
  league?: string;
  date?: string;
  status: GameStatus;
  competitions: Competition[];
}

export interface StandingsEntry {
  team: TeamInfo;
  stats: Array<{ name: string; value: number; displayValue: string; abbreviation?: string }>;
  note?: { color: string; description: string };
}

/** Matches the web app's SeattleTeam type */
export interface SeattleTeam {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  sport: string;
  league: string;
  espnId: string;
  primaryColor: string;
  secondaryColor: string;
  emoji: string;
  logoUrl?: string;
  optInOnly?: boolean;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties?: number;
  summary?: string;
}

export interface Opponent {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  logo: string;
  record?: TeamRecord;
}
