import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface CompactBaseballLineScoreProps {
  gameId: string;
  awayAbbr: string;
  homeAbbr: string;
  awayLogo?: string;
  homeLogo?: string;
}

export default function CompactBaseballLineScore({
  gameId, awayAbbr, homeAbbr,
}: CompactBaseballLineScoreProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Strip any non-numeric prefix (e.g. "mlb-401234567" → "401234567")
    const id = (gameId ?? '').replace(/^[^0-9]*/, '');
    if (!id) { setLoading(false); return; }
    fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`)
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [gameId]);

  if (loading) return <ActivityIndicator size="small" color="#5F6773" style={{ marginVertical: 4 }} />;
  if (error || !data) return null;

  const teams: any[] = data?.boxscore?.teams ?? [];
  const away = teams.find((t: any) => t.homeAway === 'away') ?? teams[0];
  const home = teams.find((t: any) => t.homeAway === 'home') ?? teams[1];
  if (!away || !home) return null;

  const awayLines: number[] = away.linescores?.map((l: any) => l.value) ?? [];
  const homeLines: number[] = home.linescores?.map((l: any) => l.value) ?? [];
  const innings = Math.max(awayLines.length, homeLines.length, 9);
  const inningNums = Array.from({ length: innings }, (_, i) => i + 1);

  const awayR = away.statistics?.find((s: any) => s.name === 'runs')?.displayValue ?? String(awayLines.reduce((a: number, b: number) => a + b, 0));
  const homeR = home.statistics?.find((s: any) => s.name === 'runs')?.displayValue ?? String(homeLines.reduce((a: number, b: number) => a + b, 0));
  const awayH = away.statistics?.find((s: any) => s.name === 'hits')?.displayValue ?? '-';
  const homeH = home.statistics?.find((s: any) => s.name === 'hits')?.displayValue ?? '-';
  const awayE = away.statistics?.find((s: any) => s.name === 'errors')?.displayValue ?? '-';
  const homeE = home.statistics?.find((s: any) => s.name === 'errors')?.displayValue ?? '-';

  const currentInning: number | null = data?.header?.competitions?.[0]?.status?.period ?? null;

  return (
    <View style={ls.container}>
      {/* Header row */}
      <View style={ls.row}>
        <Text style={[ls.cell, ls.teamCell]} />
        {inningNums.map(n => (
          <Text key={n} style={[ls.cell, ls.inningHeader, currentInning === n && ls.activeInning]}>{n}</Text>
        ))}
        <Text style={[ls.cell, ls.totHeader]}>R</Text>
        <Text style={[ls.cell, ls.totHeader]}>H</Text>
        <Text style={[ls.cell, ls.totHeader]}>E</Text>
      </View>
      {/* Away row */}
      <View style={ls.row}>
        <Text style={[ls.cell, ls.teamCell, ls.teamAbbr]}>{awayAbbr}</Text>
        {inningNums.map(n => {
          const val = awayLines[n - 1];
          return (
            <Text key={n} style={[ls.cell, ls.score, currentInning === n && ls.activeInning]}>
              {val != null ? val : '-'}
            </Text>
          );
        })}
        <Text style={[ls.cell, ls.tot]}>{awayR}</Text>
        <Text style={[ls.cell, ls.tot]}>{awayH}</Text>
        <Text style={[ls.cell, ls.tot]}>{awayE}</Text>
      </View>
      {/* Home row */}
      <View style={ls.row}>
        <Text style={[ls.cell, ls.teamCell, ls.teamAbbr]}>{homeAbbr}</Text>
        {inningNums.map(n => {
          const val = homeLines[n - 1];
          return (
            <Text key={n} style={[ls.cell, ls.score, currentInning === n && ls.activeInning]}>
              {val != null ? val : '-'}
            </Text>
          );
        })}
        <Text style={[ls.cell, ls.tot]}>{homeR}</Text>
        <Text style={[ls.cell, ls.tot]}>{homeH}</Text>
        <Text style={[ls.cell, ls.tot]}>{homeE}</Text>
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  container: { marginTop: 6, marginHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { width: 20, textAlign: 'center', fontSize: 10, color: '#5F6773' },
  teamCell: { width: 32, textAlign: 'left' },
  teamAbbr: { color: '#F2E6CF', fontWeight: '700', fontSize: 10 },
  inningHeader: { color: '#374151', fontWeight: '600' },
  activeInning: { color: '#ef4444' },
  score: { color: '#F2E6CF' },
  totHeader: { width: 22, color: '#374151', fontWeight: '700', textAlign: 'center', fontSize: 10 },
  tot: { width: 22, color: '#F2E6CF', fontWeight: '700', textAlign: 'center', fontSize: 10 },
});
