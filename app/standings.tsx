import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchStandings } from '../lib/api';
import AppHeader from '../components/AppHeader';
import {
  BG, SURFACE, SURFACE2, SURFACE3, BORDER,
  TEXT, TEXT_MUTED, TEXT_FAINT, ACCENT,
} from '../constants/theme';

const LEAGUES = [
  { label: 'MLB',  sport: 'baseball',    league: 'mlb' },
  { label: 'NBA',  sport: 'basketball',  league: 'nba' },
  { label: 'NFL',  sport: 'football',    league: 'nfl' },
  { label: 'NHL',  sport: 'hockey',      league: 'nhl' },
  { label: 'MLS',  sport: 'soccer',      league: 'usa.1' },
  { label: 'WNBA', sport: 'basketball',  league: 'wnba' },
  { label: 'NWSL', sport: 'soccer',      league: 'usa.nwsl' },
];

// Flatten the scorpanion standings API response into a list of teams + division headers
function flattenStandings(res: any): ({type: 'header'; name: string} | {type: 'team'; entry: any})[] {
  const rows: ({type: 'header'; name: string} | {type: 'team'; entry: any})[] = [];
  if (!res) return rows;

  // Scorpanion format: { divisions: [{name, entries: [...]}] }
  if (res.divisions && Array.isArray(res.divisions)) {
    for (const div of res.divisions) {
      if (div.name) rows.push({ type: 'header', name: div.name });
      for (const entry of div.entries ?? []) {
        rows.push({ type: 'team', entry });
      }
    }
    return rows;
  }

  // ESPN format fallback: groups/children with standings.entries
  const top = res.standings ?? res.groups ?? res.children ?? res;
  const arr = Array.isArray(top) ? top : [top];

  const walk = (items: any[]) => {
    for (const item of items) {
      if (item.name) rows.push({ type: 'header', name: item.name });
      if (item.standings?.entries) {
        for (const e of item.standings.entries) rows.push({ type: 'team', entry: e });
      } else if (item.entries) {
        for (const e of item.entries) rows.push({ type: 'team', entry: e });
      } else if (item.children) {
        walk(item.children);
      }
    }
  };
  walk(arr);
  return rows;
}

type SeasonSummary = {
  label: string;
  phase: string;
  detail: string;
};

function getSeasonSummary(res: any, leagueLabel: string): SeasonSummary {
  const season =
    res?.season ??
    res?.leagues?.[0]?.season ??
    res?.children?.[0]?.standings ??
    res?.standings ??
    {};

  const label =
    season.label ??
    season.displayName ??
    season.seasonDisplayName ??
    season.name ??
    `${leagueLabel} season`;

  const rawStatus = season.status ?? season.type?.name ?? season.type?.description ?? season.seasonType ?? season.type;
  const rawType = typeof rawStatus === 'object' && rawStatus !== null
    ? rawStatus.name ?? rawStatus.description ?? rawStatus.id ?? rawStatus.type
    : rawStatus;
  const typeText = String(rawType ?? '').toLowerCase();
  let phase = 'Regular season';
  if (typeText.includes('pre') || rawType === 1) phase = 'Preseason';
  else if (typeText.includes('post') || typeText.includes('playoff') || rawType === 3) phase = 'Postseason';
  else if (typeText.includes('off') || rawType === 4) phase = 'Offseason';

  if (typeof season.status === 'string') {
    phase = season.status === 'playoffs'
      ? 'Postseason'
      : season.status.charAt(0).toUpperCase() + season.status.slice(1);
  }

  const nextStart = season.nextStartApprox ? ` · next starts around ${season.nextStartApprox}` : '';
  const detail = `${phase}${nextStart}`;
  return { label, phase, detail };
}

// Get a stat value from a scorpanion or ESPN standings entry
function getStat(entry: any, names: string[]): string {
  for (const name of names) {
    if (entry[name] !== undefined && entry[name] !== null) {
      const v = entry[name];
      if (typeof v === 'number') return v.toString();
      if (typeof v === 'string' && v !== '') return v;
    }
    // ESPN format: entry.stats array
    if (entry.stats) {
      const s = entry.stats.find((x: any) => x.name === name || x.abbreviation === name);
      if (s?.displayValue) return s.displayValue;
    }
  }
  return '–';
}

