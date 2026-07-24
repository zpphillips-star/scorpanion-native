import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet, ScrollView,
  Modal, PanResponder, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import GameDetailSheet from '../components/GameDetailSheet';
import AppHeader from '../components/AppHeader';
import { fetchSchedule } from '../lib/api';
import { normalizeGame, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE, SURFACE2, BORDER, TEXT_FAINT, TEXT_MUTED, ACCENT } from '../constants/theme';
import type { ScorpanionGame } from '../lib/types';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const { height: SCREEN_H } = Dimensions.get('window');

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function gameKickoffDate(kickoff: string): string | null {
  if (!kickoff) return null;
  if (kickoff.includes('T') || kickoff.match(/^\d{4}-/)) {
    return kickoff.split('T')[0];
  }
  const parts = kickoff.split(' ')[0]?.split('/');
  if (parts?.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${(m ?? '').padStart(2,'0')}-${(d ?? '').padStart(2,'0')}`;
  }
  return null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatDayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function CalendarScreen() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(now));
  const [allGames, setAllGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ScorpanionGame | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  // Deduped raw game lookup
  const rawById = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const g of allGames) { if (g.id) map.set(String(g.id), g); }
    return map;
  }, [allGames]);

  // Load games once
  useEffect(() => {
    fetchSchedule()
      .then((raw) => {
        const list: any[] = Array.isArray(raw) ? raw : raw.games ?? raw.events ?? [];
        // Deduplicate by game id
        const seen = new Set<string>();
        const deduped = list.filter((g) => {
          const key = String(g.id ?? g.gameId ?? JSON.stringify(g));
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllGames(deduped);
      })
      .catch(() => setAllGames([]))
      .finally(() => setLoading(false));
  }, []);

  // Games for a given date
  const gamesForDate = React.useCallback((date: string): NormalizedGame[] => {
    return allGames
      .filter((g) => gameKickoffDate(g.kickoff) === date)
      .map(normalizeGame);
  }, [allGames]);

  const dayGames = React.useMemo(() => gamesForDate(selectedDate), [gamesForDate, selectedDate]);

  // Dates with games (for dots)
  const gameDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const g of allGames) {
      const d = gameKickoffDate(g.kickoff);
      if (d) set.add(d);
    }
    return set;
  }, [allGames]);

  // Open popup with slide-up animation
  const openPopup = (date: string) => {
    setSelectedDate(date);
    setPopupOpen(true);
    slideAnim.setValue(SCREEN_H);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closePopup = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setPopupOpen(false));
  };

  // Swipe left/right to navigate days
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          setSelectedDate(d => addDays(d, 1));
        } else if (gs.dx > 50) {
          setSelectedDate(d => addDays(d, -1));
        }
      },
    })
  ).current;

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

  // Swipe calendar grid left/right to change month
  const monthPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
          else setViewMonth(m => m + 1);
        } else if (gs.dx > 50) {
          if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
          else setViewMonth(m => m - 1);
        }
      },
    })
  ).current;

  // Games for the popup's current selectedDate (reactive to swipe)
  const popupGames = React.useMemo(() => gamesForDate(selectedDate), [gamesForDate, selectedDate]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView>
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
        <View style={styles.grid} {...monthPan.panHandlers}>
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
                onPress={() => openPopup(dateStr)}
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

        {loading && <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Day games popup */}
      <Modal
        visible={popupOpen}
        transparent
        animationType="none"
        onRequestClose={closePopup}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePopup} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          {...panResponder.panHandlers}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Day header with swipe arrows */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, -1))} style={styles.dayNavBtn}>
              <Text style={styles.dayNavArrow}>‹</Text>
            </TouchableOpacity>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle}>{formatDayLabel(selectedDate)}</Text>
              {popupGames.some(g => g.status.toLowerCase().includes('progress') || g.status.toLowerCase() === 'live') && (
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, 1))} style={styles.dayNavBtn}>
              <Text style={styles.dayNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Game list */}
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {popupGames.length === 0 ? (
              <Text style={styles.noGames}>No games this day</Text>
            ) : (
              popupGames.map((g) => (
                <GameCard
                  key={g.gameId}
                  {...g}
                  onPress={() => {
                    const raw = rawById.get(g.gameId);
                    if (raw) setSelectedGame(raw);
                  }}
                />
              ))
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </Modal>

      {selectedGame && (
        <GameDetailSheet
          game={selectedGame as any}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: BG },
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
  // Popup sheet
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:      {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE2,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.72,
    paddingTop: 10,
  },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetTitleWrap: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sheetTitle: { color: '#F2E6CF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  dayNavBtn:  { padding: 12 },
  dayNavArrow: { color: TEXT_FAINT, fontSize: 24, fontWeight: '300' },
  sheetScroll: { paddingTop: 4 },
  livePill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,180,0,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot:    { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFB400' },
  liveText:   { color: '#FFB400', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  noGames:    { color: TEXT_FAINT, fontSize: 13, textAlign: 'center', marginTop: 30 },
});
