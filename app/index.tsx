import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Image, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet from '../components/GameDetailSheet';
import { GolfTodayCard, GolfMiniCard, GolfUpcomingRow } from '../components/GolfCard';
import GolfDetailSheet, { PGATournament } from '../components/GolfDetailSheet';
import CollegeSportPicker, { CollegePickerTeam } from '../components/CollegeSportPicker';
import { fetchSchedule, fetchGolf } from '../lib/api';
import { normalizeGame, isLiveStatus, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE, BORDER, ACCENT, TEXT_FAINT, SURFACE2 } from '../constants/theme';
import type { ScorpanionGame } from '../lib/types';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS } from '../lib/allProTeams';
import { OFFSEASON_DISPLAY, getApproxNextSeason } from '../lib/seasonDates';

// ── College group helpers ──────────────────────────────────────────────────────

function getCollegeGroupKey(teamId: string): string | null {
  if (teamId.startsWith('uw-'))  return 'uw';
  if (teamId.startsWith('wsu-')) return 'wsu';
  if (teamId === 'seattleu') return 'seattleu';
  return null;
}

// ── Mapping from ALL_PRO_TEAMS.id → seattleTeam.id (used to filter home screen) ──
const PRO_TO_SEATTLE_ID: Record<string, string> = {
  'nfl-sea':    'seahawks',
  'mlb-sea':    'mariners',
  'nhl-sea':    'kraken',
  'wnba-sea':   'storm',
  'mls-seattle':'sounders',
  'nwsl-reign': 'reign',
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseKickoffMs(k: string): number | null {
  if (!k) return null;
  if (k.includes('T') || k.match(/^\d{4}-/)) {
    const d = new Date(k).getTime();
    return isNaN(d) ? null : d;
  }
  const [datePart = '', ...rest] = k.split(' ');
  const [m, d, y] = datePart.split('/');
  const t = new Date(`${y}-${(m ?? '1').padStart(2,'0')}-${(d ?? '1').padStart(2,'0')}T${rest.join(' ')}Z`).getTime();
  return isNaN(t) ? null : t;
}

function kickoffDateStr(kickoff: string): string | null {
  const ms = parseKickoffMs(kickoff);
  if (!ms) return null;
  return new Date(ms).toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function sectionHeader(label: string, sub?: string) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionRule} />
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Off-season countdown card ─────────────────────────────────────────────────

interface OffseasonCardProps {
  teamId: string        // ALL_PRO_TEAMS id (e.g. 'nfl-sea')
  logo: string
  shortName: string
  league: string
  nextGame?: ScorpanionGame | null
}

function OffseasonCard({ teamId, logo, shortName, league, nextGame }: OffseasonCardProps) {
  const seasonInfo = OFFSEASON_DISPLAY[league];
  let days: number | null = null;

  if (nextGame) {
    const ms = parseKickoffMs(nextGame.kickoff);
    if (ms) days = Math.ceil((ms - Date.now()) / 86_400_000);
  }

  return (
    <View style={styles.offseasonCard}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.offseasonLogo} resizeMode="contain" />
      ) : (
        <View style={styles.offseasonLogoFallback}>
          <Text style={{ color: TEXT_FAINT, fontSize: 18 }}>{seasonInfo?.icon ?? '🏟️'}</Text>
        </View>
      )}
      <View style={styles.offseasonInfo}>
        <Text style={styles.offseasonName}>{shortName}</Text>
        {nextGame ? (
          <Text style={styles.offseasonSub} numberOfLines={1}>
            Next: {new Date(parseKickoffMs(nextGame.kickoff) ?? 0).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}{nextGame.isHome ? 'vs' : '@'} {nextGame.opponent.shortName || nextGame.opponent.abbr}
          </Text>
        ) : seasonInfo ? (
          <Text style={styles.offseasonSub}>{seasonInfo.label} · Off-season</Text>
        ) : (
          <Text style={styles.offseasonSub}>No games scheduled</Text>
        )}
        {seasonInfo && !nextGame && (
          <View style={styles.nextSeasonPill}>
            <Text style={styles.nextSeasonText}>📅 Next season begins </Text>
            <Text style={[styles.nextSeasonText, { color: '#e4e4e7', fontWeight: '700' }]}>
              {getApproxNextSeason(league) ?? seasonInfo.detail}
            </Text>
          </View>
        )}
      </View>
      {days !== null && days >= 0 && (
        <View style={styles.offseasonDays}>
          <Text style={styles.offseasonDaysNum}>{days}</Text>
          <Text style={styles.offseasonDaysLabel}>{days === 1 ? 'day' : 'days'}</Text>
        </View>
      )}
    </View>
  );
}

