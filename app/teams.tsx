import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSportsData } from '../context/SportsDataContext';
import TeamDetailSheet from '../components/TeamDetailSheet';
import { fetchTeams } from '../lib/api';
import {
  BG, SURFACE, SURFACE2, BORDER, BORDER_D,
  TEXT, TEXT_MUTED, TEXT_FAINT, ACCENT, WIN, LOSS,
} from '../constants/theme';
import type { SheetTeam } from '../lib/types';

const SPORTS = [
  { id: 'all',  label: 'All' },
  { id: 'mlb',  label: 'MLB' },
  { id: 'nba',  label: 'NBA' },
  { id: 'nfl',  label: 'NFL' },
  { id: 'nhl',  label: 'NHL' },
  { id: 'mls',  label: 'MLS' },
  { id: 'wnba', label: 'WNBA' },
];

export default function TeamsScreen() {
  const { toggleFollowTeam, isFollowing } = useSportsData();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('all');
  const [showFollowed, setShowFollowed] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);

  useEffect(() => {
    setLoading(true);
    const sport = selectedSport === 'all' ? undefined : selectedSport;
    fetchTeams(sport)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.teams || data.sports || [];
        setTeams(list);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [selectedSport]);

  const displayed = showFollowed ? teams.filter((t) => isFollowing(t.id)) : teams;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Teams</Text>
        <TouchableOpacity
          onPress={() => setShowFollowed(!showFollowed)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showFollowed ? 'heart' : 'heart-outline'}
            size={22}
            color={showFollowed ? LOSS : TEXT_FAINT}
          />
        </TouchableOpacity>
      </View>

      {/* Sport filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => setSelectedSport(s.id)}
            style={[styles.pill, selectedSport === s.id && styles.pillActive]}
          >
            <Text style={[styles.pillText, selectedSport === s.id && styles.pillTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {showFollowed
              ? 'No followed teams yet'
              : 'No teams found'}
          </Text>
          {showFollowed && (
            <Text style={styles.emptySubText}>Tap ♥ on any team to follow it</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id || item.uid || String(Math.random())}
          renderItem={({ item }) => {
            const following = isFollowing(item.id);
            const name = item.displayName || item.name || item.shortDisplayName || 'Unknown';
            const logo = item.logos?.[0]?.href || item.logo;
            const abbr: string = item.abbreviation ?? '';
            const sport: string = (item.sport ?? item.league ?? selectedSport ?? '').toLowerCase();

            return (
              <TouchableOpacity
                style={styles.teamRow}
                onPress={() =>
                  setSelectedTeam({
                    id: item.id,
                    name,
                    abbreviation: abbr,
                    logo,
                    sport,
                  })
                }
                activeOpacity={0.7}
              >
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    style={styles.teamLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.teamLogoFallback}>
                    <Text style={styles.teamLogoText}>{abbr?.slice(0, 3)}</Text>
                  </View>
                )}
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
                  {abbr ? <Text style={styles.teamAbbr}>{abbr}</Text> : null}
                </View>
                <TouchableOpacity
                  onPress={() => toggleFollowTeam(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={following ? 'heart' : 'heart-outline'}
                    size={20}
                    color={following ? LOSS : TEXT_FAINT}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {selectedTeam && (
        <TeamDetailSheet team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  pillText:   { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText:   { color: TEXT_MUTED, fontSize: 14, fontWeight: '600' },
  emptySubText: { color: TEXT_FAINT, fontSize: 12 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    gap: 12,
  },
  separator: { height: 1, backgroundColor: BORDER },
  teamLogo: { width: 36, height: 36 },
  teamLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700' },
  teamInfo: { flex: 1 },
  teamName: { color: TEXT, fontSize: 14, fontWeight: '600' },
  teamAbbr: { color: TEXT_FAINT, fontSize: 11, marginTop: 1 },
});
