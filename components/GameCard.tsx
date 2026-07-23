import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import {
  SURFACE, SURFACE2, BORDER,
  TEXT, TEXT_FAINT,
  LIVE, WIN, LOSS,
} from '../constants/theme';

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
}

export default function GameCard({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  status,
  period,
  sport: _sport,
  sportLabel,
  gameId: _gameId,
  onPress,
  gameTime,
}: GameCardProps) {
  const lower = (status ?? '').toLowerCase();
  const isLive      = lower === 'live' || lower === 'in progress' ||
                      lower.includes('progress') || lower.includes('inning') ||
                      lower.includes('quarter') || lower.includes('period') || lower.includes('half');
  const isFinal     = lower === 'final' || lower.includes('final');
  const isScheduled = !isLive && !isFinal;

  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;
  const awayNum  = Number(awayScore);
  const homeNum  = Number(homeScore);
  const awayWon  = isFinal && hasScore && awayNum > homeNum;
  const homeWon  = isFinal && hasScore && homeNum > awayNum;

  // Pulsing live dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive, pulse]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        isLive  && styles.cardLive,
        isFinal && styles.cardFinal,
      ]}
    >
      {/* Status row — centered at top */}
      <View style={styles.statusRow}>
        {isLive ? (
          <>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.liveText}>LIVE</Text>
            {(period || status) && (
              <Text style={styles.periodText}>
                {period ? period : status}
              </Text>
            )}
          </>
        ) : isFinal ? (
          <Text style={styles.finalText}>Final</Text>
        ) : (
          <Text style={styles.timeText}>{gameTime ?? 'TBD'}</Text>
        )}
      </View>

      {/* Main row: Away | Score/VS | Home */}
      <View style={styles.matchup}>
        {/* Away team */}
        <TeamBlock
          team={awayTeam}
          won={awayWon}
          lost={isFinal && homeWon}
        />

        {/* Center score or VS */}
        <View style={styles.scoreBlock}>
          {hasScore ? (
            <View style={styles.scoreRow}>
              <Text style={[
                styles.score,
                isFinal && homeWon && styles.scoreDim,
              ]}>
                {awayScore}
              </Text>
              <Text style={styles.scoreSep}>–</Text>
              <Text style={[
                styles.score,
                isFinal && awayWon && styles.scoreDim,
              ]}>
                {homeScore}
              </Text>
            </View>
          ) : (
            <Text style={styles.vs}>vs</Text>
          )}
          {isFinal && <Text style={styles.ftLabel}>FT</Text>}
        </View>

        {/* Home team */}
        <TeamBlock
          team={homeTeam}
          won={homeWon}
          lost={isFinal && awayWon}
        />
      </View>

      {/* Sport label footer */}
      {sportLabel && (
        <Text style={styles.sportLabel}>{sportLabel}</Text>
      )}
    </TouchableOpacity>
  );
}

function TeamBlock({ team, won, lost }: { team: Team; won: boolean; lost: boolean }) {
  return (
    <View style={styles.teamBlock}>
      {team.logo ? (
        <Image
          source={{ uri: team.logo }}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>{team.abbreviation?.slice(0, 3)}</Text>
        </View>
      )}
      <Text
        style={[styles.teamName, lost && styles.teamNameDim]}
        numberOfLines={1}
      >
        {team.name}
      </Text>
      <Text style={styles.teamAbbr}>{team.abbreviation}</Text>
      {won && <View style={styles.winDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardLive: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  cardFinal: {
    opacity: 0.85,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  periodText: {
    color: TEXT_FAINT,
    fontSize: 11,
    fontWeight: '600',
  },
  finalText: {
    color: TEXT_FAINT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeText: {
    color: '#f0f0f8',
    fontSize: 12,
    fontWeight: '600',
  },

  // Matchup layout
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  // Team block
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 52,
    height: 52,
  },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: TEXT_FAINT,
    fontSize: 11,
    fontWeight: '700',
  },
  teamName: {
    color: '#f0f0f8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamNameDim: {
    color: '#3a5070',
  },
  teamAbbr: {
    color: '#3a5070',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  winDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: WIN,
  },

  // Score center
  scoreBlock: {
    width: 90,
    alignItems: 'center',
    gap: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  score: {
    color: '#f0f0f8',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  scoreDim: {
    color: '#3a5070',
  },
  scoreSep: {
    color: '#1e3050',
    fontSize: 20,
    fontWeight: '800',
  },
  vs: {
    color: '#1e3050',
    fontSize: 22,
    fontWeight: '900',
  },
  ftLabel: {
    color: '#3a5070',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Footer
  sportLabel: {
    color: '#2d4a6b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
  },
});
