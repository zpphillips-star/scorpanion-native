import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SportsDataContextType {
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  followedTeams: string[];
  toggleFollowTeam: (teamId: string) => void;
  isFollowing: (teamId: string) => boolean;
}

const SportsDataContext = createContext<SportsDataContextType>({
  selectedSport: 'all',
  setSelectedSport: () => {},
  followedTeams: [],
  toggleFollowTeam: () => {},
  isFollowing: () => false,
});

export function SportsDataProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSportState] = useState('all');
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('followedTeams').then((val) => {
      if (val) setFollowedTeams(JSON.parse(val));
    });
    AsyncStorage.getItem('selectedSport').then((val) => {
      if (val) setSelectedSportState(val);
    });
  }, []);

  const setSelectedSport = (sport: string) => {
    setSelectedSportState(sport);
    AsyncStorage.setItem('selectedSport', sport);
  };

  const toggleFollowTeam = (teamId: string) => {
    setFollowedTeams((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      AsyncStorage.setItem('followedTeams', JSON.stringify(next));
      return next;
    });
  };

  const isFollowing = (teamId: string) => followedTeams.includes(teamId);

  return (
    <SportsDataContext.Provider
      value={{ selectedSport, setSelectedSport, followedTeams, toggleFollowTeam, isFollowing }}
    >
      {children}
    </SportsDataContext.Provider>
  );
}

export const useSportsData = () => useContext(SportsDataContext);
