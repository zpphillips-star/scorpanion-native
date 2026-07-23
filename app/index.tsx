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
import { fetchSchedule } from '../lib/api';
import { normalizeGame, isLiveStatus, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE3, ACCENT, TEXT, TEXT_MUTED, TEXT_FAINT, BORDER, SURFACE, LIVE } from '../constants/theme';
import type { SheetTeam } from '../lib/types';

// ── Sport filter config ───────────────────────────────────────────────────────

interface SportTab {
  id: string;
  label: string;
}

const SPORT_TABS: SportTab[] = [
  { id: 'all',     label: 'All' },
  { id: 'nfl',     label: 'NFL' },
  { id: 'mlb',     label: 'MLB' },
  { id: 'nba',     label: 'NBA' },
  { id: 'nhl',     label: 'NHL' },
  { id: 'mls',     label: 'MLS' },
  { id: 'wnba',    label: 'WNBA' },
];

// ── Sport filter pill ─────────────────────────────────────────────────────────

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

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
  const [games,        setGames]        = useState<NormalizedGame[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sport,        setSport]        = useState('all');
  const [selectedGame, setSelectedGame] = useState<SheetGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const raw  = await fetchSchedule(sport === 'all' ? undefined : sport);
      const list = Array.isArray(raw) ? raw : raw.games ?? raw.events ?? [];

      // Filter to "near now" window: yesterday → next 3 days
      const now       = Date.now();
      const yesterday = now - 86_400_000;
      const in3days   = now + 3 * 86_400_000;

      function parseKickoff(k: string): number | null {
        if (!k) return null;
        if (k.includes('T') || k.match(/^\d{4}-/)) {
          const d = new Date(k).getTime();
          return isNaN(d) ? null : d;
        }
        // Legacy: "07/19/2026 7:10:00 PM"
        const [datePart = '', ...rest] = k.split(' ');
        const [m, d, y] = datePart.split('/');
        const t = new Date(`${y}-${(m ?? '1').padStart(2,'0')}-${(d ?? '1').padStart(2,'0')}T${rest.join(' ')}Z`).getTime();
        return isNaN(t) ? null : t;
      }

      const filtered = list
        .map((g: any) => ({ g, ts: parseKickoff(g.kickoff) }))
        .filter(({ g, ts }: { g: any; ts: number | null }) =>
          g.status === 'live' || ts === null || (ts >= yesterday && ts <= in3days)
        )
        .sort((a: { g: any; ts: number | null }, b: { g: any; ts: number | null }) => {
          if (a.g.status === 'live' && b.g.status !== 'live') return -1;
          if (b.g.status === 'live' && a.g.status !== 'live') return 1;
          return (a.ts ?? 0) - (b.ts ?? 0);
        })
        .map(({ g }: { g: any }) => normalizeGame(g));

      setGames(filtered);
    } catch (e) {
      console.warn('Failed to load games:', e);
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport]);

  useEffect(() => {
    load();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Filter games by selected sport tab
  const filteredGames = React.useMemo(() => {
    if (sport === 'all') return games;
    return games.filter((g) => {
      const label = g.sportLabel.toLowerCase();
      return label === sport || g.sport.toLowerCase().includes(sport);
    });
  }, [games, sport]);

  // Group by sport label
  const grouped = React.useMemo(() => {
    const map: Record<string, NormalizedGame[]> = {};
    for (const g of filteredGames) {
      const key = g.sportLabel;
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return Object.entries(map);
  }, [filteredGames]);

  // Flatten for FlatList
  const listData = React.useMemo(() => {
    const rows: Array<
      | { type: 'header'; label: string; liveCount: number }
      | { type: 'game'; game: NormalizedGame }
    > = [];
    for (const [label, grp] of grouped) {
      const liveCount = grp.filter((g) => isLiveStatus(g.status)).length;
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
          <Text style={styles.emptyText}>No games today</Text>
          <Text style={styles.emptySubText}>Check back later</Text>
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
  safe: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  headerTitle:   { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:     { color: TEXT_FAINT, fontSize: 13, fontWeight: '500' },
  filterBar:     { borderBottomWidth: 1, borderBottomColor: BORDER, maxHeight: 48 },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  pill:          { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  pillActive:    { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText:      { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText:     { color: TEXT_MUTED, fontSize: 15, fontWeight: '600' },
  emptySubText:  { color: TEXT_FAINT, fontSize: 12 },
  list:          { paddingTop: 8, paddingBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, gap: 8 },
  sectionLabel:  { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,180,0,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  liveDot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: LIVE },
  liveBadgeText: { color: LIVE, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});
