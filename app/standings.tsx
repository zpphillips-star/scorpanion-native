import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchStandings } from '../lib/api';

const LEAGUES = [
  { label: 'MLB', sport: 'baseball', league: 'mlb' },
  { label: 'NBA', sport: 'basketball', league: 'nba' },
  { label: 'NFL', sport: 'football', league: 'nfl' },
  { label: 'NHL', sport: 'hockey', league: 'nhl' },
  { label: 'MLS', sport: 'soccer', league: 'mls' },
];

export default function StandingsScreen() {
  const [selected, setSelected] = useState(LEAGUES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStandings(selected.sport, selected.league)
      .then((res) => {
        const entries = res?.standings || res?.groups || res?.children || res || [];
        const flat: any[] = [];
        const flatten = (arr: any[]) =>
          arr.forEach((item) => {
            if (item.standings?.entries) flat.push(...item.standings.entries);
            else if (item.entries) flat.push(...item.entries);
            else if (item.children) flatten(item.children);
            else flat.push(item);
          });
        flatten(Array.isArray(entries) ? entries : [entries]);
        setData(flat);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['left', 'right']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-zinc-800"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
      >
        {LEAGUES.map((l) => (
          <TouchableOpacity
            key={l.label}
            onPress={() => setSelected(l)}
            className={`mr-2 px-4 py-1.5 rounded-full ${
              selected.label === l.label ? 'bg-blue-600' : 'bg-zinc-800'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selected.label === l.label ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-500">No standings available</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={() => (
            <View className="flex-row px-4 py-2 border-b border-zinc-800">
              <Text className="flex-1 text-xs font-semibold text-zinc-500 uppercase">Team</Text>
              <Text className="w-8 text-xs font-semibold text-zinc-500 uppercase text-center">W</Text>
              <Text className="w-8 text-xs font-semibold text-zinc-500 uppercase text-center">L</Text>
              <Text className="w-12 text-xs font-semibold text-zinc-500 uppercase text-center">PCT</Text>
              <Text className="w-12 text-xs font-semibold text-zinc-500 uppercase text-center">GB</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const teamName =
              item.team?.displayName || item.team?.name || item.name || `Team ${index + 1}`;
            const stats = item.stats || [];
            const getStat = (name: string) =>
              stats.find(
                (s: any) => s.name === name || s.abbreviation === name
              )?.displayValue || '-';
            return (
              <View
                className={`flex-row px-4 py-3 ${
                  index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'
                }`}
              >
                <View className="flex-1 flex-row items-center">
                  <Text className="text-xs text-zinc-500 w-6">{index + 1}</Text>
                  <Text className="text-sm font-medium text-zinc-100" numberOfLines={1}>
                    {teamName}
                  </Text>
                </View>
                <Text className="w-8 text-sm text-zinc-300 text-center">
                  {getStat('wins') || getStat('W')}
                </Text>
                <Text className="w-8 text-sm text-zinc-300 text-center">
                  {getStat('losses') || getStat('L')}
                </Text>
                <Text className="w-12 text-sm text-zinc-300 text-center">
                  {getStat('winPercent') || getStat('PCT')}
                </Text>
                <Text className="w-12 text-sm text-zinc-300 text-center">
                  {getStat('gamesBehind') || getStat('GB')}
                </Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}