// ── Mini card for RECENT horizontal scroll ────────────────────────────────────

function MiniCard({ game, onPress }: { game: NormalizedGame; onPress: () => void }) {
  const awayWon = game.status === 'Final' && Number(game.awayScore) > Number(game.homeScore);
  const homeWon = game.status === 'Final' && Number(game.homeScore) > Number(game.awayScore);
  return (
    <TouchableOpacity onPress={onPress} style={styles.miniCard} activeOpacity={0.7}>
      <Text style={styles.miniSport}>{game.sportLabel}</Text>
      <View style={styles.miniTeams}>
        <View style={styles.miniTeamCol}>
          {game.awayTeam.logo
            ? <Image source={{ uri: game.awayTeam.logo }} style={styles.miniLogo} resizeMode="contain" />
            : <View style={styles.miniLogoFallback}><Text style={styles.miniLogoText}>{game.awayTeam.abbreviation?.slice(0,3)}</Text></View>
          }
          <Text style={[styles.miniAbbr, homeWon && styles.miniLoserAbbr]}>{game.awayTeam.abbreviation}</Text>
          {game.awayScore !== undefined && (
            <Text style={[styles.miniScore, homeWon && styles.miniLoserScore]}>{game.awayScore}</Text>
          )}
        </View>
        <Text style={styles.miniDash}>–</Text>
        <View style={styles.miniTeamCol}>
          {game.homeTeam.logo
            ? <Image source={{ uri: game.homeTeam.logo }} style={styles.miniLogo} resizeMode="contain" />
            : <View style={styles.miniLogoFallback}><Text style={styles.miniLogoText}>{game.homeTeam.abbreviation?.slice(0,3)}</Text></View>
          }
          <Text style={[styles.miniAbbr, awayWon && styles.miniLoserAbbr]}>{game.homeTeam.abbreviation}</Text>
          {game.homeScore !== undefined && (
            <Text style={[styles.miniScore, awayWon && styles.miniLoserScore]}>{game.homeScore}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Date group header for UPCOMING ───────────────────────────────────────────

function DateHeader({ dateStr }: { dateStr: string }) {
  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).toUpperCase();
  return (
    <View style={styles.dateHeaderRow}>
      <Text style={styles.dateHeaderText}>{label}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

// ── Golf tournament data hook ─────────────────────────────────────────────────

function useGolfTournaments(tourId: 'pga' | 'lpga', enabled: boolean) {
  const [tournaments, setTournaments] = useState<PGATournament[]>([]);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    try {
      const data: PGATournament[] = await fetchGolf(tourId);
      setTournaments(Array.isArray(data) ? data : []);
      setLoaded(true);
      const isLive = Array.isArray(data) && data.some(t => t.status === 'live');
      const nextMs = isLive ? 60_000 : 5 * 60_000;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(doFetch, nextMs);
    } catch {
      setLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(() => {
    if (!enabled) { setTournaments([]); setLoaded(true); return; }
    doFetch();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, doFetch]);

  return { tournaments, loaded };
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { followedTeams } = useSportsData();
  const [allGames,   setAllGames]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ScorpanionGame | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [collegePicker, setCollegePicker] = useState<string | null>(null); // 'uw' | 'wsu' | 'seattleu'
  const [selectedGolfUpcoming, setSelectedGolfUpcoming] = useState<{
    tournament: PGATournament; label: string; accentColor: string;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Golf follow state ────────────────────────────────────────────────────────
  const pgaFollowed  = followedTeams.includes('pga');
  const lpgaFollowed = followedTeams.includes('lpga');
  const pgaVisibleInFilter  = pgaFollowed  && (activeFilter === 'all' || activeFilter === 'pga');
  const lpgaVisibleInFilter = lpgaFollowed && (activeFilter === 'all' || activeFilter === 'lpga');

  const { tournaments: pgaTournaments }  = useGolfTournaments('pga',  pgaFollowed);
  const { tournaments: lpgaTournaments } = useGolfTournaments('lpga', lpgaFollowed);

  // ── Schedule load ────────────────────────────────────────────────────────────
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!allGames.length) setLoading(true);
    try {
      const raw  = await fetchSchedule();
      const list = Array.isArray(raw) ? raw : raw.games ?? raw.events ?? [];
      setAllGames(list);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const today = todayStr();
  const now   = Date.now();
  const day7  = 7 * 86_400_000;
  const day14 = 14 * 86_400_000;

  // ── Build filter bar items ───────────────────────────────────────────────────
  // 1) Pro teams with a Seattle mapping
  // 2) Golf tours if followed
  // 3) College group buttons (one per school group, not per sport)
  const filterableProTeams = React.useMemo(() =>
    followedTeams
      .map(id => ALL_PRO_TEAMS.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t && PRO_TO_SEATTLE_ID[t.id] !== undefined),
    [followedTeams]
  );

  // College group representatives (one per school)
  const collegeGroupReps = React.useMemo(() => {
    const seen = new Set<string>();
    const reps: { groupKey: string; team: NonNullable<typeof ALL_PRO_TEAMS[0]> }[] = [];
    for (const id of followedTeams) {
      const gk = getCollegeGroupKey(id);
      if (gk && !seen.has(gk)) {
        seen.add(gk);
        const team = ALL_PRO_TEAMS.find(t => t.id === id);
        if (team) reps.push({ groupKey: gk, team });
      }
    }
    return reps;
  }, [followedTeams]);

  // Golf tour filter items
  const golfFilterItems = React.useMemo(() => {
    const items: { id: string; logo: string }[] = [];
    if (pgaFollowed)  items.push({ id: 'pga',  logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/pgatour.png' });
    if (lpgaFollowed) items.push({ id: 'lpga', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/lpga.png' });
    return items;
  }, [pgaFollowed, lpgaFollowed]);

  const hasFilterBar = filterableProTeams.length > 0 || collegeGroupReps.length > 0 || golfFilterItems.length > 0;

  // ── Filter game data ─────────────────────────────────────────────────────────
  const filteredGames = React.useMemo(() => {
    if (activeFilter === 'all') return allGames;
    // College sport filter (e.g. 'uw-football') → filter by seattleTeam.id === activeFilter
    const gk = getCollegeGroupKey(activeFilter);
    if (gk !== null) {
      // If the active filter IS a specific college sport ID (e.g. 'uw-football')
      return allGames.filter((g: any) => g.seattleTeam?.id === activeFilter);
    }
    // Golf filter — no team games match
    if (activeFilter === 'pga' || activeFilter === 'lpga') return [];
    // Pro team filter
    const seattleId = PRO_TO_SEATTLE_ID[activeFilter];
    if (!seattleId) return allGames;
    return allGames.filter((g: any) => g.seattleTeam?.id === seattleId);
  }, [allGames, activeFilter]);

  // ── Categorize games ─────────────────────────────────────────────────────────
  const { recent, todayGames, upcoming, rawById } = React.useMemo(() => {
    const recent: NormalizedGame[]   = [];
    const todayGames: NormalizedGame[] = [];
    const upcoming: NormalizedGame[] = [];
    const rawById = new Map<string, any>();

    for (const g of filteredGames) {
      const ts   = parseKickoffMs(g.kickoff);
      const ds   = kickoffDateStr(g.kickoff);
      const norm = normalizeGame(g);
      rawById.set(norm.gameId, g);

      if (g.status === 'live' || isLiveStatus(norm.status)) {
        todayGames.unshift(norm);
      } else if (ds === today) {
        todayGames.push(norm);
      } else if (ts && ts >= now - day7 && ts < now && g.status === 'ft') {
        recent.push(norm);
      } else if (ts && ts > now && ts <= now + day14) {
        upcoming.push(norm);
      }
    }

    recent.sort((a, b) => (parseKickoffMs((filteredGames.find((g: any) => g.id === a.gameId) ?? {}).kickoff ?? '') ?? 0) - (parseKickoffMs((filteredGames.find((g: any) => g.id === b.gameId) ?? {}).kickoff ?? '') ?? 0));
    upcoming.sort((a, b) => (parseKickoffMs((filteredGames.find((g: any) => g.id === a.gameId) ?? {}).kickoff ?? '') ?? 0) - (parseKickoffMs((filteredGames.find((g: any) => g.id === b.gameId) ?? {}).kickoff ?? '') ?? 0));

    return { recent, todayGames, upcoming, rawById };
  }, [filteredGames, today, now]);

  // ── Golf classification ───────────────────────────────────────────────────────
  const cutoffAgo7 = now - day7;
  const pgaToday    = pgaVisibleInFilter  ? pgaTournaments.filter(t => t.status === 'live') : [];
  const pgaRecent   = pgaVisibleInFilter  ? pgaTournaments.filter(t => t.status === 'completed' && new Date(t.endDate).getTime() >= cutoffAgo7) : [];
  const pgaUpcoming = pgaVisibleInFilter  ? pgaTournaments.filter(t => t.status === 'upcoming') : [];
  const lpgaToday    = lpgaVisibleInFilter ? lpgaTournaments.filter(t => t.status === 'live') : [];
  const lpgaRecent   = lpgaVisibleInFilter ? lpgaTournaments.filter(t => t.status === 'completed' && new Date(t.endDate).getTime() >= cutoffAgo7) : [];
  const lpgaUpcoming = lpgaVisibleInFilter ? lpgaTournaments.filter(t => t.status === 'upcoming') : [];

  const hasGolfToday = pgaToday.length > 0 || lpgaToday.length > 0;

  // ── Group upcoming by date ───────────────────────────────────────────────────
  const upcomingByDate = React.useMemo(() => {
    const map: Record<string, NormalizedGame[]> = {};
    for (const g of upcoming) {
      const rawG = filteredGames.find((r: any) => r.id === g.gameId);
      const ds   = rawG ? kickoffDateStr(rawG.kickoff) : null;
      const key  = ds ?? 'TBD';
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return Object.entries(map);
  }, [upcoming, filteredGames]);

  // Golf upcoming: add earliest upcoming per tournament
  const golfUpcomingByDate: Record<string, { tournament: PGATournament; label: string; accentColor: string }[]> = {};
  const addGolfToDate = (t: PGATournament, label: string, accentColor: string) => {
    // If tournament has per-round dates, add one entry per round; else use startDate
    if (t.rounds && t.rounds.length > 0) {
      for (const round of t.rounds) {
        if (!round.date) continue;
        const ds = round.date.split('T')[0];
        if (ds <= today) continue; // only future rounds
        if (!golfUpcomingByDate[ds]) golfUpcomingByDate[ds] = [];
        golfUpcomingByDate[ds].push({ tournament: t, label, accentColor });
      }
    } else {
      const ds = t.startDate ? t.startDate.split('T')[0] : undefined;
      if (!ds || ds <= today) return;
      if (!golfUpcomingByDate[ds]) golfUpcomingByDate[ds] = [];
      golfUpcomingByDate[ds].push({ tournament: t, label, accentColor });
    }
  };
  pgaUpcoming.forEach(t  => addGolfToDate(t, 'PGA Tour', '#CBA135'));
  lpgaUpcoming.forEach(t => addGolfToDate(t, 'LPGA',     '#C084FC'));

  const allUpcomingDates = [...new Set([
    ...upcomingByDate.map(([d]) => d),
    ...Object.keys(golfUpcomingByDate),
  ])].filter(d => d > today).sort();

  // ── Next-game lookup for off-season countdown ────────────────────────────────
  const nextGameByTeamId = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const id of followedTeams) {
      const seattleId = PRO_TO_SEATTLE_ID[id];
      if (!seattleId) continue;
      const next = allGames
        .filter((g: any) => g.seattleTeam?.id === seattleId)
        .filter((g: any) => (parseKickoffMs(g.kickoff) ?? 0) > now)
        .sort((a: any, b: any) => (parseKickoffMs(a.kickoff) ?? 0) - (parseKickoffMs(b.kickoff) ?? 0))[0];
      if (next) map[id] = next;
    }
    return map;
  }, [allGames, followedTeams, now]);

  // ── Teams with NO games in range (for off-season display) ───────────────────
  const teamsWithNoGames = React.useMemo(() => {
    if (activeFilter !== 'all') return [];
    return followedTeams
      .map(id => ALL_PRO_TEAMS.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => {
        if (!t) return false;
        if (t.sport === 'golf') return false; // golf has its own section
        if (t.league === 'NCAA') return false; // college is game-data based
        const seattleId = PRO_TO_SEATTLE_ID[t.id];
        if (!seattleId) return false;
        const hasGame = allGames.some((g: any) => {
          if (g.seattleTeam?.id !== seattleId) return false;
          const ts = parseKickoffMs(g.kickoff);
          return ts ? (ts >= now - day7 && ts <= now + day14) : false;
        });
        return !hasGame;
      });
  }, [allGames, followedTeams, now]);

  // ── College sport picker data ────────────────────────────────────────────────
  function getCollegePickerTeams(groupKey: string): CollegePickerTeam[] {
    const teams = followedTeams
      .map(id => ALL_PRO_TEAMS.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t && getCollegeGroupKey(t.id) === groupKey);
    return teams.map(team => {
      const hasGames = allGames.some((g: any) => g.seattleTeam?.id === team.id);
      return { team, hasGames };
    });
  }

  const hasLive = todayGames.some(g => isLiveStatus(g.status));
  const hasAnyContent = recent.length > 0 || todayGames.length > 0 || upcoming.length > 0 || hasGolfToday || pgaRecent.length > 0 || lpgaRecent.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (followedTeams.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scorpanion</Text>
        </View>
        <View style={styles.noTeamsState}>
          <View style={styles.noTeamsCircle}>
            <Text style={styles.noTeamsPlus}>+</Text>
          </View>
          <Text style={styles.noTeamsTitle}>Add your teams</Text>
          <Text style={styles.noTeamsSub}>Follow teams to see their scores here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} colors={[ACCENT]} />
        }
      >
        {/* Page header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scorpanion</Text>
          {hasLive && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Now</Text>
            </View>
          )}
        </View>

        {/* ── Team filter bar ───────────────────────────────────────────────── */}
        {hasFilterBar && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBarContent}
              style={styles.filterBarScroll}
            >
              {/* ALL pill */}
              <TouchableOpacity onPress={() => { setActiveFilter('all'); setCollegePicker(null); }} activeOpacity={0.75}>
                <View style={[styles.filterCircle, activeFilter === 'all' && styles.filterCircleActive]}>
                  <Text style={styles.filterAllText}>All</Text>
                </View>
              </TouchableOpacity>

              {/* Pro team logo pills */}
              {filterableProTeams.map(team => {
                const isActive = activeFilter === team.id;
                const isDimmed = activeFilter !== 'all' && !isActive;
                return (
                  <TouchableOpacity
                    key={team.id}
                    onPress={() => { setActiveFilter(isActive ? 'all' : team.id); setCollegePicker(null); }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.filterCircle, styles.filterCircleTeam, isActive && styles.filterCircleActive, isDimmed && styles.filterCircleDim]}>
                      <Image source={{ uri: team.logo }} style={styles.filterLogo} resizeMode="contain" />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Golf tour pills */}
              {golfFilterItems.map(item => {
                const isActive = activeFilter === item.id;
                const isDimmed = activeFilter !== 'all' && !isActive;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => { setActiveFilter(isActive ? 'all' : item.id); setCollegePicker(null); }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.filterCircle, styles.filterCircleTeam, isActive && styles.filterCircleActive, isDimmed && styles.filterCircleDim]}>
                      <Image source={{ uri: item.logo }} style={styles.filterLogo} resizeMode="contain" />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* College group pills (with ▾ chevron) */}
              {collegeGroupReps.map(({ groupKey, team }) => {
                const isActive = getCollegeGroupKey(activeFilter) === groupKey;
                const isDimmed = activeFilter !== 'all' && !isActive;
                const pickerOpen = collegePicker === groupKey;
                return (
                  <TouchableOpacity
                    key={groupKey}
                    onPress={() => {
                      if (pickerOpen) {
                        setCollegePicker(null);
                      } else {
                        setCollegePicker(groupKey);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.filterCircle, styles.filterCircleTeam, isActive && styles.filterCircleActive, isDimmed && styles.filterCircleDim]}>
                      <Image source={{ uri: team.logo }} style={styles.filterLogo} resizeMode="contain" />
                      <Text style={styles.chevron}>▾</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── RECENT section ─────────────────────────────────────────────────── */}
        {(recent.length > 0 || pgaRecent.length > 0 || lpgaRecent.length > 0) && (
          <View style={styles.section}>
            {sectionHeader('RECENT', 'LAST 7 DAYS')}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniScroll}>
              {recent.map((g) => (
                <MiniCard key={g.gameId} game={g} onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
              ))}
              {pgaRecent.map(t => (
                <GolfMiniCard key={`pga-recent-${t.id}`} tournament={t} label="PGA Tour" accentColor="#CBA135" />
              ))}
              {lpgaRecent.map(t => (
                <GolfMiniCard key={`lpga-recent-${t.id}`} tournament={t} label="LPGA" accentColor="#C084FC" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── TODAY section ──────────────────────────────────────────────────── */}
        {(todayGames.length > 0 || hasGolfToday) && (
          <View style={styles.section}>
            {sectionHeader('TODAY', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase())}
            {todayGames.map((g) => (
              <GameCard key={g.gameId} {...g} onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
            ))}
            {pgaToday.map(t => (
              <GolfTodayCard key={`pga-today-${t.id}`} tournament={t} label="PGA Tour" accentColor="#CBA135" />
            ))}
            {lpgaToday.map(t => (
              <GolfTodayCard key={`lpga-today-${t.id}`} tournament={t} label="LPGA" accentColor="#C084FC" />
            ))}
          </View>
        )}

        {/* ── UPCOMING section ──────────────────────────────────────────────── */}
        {(allUpcomingDates.length > 0) && (
          <View style={styles.section}>
            {sectionHeader('UPCOMING', 'NEXT 14 DAYS')}
            {allUpcomingDates.map(ds => {
              const games = upcomingByDate.find(([d]) => d === ds)?.[1] ?? [];
              const golfItems = golfUpcomingByDate[ds] ?? [];
              const shownGolfIds = new Set<string>();
              return (
                <View key={ds}>
                  <DateHeader dateStr={ds} />
                  {games.map((g) => (
                    <GameCard key={g.gameId} {...g} compact onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
                  ))}
                  {golfItems.map(({ tournament: t, label, accentColor }, idx) => {
                    if (shownGolfIds.has(t.id)) return null;
                    shownGolfIds.add(t.id);
                    return (
                      <GolfUpcomingRow
                        key={`golf-${t.id}-${ds}-${idx}`}
                        tournament={t}
                        label={label}
                        accentColor={accentColor}
                        onPress={() => setSelectedGolfUpcoming({ tournament: t, label, accentColor })}
                      />
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Off-season / empty state ──────────────────────────────────────── */}
        {!hasAnyContent && activeFilter === 'all' && teamsWithNoGames.length > 0 && (
          <View style={styles.section}>
            {sectionHeader('OFF-SEASON')}
            {teamsWithNoGames.map(team => (
              <OffseasonCard
                key={team.id}
                teamId={team.id}
                logo={team.logo}
                shortName={team.shortName}
                league={team.league.toLowerCase()}
                nextGame={nextGameByTeamId[team.id]}
              />
            ))}
          </View>
        )}

        {/* Generic empty state (filtered view with no content) */}
        {!hasAnyContent && teamsWithNoGames.length === 0 && (
          <View style={styles.center}>
            <Text style={{ color: TEXT_FAINT, fontSize: 14 }}>No games in range</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Game detail sheet ─────────────────────────────────────────────────── */}
      {selectedGame && (
        <GameDetailSheet game={selectedGame as any} onClose={() => setSelectedGame(null)} />
      )}

      {/* ── Golf upcoming detail sheet ───────────────────────────────────────── */}
      {selectedGolfUpcoming && (
        <GolfDetailSheet
          tournament={selectedGolfUpcoming.tournament}
          label={selectedGolfUpcoming.label}
          accentColor={selectedGolfUpcoming.accentColor}
          onClose={() => setSelectedGolfUpcoming(null)}
        />
      )}

      {/* ── College sport picker ─────────────────────────────────────────────── */}
      {collegePicker && (
        <CollegeSportPicker
          groupKey={collegePicker}
          availableTeams={getCollegePickerTeams(collegePicker)}
          selectedTeamIds={followedTeams}
          activeFilter={activeFilter}
          onSelect={(id) => { setActiveFilter(id); setCollegePicker(null); }}
          onSelectAll={() => { setActiveFilter('all'); setCollegePicker(null); }}
          onClose={() => setCollegePicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerTitle: { color: '#F2E6CF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, flex: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#f87171', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Filter bar
  filterBarScroll: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, flexDirection: 'row' },
  filterCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BG,
    borderWidth: 2, borderColor: 'rgba(214,88,32,0.45)',
  },
  filterCircleTeam: {
    overflow: 'hidden', padding: 4,
    backgroundColor: SURFACE2,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  filterCircleActive: {
    borderColor: '#D65820',
    shadowColor: '#D65820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  filterCircleDim: { opacity: 0.4 },
  filterLogo: { width: 32, height: 32 },
  filterAllText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  chevron: { position: 'absolute', bottom: 2, right: 4, color: '#e4e4e7', fontSize: 8, fontWeight: '900' },

  // No-teams state
  noTeamsState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  noTeamsCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4b5563', alignItems: 'center', justifyContent: 'center' },
  noTeamsPlus: { color: '#6b7280', fontSize: 36, fontWeight: '300', marginTop: -2 },
  noTeamsTitle: { color: '#F2E6CF', fontSize: 16, fontWeight: '700' },
  noTeamsSub: { color: TEXT_FAINT, fontSize: 13, textAlign: 'center' },

  section: { marginTop: 24 },

  sectionRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  sectionLabel:{ color: '#F2E6CF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  sectionSub:  { color: TEXT_FAINT, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  miniScroll: { paddingHorizontal: 16, gap: 0 },
  miniCard:   { width: 120, paddingRight: 16, marginRight: 16, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
  miniSport:  { color: TEXT_FAINT, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  miniTeams:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniTeamCol:{ alignItems: 'center', gap: 3 },
  miniLogo:   { width: 28, height: 28 },
  miniLogoFallback: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center' },
  miniLogoText: { color: TEXT_FAINT, fontSize: 8, fontWeight: '700' },
  miniAbbr:   { color: '#F2E6CF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  miniLoserAbbr: { color: 'rgb(63,79,98)' },
  miniScore:  { color: '#F2E6CF', fontSize: 14, fontWeight: '800' },
  miniLoserScore: { color: 'rgb(63,79,98)' },
  miniDash:   { color: '#1e3050', fontSize: 14, fontWeight: '900', alignSelf: 'flex-end', marginBottom: 4 },

  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  dateHeaderText:{ color: '#F2E6CF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },

  // Off-season card
  offseasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  offseasonLogo: { width: 36, height: 36 },
  offseasonLogoFallback: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  offseasonInfo: { flex: 1, minWidth: 0 },
  offseasonName: { color: '#F2E6CF', fontSize: 13, fontWeight: '600' },
  offseasonSub: { color: TEXT_FAINT, fontSize: 11, marginTop: 2 },
  nextSeasonPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start',
  },
  nextSeasonText: { color: '#a1a1aa', fontSize: 11 },
  offseasonDays: { alignItems: 'flex-end' },
  offseasonDaysNum: { color: '#d4d4d8', fontSize: 20, fontWeight: '800' },
  offseasonDaysLabel: { color: TEXT_FAINT, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});
