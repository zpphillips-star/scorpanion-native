import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

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
}

export default function GameCard({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  status,
  period,
  sport,
  gameId,
  onPress,
}: GameCardProps) {
  const lower = status?.toLowerCase() ?? '';
  const isLive =
    lower.includes('progress') ||
    lower.includes('inning') ||
    lower.includes('quarter') ||
    lower.includes('period');
  const isFinal = lower.includes('final');

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 border border-zinc-800 rounded-xl mx-4 mb-3 p-4"
      activeOpacity={0.7}
    >
      {/* Sport badge + status */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {sport}
        </Text>
        <Text
          className={`text-xs font-semibold ${
            isLive ? 'text-green-400' : isFinal ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          {period ? `${period} • ${status}` : status}
        </Text>
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
    </TouchableOpacity>
  );
}
