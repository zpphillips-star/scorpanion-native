import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet, { SheetGame } from '../components/GameDetailSheet';
import TeamDetailSheet from '../components/TeamDetailSheet';
import { fetchSchedule } from '../lib/api';
import { normalizeGame, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE, SURFACE2, SURFACE3, BORDER, TEXT, TEXT_FAINT, TEXT_MUTED, ACCENT, LIVE } from '../constants/theme';
import type { SheetTeam } from '../lib/types';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]; // "2026-07-22"
}

function gameKickoffDate(kickoff: string): string | null {
  if (!kickoff) return null;
  if (kickoff.includes('T') || kickoff.match(/^\d{4}-/)) {
    return kickoff.split('T')[0];
  }
  // Legacy "MM/DD/YYYY ..."
  const parts = kickoff.split(' ')[0]?.split('/');
  if (parts?.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${(m ?? '').padStart(2,'0')}-${(d ?? '').padStart(2,'0')}`;
  }
  return null;
}

export default function CalendarScreen() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(now));
  const [allGames, setAllGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<SheetGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);

  // Load all games once
  useEffect(() => {
    fetchSchedule()
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : raw.games ?? raw.events ?? [];
        setAllGames(list);
      })
      .catch(() => setAllGames([]))
      .finally(() => setLoading(false));
  }, []);

  // Games for selected date
  const dayGames: NormalizedGame[] = React.useMemo(() => {
    return allGames
      .filter((g) => gameKickoffDate(g.kickoff) === selectedDate)
      .map(normalizeGame);
  }, [allGames, selectedDate]);

  // Dates that have games this month (for dots)
  const gameDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const g of allGames) {
      const d = gameKickoffDate(g.kickoff);
      if (d) set.add(d);
    }
    return set;
  }, [allGames]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = toDateStr(now);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day of week headers */}
        <View style={styles.dowRow}>
          {DOW.map(d => (
            <Text key={d} style={styles.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={styles.cell} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasGame = gameDates.has(dateStr);

            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.cell}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSelected && styles.dayCircleToday,
                ]}>
                  <Text style={[
                    styles.dayNum,
                    isSelected && styles.dayNumSelected,
                    isToday && !isSelected && styles.dayNumToday,
                  ]}>
                    {day}
                  </Text>
                </View>
                {hasGame && <View style={[styles.gameDot, isSelected && styles.gameDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Games for selected date */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {dayGames.some(g => g.status.toLowerCase().includes('progress') || g.status.toLowerCase() === 'live') && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Now</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
        ) : dayGames.length === 0 ? (
          <Text style={styles.noGames}>No games this day</Text>
        ) : (
          dayGames.map((g) => (
            <GameCard
              key={g.gameId}
              {...g}
              onPress={() => setSelectedGame(g)}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onTeamPress={(team) => { setSelectedGame(null); setSelectedTeam(team); }}
        />
      )}
      {selectedTeam && (
        <TeamDetailSheet team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: BG },
  header:     { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:      { color: '#F2E6CF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  navBtn:     { padding: 8 },
  navArrow:   { color: TEXT_FAINT, fontSize: 22, fontWeight: '300' },
  monthLabel: { color: '#F2E6CF', fontSize: 15, fontWeight: '700' },
  dowRow:     { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4 },
  dowLabel:   { flex: 1, textAlign: 'center', color: TEXT_FAINT, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell:       { width: `${100/7}%`, alignItems: 'center', paddingVertical: 4, gap: 3 },
  dayCircle:  { width: CELL_SIZE - 8, height: CELL_SIZE - 8, borderRadius: (CELL_SIZE - 8) / 2, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: ACCENT },
  dayCircleToday: { borderWidth: 1.5, borderColor: ACCENT },
  dayNum:     { color: TEXT_MUTED, fontSize: 14, fontWeight: '500' },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { color: ACCENT, fontWeight: '700' },
  gameDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, opacity: 0.6 },
  gameDotSelected: { opacity: 1, backgroundColor: '#fff' },
  divider:    { height: 1, backgroundColor: BORDER, marginTop: 8, marginHorizontal: 16 },
  dayHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dayTitle:   { color: '#F2E6CF', fontSize: 14, fontWeight: '700', flex: 1 },
  livePill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot:    { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ef4444' },
  liveText:   { color: '#f87171', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  noGames:    { color: TEXT_FAINT, fontSize: 13, textAlign: 'center', marginTop: 20 },
});
