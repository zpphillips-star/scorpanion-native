import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import GameDetailSheet, { type SheetGame } from '../components/GameDetailSheet';
import TeamDetailSheet from '../components/TeamDetailSheet';
import { fetchLiveScores } from '../lib/api';
import type { SheetTeam } from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORTS = ['All', 'MLB', 'NBA', 'NFL', 'NHL', 'MLS', 'WNBA'];

/** Polling intervals */
const LIVE_POLL_MS = 2_000;
const IDLE_POLL_MS = 30_000;

/** Keywords that indicate a game is currently in progress */
const LIVE_KEYWORDS = ['progress', 'inning', 'quarter', 'period', 'half', 'live'];

function isGameLive(status: string): boolean {
  const lower = status?.toLowerCase() ?? '';
  return LIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

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

  // Game time for scheduled games
  const rawDate = game.date || game.competitions?.[0]?.date;
  let gameTime: string | undefined;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        gameTime = d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      }
    } catch {
      // ignore
    }
  }

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
    gameTime,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScoresScreen() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSport, setSelectedSport] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<SheetGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SheetTeam | null>(null);

  /** Current setInterval handle */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** The delay the current interval was created with – used to detect changes */
  const currentDelayRef = useRef<number>(IDLE_POLL_MS);

  // ── Data loader ─────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
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
      if (!silent) setError(e.message);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedSport]);

  // ── Polling setup ────────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (delay: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      currentDelayRef.current = delay;
      intervalRef.current = setInterval(() => {
        load(true);
      }, delay);
    },
    [load]
  );

  /**
   * When games update, check if the live/idle status changed and
   * restart the interval at the correct rate.
   */
  useEffect(() => {
    const hasLive = games.some((g) => isGameLive(g.status));
    const target = hasLive ? LIVE_POLL_MS : IDLE_POLL_MS;
    if (target !== currentDelayRef.current) {
      startPolling(target);
    }
  }, [games, startPolling]);

  // ── Focus lifecycle ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      startPolling(IDLE_POLL_MS); // games useEffect will escalate to LIVE_POLL_MS if needed

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [load, startPolling])
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
          <TouchableOpacity onPress={() => load()} className="bg-blue-600 px-6 py-2 rounded-full">
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
          keyExtractor={(item, index) => item.gameId ?? String(index)}
          renderItem={({ item }) => (
            <GameCard
              {...item}
              onPress={() => setSelectedGame(item as SheetGame)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        />
      )}

      {/* Game detail bottom sheet */}
      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onTeamPress={(t) => setSelectedTeam(t)}
        />
      )}

      {/* Team detail bottom sheet — rendered above GameDetailSheet */}
      {selectedTeam && (
        <TeamDetailSheet
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </SafeAreaView>
  );
}
