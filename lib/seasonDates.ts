/**
 * seasonDates.ts — Season date data for off-season countdown display.
 * Mirrors scorpanion webapp's lib/seasonDates.ts and lib/seasonStatus.ts.
 */

export interface OffseasonDisplay {
  label: string
  detail: string
  icon: string
  nextStart?: string  // rough "Month YYYY" of next season start
}

// Map league ID (from SEATTLE_TEAMS / seattleTeam.league) → display info
export const OFFSEASON_DISPLAY: Record<string, OffseasonDisplay> = {
  nfl:          { label: 'Training Camp',    detail: 'Opens late July',         icon: '🏈', nextStart: 'September' },
  mlb:          { label: 'Spring Training',  detail: 'Opens mid-February',      icon: '⚾', nextStart: 'March' },
  nba:          { label: 'New Season',       detail: 'Begins mid-October',      icon: '🏀', nextStart: 'October' },
  nhl:          { label: 'New Season',       detail: 'Begins early October',    icon: '🏒', nextStart: 'October' },
  'usa.1':      { label: 'New Season',       detail: 'Begins late February',    icon: '⚽', nextStart: 'February' },
  mls:          { label: 'New Season',       detail: 'Begins late February',    icon: '⚽', nextStart: 'February' },
  wnba:         { label: 'New Season',       detail: 'Begins mid-May',          icon: '🏀', nextStart: 'May' },
  'usa.nwsl':   { label: 'New Season',       detail: 'Begins mid-March',        icon: '⚽', nextStart: 'March' },
  nwsl:         { label: 'New Season',       detail: 'Begins mid-March',        icon: '⚽', nextStart: 'March' },
  'college-football':          { label: 'Fall Season', detail: 'Begins late August',   icon: '🏈', nextStart: 'September' },
  'mens-college-basketball':   { label: 'New Season',  detail: 'Begins November',      icon: '🏀', nextStart: 'November' },
  'womens-college-basketball': { label: 'New Season',  detail: 'Begins November',      icon: '🏀', nextStart: 'November' },
  whl:          { label: 'New Season',       detail: 'Begins late September',   icon: '🏒', nextStart: 'September' },
  pwhl:         { label: 'New Season',       detail: 'Begins January',          icon: '🏒', nextStart: 'January' },
}

/**
 * Returns a human-readable string like "October 2026" for when the next
 * season of this league is expected to start.
 */
export function getApproxNextSeason(leagueId: string): string | null {
  const info = OFFSEASON_DISPLAY[leagueId]
  if (!info?.nextStart) return null

  const now = new Date()
  const m   = now.getMonth() // 0-indexed
  const y   = now.getFullYear()

  // Fall-starting leagues: if we're past June, the "next" season is next year
  const fallStart = ['nhl', 'nba', 'nfl', 'whl', 'college-football',
                     'mens-college-basketball', 'womens-college-basketball']
  const nextYear = fallStart.includes(leagueId) && m >= 6 ? y + 1 : y
  return `${info.nextStart} ${nextYear}`
}
