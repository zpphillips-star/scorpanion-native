import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet from '../components/GameDetailSheet';
import { fetchSchedule } from '../lib/api';
import { normalizeGame, isLiveStatus, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE, BORDER, ACCENT, TEXT_FAINT, SURFACE2 } from '../constants/theme';
import type { ScorpanionGame } from '../lib/types';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS } from '../lib/allProTeams';

// Mapping from ALL_PRO_TEAMS.id → scorpanion seattleTeam.id (used to filter home screen)
const PRO_TO_SEATTLE_ID: Record<string, string> = {
  'nfl-sea':    'seahawks',
  'mlb-sea':    'mariners',
  'nhl-sea':    'kraken',
  'wnba-sea':   'storm',
  'mls-seattle': 'sounders',
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

// ── Mini card for RECENT horizontal scroll ────────────────────────────────────

function MiniCard({ game, onPress }: { game: NormalizedGame; onPress: () => void }) {
  const awayWon = game.status === 'Final' && Number(game.awayScore) > Number(game.homeScore);
  const homeWon = game.status === 'Final' && Number(game.homeScore) > Number(game.awayScore);
  return (
    <TouchableOpacity onPress={onPress} style={styles.miniCard} activeOpacity={0.7}>
      <Text style={styles.miniSport}>{game.sportLabel}</Text>
      <View style={styles.miniTeams}>
        {/* Away */}
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
        {/* Home */}
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { followedTeams } = useSportsData();
  const [allGames,   setAllGames]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ScorpanionGame | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Teams the user follows that are filterable on the home screen (have a seattleTeam mapping)
  const filterableTeams = React.useMemo(() =>
    followedTeams
      .map(id => ALL_PRO_TEAMS.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t && PRO_TO_SEATTLE_ID[t.id] !== undefined),
    [followedTeams]
  );

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

  // Apply team filter to raw games before normalizing
  const filteredGames = React.useMemo(() => {
    if (activeFilter === 'all') return allGames;
    const seattleId = PRO_TO_SEATTLE_ID[activeFilter];
    if (!seattleId) return allGames;
    return allGames.filter((g: any) => g.seattleTeam?.id === seattleId);
  }, [allGames, activeFilter]);

  // Categorize games + build raw lookup map
  const { recent, todayGames, upcoming, rawById } = React.useMemo(() => {
    const recent: NormalizedGame[]  = [];
    const todayGames: NormalizedGame[] = [];
    const upcoming: NormalizedGame[] = [];
    const rawById = new Map<string, any>();

    for (const g of filteredGames) {
      const ts  = parseKickoffMs(g.kickoff);
      const ds  = kickoffDateStr(g.kickoff);
      const norm = normalizeGame(g);
      rawById.set(norm.gameId, g);

      if (g.status === 'live' || isLiveStatus(norm.status)) {
        todayGames.unshift(norm); // live → top of today
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

  // Group upcoming by date
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

  const hasLive = todayGames.some(g => isLiveStatus(g.status));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state — no teams followed
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

        {/* ── Team filter bar (shown when following filterable teams) ── */}
        {filterableTeams.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContent}
            style={styles.filterBarScroll}
          >
            {/* ALL pill */}
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.75}
            >
              <View style={[
                styles.filterCircle,
                activeFilter === 'all' && styles.filterCircleActive,
              ]}>
                <Text style={styles.filterAllText}>All</Text>
              </View>
            </TouchableOpacity>

            {/* Per-team logo pills */}
            {filterableTeams.map(team => {
              const isActive = activeFilter === team.id;
              const isDimmed = activeFilter !== 'all' && !isActive;
              return (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => setActiveFilter(isActive ? 'all' : team.id)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.filterCircle,
                    styles.filterCircleTeam,
                    isActive && styles.filterCircleActive,
                    isDimmed && styles.filterCircleDim,
                  ]}>
                    <Image source={{ uri: team.logo }} style={styles.filterLogo} resizeMode="contain" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── RECENT section ── */}
        {recent.length > 0 && (
          <View style={styles.section}>
            {sectionHeader('RECENT', 'LAST 7 DAYS')}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniScroll}>
              {recent.map((g) => (
                <MiniCard key={g.gameId} game={g} onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── TODAY section ── */}
        {todayGames.length > 0 && (
          <View style={styles.section}>
            {sectionHeader('TODAY', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase())}
            {todayGames.map((g) => (
              <GameCard key={g.gameId} {...g} onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
            ))}
          </View>
        )}

        {/* ── UPCOMING section ── */}
        {upcomingByDate.length > 0 && (
          <View style={styles.section}>
            {sectionHeader('UPCOMING', 'NEXT 14 DAYS')}
            {upcomingByDate.map(([date, games]) => (
              <View key={date}>
                <DateHeader dateStr={date} />
                {games.map((g) => (
                  <GameCard key={g.gameId} {...g} compact onPress={() => { const raw = rawById.get(g.gameId); if (raw) setSelectedGame(raw); }} />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!recent.length && !todayGames.length && !upcoming.length && (
          <View style={styles.center}>
            <Text style={{ color: TEXT_FAINT, fontSize: 14 }}>No games in range</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {selectedGame && (
        <GameDetailSheet game={selectedGame as any} onClose={() => setSelectedGame(null)} />
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

  // ── Team filter bar ──────────────────────────────────────────────────────────
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

  // ── No-teams empty state ─────────────────────────────────────────────────────
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
});
