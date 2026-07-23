/**
 * GolfDetailSheet.tsx — Full leaderboard detail sheet for PGA/LPGA tournaments.
 * Translates webapp's GolfDetailSheet.tsx to React Native.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Image, SafeAreaView,
} from 'react-native';
import { BG, SURFACE, SURFACE2, BORDER, TEXT, TEXT_FAINT, ACCENT } from '../constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PGAPlayer {
  position: string
  name: string
  shortName: string
  totalScore: string
  todayScore: string
  thru: string
  country?: string
  isAmateur?: boolean
}

export interface PGATournament {
  id: string
  name: string
  shortName: string
  course: string
  location: string
  roundLabel: string
  status: 'upcoming' | 'live' | 'completed'
  startDate: string
  endDate: string
  purse?: string
  leaders: PGAPlayer[]
  cutLine?: string
  firstTeeTime?: string
  pgatourId?: string
  rounds?: {
    roundNumber: number
    label: string
    teeTime?: string
    date: string
  }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(s: string): string {
  if (!s || s === 'E' || s === '--') return '#e4e4e7';
  if (s.startsWith('-')) return '#4ade80';
  if (s.startsWith('+')) return '#f87171';
  return '#e4e4e7';
}

// ── Main component ─────────────────────────────────────────────────────────────

interface GolfDetailSheetProps {
  tournament: PGATournament
  label: string
  accentColor: string
  onClose: () => void
}

export default function GolfDetailSheet({
  tournament, label, accentColor, onClose,
}: GolfDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'schedule'>('leaderboard');

  const isLive      = tournament.status === 'live';
  const isCompleted = tournament.status === 'completed';
  const isUpcoming  = tournament.status === 'upcoming';

  const statusLabel = isLive
    ? tournament.roundLabel
    : isCompleted ? 'Final'
    : tournament.roundLabel || 'Upcoming';

  const logoUrl = label === 'LPGA'
    ? 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/lpga.png'
    : 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/pgatour.png';

  function fmtDateRange(): string {
    try {
      const fmt = (iso: string) => {
        const [y, m, d] = iso.split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      const s = fmt(tournament.startDate);
      const e = fmt(tournament.endDate);
      return s === e ? s : `${s}–${e}`;
    } catch { return ''; }
  }

  return (
    <Modal visible animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      </View>

      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tourLabelRow}>
            <Image source={{ uri: logoUrl }} style={styles.tourLogo} resizeMode="contain" />
            <Text style={[styles.tourLabel, { color: accentColor }]}>{label}</Text>
          </View>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          {(tournament.course || tournament.location) ? (
            <Text style={styles.courseText}>
              {[tournament.course, tournament.location].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <Text style={styles.dateRange}>{fmtDateRange()}</Text>

          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: `${accentColor}22` }]}>
            {isLive && <View style={[styles.liveDot, { backgroundColor: accentColor }]} />}
            <Text style={[styles.statusPillText, { color: isLive ? accentColor : '#a1a1aa' }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Tab bar (only show Rounds tab for upcoming) */}
        {isUpcoming && (tournament.rounds?.length ?? 0) > 0 ? (
          <View style={styles.tabRow}>
            {(['leaderboard', 'schedule'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
              >
                <Text style={[styles.tabText, activeTab === tab ? { color: accentColor } : { color: TEXT_FAINT }]}>
                  {tab === 'leaderboard' ? 'LEADERBOARD' : 'ROUNDS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Column headers */}
        {activeTab === 'leaderboard' && !isUpcoming ? (
          <View style={styles.colHeader}>
            <Text style={[styles.colHeaderText, { flex: 1, marginLeft: 32 }]}>PLAYER</Text>
            <Text style={[styles.colHeaderText, styles.colW]}>TODAY</Text>
            <Text style={[styles.colHeaderText, styles.colW]}>TOTAL</Text>
            <Text style={[styles.colHeaderText, styles.colW]}>THRU</Text>
          </View>
        ) : null}

        {/* Content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'leaderboard' && !isUpcoming ? (
            // Leaderboard rows
            tournament.leaders.length > 0
              ? tournament.leaders.map((player, i) => {
                  const isCut = player.position === 'CUT';
                  return (
                    <View
                      key={player.name + i}
                      style={[
                        styles.playerRow,
                        i % 2 === 0 && styles.playerRowAlt,
                        isCut && styles.playerRowCut,
                      ]}
                    >
                      <Text style={styles.playerRank}>{isCut ? 'CUT' : player.position}</Text>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                        {player.country ? (
                          <Text style={styles.playerCountry} numberOfLines={1}>{player.country}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.playerStat, { color: isCut ? '#52525b' : scoreColor(player.todayScore) }]}>
                        {player.todayScore || '–'}
                      </Text>
                      <Text style={[styles.playerStat, { color: isCut ? '#52525b' : scoreColor(player.totalScore) }]}>
                        {player.totalScore}
                      </Text>
                      <Text style={[styles.playerStat, { color: '#d4d4d8' }]}>
                        {isCut ? 'CUT' : (player.thru || '–')}
                      </Text>
                    </View>
                  );
                })
              : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {isUpcoming ? 'Tournament has not started yet' : 'No leaderboard data available'}
                  </Text>
                </View>
              )
          ) : (
            // Rounds / upcoming schedule
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {isUpcoming && (tournament.rounds?.length ?? 0) > 0 ? (
                tournament.rounds!.map(round => {
                  const dateStr = round.date
                    ? new Date(round.date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })
                    : '';
                  const teeStr = round.teeTime
                    ? new Date(round.teeTime).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit', hour12: true,
                      })
                    : 'TBD';

                  return (
                    <View key={round.roundNumber} style={styles.roundRow}>
                      <Text style={[styles.roundLabel, { color: accentColor }]}>{round.label}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roundDate}>{dateStr}</Text>
                        <Text style={styles.roundTeeTime}>First tee: {teeStr}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No round information available</Text>
                </View>
              )}
            </View>
          )}

          {/* Purse */}
          {tournament.purse ? (
            <View style={styles.purseRow}>
              <Text style={styles.purseLabel}>Purse</Text>
              <Text style={styles.purseValue}>{tournament.purse}</Text>
            </View>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '92%',
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12, right: 16,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#111d2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tourLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tourLogo: { width: 20, height: 20 },
  tourLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  tournamentName: { color: TEXT, fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 4, paddingRight: 32 },
  courseText: { color: '#a1a1aa', fontSize: 12, marginBottom: 4 },
  dateRange: { color: '#71717a', fontSize: 11, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0d1520',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0d1520',
  },
  colHeaderText: { color: '#52525b', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },
  colW: { width: 44, textAlign: 'center' },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playerRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  playerRowCut: { opacity: 0.4 },
  playerRank: { color: '#71717a', fontSize: 12, fontWeight: '500', width: 26, textAlign: 'right', marginRight: 8 },
  playerInfo: { flex: 1, marginRight: 8 },
  playerName: { color: TEXT, fontSize: 14, fontWeight: '600' },
  playerCountry: { color: '#71717a', fontSize: 11, marginTop: 2 },
  playerStat: { width: 44, textAlign: 'center', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },

  roundRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  roundLabel: { fontSize: 14, fontWeight: '800', width: 28, marginTop: 2 },
  roundDate: { color: TEXT, fontSize: 13, fontWeight: '600' },
  roundTeeTime: { color: TEXT_FAINT, fontSize: 11, marginTop: 2 },

  purseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  purseLabel: { color: TEXT_FAINT, fontSize: 12, fontWeight: '600' },
  purseValue: { color: TEXT, fontSize: 12, fontWeight: '700' },

  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: TEXT_FAINT, fontSize: 13 },
});
