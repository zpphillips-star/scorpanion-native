import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineTeam {
  teamId: string; abbr: string; logo: string; homeAway: string;
  score: number; linescores: number[]; record: string; hits?: number; errors?: number;
}
interface TeamStat {
  teamId: string; abbr: string;
  statistics: { name: string; label: string; displayValue: string }[];
}
interface TopScorer   { teamId: string; abbr: string; name: string; pts: string; reb: string; ast: string }
interface TopBatter   { teamId: string; name: string; ab: string; h: string; hr: string; rbi: string }
interface GoalScorer  { teamId: string; name: string; minute: string; type: string }
interface TopFootballer {
  teamId: string; name: string; role: 'QB'|'RUS'|'REC';
  stat1: string; stat2: string; stat3: string; stat4?: string;
}
interface BoxScoreData {
  sportType: string; periodLabels: string[];
  linescores: LineTeam[]; stats: TeamStat[];
  currentPeriod: number | null;
  topScorers: TopScorer[]; topBatters?: TopBatter[];
  topFootballers?: TopFootballer[];
  shotsOnGoal: { teamId: string; abbr: string; value: string }[];
  isShootout: boolean; goalScorers: GoalScorer[];
  pitcherList?: { teamId: string; name: string; ip: string; er: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BG       = '#0c1b31';
const SURFACE2 = '#1a2d4a';
const TEXT     = '#F2E6CF';
const FAINT    = '#5F6773';
const FAINT2   = '#374151';
const BORDER   = '#1e3050';
const WIN_GREEN = '#34d399';
const LOSS_RED  = '#f87171';

const FOOTBALL_STATS    = ['passingYards','rushingYards','totalYards','turnovers'];
const HOCKEY_STATS      = ['goals','powerPlayGoals','penaltyMinutes'];
const BASKETBALL_STATS  = ['fieldGoalsAttempted','threePointFieldGoalsMade','rebounds','assists','turnovers'];
const SOCCER_STATS      = ['shotsOnTarget','shots','fouls','yellowCards'];

function getHighlightStats(sport: string): string[] {
  if (sport === 'football')   return FOOTBALL_STATS;
  if (sport === 'hockey')     return HOCKEY_STATS;
  if (sport === 'basketball') return BASKETBALL_STATS;
  if (sport === 'soccer')     return SOCCER_STATS;
  return [];
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={sh.row}>
      <View style={sh.line} />
      <Text style={sh.label}>{label}</Text>
      <View style={sh.line} />
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  line:  { flex: 1, height: 1, backgroundColor: 'rgba(113,113,122,0.3)' },
  label: { color: FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ─── Period table (shared by football/basketball/hockey) ──────────────────────

function PeriodTable({
  data, seattleTeamId, sport,
}: { data: BoxScoreData; seattleTeamId?: string; sport: string }) {
  const { linescores, periodLabels, currentPeriod } = data;
  return (
    <View style={{ width: '100%' }}>
        {/* Header row */}
        <View style={pt.headerRow}>
          <View style={pt.teamCell} />
          {periodLabels.map((lbl, i) => {
            const isCur = currentPeriod !== null && i === currentPeriod - 1;
            return (
              <Text key={i} style={[pt.hdr, isCur && { color: '#ef4444' }]}>{lbl}</Text>
            );
          })}
          <Text style={[pt.hdr, { color: TEXT, marginLeft: 4 }]}>T</Text>
          {sport === 'hockey' && data.shotsOnGoal.length > 0 && (
            <Text style={pt.hdr}>SOG</Text>
          )}
        </View>

        {/* Team rows */}
        {linescores.map((team) => {
          const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === 'SEA';
          const sogMap: Record<string, string> = {};
          for (const s of data.shotsOnGoal) sogMap[s.teamId] = s.value;
          const isWinner = data.isShootout
            ? data.linescores.reduce((a, b) => a.score > b.score ? a : b)?.teamId === team.teamId
            : false;
          return (
            <View key={team.teamId} style={[pt.row, { borderTopWidth: 1, borderTopColor: BORDER }]}>
              {/* Team label */}
              <View style={[pt.teamCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                {team.logo
                  ? <Image source={{ uri: team.logo }} style={{ width: 18, height: 18, opacity: isSea ? 1 : 0.5 }} resizeMode="contain" />
                  : <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: SURFACE2 }} />
                }
                <Text style={{ color: isSea ? TEXT : FAINT, fontSize: 13, fontWeight: '700' }}>{team.abbr}</Text>
              </View>
              {/* Period scores */}
              {periodLabels.map((lbl, pi) => {
                const val = team.linescores[pi];
                const isCur = currentPeriod !== null && pi === currentPeriod - 1;
                let display = val !== undefined ? String(val) : '–';
                if (sport === 'hockey' && lbl === 'SO' && val !== undefined) {
                  display = isWinner ? '✓' : '–';
                }
                if (sport === 'baseball' && val === undefined && pi >= team.linescores.length && team.homeAway === 'home') {
                  display = 'x';
                }
                // Baseball: active inning = red text only (no bg)
                // Basketball: active quarter = dark bg cell
                const isBaseball = sport === 'baseball';
                const isBball = sport === 'basketball';
                return (
                  <Text key={pi} style={[
                    pt.cell,
                    isBaseball && isCur && { color: '#ef4444' },
                    isBball && isCur && { backgroundColor: '#27272a', borderRadius: 4 },
                    !isBaseball && !isBball && isCur && { backgroundColor: SURFACE2, borderRadius: 4 },
                    { color: isBaseball && isCur ? '#ef4444' : val !== undefined ? (isSea ? TEXT : FAINT) : FAINT2 },
                  ]}>
                    {display}
                  </Text>
                );
              })}
              {/* Total */}
              <Text style={[pt.cell, { color: isSea ? TEXT : FAINT, fontWeight: '800', fontSize: 16, marginLeft: 4 }]}>
                {Math.round(team.score)}
                {sport === 'hockey' && data.isShootout && isWinner ? <Text style={{ fontSize: 10, color: FAINT }}> SO</Text> : null}
              </Text>
              {/* SOG for hockey */}
              {sport === 'hockey' && data.shotsOnGoal.length > 0 && (
                <Text style={[pt.cell, { color: FAINT }]}>{sogMap[team.teamId] ?? '–'}</Text>
              )}
            </View>
          );
        })}
    </View>
  );
}
const pt = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  teamCell:  { width: 72 },
  hdr:       { color: FAINT, fontSize: 11, fontWeight: '700', textAlign: 'center', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  cell:      { fontSize: 14, fontWeight: '600', textAlign: 'center', flex: 1, paddingHorizontal: 2 },
});

// ─── Soccer goal scorers ──────────────────────────────────────────────────────

function SoccerScoreboard({ data }: { data: BoxScoreData }) {
  const { linescores, goalScorers } = data;
  if (linescores.length < 2) return null;

  const homeEntry = linescores.find(t => t.homeAway === 'home') ?? linescores[1];
  const awayEntry = linescores.find(t => t.homeAway === 'away') ?? linescores[0];
  const homeTeamId = homeEntry.teamId;
  const awayAbbr   = awayEntry.abbr;
  const homeAbbr   = homeEntry.abbr;

  const sorted = [...goalScorers].sort((a, b) => {
    const parse = (m: string) => { const [base, extra = '0'] = m.split('+'); return parseInt(base) * 100 + parseInt(extra); };
    return parse(a.minute) - parse(b.minute);
  });

  const suffix = (type: string) => {
    if (/own.?goal/i.test(type)) return ' (OG)';
    if (/penalty/i.test(type)) return ' (P)';
    return '';
  };

  return (
    <>
      <SectionHeader label="Goals" />
      {/* Column headers */}
      <View style={ss.row}>
        <Text style={[ss.teamHdr, { textAlign: 'right' }]}>{awayAbbr}</Text>
        <View style={{ width: 44 }} />
        <Text style={[ss.teamHdr, { textAlign: 'left' }]}>{homeAbbr}</Text>
      </View>
      {goalScorers.length === 0 ? (
        <Text style={{ color: FAINT, textAlign: 'center', fontSize: 12, paddingVertical: 10 }}>No goals recorded</Text>
      ) : (
        <View style={{ gap: 6, marginBottom: 16 }}>
          {sorted.map((s, i) => {
            const isHome = s.teamId === homeTeamId;
            const label  = s.name + suffix(s.type);
            const minDisplay = s.minute + (s.minute.includes('+') ? '' : '') + '′';
            return (
              <View key={i} style={ss.row}>
                <Text style={[ss.scorer, { textAlign: 'right' }]}>{!isHome ? label : ''}</Text>
                <Text style={ss.minute}>{minDisplay}</Text>
                <Text style={[ss.scorer, { textAlign: 'left' }]}>{isHome ? label : ''}</Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}
const ss = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center' },
  teamHdr: { flex: 1, color: FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  scorer:  { flex: 1, color: TEXT, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  minute:  { width: 44, color: FAINT, fontSize: 11, textAlign: 'center' },
});

// ─── Top scorers (basketball) ─────────────────────────────────────────────────

function TopScorersList({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, topScorers } = data;
  if (!topScorers || topScorers.length === 0) return null;

  return (
    <>
      <SectionHeader label="Top Scorers" />
      <View style={{ flexDirection: 'row', gap: 3, justifyContent: 'flex-end', marginBottom: 6 }}>
        {['PTS','REB','AST'].map(h => (
          <Text key={h} style={{ width: 32, color: FAINT, fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</Text>
        ))}
      </View>
      {linescores.map((team, ti) => {
        const scorers = topScorers.filter(s => s.teamId === team.teamId);
        if (!scorers.length) return null;
        const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === 'SEA';
        return (
          <View key={team.teamId} style={ti > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: SURFACE2 } : {}}>
            {scorers.map((s, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                <Text style={{ flex: 1, color: isSea ? TEXT : '#e4e4e7', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{s.name}</Text>
                {[s.pts, s.reb, s.ast].map((v, vi) => (
                  <Text key={vi} style={{ width: 32, color: vi === 0 ? '#e4e4e7' : FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{v}</Text>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

// ─── Top batters (baseball) ───────────────────────────────────────────────────

function TopBattersList({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, topBatters } = data;
  if (!topBatters || topBatters.length === 0) return null;

  return (
    <>
      <SectionHeader label="Top Performers" />
      <View style={{ flexDirection: 'row', gap: 3, justifyContent: 'flex-end', marginBottom: 6 }}>
        {['H','HR','RBI'].map(h => (
          <Text key={h} style={{ width: 32, color: FAINT, fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</Text>
        ))}
      </View>
      {linescores.map((team, ti) => {
        const batters = topBatters.filter(b => b.teamId === team.teamId);
        if (!batters.length) return null;
        const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === 'SEA';
        return (
          <View key={team.teamId} style={ti > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: SURFACE2 } : {}}>
            {batters.map((b, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                <Text style={{ flex: 1, color: isSea ? TEXT : '#e4e4e7', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{b.name}</Text>
                {[b.h, b.hr, b.rbi].map((v, vi) => (
                  <Text key={vi} style={{ width: 32, color: vi === 0 ? '#e4e4e7' : FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{v}</Text>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

// ─── Top footballers ──────────────────────────────────────────────────────────

function TopFootballersList({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, topFootballers = [] } = data;
  if (!topFootballers.length) return null;

  return (
    <>
      <SectionHeader label="Top Performers" />
      {linescores.map((team, ti) => {
        const performers = topFootballers.filter(p => p.teamId === team.teamId);
        if (!performers.length) return null;
        const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === 'SEA';
        return (
          <View key={team.teamId} style={ti > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: SURFACE2 } : {}}>
            {performers.map((p, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 4 }}>
                <Text style={{ width: 28, color: FAINT2, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{p.role}</Text>
                <Text style={{ flex: 1, color: isSea ? TEXT : '#e4e4e7', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
                {p.role === 'QB' ? (
                  <>
                    <Text style={{ width: 40, color: FAINT, fontSize: 11, textAlign: 'center' }}>{p.stat1}</Text>
                    <Text style={{ width: 32, color: '#e4e4e7', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat2}</Text>
                    <Text style={{ width: 24, color: FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat3}</Text>
                    <Text style={{ width: 24, color: FAINT2, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat4 ?? '–'}</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ width: 32, color: FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat1}</Text>
                    <Text style={{ width: 32, color: '#e4e4e7', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat2}</Text>
                    <Text style={{ width: 24, color: FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.stat3}</Text>
                    <View style={{ width: 24 }} />
                  </>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

// ─── Team stats bars ──────────────────────────────────────────────────────────

function TeamStatsSection({ data, color }: { data: BoxScoreData; color: string }) {
  const { sportType, stats } = data;
  if (stats.length < 2) return null;

  const highlightKeys = getHighlightStats(sportType);
  const teamA = stats[0], teamB = stats[1];

  const sharedStats = highlightKeys.filter(k =>
    stats.some(t => t.statistics.some(s => s.name === k || s.label?.toLowerCase().includes(k.toLowerCase())))
  );
  if (sharedStats.length === 0) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <SectionHeader label="Team Stats" />

      {sharedStats.map(key => {
        const sa = teamA.statistics.find(s => s.name === key || s.label?.toLowerCase().includes(key.toLowerCase()));
        const sb = teamB.statistics.find(s => s.name === key || s.label?.toLowerCase().includes(key.toLowerCase()));
        if (!sa && !sb) return null;
        const label = sa?.label ?? sb?.label ?? key;
        const vA = sa?.displayValue ?? '–';
        const vB = sb?.displayValue ?? '–';
        const numA = parseFloat(vA.replace(/[^\d.]/g, '')) || 0;
        const numB = parseFloat(vB.replace(/[^\d.]/g, '')) || 0;
        const total = numA + numB || 1;
        const pctA = numA / total;
        return (
          <View key={key} style={{ paddingVertical: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{vA}</Text>
              <Text style={{ color: FAINT, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
              <Text style={{ color: FAINT, fontSize: 12, fontWeight: '700' }}>{vB}</Text>
            </View>
            <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 3, backgroundColor: color, borderRadius: 2, width: `${pctA * 100}%` }} />
            </View>
          </View>
        );
      })}

      {/* Team name labels at the bottom */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: FAINT2, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {teamA.abbr}
        </Text>
        <Text style={{ color: FAINT2, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {teamB.abbr}
        </Text>
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  league: string;
  seattleTeamId?: string;
  color?: string;
  isStale?: boolean;
}

export default function BoxScore({ eventId, league, seattleTeamId, color = '#D95C17', isStale }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    setLoading(true);
    fetch(`https://scorpanion.com/api/boxscore?eventId=${encodeURIComponent(eventId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: BoxScoreData | null) => {
        if (d && d.linescores && d.linescores.length > 0) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId, league]);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }

  if (!data || data.linescores.length === 0) return null;

  const { sportType } = data;
  const showStats = sportType !== 'football';

  return (
    <View>
      {isStale && (
        <View style={{ backgroundColor: 'rgba(255,180,0,0.08)', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,180,0,0.2)' }}>
          <Text style={{ color: '#FFB400', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>Cached · live data unavailable</Text>
        </View>
      )}
      {sportType === 'soccer' && <SoccerScoreboard data={data} />}
      {['baseball','basketball','hockey','football'].includes(sportType) && (
        <>
          <SectionHeader label={
            sportType === 'baseball'   ? 'Line Score' :
            sportType === 'basketball' ? 'Score by Quarter' :
            sportType === 'hockey'     ? `Score by Period${data.isShootout ? ' (SO)' : ''}` :
            'Score by Quarter'
          } />
          <PeriodTable data={data} seattleTeamId={seattleTeamId} sport={sportType} />
        </>
      )}
      {!['soccer','baseball','basketball','hockey','football'].includes(sportType) && (
        <>
          <SectionHeader label="Score" />
          <PeriodTable data={data} seattleTeamId={seattleTeamId} sport={sportType} />
        </>
      )}

      {sportType === 'basketball' && <TopScorersList data={data} seattleTeamId={seattleTeamId} />}
      {sportType === 'baseball'   && (
        <>
          <TopBattersList data={data} seattleTeamId={seattleTeamId} />
          {data.pitcherList && data.pitcherList.length > 0 && (
            <>
              <SectionHeader label="Pitchers" />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
                {['IP','ER'].map(h => (
                  <Text key={h} style={{ width: 36, color: FAINT, fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase' }}>{h}</Text>
                ))}
              </View>
              {data.linescores.map((team, ti) => {
                const pitchers = data.pitcherList!.filter(p => p.teamId === team.teamId);
                if (!pitchers.length) return null;
                return (
                  <View key={team.teamId} style={ti > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: BORDER } : {}}>
                    {pitchers.map((p, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                        <Text style={{ flex: 1, color: TEXT, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
                        <Text style={{ width: 36, color: FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.ip}</Text>
                        <Text style={{ width: 36, color: FAINT, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{p.er}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
      {sportType === 'hockey' && data.goalScorers && data.goalScorers.length > 0 && (
        <>
          <SectionHeader label="Goals" />
          {data.goalScorers.map((s, i) => {
            const typeAbbr = /power.?play/i.test(s.type) ? 'PP'
              : /short.?handed/i.test(s.type) ? 'SH'
              : /empty/i.test(s.type) ? 'EN'
              : '';
            const timeDisplay = s.minute + (typeAbbr ? ` ${typeAbbr}` : '');
            const team = data.linescores.find(t => t.teamId === s.teamId);
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 }}>
                <Text style={{ width: 48, color: FAINT, fontSize: 11, fontWeight: '700' }}>{timeDisplay}</Text>
                <Text style={{ flex: 1, color: TEXT, fontSize: 13, fontWeight: '600' }}>{s.name}</Text>
                <Text style={{ color: FAINT, fontSize: 11 }}>{team?.abbr ?? ''}</Text>
              </View>
            );
          })}
        </>
      )}
      {sportType === 'football'   && <TopFootballersList data={data} seattleTeamId={seattleTeamId} />}

      {showStats && <TeamStatsSection data={data} color={color} />}
    </View>
  );
}
