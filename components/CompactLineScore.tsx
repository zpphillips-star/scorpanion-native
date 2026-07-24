import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface CompactLineScoreProps {
  gameId: string;
  awayAbbr: string;
  homeAbbr: string;
  sport: string; // 'basketball' | 'football' | 'hockey'
  awayLogo?: string;
  homeLogo?: string;
}

function getESPNUrl(gameId: string, sport: string): string {
  const id = (gameId ?? '').replace(/^[^0-9]*/, '');
  const sportMap: Record<string, { sport: string; league: string }> = {
    basketball: { sport: 'basketball', league: 'nba' },
    football:   { sport: 'football',   league: 'nfl' },
    hockey:     { sport: 'hockey',     league: 'nhl' },
  };
  const s = sportMap[sport] ?? { sport, league: sport };
  return `https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${s.league}/summary?event=${id}`;
}

function getPeriodLabel(sport: string, index: number): string {
  if (sport === 'basketball') return index < 4 ? `Q${index + 1}` : 'OT';
  if (sport === 'football')   return index < 4 ? `Q${index + 1}` : 'OT';
  if (sport === 'hockey')     return index < 3 ? `P${index + 1}` : 'OT';
  return `${index + 1}`;
}

export default function CompactLineScore({ gameId, awayAbbr, homeAbbr, sport }: CompactLineScoreProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = (gameId ?? '').replace(/^[^0-9]*/, '');
    if (!id) { setLoading(false); return; }
    fetch(getESPNUrl(gameId, sport))
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gameId, sport]);

  if (loading) return <ActivityIndicator size="small" color="#5F6773" style={{ marginVertical: 4 }} />;
  if (!data) return null;

  const teams: any[] = data?.boxscore?.teams ?? [];
  const away = teams.find((t: any) => t.homeAway === 'away') ?? teams[0];
  const home = teams.find((t: any) => t.homeAway === 'home') ?? teams[1];
  if (!away || !home) return null;

  const awayLines: any[] = away.linescores ?? [];
  const homeLines: any[] = home.linescores ?? [];
  const periods = Math.max(awayLines.length, homeLines.length);
  const currentPeriod: number | null = data?.header?.competitions?.[0]?.status?.period ?? null;

  const awayTotal = away.team?.score ?? awayLines.reduce((a: number, b: any) => a + (b.value ?? 0), 0);
  const homeTotal = home.team?.score ?? homeLines.reduce((a: number, b: any) => a + (b.value ?? 0), 0);

  return (
    <View style={cls.container}>
      <View style={cls.row}>
        <Text style={[cls.cell, cls.teamCell]} />
        {Array.from({ length: periods }, (_, i) => (
          <Text key={i} style={[cls.cell, cls.periodHeader, currentPeriod === i + 1 && cls.active]}>
            {getPeriodLabel(sport, i)}
          </Text>
        ))}
        <Text style={[cls.cell, cls.totHeader]}>T</Text>
      </View>
      <View style={cls.row}>
        <Text style={[cls.cell, cls.teamCell, cls.teamAbbr]}>{awayAbbr}</Text>
        {Array.from({ length: periods }, (_, i) => {
          const val = awayLines[i];
          const score = typeof val === 'object' ? val?.value : val;
          return (
            <Text key={i} style={[cls.cell, cls.score, currentPeriod === i + 1 && cls.active]}>
              {score != null ? score : '-'}
            </Text>
          );
        })}
        <Text style={[cls.cell, cls.tot]}>{awayTotal}</Text>
      </View>
      <View style={cls.row}>
        <Text style={[cls.cell, cls.teamCell, cls.teamAbbr]}>{homeAbbr}</Text>
        {Array.from({ length: periods }, (_, i) => {
          const val = homeLines[i];
          const score = typeof val === 'object' ? val?.value : val;
          return (
            <Text key={i} style={[cls.cell, cls.score, currentPeriod === i + 1 && cls.active]}>
              {score != null ? score : '-'}
            </Text>
          );
        })}
        <Text style={[cls.cell, cls.tot]}>{homeTotal}</Text>
      </View>
    </View>
  );
}

const cls = StyleSheet.create({
  container: { marginTop: 6, marginHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { width: 24, textAlign: 'center', fontSize: 10, color: '#5F6773' },
  teamCell: { width: 32, textAlign: 'left' },
  teamAbbr: { color: '#F2E6CF', fontWeight: '700', fontSize: 10 },
  periodHeader: { color: '#374151', fontWeight: '600' },
  active: { color: '#ef4444' },
  score: { color: '#F2E6CF' },
  totHeader: { width: 28, color: '#374151', fontWeight: '700', textAlign: 'center', fontSize: 10 },
  tot: { width: 28, color: '#F2E6CF', fontWeight: '700', textAlign: 'center', fontSize: 10 },
});
