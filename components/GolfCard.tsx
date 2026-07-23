/**
 * GolfCard.tsx — Golf tournament cards for home screen.
 * Today card, mini recent card, and upcoming row variants.
 * Translates webapp's GolfTodayCard / GolfRecentCard / GolfUpcomingRow.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { BG, SURFACE, SURFACE2, BORDER, TEXT, TEXT_FAINT } from '../constants/theme';
import GolfDetailSheet, { PGATournament } from './GolfDetailSheet';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
}

function fmtDateShort(iso: string): string {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
  } catch { return ''; }
}

function scoreColor(s: string): string {
  if (!s || s === 'E') return '#e4e4e7';
  if (s.startsWith('-')) return '#4ade80';
  if (s.startsWith('+')) return '#f87171';
  return '#e4e4e7';
}

// ── Golf Today Card ─────────────────────────────────────────────────────────── 
// Matches TodayGameCard layout: left live-border stripe, header sport label,
// center body with Day X of 4 / logo / tournament name.

interface GolfTodayCardProps {
  tournament: PGATournament
  label: string
  accentColor: string
}

export function GolfTodayCard({ tournament, label, accentColor }: GolfTodayCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isLive      = tournament.status === 'live';
  const isCompleted = tournament.status === 'completed';

  // "Round 3 — Live" → "Day 3 of 4"
  const roundMatch = tournament.roundLabel.match(/\d+/);
  const roundNum   = roundMatch ? parseInt(roundMatch[0]) : null;
  const dayLabel   = roundNum ? `Day ${roundNum} of 4` : tournament.roundLabel;

  const logoUrl = label === 'LPGA'
    ? 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/lpga.png'
    : 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/pgatour.png';

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDetail(true)}
        activeOpacity={0.75}
        style={[styles.todayCard, { opacity: isCompleted ? 0.82 : 1 }]}
      >
        {/* Live stripe */}
        {isLive && <View style={styles.liveStripe} />}

        <View style={[styles.todayInner, !isLive && { paddingLeft: 16 }]}>
          {/* Header row */}
          <View style={styles.todayHeader}>
            <Text style={styles.todayTourLabel}>{label}</Text>
            {isLive ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            ) : isCompleted ? (
              <Text style={styles.finalText}>FINAL</Text>
            ) : (
              <Text style={styles.roundText}>{tournament.roundLabel}</Text>
            )}
          </View>

          {/* Body: Day X of 4 | logo | tournament name */}
          <View style={styles.todayBody}>
            <View style={styles.todayBodyCol}>
              <Text style={styles.todayDayLabel}>{dayLabel}</Text>
            </View>
            <View style={styles.todayLogoWrap}>
              <Image source={{ uri: logoUrl }} style={styles.todayLogo} resizeMode="contain" />
            </View>
            <View style={styles.todayBodyCol}>
              <Text style={styles.todayTourneyName} numberOfLines={2}>
                {tournament.shortName || tournament.name}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {showDetail && (
        <GolfDetailSheet
          tournament={tournament}
          label={label}
          accentColor={accentColor}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

// ── Golf Mini Card (for RECENT horizontal scroll) ──────────────────────────────

interface GolfMiniCardProps {
  tournament: PGATournament
  label: string
  accentColor: string
}

export function GolfMiniCard({ tournament, label, accentColor }: GolfMiniCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const winner = tournament.leaders[0];

  const shortName = (() => {
    const base = tournament.shortName || tournament.name;
    const words = base.split(' ');
    return words.slice(0, 2).join(' ');
  })();

  const winnerLastName = winner
    ? (winner.name || '').split(' ').pop() ?? ''
    : '';

  const logoUrl = label === 'LPGA'
    ? 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/lpga.png'
    : 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/pgatour.png';

  return (
    <>
      <TouchableOpacity onPress={() => setShowDetail(true)} style={styles.miniCard} activeOpacity={0.75}>
        {/* Day of week — centered */}
        <Text style={styles.miniDay}>{fmtDateShort(tournament.endDate)}</Text>
        {/* Logo + short name + winner score */}
        <View style={styles.miniCenter}>
          <Image source={{ uri: logoUrl }} style={styles.miniLogo} resizeMode="contain" />
          <Text style={styles.miniTourneyName} numberOfLines={1}>{shortName}</Text>
          <View style={styles.miniScoreRow}>
            {winnerLastName ? (
              <Text style={styles.miniWinner} numberOfLines={1}>{winnerLastName}</Text>
            ) : null}
            <Text style={[styles.miniScore, { color: winner ? scoreColor(winner.totalScore) : '#e4e4e7' }]}>
              {winner ? winner.totalScore : '–'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showDetail && (
        <GolfDetailSheet
          tournament={tournament}
          label={label}
          accentColor={accentColor}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

// ── Golf Upcoming Row ──────────────────────────────────────────────────────────

interface GolfUpcomingRowProps {
  tournament: PGATournament
  label: string
  accentColor: string
  onPress: () => void
}

export function GolfUpcomingRow({ tournament, label, accentColor, onPress }: GolfUpcomingRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.upcomingRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.upcomingLabelRow}>
          <Text style={[styles.upcomingTourLabel, { color: accentColor }]}>{label}</Text>
          {tournament.course ? (
            <Text style={styles.upcomingCourse} numberOfLines={1}> · {tournament.course}</Text>
          ) : null}
        </View>
        <Text style={styles.upcomingName} numberOfLines={1}>
          {tournament.shortName || tournament.name}
        </Text>
      </View>
      <Text style={styles.upcomingDate}>{fmtDate(tournament.startDate)}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Today card
  todayCard: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  liveStripe: { width: 3, backgroundColor: '#ef4444', borderRadius: 1.5 },
  todayInner: { flex: 1, paddingLeft: 13 },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  todayTourLabel: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#f87171', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  finalText: { color: TEXT_FAINT, fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  roundText: { color: '#71717a', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  todayBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 20,
    gap: 8,
  },
  todayBodyCol: { flex: 1, alignItems: 'center' },
  todayDayLabel: { color: '#f0f0f8', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  todayLogoWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  todayLogo: { width: 48, height: 48 },
  todayTourneyName: { color: '#f0f0f8', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  // Mini card (recent section horizontal scroll)
  miniCard: {
    width: 120,
    paddingRight: 16,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  miniDay: {
    color: TEXT_FAINT,
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  miniCenter: { alignItems: 'center' },
  miniLogo: { width: 26, height: 26, borderRadius: 4 },
  miniTourneyName: { color: TEXT_FAINT, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2, textAlign: 'center', maxWidth: 96 },
  miniScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  miniWinner: { color: '#d4d4d8', fontSize: 14, fontWeight: '800', maxWidth: 56 },
  miniScore: { fontSize: 17, fontWeight: '800' },

  // Upcoming row
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  upcomingLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  upcomingTourLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  upcomingCourse: { color: '#52525b', fontSize: 10, flex: 1 },
  upcomingName: { color: TEXT, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  upcomingDate: { color: TEXT_FAINT, fontSize: 12, fontWeight: '500', flexShrink: 0 },
});
