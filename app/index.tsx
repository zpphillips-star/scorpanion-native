import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import { fetchLiveScores } from '../lib/api';

const SPORTS = ['All', 'MLB', 'NBA', 'NFL', 'NHL', 'MLS', 'WNBA'];

function normalizeGame(game: any) {
  const competitors = game.competitions?.[0]?.competitors || game.competitors || [];
  const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[0];
  const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[1];

  const status =
    game.status?.type?.description ||
    game.status?.description ||
    game.statusText ||
    game.state ||
    'Scheduled';

  const periodNum = game.status?.period;
  const inning = game.status?.inning;
  const period = periodNum
    ? `Period ${periodNum}`
    : inning
    ? `Inning ${inning}`
    : undefined;

  return {
    gameId: game.id || game.gameId,
    sport: game.sport || game.league || '',
    awayTeam: {
      id: away?.team?.id || away?.id || '',
      name:
        away?.team?.shortDisplayName ||
        away?.team?.displayName ||
        away?.team?.name ||
        away?.name ||
        'Away',
      abbreviation: away?.team?.abbreviation || away?.abbreviation || 'AWY',
      logo: away?.team?.logo || away?.logo,
    },
    homeTeam: {
      id: home?.team?.id || home?.id || '',
      name:
        home?.team?.shortDisplayName ||
        home?.team?.displayName ||
        home?.team?.name ||
        home?.name ||
        'Home',
      abbreviation: home?.team?.abbreviation || home?.abbreviation || 'HME',
      logo: home?.team?.logo || home?.logo,
    },
    awayScore: away?.score !== undefined ? away.score : undefined,
    homeScore: home?.score !== undefined ? home.score : undefined,
    status,
    period,
  };
}

export default function ScoresScreen() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSport, setSelectedSport] = useState('All');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const sport = selectedSport === 'All' ? undefined : selectedSport.toLowerCase();
      const data = await fetchLiveScores(sport);
      const rawGames = Array.isArray(data)
        ? data
        : data.games || data.events || data.scoreboard || [];
      setGames(
        rawGames
          .map(normalizeGame)
          .filter((g: any) => g.awayTeam && g.homeTeam)
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSport]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['left', 'right']}>
      {/* Sport filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-zinc-800"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
      >
        {SPORTS.map((sport) => (
          <TouchableOpacity
            key={sport}
            onPress={() => setSelectedSport(sport)}
            className={`mr-2 px-4 py-1.5 rounded-full ${
              selectedSport === sport ? 'bg-blue-600' : 'bg-zinc-800'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selectedSport === sport ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-400 text-center mb-4">{error}</Text>
          <TouchableOpacity onPress={load} className="bg-blue-600 px-6 py-2 rounded-full">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : games.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-500 text-lg">No games today</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.gameId}
          renderItem={({ item }) => <GameCard {...item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}
