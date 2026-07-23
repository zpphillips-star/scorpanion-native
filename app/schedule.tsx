import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import { fetchSchedule } from '../lib/api';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function getDayLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDays() {
  const days: Date[] = [];
  for (let i = -3; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function normalizeGame(game: any) {
  const competitors = game.competitions?.[0]?.competitors || game.competitors || [];
  const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[0];
  const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[1];
  const status =
    game.status?.type?.description ||
    game.status?.description ||
    game.statusText ||
    'Scheduled';

  return {
    gameId: game.id || game.gameId,
    sport: game.sport || game.league || '',
    awayTeam: {
      id: away?.team?.id || '',
      name: away?.team?.shortDisplayName || away?.team?.name || 'Away',
      abbreviation: away?.team?.abbreviation || 'AWY',
      logo: away?.team?.logo,
    },
    homeTeam: {
      id: home?.team?.id || '',
      name: home?.team?.shortDisplayName || home?.team?.name || 'Home',
      abbreviation: home?.team?.abbreviation || 'HME',
      logo: home?.team?.logo,
    },
    awayScore: away?.score !== undefined ? away.score : undefined,
    homeScore: home?.score !== undefined ? home.score : undefined,
    status,
  };
}

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const days = getDays();

  const load = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const data = await fetchSchedule(undefined, formatDate(date));
      const rawGames = Array.isArray(data) ? data : data.games || data.events || [];
      setGames(rawGames.map(normalizeGame));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(selectedDay);
  }, [selectedDay, load]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['left', 'right']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-zinc-800"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
      >
        {days.map((d, i) => {
          const isSelected = d.toDateString() === selectedDay.toDateString();
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedDay(d)}
              className={`mr-2 px-3 py-1.5 rounded-full ${
                isSelected ? 'bg-blue-600' : 'bg-zinc-800'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isSelected ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {getDayLabel(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : games.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-500">No games scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item, index) => item.gameId ?? String(index)}
          renderItem={({ item }) => <GameCard {...item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(selectedDay);
              }}
              tintColor="#3b82f6"
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}
