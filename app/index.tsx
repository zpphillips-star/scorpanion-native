import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet, { SheetGame } from '../components/GameDetailSheet';
import TeamDetailSheet from '../components/TeamDetailSheet';
import { fetchLiveScores } from '../lib/api';
import { BG, SURFACE3, ACCENT, TEXT, TEXT_MUTED, TEXT_FAINT, BORDER, SURFACE, LIVE } from '../constants/theme';
import type { SheetTeam } from '../lib/types';

// ── Sport filter config ───────────────────────────────────────────────────────

interface SportTab {
  id: string;
  label: string;
}

const SPORT_TABS: SportTab[] = [
  { id: 'all',        label: 'All' },
  { id: 'baseball',   label: 'MLB' },
  { id: 'basketball', label: 'NBA' },
  { id: 'football',   label: 'NFL' },
  { id: 'hockey',     label: 'NHL' },
  { id: 'soccer',     label: 'MLS' },
  { id: 'basketball_wnba', label: 'WNBA' },
];

// ── Data normalisation ────────────────────────────────────────────────────────

function normalizeGame(raw: any): SheetGame & { gameTime?: string; sportLabel: string } {
  const comp   = raw.competitions?.[0] ?? raw;
  const comps  = comp.competitors ?? raw.competitors ?? [];
  const away   = comps.find((c: any) => c.homeAway === 'away') ?? comps[0] ?? {};
  const home   = comps.find((c: any) => c.homeAway === 'home') ?? comps[1] ?? {};

  const status =
    comp.status?.type?.description ??
    comp.status?.description ??
    raw.status?.type?.description ??
    raw.status?.description ??
    raw.statusText ??
    'Scheduled';

  const period =
    comp.status?.type?.shortDetail ??
    raw.status?.type?.shortDetail ??
    '';

  const rawDate = raw.date ?? comp.date;
  let gameTime: string | undefined;
  if (rawDate) {
    try {
      gameTime = new Date(rawDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch { /* ignore */ }
  }

  const sport: string = (raw.sport ?? raw.league ?? '').toLowerCase();
  const sportLabel = getSportLabel(sport);

  return {
    gameId:    raw.id ?? raw.gameId ?? String(Math.random()),
    sport,
    sportLabel,
    status,
    period:    period || undefined,
    gameTime,
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
    awayScore: away.score !== undefined ? away.score : undefined,
    homeScore: home.score !== undefined ? home.score : undefined,
  };
}

function getSportLabel(sport: string): string {
  if (/baseball|mlb/.test(sport))       return 'MLB';
  if (/basketball.*wnba|wnba/.test(sport)) return 'WNBA';
  if (/basketball|nba/.test(sport))     return 'NBA';
  if (/football|nfl/.test(sport))       return 'NFL';
  if (/hockey|nhl/.test(sport))         return 'NHL';
  if (/soccer|mls/.test(sport))         return 'MLS';
  return sport.toUpperCase();
}

function isLiveGame(status: string): boolean {
  const lower = status.toLowerCase();
  return (
    lower.includes('progress') ||
    lower.includes('inning')   ||
    lower.includes('quarter')  ||
    lower.includes('period')   ||
    lower.includes('half')     ||
    lower === 'live'
  );
}

// ── Sport filter pill ─────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function SportSectionHeader({ label, liveCount }: { label: string; liveCount: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {liveCount > 0 && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>{liveCount} LIVE</Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [games,      setGames]      = useState<ReturnType<typeof normalizeGame>[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sport,      setSport]      = useState('all');
  const [selectedGame, setSelectedGame] = useState<SheetGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const raw  = await fetchLiveScores(sport === 'all' ? undefined : sport);
      const list = Array.isArray(raw) ? raw : raw.games ?? raw.events ?? [];
      setGames(list.map(normalizeGame));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport]);

  // Initial load + sport filter change
  useEffect(() => {
    load();
    // Auto-refresh every 30s when viewing scores
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Group games by sport label
  const grouped = React.useMemo(() => {
    const map: Record<string, ReturnType<typeof normalizeGame>[]> = {};
    for (const g of games) {
      const key = g.sportLabel;
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return Object.entries(map);
  }, [games]);

  // Flatten for FlatList with section headers
  const listData = React.useMemo(() => {
    const rows: Array<{ type: 'header'; label: string; liveCount: number } | { type: 'game'; game: ReturnType<typeof normalizeGame> }> = [];
    for (const [label, grp] of grouped) {
      const liveCount = grp.filter(g => isLiveGame(g.status)).length;
      rows.push({ type: 'header', label, liveCount });
      for (const g of grp) rows.push({ type: 'game', game: g });
    }
    return rows;
  }, [grouped]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scorpanion</Text>
        <Text style={styles.headerSub}>Live Scores</Text>
      </View>

      {/* Sport filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {SPORT_TABS.map((tab) => (
          <FilterPill
            key={tab.id}
            label={tab.label}
            active={sport === tab.id}
            onPress={() => setSport(tab.id)}
          />
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No games right now</Text>
          <Text style={styles.emptySubText}>Check the Schedule tab for upcoming games</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `hdr-${item.label}` : `game-${item.game.gameId}-${i}`
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <SportSectionHeader label={item.label} liveCount={item.liveCount} />;
            }
            const g = item.game;
            return (
              <GameCard
                {...g}
                onPress={() => setSelectedGame(g)}
              />
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* Game detail sheet */}
      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onTeamPress={(team) => {
            setSelectedGame(null);
            setSelectedTeam(team);
          }}
        />
      )}

      {/* Team detail sheet */}
      {selectedTeam && (
        <TeamDetailSheet
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: TEXT_FAINT,
    fontSize: 13,
    fontWeight: '500',
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    maxHeight: 48,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  pillText: {
    color: TEXT_FAINT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubText: {
    color: TEXT_FAINT,
    fontSize: 12,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8,
  },
  sectionLabel: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,180,0,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: LIVE,
  },
  liveBadgeText: {
    color: LIVE,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