export default function StandingsScreen() {
  const [selected, setSelected] = useState(LEAGUES[0]);
  const [rows, setRows] = useState<ReturnType<typeof flattenStandings>>([]);
  const [season, setSeason] = useState<SeasonSummary>(() => getSeasonSummary(null, LEAGUES[0].label));
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [sortKey, setSortKey] = useState<'W' | 'L' | 'PCT' | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorText('');
    fetchStandings(selected.sport, selected.league)
      .then((res) => {
        if (mounted) {
          setRows(flattenStandings(res));
          setSeason(getSeasonSummary(res, selected.label));
        }
      })
      .catch(() => {
        if (mounted) {
          setRows([]);
          setSeason(getSeasonSummary(null, selected.label));
          setErrorText(`${selected.label} standings are unavailable right now.`);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [selected]);

  function toggleSort(key: 'W' | 'L' | 'PCT') {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === 'L'); }
  }

  function isSeattleTeam(name: string, abbr: string): boolean {
    const n = (name ?? '').toLowerCase();
    const a = (abbr ?? '').toUpperCase();
    return n.includes('seattle') || a === 'SEA' || a === 'OL REIGN' || n.includes('reign') || n.includes('sounders') || n.includes('storm') || n.includes('kraken') || n.includes('mariners') || n.includes('seahawks');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader hideFilter />

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

      <View style={styles.seasonCard}>
        <View style={styles.seasonAccent} />
        <View style={styles.seasonTextBlock}>
          <Text style={styles.seasonKicker}>{selected.label} STANDINGS</Text>
          <Text style={styles.seasonTitle} numberOfLines={1}>{season.label}</Text>
          <Text style={styles.seasonDetail} numberOfLines={1}>{season.detail}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{errorText || 'No standings available'}</Text>
        </View>
      ) : (
        <>
          {/* Column headers */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colTeam, styles.colHeader]}>Team</Text>
            <TouchableOpacity onPress={() => toggleSort('W')} style={styles.colW}>
              <Text style={[styles.colHeader, sortKey === 'W' && { color: ACCENT }]}>W{sortKey === 'W' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('L')} style={styles.colL}>
              <Text style={[styles.colHeader, sortKey === 'L' && { color: ACCENT }]}>L{sortKey === 'L' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('PCT')} style={styles.colPct}>
              <Text style={[styles.colHeader, sortKey === 'PCT' && { color: ACCENT }]}>PCT{sortKey === 'PCT' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
            </TouchableOpacity>
            <Text style={[styles.colGb, styles.colHeader]}>GB</Text>
          </View>
          <FlatList
            data={rows}
            keyExtractor={(_, i) => String(i)}
            removeClippedSubviews
            maxToRenderPerBatch={20}
            windowSize={11}
            initialNumToRender={20}
            renderItem={({ item, index }) => {              if (item.type === 'header') {
                return (
                  <View style={styles.divisionHeader}>
                    <Text style={styles.divisionName}>{item.name}</Text>
                  </View>
                );
              }
              const e = item.entry;
              // Scorpanion format fields
              const name    = e.teamName ?? e.team?.displayName ?? e.team?.name ?? `Team ${index}`;
              const abbr    = e.abbr ?? e.team?.abbreviation ?? '';
              const logo    = e.logo ?? e.team?.logos?.[0]?.href;
              const wins    = getStat(e, ['wins', 'W', 'w']);
              const losses  = getStat(e, ['losses', 'L', 'l']);
              const pct     = getStat(e, ['winPct', 'winPercent', 'PCT', 'pct']);
              const gb      = getStat(e, ['gamesBehind', 'GB', 'gb']);
              const pctNum  = parseFloat(pct);
              const pctStr  = isNaN(pctNum)
                ? pct
                : pct.includes('.') ? pct : pctNum.toFixed(3).replace(/^0/, '');
              const isSeattle = isSeattleTeam(name, abbr);

              return (
                <View style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  isSeattle && { backgroundColor: 'rgba(217,92,23,0.1)' },
                ]}>
                  <View style={[styles.colTeam, styles.teamCell]}>
                    {logo ? (
                      <Image source={{ uri: logo }} style={styles.teamLogo} resizeMode="contain" />
                    ) : (
                      <View style={styles.teamLogoFallback}>
                        <Text style={styles.teamLogoText}>{abbr.slice(0, 2)}</Text>
                      </View>
                    )}
                    <Text style={[styles.rowTeam, isSeattle && { color: '#F2E6CF', fontWeight: '700' }]} numberOfLines={1}>{name}</Text>
                  </View>
                  <Text style={[styles.colW, styles.rowStat]}>{wins}</Text>
                  <Text style={[styles.colL, styles.rowStat]}>{losses}</Text>
                  <Text style={[styles.colPct, styles.rowStat]}>{pctStr}</Text>
                  <Text style={[styles.colGb, styles.rowStat]}>{gb}</Text>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: BG },
  pageHeader:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  pageTitle:   { color: '#F2E6CF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  filterBar:   { borderBottomWidth: 1, borderBottomColor: BORDER, maxHeight: 52, flexGrow: 0 },
  filterContent: { paddingHorizontal: 12, paddingRight: 20, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  pill:        { minWidth: 58, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, flexShrink: 0 },
  pillActive:  { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText:    { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  pillTextActive: { color: '#fff' },
  seasonCard: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seasonAccent: { width: 4, height: 42, borderRadius: 4, backgroundColor: ACCENT },
  seasonTextBlock: { flex: 1, minWidth: 0 },
  seasonKicker: { color: TEXT_FAINT, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  seasonTitle: { color: TEXT, fontSize: 16, fontWeight: '800', marginTop: 2 },
  seasonDetail: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600', marginTop: 2 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { color: TEXT_FAINT, fontSize: 14 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE3,
    alignItems: 'center',
  },
  divisionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#213858',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  divisionName: { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  rowEven:     { backgroundColor: SURFACE },
  rowOdd:      { backgroundColor: BG },
  colTeam:     { flex: 1 },
  colW:        { width: 32, textAlign: 'center' },
  colL:        { width: 32, textAlign: 'center' },
  colPct:      { width: 50, textAlign: 'center' },
  colGb:       { width: 40, textAlign: 'center' },
  colHeader:   { color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  teamCell:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamLogo:    { width: 24, height: 24 },
  teamLogoFallback: { width: 24, height: 24, borderRadius: 4, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },
  teamLogoText: { color: TEXT_FAINT, fontSize: 9, fontWeight: '700' },
  rowTeam:     { color: TEXT, fontSize: 13, fontWeight: '600', flex: 1 },
  rowStat:     { color: TEXT_MUTED, fontSize: 13 },
});
