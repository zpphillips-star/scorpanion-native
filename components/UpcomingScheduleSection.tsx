import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingGame {
  opponent: string;
  oppLogo: string;
  date: string;
  isHome: boolean;
  time: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FAINT  = '#5F6773';
const TEXT   = '#F2E6CF';
const BORDER = '#1e3050';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Schedule column ──────────────────────────────────────────────────────────

function ScheduleCol({ games }: { games: UpcomingGame[] }) {
  if (games.length === 0) {
    return <Text style={sc.none}>No upcoming games</Text>;
  }
  return (
    <View style={{ gap: 0 }}>
      {games.map((g, i) => (
        <View
          key={i}
          style={[sc.row, i < games.length - 1 && sc.borderBottom]}
        >
          <Text style={sc.date}>{fmtShortDate(g.date)}</Text>
          <Text style={sc.homeAway}>{g.isHome ? 'vs' : '@'}</Text>
          {g.oppLogo
            ? <Image source={{ uri: g.oppLogo }} style={sc.logo} resizeMode="contain" />
            : null
          }
          <Text style={sc.name} numberOfLines={1}>{g.opponent}</Text>
        </View>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 4 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(94,103,115,0.35)' },
  date:       { width: 46, color: FAINT, fontSize: 11 },
  homeAway:   { width: 18, color: FAINT, fontSize: 11 },
  logo:       { width: 16, height: 16 },
  name:       { flex: 1, color: TEXT, fontSize: 12, fontWeight: '600' },
  none:       { color: FAINT, fontSize: 12, paddingVertical: 6 },
});

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  awayGames: UpcomingGame[];
  homeGames: UpcomingGame[];
  awayName: string;
  homeName: string;
}

export default function UpcomingScheduleSection({ awayGames, homeGames, awayName, homeName }: Props) {
  if (awayGames.length === 0 && homeGames.length === 0) return null;

  return (
    <View>
      {/* Header */}
      <View style={styles.hdrRow}>
        <View style={styles.hdrLine} />
        <Text style={styles.hdrLabel}>Upcoming Schedule</Text>
        <View style={styles.hdrLine} />
      </View>

      {/* Two-column grid */}
      <View style={styles.grid}>
        {/* Away column */}
        <View style={[styles.col, styles.colLeft]}>
          <Text style={styles.colTitle} numberOfLines={1}>{awayName}</Text>
          <ScheduleCol games={awayGames} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Home column */}
        <View style={styles.col}>
          <Text style={styles.colTitle} numberOfLines={1}>{homeName}</Text>
          <ScheduleCol games={homeGames} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hdrRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  hdrLine:  { flex: 1, height: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
  hdrLabel: { color: FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  grid:     { flexDirection: 'row' },
  col:      { flex: 1 },
  colLeft:  { paddingRight: 6 },
  divider:  { width: 1, backgroundColor: BORDER, marginHorizontal: 4 },
  colTitle: { color: FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
});
