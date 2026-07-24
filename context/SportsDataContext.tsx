import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SportsDataContextType {
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  followedTeams: string[];
  toggleFollowTeam: (teamId: string) => void;
  isFollowing: (teamId: string) => boolean;
  activeFilter: string;
  setActiveFilter: (teamId: string) => void;
}

const SportsDataContext = createContext<SportsDataContextType>({
  selectedSport: 'all',
  setSelectedSport: () => {},
  followedTeams: [],
  toggleFollowTeam: () => {},
  isFollowing: () => false,
  activeFilter: 'all',
  setActiveFilter: () => {},
});

export function SportsDataProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSportState] = useState('all');
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);
  const [activeFilter, setActiveFilterState] = useState('all');

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

  const setActiveFilter = (teamId: string) => {
    setActiveFilterState(teamId);
  };

  const toggleFollowTeam = (teamId: string) => {
    setFollowedTeams((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      // If unfollowing the active filter, reset it
      if (!next.includes(activeFilter)) setActiveFilterState('all');
      AsyncStorage.setItem('followedTeams', JSON.stringify(next));
      return next;
    });
  };

  const isFollowing = (teamId: string) => followedTeams.includes(teamId);

  return (
    <SportsDataContext.Provider
      value={{ selectedSport, setSelectedSport, followedTeams, toggleFollowTeam, isFollowing, activeFilter, setActiveFilter }}
    >
      {children}
    </SportsDataContext.Provider>
  );
}

export const useSportsData = () => useContext(SportsDataContext);
