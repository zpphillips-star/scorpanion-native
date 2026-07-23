import React, { useState, useCallback, useEffect } from 'react';
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
import { normalizeGame, NormalizedGame } from '../lib/normalizeGame';
import { BG, SURFACE, BORDER, TEXT, TEXT_FAINT, ACCENT } from '../constants/theme';
import type { SheetTeam } from '../lib/types';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function getDayLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDays() {
  const days: Date[] = [];
  for (let i = -3; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<SheetGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);
  const days = getDays();

  const load = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const data = await fetchSchedule(undefined, formatDate(date));
      const rawGames = Array.isArray(data) ? data : data.games || data.events || [];
      setGames(rawGames.map(normalizeGame));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(selectedDay);
  }, [selectedDay, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Schedule</Text>
      </View>

      {/* Day picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {days.map((d, i) => {
          const isSelected = d.toDateString() === selectedDay.toDateString();
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedDay(d)}
              style={[styles.pill, isSelected && styles.pillActive]}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {getDayLabel(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No games scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item, index) => item.gameId ?? String(index)}
          renderItem={({ item }) => (
            <GameCard {...item} onPress={() => setSelectedGame(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(selectedDay); }}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        />
      )}

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

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: BG },
  pageHeader:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  pageTitle:   { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  filterBar:   { borderBottomWidth: 1, borderBottomColor: BORDER, maxHeight: 48 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  pill:        { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  pillActive:  { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText:    { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { color: TEXT_FAINT, fontSize: 14 },
});
