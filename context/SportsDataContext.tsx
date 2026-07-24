import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

  const setSelectedSport = useCallback((sport: string) => {
    setSelectedSportState(sport);
    AsyncStorage.setItem('selectedSport', sport);
  }, []);

  const setActiveFilter = useCallback((teamId: string) => {
    setActiveFilterState(teamId);
  }, []);

  const toggleFollowTeam = useCallback((teamId: string) => {
    setFollowedTeams((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      // If unfollowing the active filter, reset it
      if (!next.includes(activeFilter)) setActiveFilterState('all');
      AsyncStorage.setItem('followedTeams', JSON.stringify(next));
      return next;
    });
  }, [activeFilter]);

  const isFollowing = useCallback((teamId: string) => followedTeams.includes(teamId), [followedTeams]);

  // Memoize context value so consumers only re-render when relevant state changes.
  const contextValue = useMemo(
    () => ({ selectedSport, setSelectedSport, followedTeams, toggleFollowTeam, isFollowing, activeFilter, setActiveFilter }),
    [selectedSport, setSelectedSport, followedTeams, toggleFollowTeam, isFollowing, activeFilter, setActiveFilter]
  );

  return (
    <SportsDataContext.Provider value={contextValue}>
      {children}
    </SportsDataContext.Provider>
  );
}

export const useSportsData = () => useContext(SportsDataContext);
