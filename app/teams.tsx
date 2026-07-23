import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  FlatList, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { useSportsData } from '../context/SportsDataContext';
import { ALL_PRO_TEAMS } from '../lib/allProTeams';
import type { ProTeam } from '../lib/allProTeams';
import TeamDetailSheet from '../components/TeamDetailSheet';
import type { TeamSheetParams } from '../lib/types';

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
  const [paths, setPaths] = useState<StatePath[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then(r => r.json())
      .then(topo => { setPaths(decodeTopo(topo)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={ACCENT} />
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
            const stroke = isSelected ? '#D95C17' : 'rgba(255,255,255,0.15)';
            return (
              <Path
                key={abbr}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? 1.5 : 0.5}
                onPress={() => hasTeams && onStateSelect(selectedState === abbr ? '' : abbr)}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ─── Sport filter tabs ────────────────────────────────────────────────────────

const SPORT_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'NFL', label: 'NFL' },
  { id: 'NBA', label: 'NBA' },
  { id: 'NHL', label: 'NHL' },
  { id: 'MLB', label: 'MLB' },
  { id: 'WNBA', label: 'WNBA' },
  { id: 'MLS', label: 'MLS' },
  { id: 'NWSL', label: 'NWSL' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TeamsScreen() {
  const { followedTeams, toggleFollowTeam, isFollowing } = useSportsData();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamSheetParams | null>(null);

  const teamsPerState = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_PRO_TEAMS.forEach(t => { map[t.state] = (map[t.state] || 0) + 1; });
    return map;
  }, []);

  const filteredTeams = useMemo(() => {
    let base = activeTab === 'ALL'
      ? ALL_PRO_TEAMS
      : ALL_PRO_TEAMS.filter(t => t.league === activeTab);
    if (selectedState) {
      base = base.filter(t => t.state === selectedState);
    }
    return [...base].sort((a, b) => {
      const af = isFollowing(a.id), bf = isFollowing(b.id);
      if (af !== bf) return af ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [activeTab, selectedState, followedTeams]);

  const followCount = ALL_PRO_TEAMS.filter(t => isFollowing(t.id)).length;

  function openTeam(team: ProTeam) {
    setSelectedTeam({
      teamId: team.espnId,
      teamName: team.name,
      teamLogo: team.logo,
      league: team.league.toLowerCase(),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TEAMS</Text>
          <Text style={styles.headerSub}>Following {followCount} team{followCount !== 1 ? 's' : ''}</Text>
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
        </View>

        {/* Team grid - 3 columns */}
        <View style={styles.grid}>
          {filteredTeams.map(team => {
            const followed = isFollowing(team.id);
            return (
              <TouchableOpacity
                key={team.id}
                style={[styles.teamCard, followed && styles.teamCardFollowed]}
                onPress={() => openTeam(team)}
                activeOpacity={0.75}
              >
                {team.logo
                  ? <Image source={{ uri: team.logo }} style={styles.teamLogo} resizeMode="contain" />
                  : <View style={styles.teamLogoFallback}>
                      <Text style={styles.teamLogoText}>{team.abbr}</Text>
                    </View>
                }
                <Text style={styles.teamName} numberOfLines={2}>{team.shortName}</Text>
                <View style={[styles.leagueBadge]}>
                  <Text style={styles.leagueText}>{team.league}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredTeams.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No teams found</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {selectedTeam && (
        <TeamDetailSheet
          teamId={selectedTeam.teamId}
          teamName={selectedTeam.teamName}
          teamLogo={selectedTeam.teamLogo}
          league={selectedTeam.league}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_W = (WIN_W - 32 - 16) / 3; // 3 cols, 16px padding each side, 8px gaps

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { color: TEXT, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { color: FAINT, fontSize: 13, marginTop: 2 },

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

  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 12, gap: 8,
  },
  teamCard: {
    width: CARD_W,
    alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  teamCardFollowed: {
    backgroundColor: 'rgba(217,92,23,0.12)',
    borderColor: ACCENT,
  },
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
