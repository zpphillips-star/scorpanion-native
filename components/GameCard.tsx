import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';

interface Team {
  id: string;
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

const DOT_COLORS: Record<'W' | 'L' | 'T', string> = {
  W: '#4ade80',
  L: '#f87171',
  T: '#71717a',
};

export default function GameCard({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  status,
  period,
  sport,
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
    lower.includes('live');
  const isFinal = lower.includes('final');
  const isScheduled = !isLive && !isFinal;

  // ── Pulsing green dot animation ──────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isLive, pulseAnim]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 border border-zinc-800 rounded-xl mx-4 mb-3 p-4"
      activeOpacity={0.7}
    >
      {/* Sport badge + live indicator + status */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {sport}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {isLive && (
            <Animated.View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: '#4ade80',
                opacity: pulseAnim,
              }}
            />
          )}
          <Text
            className={`text-xs font-semibold ${
              isLive ? 'text-green-400' : isFinal ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {period ? `${period} • ${status}` : status}
          </Text>
        </View>
      </View>

      {/* Away team row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {awayTeam.logo ? (
            <Image
              source={{ uri: awayTeam.logo }}
              style={{ width: 28, height: 28, marginRight: 12 }}
              resizeMode="contain"
            />
          ) : (
            <View className="w-7 h-7 mr-3 rounded bg-zinc-700 items-center justify-center">
              <Text className="text-xs text-zinc-400 font-bold">
                {awayTeam.abbreviation?.slice(0, 2)}
              </Text>
            </View>
          )}
          <Text className="text-base font-semibold text-zinc-100">
            {awayTeam.name || awayTeam.abbreviation}
          </Text>
        </View>
        {awayScore !== undefined && (
          <Text
            className={`text-xl font-bold ${
              isFinal || isLive ? 'text-zinc-100' : 'text-zinc-500'
            }`}
          >
            {awayScore}
          </Text>
        )}
      </View>

      {/* Home team row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {homeTeam.logo ? (
            <Image
              source={{ uri: homeTeam.logo }}
              style={{ width: 28, height: 28, marginRight: 12 }}
              resizeMode="contain"
            />
          ) : (
            <View className="w-7 h-7 mr-3 rounded bg-zinc-700 items-center justify-center">
              <Text className="text-xs text-zinc-400 font-bold">
                {homeTeam.abbreviation?.slice(0, 2)}
              </Text>
            </View>
          )}
          <Text className="text-base font-semibold text-zinc-100">
            {homeTeam.name || homeTeam.abbreviation}
          </Text>
        </View>
        {homeScore !== undefined && (
          <Text
            className={`text-xl font-bold ${
              isFinal || isLive ? 'text-zinc-100' : 'text-zinc-500'
            }`}
          >
            {homeScore}
          </Text>
        )}
      </View>

      {/* Game time (scheduled only) */}
      {isScheduled && !!gameTime && (
        <Text
          className="text-xs text-zinc-500 text-center mt-3"
          style={{ letterSpacing: 0.3 }}
        >
          {gameTime}
        </Text>
      )}

      {/* W/L form dots (most recent on left) */}
      {formDots && formDots.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          {formDots.slice(0, 5).map((result, i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: DOT_COLORS[result],
              }}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
