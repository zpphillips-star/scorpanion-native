import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, SectionList, RefreshControl, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet from '../components/GameDetailSheet';
import AppHeader from '../components/AppHeader';
import { fetchSchedule } from '../lib/api';
import { normalizeGame, NormalizedGame } from '../lib/normalizeGame';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS, ProTeam } from '../lib/allProTeams';
import { BG, SURFACE2, BORDER, TEXT_FAINT, ACCENT } from '../constants/theme';
import type { ScorpanionGame } from '../lib/types';

// ── Date helpers ───────────────────────────────────────────────────────────────

function getDateStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toApiDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function formatSectionTitle(dateStr: string, todayStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const base = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).toUpperCase();
  if (dateStr === todayStr) return `TODAY  ·  ${base}`;
  return base;
}

// ── Section type ──────────────────────────────────────────────────────────────
type GameSection = { title: string; data: NormalizedGame[] };

// ── ESPN fetch helpers ────────────────────────────────────────────────────────

// Map ProTeam.league → ESPN API path
const ESPN_LEAGUE_PATH: Partial<Record<string, string>> = {
  'NFL':  'football/nfl',
  'NBA':  'basketball/nba',
  'NHL':  'hockey/nhl',
  'MLB':  'baseball/mlb',
  'WNBA': 'basketball/wnba',
  'MLS':  'soccer/usa.1',
  'NWSL': 'soccer/usa.nwsl',
};

