import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { SURFACE, BORDER, TEXT_FAINT } from '../constants/theme';

interface Team {
  id?: string;
  name: string;
  abbreviation: string;
  logo?: string;
}

interface GameCardProps {
  awayTeam: Team;
  homeTeam: Team;
  awayScore?: number | string;
  homeScore?: number | string;
  status: string;
  period?: string;
  sport: string;
  sportLabel?: string;
  gameId: string;
  onPress?: () => void;
  gameTime?: string;
  formDots?: Array<'W' | 'L' | 'T'>;
  compact?: boolean; // schedule/upcoming list style
}

export default function GameCard({
  awayTeam, homeTeam, awayScore, homeScore,
  status, period, sport: _sport, sportLabel,
  gameId: _gameId, onPress, gameTime, compact = false,
}: GameCardProps) {
  const lower = (status ?? '').toLowerCase();
  const isLive  = lower === 'live' || lower.includes('progress') || lower.includes('inning') ||
                  lower.includes('quarter') || lower.includes('period') || lower.includes('half');
  const isFinal = lower === 'final' || lower.includes('final');
  const isUp    = !isLive && !isFinal;

  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;
  const awayNum  = Number(awayScore);
  const homeNum  = Number(homeScore);
  const awayWon  = isFinal && hasScore && awayNum > homeNum;
  const homeWon  = isFinal && hasScore && homeNum > awayNum;

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) { pulse.setValue(1); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.15, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [isLive, pulse]);

  // COMPACT MODE — 4-column row (schedule/upcoming)
  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactRow}>
        {/* Status col */}
        <View style={styles.compactStatus}>
          {isLive ? (
            <Text style={styles.liveLabel}>LIVE</Text>
          ) : isFinal ? (
            <Text style={styles.compactStatusText}>Final</Text>
          ) : (
            <Text style={styles.compactStatusText}>{gameTime ?? 'TBD'}</Text>
          )}
          {sportLabel ? <Text style={styles.compactSport}>{sportLabel}</Text> : null}
        </View>
        {/* Away team */}
        <View style={styles.compactAway}>
          {awayTeam.logo
            ? <Image source={{ uri: awayTeam.logo }} style={styles.compactLogo} resizeMode="contain" />
            : <View style={styles.compactLogoFallback}><Text style={styles.compactLogoText}>{awayTeam.abbreviation?.slice(0,3)}</Text></View>
          }
          <Text style={[styles.compactTeamName, isFinal && homeWon && styles.loserText]} numberOfLines={1}>
            {awayTeam.name}
          </Text>
        </View>
        {/* Score */}
        <View style={styles.compactScoreBlock}>
          {hasScore
            ? <Text style={styles.compactScore}>{awayScore}–{homeScore}</Text>
            : <Text style={styles.compactVs}>vs</Text>
          }
        </View>
        {/* Home team */}
        <View style={styles.compactHome}>
          {homeLogo(homeTeam)}
          <Text style={[styles.compactTeamName, isFinal && awayWon && styles.loserText]} numberOfLines={1}>
            {homeTeam.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // FULL MODE — big card matching web app (Away | Score | Home)
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.card, isLive && styles.cardLive, isFinal && styles.cardFinal]}
    >
      {/* Status */}
      <View style={styles.statusRow}>
        {isLive ? (
          <>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
            {period ? <Text style={styles.periodText}>{period}</Text> : null}
          </>
        ) : isFinal ? (
          <Text style={styles.finalLabel}>FINAL</Text>
        ) : (
          <Text style={styles.timeLabel}>{gameTime ?? 'TBD'}</Text>
        )}
      </View>

      {/* Away | Score | Home */}
      <View style={styles.matchup}>
        <TeamCol team={awayTeam} won={awayWon} lost={isFinal && homeWon} />

        <View style={styles.scoreBlock}>
          {hasScore ? (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.score, isFinal && homeWon && styles.scoreLoser]}>{awayScore}</Text>
                <Text style={styles.scoreDash}>–</Text>
                <Text style={[styles.score, isFinal && awayWon && styles.scoreLoser]}>{homeScore}</Text>
              </View>
              {isFinal && <Text style={styles.ftText}>FULL TIME</Text>}
            </>
          ) : (
            <Text style={styles.vs}>vs</Text>
          )}
        </View>

        <TeamCol team={homeTeam} won={homeWon} lost={isFinal && awayWon} />
      </View>

      {/* Sport label */}
      {sportLabel ? <Text style={styles.sportLabel}>{sportLabel}</Text> : null}
    </TouchableOpacity>
  );
}

