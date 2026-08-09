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

function ScheduleBlock({ games, teamName }: { games: UpcomingGame[]; teamName: string }) {
  if (games.length === 0) {
    return (
      <View style={sc.block}>
        <Text style={sc.blockTitle} numberOfLines={1}>{teamName}</Text>
        <Text style={sc.none}>No upcoming games</Text>
      </View>
    );
  }
  return (
    <View style={sc.block}>
      <Text style={sc.blockTitle} numberOfLines={1}>{teamName}</Text>
      {games.map((g, i) => (
        <View
          key={i}
          style={[sc.row, i < games.length - 1 && sc.borderBottom]}
        >
          <View style={sc.dateBox}>
            <Text style={sc.date} numberOfLines={1}>{fmtShortDate(g.date)}</Text>
            <Text style={sc.time} numberOfLines={1}>{g.time || 'TBD'}</Text>
          </View>
          <Text style={sc.homeAway}>{g.isHome ? 'vs' : '@'}</Text>
          {g.oppLogo
            ? <Image source={{ uri: g.oppLogo }} style={sc.logo} resizeMode="contain" />
            : <View style={sc.logoFallback} />
          }
          <Text style={sc.name} numberOfLines={1} ellipsizeMode="tail">{g.opponent}</Text>
        </View>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  blockTitle: { color: FAINT, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8, minWidth: 0 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(94,103,115,0.28)' },
  dateBox:    { width: 54, flexShrink: 0 },
  date:       { color: FAINT, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  time:       { color: '#2d4a6b', fontSize: 9, lineHeight: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  homeAway:   { width: 18, color: FAINT, fontSize: 11, fontWeight: '800', textAlign: 'center', flexShrink: 0 },
  logo:       { width: 18, height: 18, flexShrink: 0 },
  logoFallback: { width: 18, height: 18, borderRadius: 9, backgroundColor: BORDER, flexShrink: 0 },
  name:       { flex: 1, minWidth: 0, color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '700' },
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

      {/* Stacked phone layout: gives long opponent names room and avoids cramped columns. */}
      <View style={styles.stack}>
        <ScheduleBlock games={awayGames} teamName={awayName} />
        <ScheduleBlock games={homeGames} teamName={homeName} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hdrRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  hdrLine:  { flex: 1, height: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
  hdrLabel: { color: FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  stack:    { gap: 0 },
});