async function fetchESPNForLeague(espnPath: string, dateStr: string): Promise<any[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard?dates=${toApiDate(dateStr)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

// ── Team filter helpers ────────────────────────────────────────────────────────

function gameMatchesTeam(game: NormalizedGame, team: ProTeam): boolean {
  // Tours (PGA, LPGA) have no espnId — match by sport label
  if (!team.espnId) return game.sportLabel === team.league;
  // Scorpanion format: use seattleEspnId exclusively (no opponent ID collisions)
  if (game.seattleEspnId) return game.seattleEspnId === team.espnId;
  // ESPN format: MUST check both ID and league — ESPN reuses IDs across sports
  return game.sportLabel === team.league &&
    (game.awayTeam.id === team.espnId || game.homeTeam.id === team.espnId);
}

// ── ESPN → ScorpanionGame adapter ─────────────────────────────────────────────
// Lets GameDetailSheet render ESPN (non-Seattle) games by mapping them into
// the ScorpanionGame shape, treating the followed team as "seattleTeam".
function mapEspnToScorpanionShape(raw: any, followedTeam: ProTeam): ScorpanionGame {
  const comp  = raw.competitions?.[0] ?? raw;
  const comps: any[] = comp.competitors ?? raw.competitors ?? [];

  const ourComp = comps.find((c: any) => c.team?.id === followedTeam.espnId) ?? comps[0] ?? {};
  const oppComp = comps.find((c: any) => c.team?.id !== followedTeam.espnId) ?? comps[1] ?? {};

  const isHome    = ourComp?.homeAway === 'home';
  const sport     = followedTeam.sport?.toLowerCase() ?? followedTeam.league.toLowerCase();
  const league    = followedTeam.league;

  const statusRaw = (
    comp.status?.type?.description ??
    comp.status?.description ??
    raw.status?.type?.description ??
    'Scheduled'
  ).toLowerCase();
  const status: string = statusRaw.includes('final') ? 'ft'
    : (statusRaw.includes('progress') || statusRaw.includes('live')) ? 'live'
    : 'upcoming';

  const parseRecord = (c: any) => {
    const rec = (c.records ?? []).find((r: any) => r.type === 'total') ?? c.records?.[0];
    if (!rec?.summary) return undefined;
    const parts = rec.summary.split('-').map(Number);
    if (parts.length >= 2 && !parts.some(isNaN)) {
      return { wins: parts[0] as number, losses: parts[1] as number, ...(parts[2] !== undefined ? { ties: parts[2] as number } : {}) };
    }
    return undefined;
  };

  return {
    id:            String(raw.id ?? raw.gameId ?? ''),
    sport,
    league,
    status,
    isHome,
    kickoff:       raw.date ?? comp.date ?? '',
    seattleScore:  ourComp?.score !== undefined ? Number(ourComp.score) : undefined,
    opponentScore: oppComp?.score !== undefined ? Number(oppComp.score) : undefined,
    period:        comp.status?.period !== undefined ? String(comp.status.period) : undefined,
    clock:         comp.status?.displayClock,
    seattleTeam: {
      id:             followedTeam.id,
      name:           ourComp?.team?.displayName   ?? followedTeam.name,
      shortName:      ourComp?.team?.shortDisplayName ?? followedTeam.shortName,
      abbr:           ourComp?.team?.abbreviation  ?? followedTeam.abbr,
      sport,
      league,
      espnId:         followedTeam.espnId,
      primaryColor:   ourComp?.team?.color ? `#${ourComp.team.color}` : followedTeam.primaryColor,
      secondaryColor: ourComp?.team?.alternateColor ? `#${ourComp.team.alternateColor}` : followedTeam.primaryColor,
      emoji:          '⚡',
      logoUrl:        followedTeam.logo,
    },
    opponent: {
      id:        oppComp?.team?.id        ?? '',
      name:      oppComp?.team?.displayName      ?? 'Opponent',
      shortName: oppComp?.team?.shortDisplayName,
      abbr:      oppComp?.team?.abbreviation     ?? '???',
      logo:      oppComp?.team?.logo             ?? '',
      record:    parseRecord(oppComp),
    },
    seattleRecord:  parseRecord(ourComp),
    opponentRecord: parseRecord(oppComp),
    venue: comp.venue ? {
      name:  comp.venue.fullName ?? comp.venue.name,
      city:  comp.venue.address?.city  ?? comp.venue.city,
      state: comp.venue.address?.state ?? comp.venue.state,
    } : undefined,
    broadcast: comp.broadcasts?.[0]?.names?.[0] ?? comp.broadcast,
  } as ScorpanionGame;
}

// Date extractor for the Scorpanion API's "MM/DD/YYYY HH:MM:SS" or ISO format
function gameKickoffDate(kickoff: string): string | null {
  if (!kickoff) return null;
  if (kickoff.includes('T') || kickoff.match(/^\d{4}-/)) return kickoff.split('T')[0];
  const parts = kickoff.split(' ')[0]?.split('/');
  if (parts?.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${(m ?? '').padStart(2,'0')}-${(d ?? '').padStart(2,'0')}`;
  }
  return null;
}

// Load: yesterday + today + 10 days ahead = 12 days
const OFFSETS = Array.from({ length: 12 }, (_, i) => i - 1);

export default function ScheduleScreen() {
  const { followedTeams, activeFilter, setActiveFilter } = useSportsData();
  const [normByDate,    setNormByDate]    = useState<Map<string, NormalizedGame[]>>(new Map());
  const allRawByIdRef  = useRef<Map<string, any>>(new Map());   // ref = always latest, no stale-closure issue
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedGame,  setSelectedGame]  = useState<ScorpanionGame | null>(null);
  const listRef   = useRef<SectionList<NormalizedGame, GameSection>>(null);
  const didScroll = useRef(false);
  const todayStr  = useMemo(() => getDateStr(0), []);
  const dateStrs  = useMemo(() => OFFSETS.map(o => getDateStr(o)), []);

  // ── Filterable teams (all followed teams that exist in ALL_PRO_TEAMS) ────────
  const filterableTeams = useMemo(() =>
    followedTeams
      .map(id => ALL_PRO_TEAMS.find(t => t.id === id))
      .filter((t): t is ProTeam => !!t),
    [followedTeams]
  );
  // Ref so load() always sees the latest followed teams without being in its dep array
  const filterableTeamsRef = useRef<ProTeam[]>(filterableTeams);
  useEffect(() => { filterableTeamsRef.current = filterableTeams; }, [filterableTeams]);

  // ── Load: Scorpanion (Seattle teams) + ESPN (non-Seattle followed teams) ─────
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    didScroll.current = false;

    const normMap = new Map<string, NormalizedGame[]>();
    const rawMap  = new Map<string, any>();
    const dateStrSet = new Set(dateStrs);

    // ── Step 1: Scorpanion — fetch ONCE, partition by actual kickoff date ──────
    try {
      const data = await fetchSchedule();
      const arr: any[] = Array.isArray(data) ? data : data.games ?? data.events ?? [];

      for (const g of arr) {
        if (!g?.id) continue;
        const dateStr = gameKickoffDate(g.kickoff);
        if (!dateStr || !dateStrSet.has(dateStr)) continue; // outside our window
        rawMap.set(String(g.id), g);
        const bucket = normMap.get(dateStr) ?? [];
        bucket.push(normalizeGame(g));
        normMap.set(dateStr, bucket);
      }
    } catch { /* silent */ }

    // ── Step 2: Determine which followed teams need ESPN ──────────────────────
    const seattleEspnIds = new Set<string>();
    normMap.forEach(games =>
      games.forEach(g => { if (g.seattleEspnId) seattleEspnIds.add(g.seattleEspnId); })
    );

    const currentTeams = filterableTeamsRef.current;
    const nonSeattleTeams = currentTeams.filter(
      t => t.espnId && !seattleEspnIds.has(t.espnId) && ESPN_LEAGUE_PATH[t.league]
    );

    const leaguesNeeded = [
      ...new Set(nonSeattleTeams.map(t => ESPN_LEAGUE_PATH[t.league] as string))
    ];

    // ── Step 3: Fetch ESPN for non-Seattle leagues (per date) ─────────────────
    if (leaguesNeeded.length > 0) {
      const espnFetches = dateStrs.flatMap(dateStr =>
        leaguesNeeded.map(async (leaguePath) => {
          const events = await fetchESPNForLeague(leaguePath, dateStr);
          const sport  = leaguePath.split('/')[1];
          return { dateStr, events, sport };
        })
      );

      const espnResults = await Promise.allSettled(espnFetches);

      for (const r of espnResults) {
        if (r.status !== 'fulfilled') continue;
        const { dateStr, events, sport } = r.value;
        if (!events.length) continue;

        const relevant = events.filter((e: any) => {
          const comps = e.competitions?.[0]?.competitors ?? e.competitors ?? [];
          return nonSeattleTeams.some(t =>
            comps.some((c: any) => c.team?.id === t.espnId)
          );
        });
        if (!relevant.length) continue;

        relevant.forEach((e: any) => { if (e?.id) rawMap.set(String(e.id), e); });

        const normalized = relevant.map((e: any) => normalizeGame({ ...e, sport }));
        const existing    = normMap.get(dateStr) ?? [];
        const existingIds = new Set(existing.map(g => g.gameId));
        const fresh       = normalized.filter(g => !existingIds.has(g.gameId));
        normMap.set(dateStr, [...existing, ...fresh]);
      }
    }

    setNormByDate(normMap);
    allRawByIdRef.current = rawMap;
    setLoading(false);
    setRefreshing(false);
  }, [dateStrs]);

  useEffect(() => { load(); }, [load]);

  // ── Build sections (filtered) ────────────────────────────────────────────────
  const sections = useMemo(() => {
    const activeTeam = activeFilter !== 'all'
      ? ALL_PRO_TEAMS.find(t => t.id === activeFilter) ?? null
      : null;
    return dateStrs
      .map(dateStr => {
        let games = normByDate.get(dateStr) ?? [];
        if (activeTeam) {
          // Specific chip: only games involving that exact team
          games = games.filter(g => gameMatchesTeam(g, activeTeam));
        } else {
          // "ALL": only games for followed teams — never show unfollowed teams
          games = filterableTeams.length > 0
            ? games.filter(g => filterableTeams.some(t => gameMatchesTeam(g, t)))
            : [];
        }
        return { title: dateStr, data: games };
      })
      .filter(s => s.data.length > 0);
  }, [normByDate, dateStrs, activeFilter, filterableTeams]);

  // ── Auto-scroll to today (or nearest future) ─────────────────────────────────
  useEffect(() => {
    if (loading || didScroll.current || sections.length === 0) return;
    let idx = sections.findIndex(s => s.title === todayStr);
    if (idx < 0) idx = sections.findIndex(s => s.title > todayStr);
    if (idx < 0) return;
    setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: idx, itemIndex: 0,
          animated: true, viewPosition: 0,
        });
        didScroll.current = true;
      } catch { /* ignore */ }
    }, 350);
  }, [loading, sections, todayStr]);

  // ── Renderers ────────────────────────────────────────────────────────────────
  const renderSectionHeader = ({ section }: { section: GameSection }) => {
    const isToday = section.title === todayStr;
    return (
      <View style={[styles.dateHeader, isToday && styles.dateHeaderToday]}>
        <Text style={[styles.dateText, isToday && styles.dateTextToday]}>
          {formatSectionTitle(section.title, todayStr)}
        </Text>
        <View style={[styles.dateRule, isToday && styles.dateRuleToday]} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: NormalizedGame }) => (
    <GameCard
      {...item}
      compact
      noDivider
      onPress={() => {
        const raw = allRawByIdRef.current.get(item.gameId);
        if (!raw) return;
        if (raw.seattleTeam) {
          // Scorpanion format — pass straight through
          setSelectedGame(raw);
        } else {
          // ESPN format — map to ScorpanionGame shape using the matching followed team
          const comp  = raw.competitions?.[0] ?? raw;
          const comps: any[] = comp.competitors ?? raw.competitors ?? [];
          const matchedTeam = filterableTeamsRef.current.find(t =>
            t.espnId && comps.some((c: any) => c.team?.id === t.espnId)
          );
          if (matchedTeam) setSelectedGame(mapEspnToScorpanionShape(raw, matchedTeam));
        }
      }}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader />

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <View>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ width: 56, height: 32, borderRadius: 6, backgroundColor: '#142236' }} />
              <View style={{ flex: 1, marginHorizontal: 12, gap: 6 }}>
                <View style={{ height: 12, borderRadius: 4, backgroundColor: '#142236' }} />
                <View style={{ height: 10, borderRadius: 4, backgroundColor: '#142236', width: '60%' }} />
              </View>
            </View>
          ))}
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No games scheduled</Text>
        </View>
      ) : (
        <SectionList<NormalizedGame, GameSection>
          ref={listRef}
          sections={sections}
          keyExtractor={(item, idx) => item.gameId || String(idx)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          onScrollToIndexFailed={() => {}}
        />
      )}

      {selectedGame && (
        <GameDetailSheet
          game={selectedGame as any}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:  { color: TEXT_FAINT, fontSize: 14 },

  // Section date headers
  dateHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
    gap: 10, backgroundColor: BG,
  },
  dateHeaderToday: {},
  dateText: {
    color: TEXT_FAINT, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase', flexShrink: 0,
  },
  dateTextToday: { color: ACCENT },
  dateRule:      { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dateRuleToday: { backgroundColor: 'rgba(217,92,23,0.3)' },
});

