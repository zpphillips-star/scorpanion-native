import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSportsData } from '../context/SportsDataContext';
import { fetchTeams } from '../lib/api';

const SPORTS = ['All', 'MLB', 'NBA', 'NFL', 'NHL', 'MLS'];

export default function TeamsScreen() {
  const { toggleFollowTeam, isFollowing } = useSportsData();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [showFollowed, setShowFollowed] = useState(false);

  useEffect(() => {
    setLoading(true);
    const sport = selectedSport === 'All' ? undefined : selectedSport.toLowerCase();
    fetchTeams(sport)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.teams || data.sports || [];
        setTeams(list);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [selectedSport]);

  const displayed = showFollowed ? teams.filter((t) => isFollowing(t.id)) : teams;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['left', 'right']}>
      <View className="flex-row items-center border-b border-zinc-800 pr-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {SPORTS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedSport(s)}
              className={`px-4 py-1.5 rounded-full ${
                selectedSport === s ? 'bg-blue-600' : 'bg-zinc-800'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedSport === s ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => setShowFollowed(!showFollowed)} className="ml-2">
          <Ionicons
            name={showFollowed ? 'heart' : 'heart-outline'}
            size={24}
            color={showFollowed ? '#ef4444' : '#71717a'}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : displayed.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-zinc-500 text-center">
            {showFollowed
              ? 'No followed teams yet. Tap the heart icon on any team to follow.'
              : 'No teams found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id || item.uid || String(Math.random())}
          renderItem={({ item }) => {
            const following = isFollowing(item.id);
            const name =
              item.displayName || item.name || item.shortDisplayName || 'Unknown';
            const logo = item.logos?.[0]?.href || item.logo;
            return (
              <View className="flex-row items-center px-4 py-3 border-b border-zinc-800/50">
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    style={{ width: 36, height: 36, marginRight: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="w-9 h-9 mr-3 rounded-full bg-zinc-800 items-center justify-center">
                    <Text className="text-xs text-zinc-400 font-bold">
                      {item.abbreviation?.slice(0, 3)}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-100">{name}</Text>
                  {item.abbreviation && (
                    <Text className="text-xs text-zinc-500">{item.abbreviation}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleFollowTeam(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={following ? 'heart' : 'heart-outline'}
                    size={22}
                    color={following ? '#ef4444' : '#71717a'}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}
