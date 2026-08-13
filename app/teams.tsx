import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, StyleSheet, useWindowDimensions, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS, ProTeam } from '../lib/allProTeams';

import AppHeader from '../components/AppHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG      = '#0c1b31';
const SURFACE = '#142236';
const SURFACE2= '#1a2d4a';
const BORDER  = '#1e3050';
const TEXT    = '#F2E6CF';
const FAINT   = '#5F6773';
const ACCENT  = '#D95C17';

const MAP_ASPECT = 420 / 800; // taller aspect ratio for better phone readability
const MIN_CARD_W = 88;
const MIN_MAP_W = 280;
const FALLBACK_MAP_W = Math.max(MIN_MAP_W, Math.round((Dimensions.get('window').width || 390) - 32));

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

function decodeTopo(topo: any, mapW: number, mapH: number): StatePath[] {
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

  function projectPoint(lonRaw: number, lat: number): [number, number] {
    const lon = lonRaw > 0 ? lonRaw - 360 : lonRaw;

    // states-10m stores longitude/latitude. The old renderer treated those as
    // already-projected pixels, which put most paths off-canvas on Android. Use
    // deterministic phone-friendly USA insets instead of silently drawing blank.
    if (lat > 50 && lon < -125) {
      const x = ((lon + 180) / 50) * (mapW * 0.24) + mapW * 0.04;
      const y = ((72 - lat) / 22) * (mapH * 0.24) + mapH * 0.68;
      return [x, y];
    }

    if (lat < 25 && lon < -140) {
      const x = ((lon + 161) / 8) * (mapW * 0.14) + mapW * 0.34;
      const y = ((23 - lat) / 6) * (mapH * 0.12) + mapH * 0.82;
      return [x, y];
    }

    const x = ((lon + 125) / 59) * (mapW * 0.78) + mapW * 0.16;
    const y = ((50 - lat) / 26) * (mapH * 0.72) + mapH * 0.06;
    return [x, y];
  }

  function ringToD(ring: number[]): string {
    const pts: [number, number][] = [];
    for (const idx of ring) {
      const isRev = idx < 0;
      const arcPts = isRev ? [...decoded[~idx]].reverse() : decoded[idx];
      const start = pts.length === 0 ? 0 : 1;
      for (let i = start; i < arcPts.length; i++) {
        pts.push(projectPoint(arcPts[i][0], arcPts[i][1]));
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

const TOPO_DATA = require('../assets/states-10m.json');
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
  const { width } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const availableWidth = measuredWidth > 0
    ? measuredWidth
    : (width > 64 ? width - 32 : FALLBACK_MAP_W);
  const mapW = Math.max(MIN_MAP_W, Math.round(availableWidth));
  const mapH = Math.max(140, Math.round(mapW * MAP_ASPECT));
  const paths = useMemo(() => {
    try { return decodeTopo(TOPO_DATA, mapW, mapH); } catch { return []; }
  }, [mapW, mapH]);

  if (paths.length === 0) {
    return (
      <View
        style={styles.mapSizer}
        onLayout={(event) => setMeasuredWidth(Math.round(event.nativeEvent.layout.width))}
      >
        <View style={[styles.mapContainer, styles.mapUnavailable, { height: mapH }]}>
          <Text style={styles.mapUnavailableTitle}>Map unavailable</Text>
          <Text style={styles.mapUnavailableText}>Team list still works below.</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.mapSizer}
      onLayout={(event) => setMeasuredWidth(Math.round(event.nativeEvent.layout.width))}
    >
      <View style={[styles.mapContainer, { height: mapH }]}>
        <Svg width={mapW} height={mapH} viewBox={`0 0 ${mapW} ${mapH}`}>
        <G>
          {paths.map(({ abbr, d }) => {
            const hasTeams = (teamsPerState[abbr] ?? 0) > 0;
            const isSelected = selectedState === abbr;
            // Use explicit fill+fillOpacity to avoid Android rgba rendering issues
            const fillColor = isSelected ? '#D95C17' : hasTeams ? '#ffffff' : '#8ab0d0';
            const fillOp = isSelected ? 0.40 : hasTeams ? 0.20 : 0.07;
            const strokeColor = isSelected ? '#D95C17' : hasTeams ? '#c8d8e8' : '#8ab0d0';
            const strokeOp = isSelected ? 1.0 : hasTeams ? 0.65 : 0.40;
            const strokeW = isSelected ? 2.0 : 1.0;
            return (
              <Path
                key={abbr}
                d={d}
                fill={fillColor}
                fillOpacity={fillOp}
                stroke={strokeColor}
                strokeOpacity={strokeOp}
                strokeWidth={strokeW}
                onPress={() => hasTeams && onStateSelect(selectedState === abbr ? '' : abbr)}
              />
            );
          })}
        </G>
      </Svg>
    </View>
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
  const { toggleFollowTeam, isFollowing } = useSportsData();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(MIN_CARD_W, Math.floor((width - 32 - 16) / 3));
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedStateTeamId, setSelectedStateTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const teamsPerState = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_PRO_TEAMS.forEach(t => { map[t.state] = (map[t.state] || 0) + 1; });
    return map;
  }, []);

  const handleStateSelect = (abbr: string) => {
    setSelectedState(prev => {
      const next = prev === abbr || !abbr ? null : abbr;
      setSelectedStateTeamId(null);
      return next;
    });
  };

  const selectedStateTeams = useMemo(() => {
    if (!selectedState) return [];
    return ALL_PRO_TEAMS
      .filter(t => t.state === selectedState)
      .sort((a, b) => {
        const leagueDelta = LEAGUES.findIndex(l => l.id === a.league) - LEAGUES.findIndex(l => l.id === b.league);
        if (leagueDelta !== 0) return leagueDelta;
        return a.name.localeCompare(b.name);
      });
  }, [selectedState]);

  // Base filtered by tab + state + optional state-team quick filter + search
  const baseTeams = useMemo(() => {
    let base = ALL_PRO_TEAMS;
    if (activeTab === 'GOLF') {
      base = base.filter(t => t.league === 'PGA' || t.league === 'LPGA');
    } else if (activeTab !== 'ALL') {
      base = base.filter(t => t.league === activeTab);
    }
    if (selectedState) base = base.filter(t => t.state === selectedState);
    if (selectedStateTeamId) base = base.filter(t => t.id === selectedStateTeamId);
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
  }, [activeTab, selectedState, selectedStateTeamId, search]);

  // Followed section (teams user follows, from baseTeams)
  const followedSection = useMemo(
    () => baseTeams.filter(t => isFollowing(t.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [baseTeams, isFollowing]
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
  }, [activeTab, baseTeams, isFollowing]);

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
            onStateSelect={handleStateSelect}
            teamsPerState={teamsPerState}
          />
          {selectedState && (
            <TouchableOpacity
              style={styles.clearState}
              onPress={() => { setSelectedState(null); setSelectedStateTeamId(null); }}
            >
              <Text style={styles.clearStateText}>✕ {selectedState}{selectedStateTeamId ? ' team' : ''}</Text>
            </TouchableOpacity>
          )}
          {/* Map legend + hints */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 }}>
            <Text style={{ color: FAINT, fontSize: 10 }}>● Has teams</Text>
            <Text style={{ color: FAINT, fontSize: 10 }}>Pinch to zoom · drag to pan</Text>
          </View>
        </View>

        {selectedState && selectedStateTeams.length > 0 && (
          <View style={styles.stateTeamsPanel}>
            <View style={styles.stateTeamsHeader}>
              <View>
                <Text style={styles.stateTeamsEyebrow}>STATE TEAMS</Text>
                <Text style={styles.stateTeamsTitle}>{selectedState} quick filters</Text>
              </View>
              <Text style={styles.stateTeamsCount}>{selectedStateTeams.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stateTeamsRow}
            >
              <TouchableOpacity
                onPress={() => setSelectedStateTeamId(null)}
                activeOpacity={0.75}
                style={[
                  styles.stateTeamChip,
                  styles.stateTeamAllChip,
                  !selectedStateTeamId && styles.stateTeamChipActive,
                ]}
              >
                <Text style={[styles.stateTeamAllText, !selectedStateTeamId && styles.stateTeamTextActive]}>All</Text>
                <Text style={styles.stateTeamLeagueText}>{selectedState}</Text>
              </TouchableOpacity>

              {selectedStateTeams.map(team => {
                const isActive = selectedStateTeamId === team.id;
                const followed = isFollowing(team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    onPress={() => setSelectedStateTeamId(isActive ? null : team.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.stateTeamChip,
                      followed && styles.stateTeamChipFollowed,
                      isActive && styles.stateTeamChipActive,
                    ]}
                  >
                    {followed && <View style={styles.stateTeamFollowDot} />}
                    {team.logo
                      ? <Image source={{ uri: team.logo }} style={styles.stateTeamLogo} resizeMode="contain" />
                      : <View style={styles.stateTeamLogoFallback}><Text style={styles.stateTeamLogoText}>{team.abbr}</Text></View>
                    }
                    <View style={styles.stateTeamTextBlock}>
                      <Text style={[styles.stateTeamName, isActive && styles.stateTeamTextActive]} numberOfLines={1}>
                        {team.shortName}
                      </Text>
                      <Text style={styles.stateTeamLeagueText} numberOfLines={1}>{team.league} · {team.abbr}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
                  cardWidth={cardWidth}
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
                  cardWidth={cardWidth}
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

function TeamCard({ team, followed, cardWidth, onPress }: { team: ProTeam; followed: boolean; cardWidth: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.teamCard, { width: cardWidth }, followed && styles.teamCardFollowed]}
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
  mapSizer: { width: '100%', minHeight: 140 },
  mapContainer: {
    backgroundColor: 'rgba(14,26,49,0.8)',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  mapUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mapUnavailableTitle: { color: TEXT, fontSize: 13, fontWeight: '800' },
  mapUnavailableText: { color: FAINT, fontSize: 11, marginTop: 4 },
  clearState: {
    alignSelf: 'flex-end', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, backgroundColor: 'rgba(217,92,23,0.2)',
    borderWidth: 1, borderColor: ACCENT,
  },
  clearStateText: { color: ACCENT, fontSize: 11, fontWeight: '700' },

  // Selected-state horizontal team carousel
  stateTeamsPanel: {
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(20,34,54,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(217,92,23,0.34)',
  },
  stateTeamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  stateTeamsEyebrow: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  stateTeamsTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  stateTeamsCount: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  stateTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingRight: 18,
  },
  stateTeamChip: {
    width: 128,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  stateTeamAllChip: {
    width: 72,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 1,
  },
  stateTeamChipActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(217,92,23,0.18)',
  },
  stateTeamChipFollowed: {
    borderColor: 'rgba(217,92,23,0.42)',
  },
  stateTeamFollowDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  stateTeamLogo: { width: 30, height: 30, flexShrink: 0 },
  stateTeamLogoFallback: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stateTeamLogoText: { color: FAINT, fontSize: 9, fontWeight: '800' },
  stateTeamTextBlock: { flex: 1, minWidth: 0 },
  stateTeamName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  stateTeamAllText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },
  stateTeamTextActive: { color: '#fff' },
  stateTeamLeagueText: {
    color: FAINT,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

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