function homeLogo(team: { logo?: string; abbreviation: string }) {
  return team.logo
    ? <Image source={{ uri: team.logo }} style={styles.compactLogo} resizeMode="contain" />
    : <View style={styles.compactLogoFallback}><Text style={styles.compactLogoText}>{team.abbreviation?.slice(0,3)}</Text></View>;
}

function TeamCol({ team, won, lost }: { team: { logo?: string; name: string; abbreviation: string }; won: boolean; lost: boolean }) {
  return (
    <View style={styles.teamCol}>
      {team.logo
        ? <Image source={{ uri: team.logo }} style={[styles.logo, lost && styles.logoDim]} resizeMode="contain" />
        : <View style={[styles.logoFallback, lost && styles.logoDim]}>
            <Text style={styles.logoFallbackText}>{team.abbreviation?.slice(0,3)}</Text>
          </View>
      }
      <Text style={[styles.teamName, lost && styles.loserText]} numberOfLines={1}>{team.name}</Text>
      <Text style={styles.teamAbbr}>{team.abbreviation}</Text>
    </View>
  );
}

const LOSER_COLOR = 'rgb(63,79,98)';

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  cardLive:  { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardFinal: { opacity: 0.88 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 10 },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveLabel: { color: '#f87171', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  periodText:{ color: TEXT_FAINT, fontSize: 11, fontWeight: '600' },
  finalLabel:{ color: TEXT_FAINT, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  timeLabel: { color: '#f0f0f8', fontSize: 12, fontWeight: '600' },

  matchup: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },

  teamCol: { flex: 1, alignItems: 'center', gap: 6 },
  logo:    { width: 52, height: 52 },
  logoDim: { opacity: 0.35 },
  logoFallback: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: TEXT_FAINT, fontSize: 11, fontWeight: '700' },
  teamName: { color: '#F2E6CF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  teamAbbr: { color: LOSER_COLOR, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -4 },

  scoreBlock: { width: 96, alignItems: 'center', gap: 2 },
  scoreRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  score:      { color: '#F2E6CF', fontSize: 62, fontWeight: '900', letterSpacing: -1, lineHeight: 66 },
  scoreLoser: { color: LOSER_COLOR },
  scoreDash:  { color: '#1e3050', fontSize: 28, fontWeight: '900', marginHorizontal: 2 },
  ftText:     { color: TEXT_FAINT, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  vs:         { color: '#1e3050', fontSize: 22, fontWeight: '900' },
  loserText:  { color: LOSER_COLOR },

  sportLabel: { color: '#2d4a6b', fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center', marginTop: 10 },

  // ── Compact row ────────────────────────────────────────────────────────────
  compactRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  compactStatus:    { width: 72, flexShrink: 0, gap: 2 },
  compactStatusText:{ color: TEXT_FAINT, fontSize: 11, fontWeight: '600' },
  compactSport:     { color: '#2d4a6b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  compactAway:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  compactHome:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactLogo:      { width: 20, height: 20 },
  compactLogoFallback: { width: 20, height: 20, borderRadius: 3, backgroundColor: '#1a2d4a', alignItems: 'center', justifyContent: 'center' },
  compactLogoText:  { color: TEXT_FAINT, fontSize: 7, fontWeight: '700' },
  compactTeamName:  { color: '#F2E6CF', fontSize: 13, fontWeight: '600', flex: 1 },
  compactScoreBlock:{ width: 56, alignItems: 'center' },
  compactScore:     { color: '#F2E6CF', fontSize: 13, fontWeight: '700' },
  compactVs:        { color: TEXT_FAINT, fontSize: 12, fontWeight: '600' },
});
