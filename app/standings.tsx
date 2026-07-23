import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchStandings } from '../lib/api';
import {
  BG, SURFACE, SURFACE2, SURFACE3, BORDER, BORDER_D,
  TEXT, TEXT_MUTED, TEXT_FAINT, ACCENT,
} from '../constants/theme';

const LEAGUES = [
  { label: 'MLB',  sport: 'baseball',    league: 'mlb' },
  { label: 'NBA',  sport: 'basketball',  league: 'nba' },
  { label: 'NFL',  sport: 'football',    league: 'nfl' },
  { label: 'NHL',  sport: 'hockey',      league: 'nhl' },
  { label: 'MLS',  sport: 'soccer',      league: 'mls' },
  { label: 'WNBA', sport: 'basketball',  league: 'wnba' },
];

export default function StandingsScreen() {
  const [selected, setSelected] = useState(LEAGUES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStandings(selected.sport, selected.league)
      .then((res) => {
        const entries = res?.standings || res?.groups || res?.children || res || [];
        const flat: any[] = [];
        const flatten = (arr: any[]) =>
          arr.forEach((item) => {
            if (item.standings?.entries) flat.push(...item.standings.entries);
            else if (item.entries) flat.push(...item.entries);
            else if (item.children) flatten(item.children);
            else flat.push(item);
          });
        flatten(Array.isArray(entries) ? entries : [entries]);
        setData(flat);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Standings</Text>
      </View>

      {/* League picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {LEAGUES.map((l) => (
          <TouchableOpacity
            key={l.label}
            onPress={() => setSelected(l)}
            style={[styles.pill, selected.label === l.label && styles.pillActive]}
          >
            <Text style={[styles.pillText, selected.label === l.label && styles.pillTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No standings available</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={() => (
            <View style={styles.tableHeader}>
              <Text style={[styles.colTeam, styles.colHeader]}>Team</Text>
              <Text style={[styles.colW, styles.colHeader]}>W</Text>
              <Text style={[styles.colL, styles.colHeader]}>L</Text>
              <Text style={[styles.colPct, styles.colHeader]}>PCT</Text>
              <Text style={[styles.colGb, styles.colHeader]}>GB</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const teamName =
              item.team?.displayName || item.team?.name || item.name || `Team ${index + 1}`;
            const stats = item.stats || [];
            const getStat = (name: string) =>
              stats.find(
                (s: any) => s.name === name || s.abbreviation === name
              )?.displayValue || '–';
            return (
              <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                <View style={styles.colTeam}>
                  <Text style={styles.rowRank}>{index + 1}</Text>
                  <Text style={styles.rowTeam} numberOfLines={1}>{teamName}</Text>
                </View>
                <Text style={[styles.colW, styles.rowStat]}>{getStat('wins') || getStat('W')}</Text>
                <Text style={[styles.colL, styles.rowStat]}>{getStat('losses') || getStat('L')}</Text>
                <Text style={[styles.colPct, styles.rowStat]}>{getStat('winPercent') || getStat('PCT')}</Text>
                <Text style={[styles.colGb, styles.rowStat]}>{getStat('gamesBehind') || getStat('GB')}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  pageTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    maxHeight: 48,
  },
  filterContent: {
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
  pillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText: { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: TEXT_FAINT, fontSize: 14 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE3,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rowEven: { backgroundColor: SURFACE },
  rowOdd:  { backgroundColor: BG },
  colTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  colW:    { width: 30, textAlign: 'center' },
  colL:    { width: 30, textAlign: 'center' },
  colPct:  { width: 48, textAlign: 'center' },
  colGb:   { width: 40, textAlign: 'center' },
  colHeader: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  rowRank:  { color: TEXT_FAINT, fontSize: 11, width: 20 },
  rowTeam:  { color: TEXT, fontSize: 13, fontWeight: '600', flex: 1 },
  rowStat:  { color: TEXT_MUTED, fontSize: 13 },
});
