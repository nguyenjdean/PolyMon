'use client';

import { useState, useEffect } from 'react';

export interface ModeStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesGivenUp: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // Array of 20 integers representing win counts at each guess amount
  lastPlayedDate: string; // ISO string 'YYYY-MM-DD'
}

export interface Stats {
  circles: ModeStats;
  rectangles: ModeStats;
  triangles: ModeStats;
  lines: ModeStats;
}

export interface Settings {
  colorblindMode: boolean;
}

export interface GameProgress {
  guesses: number;
  isGivenUp: boolean;
  result: any | null;
  unlockedHints: string[];
}

export interface DailyProgress {
  date: string;
  circles: GameProgress | null;
  rectangles: GameProgress | null;
  triangles: GameProgress | null;
  lines: GameProgress | null;
}

const DEFAULT_MODE_STATS: ModeStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesGivenUp: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: Array(20).fill(0),
  lastPlayedDate: ''
};

const DEFAULT_STATS: Stats = {
  circles: { ...DEFAULT_MODE_STATS },
  rectangles: { ...DEFAULT_MODE_STATS },
  triangles: { ...DEFAULT_MODE_STATS },
  lines: { ...DEFAULT_MODE_STATS }
};

const DEFAULT_SETTINGS: Settings = {
  colorblindMode: false
};

const DEFAULT_DAILY_PROGRESS: DailyProgress = {
  date: '',
  circles: null,
  rectangles: null,
  triangles: null,
  lines: null
};

export function useStore() {
  const [stats, setStatsState] = useState<Stats>(DEFAULT_STATS);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [dailyProgress, setDailyProgressState] = useState<DailyProgress>(DEFAULT_DAILY_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const savedStats = localStorage.getItem('pokeShapesStats_v3');
    const savedSettings = localStorage.getItem('pokeShapesSettings_v3');
    
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        // Ensure guessDistribution array exists and has length 20 for all modes
        const modes = ['circles', 'rectangles', 'triangles', 'lines'];
        modes.forEach((mode) => {
          if (parsed[mode] && (!parsed[mode].guessDistribution || parsed[mode].guessDistribution.length !== 20)) {
             parsed[mode].guessDistribution = Array(20).fill(0);
          }
        });
        setStatsState({ ...DEFAULT_STATS, ...parsed });
      } catch (e) {
        console.error('Failed to parse stats');
      }
    }
    
    if (savedSettings) {
      try {
        setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse settings');
      }
    }

    const savedProgress = localStorage.getItem('pokeShapesProgress_v3');
    if (savedProgress) {
      try {
        setDailyProgressState({ ...DEFAULT_DAILY_PROGRESS, ...JSON.parse(savedProgress) });
      } catch (e) {
        console.error('Failed to parse progress');
      }
    }
    
    setIsLoaded(true);
  }, []);

  const setStats = (newStats: Partial<Stats> | ((prev: Stats) => Stats)) => {
    setStatsState((prev) => {
      const updated = typeof newStats === 'function' ? newStats(prev) : { ...prev, ...newStats };
      localStorage.setItem('pokeShapesStats_v3', JSON.stringify(updated));
      return updated;
    });
  };

  const setSettings = (newSettings: Partial<Settings> | ((prev: Settings) => Settings)) => {
    setSettingsState((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings };
      localStorage.setItem('pokeShapesSettings_v3', JSON.stringify(updated));
      return updated;
    });
  };

  const setDailyProgress = (newProgress: Partial<DailyProgress> | ((prev: DailyProgress) => DailyProgress)) => {
    setDailyProgressState((prev) => {
      const updated = typeof newProgress === 'function' ? newProgress(prev) : { ...prev, ...newProgress };
      localStorage.setItem('pokeShapesProgress_v3', JSON.stringify(updated));
      return updated;
    });
  };

  const resetData = () => {
    setStatsState(DEFAULT_STATS);
    setSettingsState(DEFAULT_SETTINGS);
    setDailyProgressState(DEFAULT_DAILY_PROGRESS);
    localStorage.removeItem('pokeShapesStats_v3');
    localStorage.removeItem('pokeShapesSettings_v3');
    localStorage.removeItem('pokeShapesProgress_v3');
  };
  
  const importData = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.stats) setStats(data.stats);
        if (data.settings) setSettings(data.settings);
        return true;
    } catch(e) {
        return false;
    }
  };
  
  const exportData = (): string => {
      return JSON.stringify({ stats, settings });
  };

  return { 
    stats, 
    settings,
    dailyProgress,
    setStats, 
    setSettings,
    setDailyProgress,
    isLoaded, 
    resetData,
    importData,
    exportData
  };
}
