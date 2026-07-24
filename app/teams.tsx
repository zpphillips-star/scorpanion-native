import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS } from '../lib/allProTeams';

import AppHeader from '../components/AppHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG      = '#0c1b31';
const SURFACE = '#142236';
const SURFACE2= '#1a2d4a';
const BORDER  = '#1e3050';
const TEXT    = '#F2E6CF';
const FAINT   = '#5F6773';
const ACCENT  = '#D95C17';

const WIN_W = Dimensions.get('window').width;
const MAP_W = WIN_W - 32;
const MAP_H = Math.round(MAP_W * 322 / 800);
const SCALE_X = MAP_W / 975;
const SCALE_Y = (MAP_H / 610);

// ─── FIPS → state abbr ────────────────────────────────────────────────────────

const FIPS_TO_ABBR: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY',
};

// ─── Topojson decoder ─────────────────────────────────────────────────────────

interface StatePath { fips: string; abbr: string; d: string }

function decodeTopo(topo: any): StatePath[] {
  const sx = topo.transform.scale[0];
  const sy = topo.transform.scale[1];
  const tx = topo.transform.translate[0];
  const ty = topo.transform.translate[1];

  // Decode arcs: delta integers → projected coords (975×610 space)
  const decoded: [number, number][][] = (topo.arcs as number[][][]).map(arc => {
    let ax = 0, ay = 0;
    return arc.map(([dx, dy]) => {
      ax += dx; ay += dy;
      return [ax * sx + tx, ay * sy + ty] as [number, number];
    });
  });

  function ringToD(ring: number[]): string {
    const pts: [number, number][] = [];
    for (const idx of ring) {
      const isRev = idx < 0;
      const arcPts = isRev ? [...decoded[~idx]].reverse() : decoded[idx];
      const start = pts.length === 0 ? 0 : 1;
      for (let i = start; i < arcPts.length; i++) {
        pts.push([arcPts[i][0] * SCALE_X, arcPts[i][1] * SCALE_Y]);
      }
    }
    if (pts.length === 0) return '';
    return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}` +
      pts.slice(1).map(([x, y]) => ` L${x.toFixed(1)},${y.toFixed(1)}`).join('') + ' Z';
  }

  const results: StatePath[] = [];
  for (const geom of (topo.objects.states.geometries as any[])) {
    const fips = String(geom.id ?? '').padStart(2, '0');
    const abbr = FIPS_TO_ABBR[fips];
    if (!abbr) continue;
    let d = '';
    if (geom.type === 'Polygon') {
      d = ringToD(geom.arcs[0]);
    } else if (geom.type === 'MultiPolygon') {
      d = (geom.arcs as number[][][]).map((poly: number[][]) => ringToD(poly[0])).filter(Boolean).join(' ');
    }
    if (d) results.push({ fips, abbr, d });
  }
  return results;
}

// ─── Decode topojson at module level (synchronous, no async needed) ───────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TOPO_DATA = require('../assets/states-10m.json');
const STATIC_PATHS: StatePath[] = (() => {
  try { return decodeTopo(TOPO_DATA); } catch { return []; }
})();

// ─── US Map component ─────────────────────────────────────────────────────────

function USMap({
  selectedState,
  onStateSelect,
  teamsPerState,
}: {
  selectedState: string | null;
  onStateSelect: (abbr: string) => void;
  teamsPerState: Record<string, number>;
}) {
  // Paths are pre-decoded at module load — no async, no spinner, no CDN fallback
  const paths = STATIC_PATHS;

  if (paths.length === 0) {
    return (
      <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: FAINT, fontSize: 12 }}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <G>
          {paths.map(({ abbr, d }) => {
            const hasTeams = (teamsPerState[abbr] ?? 0) > 0;
            const isSelected = selectedState === abbr;
            const fill = isSelected
              ? 'rgba(217,92,23,0.35)'
              : hasTeams
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.03)';
            const stroke = isSelected ? '#D95C17' : 'rgba(255,255,255,0.28)';
            return (
              <Path
                key={abbr}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? 2 : 0.5}
                onPress={() => hasTeams && onStateSelect(selectedState === abbr ? '' : abbr)}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ─── League order & labels ────────────────────────────────────────────────────

const LEAGUES = [
  { id: 'NFL',  label: 'NFL' },
  { id: 'NBA',  label: 'NBA' },
  { id: 'MLB',  label: 'MLB' },
  { id: 'NHL',  label: 'NHL' },
  { id: 'WNBA', label: 'WNBA' },
  { id: 'MLS',  label: 'MLS' },
  { id: 'NWSL', label: 'NWSL' },
  { id: 'PGA',  label: 'PGA Tour' },
  { id: 'LPGA', label: 'LPGA Tour' },
];

// ─── Sport filter tabs ────────────────────────────────────────────────────────

const SPORT_TABS = [
  { id: 'ALL',  label: 'All'   },
  { id: 'NFL',  label: 'NFL'   },
  { id: 'NBA',  label: 'NBA'   },
  { id: 'MLB',  label: 'MLB'   },
  { id: 'NHL',  label: 'NHL'   },
  { id: 'WNBA', label: 'WNBA'  },
  { id: 'MLS',  label: 'MLS'   },
  { id: 'NWSL', label: 'NWSL'  },
  { id: 'GOLF', label: 'Golf'  },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TeamsScreen() {
  const { followedTeams, toggleFollowTeam, isFollowing } = useSportsData();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const teamsPerState = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_PRO_TEAMS.forEach(t => { map[t.state] = (map[t.state] || 0) + 1; });
    return map;
  }, []);

  // Base filtered by tab + state + search
  const baseTeams = useMemo(() => {
    let base = ALL_PRO_TEAMS;
    if (activeTab === 'GOLF') {
      base = base.filter(t => t.league === 'PGA' || t.league === 'LPGA');
    } else if (activeTab !== 'ALL') {
      base = base.filter(t => t.league === activeTab);
    }
    if (selectedState) base = base.filter(t => t.state === selectedState);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q)
      );
    }
    return base;
  }, [activeTab, selectedState, search, followedTeams]);

  // Followed section (teams user follows, from baseTeams)
  const followedSection = useMemo(
    () => baseTeams.filter(t => isFollowing(t.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [baseTeams, followedTeams]
  );

  // League sections — only leagues present in baseTeams, in canonical order
  const leagueSections = useMemo(() => {
    const activeLeagues = activeTab === 'ALL' || activeTab === 'GOLF'
      ? LEAGUES.filter(l => baseTeams.some(t => t.league === l.id))
      : LEAGUES.filter(l => baseTeams.some(t => t.league === l.id));

    return activeLeagues.map(league => ({
      ...league,
      teams: baseTeams
        .filter(t => t.league === league.id)
        .sort((a, b) => {
          const af = isFollowing(a.id), bf = isFollowing(b.id);
          if (af !== bf) return af ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    })).filter(s => s.teams.length > 0);
  }, [baseTeams, followedTeams]);

  const followCount = ALL_PRO_TEAMS.filter(t => isFollowing(t.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader hideFilter />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search teams, cities, leagues..."
              placeholderTextColor={FAINT}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sport filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillBar}
          contentContainerStyle={styles.pillBarContent}
        >
          {SPORT_TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.pill, activeTab === tab.id && styles.pillActive]}
            >
              <Text style={[styles.pillText, activeTab === tab.id && styles.pillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* US Map */}
        <View style={styles.mapWrapper}>
          <USMap
            selectedState={selectedState}
            onStateSelect={(abbr) => setSelectedState(selectedState === abbr ? null : abbr)}
            teamsPerState={teamsPerState}
          />
          {selectedState && (
            <TouchableOpacity
              style={styles.clearState}
              onPress={() => setSelectedState(null)}
            >
              <Text style={styles.clearStateText}>✕ {selectedState}</Text>
            </TouchableOpacity>
          )}
          {/* Map legend + hints */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 }}>
            <Text style={{ color: FAINT, fontSize: 10 }}>● Has teams</Text>
            <Text style={{ color: FAINT, fontSize: 10 }}>Pinch to zoom · drag to pan</Text>
          </View>
        </View>

        {/* Following section — only shown when teams are followed */}
        {followedSection.length > 0 && !search && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>FOLLOWING</Text>
              <Text style={styles.sectionCount}>{followedSection.length}</Text>
            </View>
            <View style={styles.grid}>
              {followedSection.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  followed
                  onPress={() => toggleFollowTeam(team.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* League sections */}
        {leagueSections.map(section => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.label}</Text>
              <Text style={styles.sectionCount}>{section.teams.length}</Text>
            </View>
            <View style={styles.grid}>
              {section.teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  followed={isFollowing(team.id)}
                  onPress={() => toggleFollowTeam(team.id)}
                />
              ))}
            </View>
          </View>
        ))}

        {leagueSections.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No teams found</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TeamCard component ───────────────────────────────────────────────────────

function TeamCard({ team, followed, onPress }: { team: any; followed: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.teamCard, followed && styles.teamCardFollowed]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {followed && (
        <View style={styles.followBadge}>
          <Text style={styles.followBadgeText}>✓</Text>
        </View>
      )}
      {team.logo
        ? <Image source={{ uri: team.logo }} style={styles.teamLogo} resizeMode="contain" />
        : <View style={styles.teamLogoFallback}>
            <Text style={styles.teamLogoText}>{team.abbr}</Text>
          </View>
      }
      <Text style={styles.teamName} numberOfLines={2}>{team.shortName}</Text>
      <View style={styles.leagueBadge}>
        <Text style={styles.leagueText}>{team.league}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_W = (WIN_W - 32 - 16) / 3; // 3 cols, 16px padding each side, 8px gaps

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Search bar
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchIcon: { fontSize: 13 },
  searchInput: { flex: 1, color: TEXT, fontSize: 14, padding: 0 },
  searchClear: { color: FAINT, fontSize: 14, paddingHorizontal: 4 },

  // Filter pills
  pillBar: { borderBottomWidth: 1, borderBottomColor: BORDER, maxHeight: 50 },
  pillBarContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  pillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText: { color: FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },

  // Map
  mapWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  mapContainer: {
    width: MAP_W, height: MAP_H,
    backgroundColor: 'rgba(14,26,49,0.8)',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  clearState: {
    alignSelf: 'flex-end', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, backgroundColor: 'rgba(217,92,23,0.2)',
    borderWidth: 1, borderColor: ACCENT,
  },
  clearStateText: { color: ACCENT, fontSize: 11, fontWeight: '700' },

  // League sections
  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  sectionDot: { width: 3, height: 16, borderRadius: 2, backgroundColor: ACCENT },
  sectionTitle: { flex: 1, color: TEXT, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionCount: {
    color: FAINT, fontSize: 11, fontWeight: '600',
    backgroundColor: SURFACE, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 8,
  },
  teamCard: {
    width: CARD_W,
    alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  teamCardFollowed: {
    backgroundColor: 'rgba(217,92,23,0.12)',
    borderColor: ACCENT,
  },
  followBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  followBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  teamLogo: { width: 44, height: 44 },
  teamLogoFallback: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
  },
  teamLogoText: { color: FAINT, fontSize: 10, fontWeight: '700' },
  teamName: { color: TEXT, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  leagueBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  leagueText: { color: FAINT, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: FAINT, fontSize: 14 },
});
