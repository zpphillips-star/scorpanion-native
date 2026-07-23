import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import {
  BG, SURFACE, SURFACE2, BORDER, BORDER_D,
  TEXT, TEXT_MUTED, TEXT_FAINT,
  ACCENT, LIVE, WIN, LOSS, FINAL,
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
  /** Human-readable sport label e.g. "MLB", "NBA" */
  sportLabel?: string;
  gameId: string;
  onPress?: () => void;
  /** Formatted local game time, shown for scheduled games */
  gameTime?: string;
  /** Last ≤5 results for the home team, most recent first */
  formDots?: Array<'W' | 'L' | 'T'>;
}

const DOT_COLORS: Record<'W' | 'L' | 'T', string> = {
  W: WIN,
  L: LOSS,
  T: TEXT_FAINT,
};

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
  formDots,
}: GameCardProps) {
  const lower = status?.toLowerCase() ?? '';
  const isLive =
    lower.includes('progress') ||
    lower.includes('inning') ||
    lower.includes('quarter') ||
    lower.includes('period') ||
    lower.includes('half') ||
    lower === 'live';
  const isFinal    = lower.includes('final');
  const isScheduled = !isLive && !isFinal;

  // Winner detection
  const awayNum = Number(awayScore);
  const homeNum = Number(homeScore);
  const awayWon = isFinal && awayScore !== undefined && awayNum > homeNum;
  const homeWon = isFinal && homeScore !== undefined && homeNum > awayNum;

  // ── Pulsing live dot ────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) { pulseAnim.setValue(1); return; }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isLive, pulseAnim]);

  const statusColor = isLive ? LIVE : isFinal ? FINAL : TEXT_FAINT;
  const displayLabel = sportLabel ?? _sport?.toUpperCase() ?? '';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, isLive && styles.cardLive]} activeOpacity={0.75}>
      {/* Sport badge + status */}
      <View style={styles.topRow}>
        <Text style={styles.sportBadge}>{displayLabel}</Text>
        <View style={styles.statusRow}>
          {isLive && (
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {period ? `${period} · ${status}` : status}
          </Text>
        </View>
      </View>

      {/* Away team */}
      <TeamRow
        team={awayTeam}
        score={awayScore}
        won={awayWon}
        dim={homeWon}
        hasScore={!isScheduled}
      />

      {/* Home team */}
      <TeamRow
        team={homeTeam}
        score={homeScore}
        won={homeWon}
        dim={awayWon}
        hasScore={!isScheduled}
      />

      {/* Game time (scheduled only) */}
      {isScheduled && !!gameTime && (
        <Text style={styles.gameTime}>{gameTime}</Text>
      )}

      {/* W/L form dots */}
      {formDots && formDots.length > 0 && (
        <View style={styles.formDots}>
          {formDots.slice(0, 5).map((r, i) => (
            <View key={i} style={[styles.formDot, { backgroundColor: DOT_COLORS[r] }]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Team row sub-component ────────────────────────────────────────────────────

function TeamRow({
  team,
  score,
  won,
  dim,
  hasScore,
}: {
  team: Team;
  score?: number | string;
  won: boolean;
  dim: boolean;
  hasScore: boolean;
}) {
  const nameColor = dim ? TEXT_FAINT : TEXT;
  const scoreColor = won ? TEXT : dim ? TEXT_FAINT : TEXT_MUTED;

  return (
    <View style={styles.teamRow}>
      <View style={styles.teamLeft}>
        {team.logo ? (
          <Image
            source={{ uri: team.logo }}
            style={styles.teamLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.teamLogoFallback}>
            <Text style={styles.teamLogoText}>{team.abbreviation?.slice(0, 2)}</Text>
          </View>
        )}
        <Text style={[styles.teamName, { color: nameColor }]} numberOfLines={1}>
          {team.name || team.abbreviation}
        </Text>
        {won && <View style={styles.winIndicator} />}
      </View>
      {hasScore && score !== undefined && (
        <Text style={[styles.score, { color: scoreColor, fontWeight: won ? '800' : '600' }]}>
          {score}
        </Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardLive: {
    borderLeftWidth: 2,
    borderLeftColor: LIVE,
    backgroundColor: 'rgba(255,180,0,0.04)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sportBadge: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LIVE,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  teamLogo: {
    width: 26,
    height: 26,
  },
  teamLogoFallback: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  winIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: WIN,
    marginLeft: 4,
  },
  score: {
    fontSize: 20,
    letterSpacing: -0.5,
    minWidth: 28,
    textAlign: 'right',
  },
  gameTime: {
    color: TEXT_FAINT,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  formDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  formDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

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
  gameId: string;
  onPress?: () => void;
  /** Formatted local game time, shown for scheduled games */
  gameTime?: string;
  /** Last ≤5 results for the home team, most recent first */
  formDots?: Array<'W' | 'L' | 'T'>;
}

