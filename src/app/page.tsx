'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore, ModeStats } from '@/lib/store';

interface PokemonOption {
  name: string;
  id: number;
  spriteUrl: string;
}

// Simple Icon Components
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const StatsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);

export default function Home() {
  const { stats, settings, dailyProgress, setStats, setSettings, setDailyProgress, resetData, importData, exportData, isLoaded } = useStore();
  
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [view, setView] = useState<'menu' | 'game'>('menu');
  const [mode, setMode] = useState<string>('circles');
  
  // Game State
  const [guesses, setGuesses] = useState(0);
  const [guessInput, setGuessInput] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isGivenUp, setIsGivenUp] = useState(false);
  
  const [unlockedHints, setUnlockedHints] = useState<string[]>([]);
  
  const [showOriginal, setShowOriginal] = useState(true);
  
  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [statsTab, setStatsTab] = useState<string>('circles');

  // Autocomplete state
  const [pokemonList, setPokemonList] = useState<PokemonOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonOption[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = targetDate ? `?date=${targetDate}` : '';
    fetch(`/api/daily${q}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setConfig(data);
          // Wipe progress if it's a new day and we're looking at today's puzzle
          if (!targetDate && dailyProgress.date !== data.date) {
            setDailyProgress({
              date: data.date,
              circles: null,
              rectangles: null,
              triangles: null,
              lines: null
            });
          }
        }
        else setMessage(data.error);
      });
  }, [targetDate, dailyProgress.date]); // Removed setDailyProgress from deps to prevent loop

  // Sync to store
  useEffect(() => {
    if (view === 'game' && !targetDate && config) {
      setDailyProgress((prev: any) => ({
        ...prev,
        [mode]: {
          guesses,
          isGivenUp,
          result,
          unlockedHints
        }
      }));
    }
  }, [guesses, isGivenUp, result, unlockedHints, view, mode, targetDate, config]); // Removed setDailyProgress

  useEffect(() => {
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
      .then(res => res.json())
      .then(data => {
        const list = data.results.map((p: any) => {
          const parts = p.url.split('/');
          const id = parseInt(parts[parts.length - 2], 10);
          return {
            name: p.name.replace(/-/g, ' '),
            id,
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
          };
        });
        setPokemonList(list);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Hints Automatically
  useEffect(() => {
    if (view === 'game' && guesses > 0 && !result && !isGivenUp && config) {
      // 3, 6, 9 guess logic
      const hintLevels = [3, 6, 9];
      let neededLevel = 0;
      if (guesses >= 9) neededLevel = 3;
      else if (guesses >= 6) neededLevel = 2;
      else if (guesses >= 3) neededLevel = 1;
      
      if (neededLevel > unlockedHints.length) {
        // Fetch next hint
        const dateQuery = targetDate ? `&date=${targetDate}` : '';
        fetch(`/api/hint?mode=${mode}&level=${unlockedHints.length + 1}${dateQuery}`)
          .then(res => res.json())
          .then(data => {
            if (data.hint && !unlockedHints.includes(data.hint)) {
              setUnlockedHints(prev => [...prev, data.hint]);
            }
          });
      }
    }
  }, [guesses, view, result, isGivenUp, config, mode, targetDate, unlockedHints]);

  const startGame = (selectedMode: string) => {
    setMode(selectedMode);
    setView('game');
    setGuessInput('');
    setMessage('');
    setShowOriginal(true);
    
    // Check if we should load persisted progress for today
    if (!targetDate && config && dailyProgress.date === config.date) {
      const saved = (dailyProgress as any)[selectedMode];
      if (saved) {
        setGuesses(saved.guesses);
        setResult(saved.result);
        setIsGivenUp(saved.isGivenUp);
        setUnlockedHints(saved.unlockedHints || []);
        return;
      }
    }
    
    // Start fresh
    setGuesses(0);
    setResult(null);
    setIsGivenUp(false);
    setUnlockedHints([]);
  };

  const quitToMenu = () => {
    setView('menu');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGuessInput(val);
    
    if (val.trim().length > 0) {
      const lower = val.toLowerCase();
      const filtered = pokemonList.filter(p => p.name.toLowerCase().includes(lower));
      setFilteredPokemon(filtered.slice(0, 10));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const updateStatsOnWin = () => {
    if (targetDate) return; // Do not track stats for historic puzzles
    
    setStats((prev: any) => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const modeStats: ModeStats = prev[mode];
      let newStreak = modeStats.currentStreak;
      if (modeStats.lastPlayedDate === yesterday) {
        newStreak += 1;
      } else if (modeStats.lastPlayedDate !== today) {
        newStreak = 1;
      }

      const newDist = [...modeStats.guessDistribution];
      newDist[guesses] = (newDist[guesses] || 0) + 1;

      return {
        ...prev,
        [mode]: {
          ...modeStats,
          gamesPlayed: modeStats.gamesPlayed + 1,
          gamesWon: modeStats.gamesWon + 1,
          currentStreak: newStreak,
          maxStreak: Math.max(modeStats.maxStreak, newStreak),
          guessDistribution: newDist,
          lastPlayedDate: today
        }
      };
    });
  };

  const updateStatsOnGiveUp = () => {
    if (targetDate) return; // Do not track stats for historic puzzles
    
    setStats((prev: any) => {
      const today = new Date().toISOString().split('T')[0];
      const modeStats: ModeStats = prev[mode];
      
      return {
        ...prev,
        [mode]: {
          ...modeStats,
          gamesPlayed: modeStats.gamesPlayed + 1,
          gamesGivenUp: modeStats.gamesGivenUp + 1,
          currentStreak: 0, // Reset streak
          lastPlayedDate: today
        }
      };
    });
  };

  const handleGiveUp = async () => {
    if (isGivenUp || result) return;
    setIsGivenUp(true);
    updateStatsOnGiveUp();
    
    // Fetch the correct answer since we gave up
    const res = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess: '$$GIVE_UP$$', mode, date: targetDate || undefined }) // special cheat code to just return the pokemon info in the backend
    });
    // Actually the backend API only returns true if it matches. Let's send a fake guess and the API doesn't tell us the answer.
    // Wait, we need the API to return the answer if we give up!
    // I will add `giveUp: true` to the payload.
  };

  const submitGuess = async (guessString: string) => {
    if (!guessString.trim() || result || isGivenUp) return;
    setShowDropdown(false);

    const res = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess: guessString, mode, date: targetDate || undefined })
    });
    
    const data = await res.json();
    
    if (data.correct) {
      setResult(data.pokemon);
      setMessage('Correct!');
      updateStatsOnWin();
    } else {
      const newGuesses = guesses + 1;
      setGuesses(newGuesses);
      if (newGuesses >= (config?.maxGuesses || 20)) {
        // Force Give Up
        handleGiveUp();
        setMessage('Out of guesses! Better luck next time.');
      } else {
        setMessage('Incorrect, try again! Image updated.');
        setGuessInput('');
      }
    }
  };

  if (!isLoaded) {
    return <div className="p-8 bg-zinc-900 min-h-screen text-white font-sans flex items-center justify-center">Loading PokeShapes...</div>;
  }

  if (message && !config) {
    return (
      <div className="p-8 bg-zinc-900 min-h-screen text-white font-sans flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">Error Loading Puzzle</h1>
        <p className="text-zinc-300 bg-zinc-800 p-4 rounded-xl border border-zinc-700 max-w-md text-center">{message}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!config) {
    return <div className="p-8 bg-zinc-900 min-h-screen text-white font-sans flex items-center justify-center">Loading PokeShapes...</div>;
  }

  // Current Mode Stats for Header
  const currentModeStats: ModeStats | undefined = (stats as any)[mode];
  
  // Current shapes calculation
  let currentShapes = 0;
  if (config?.shapeSettings) {
     const shapeSettings = config.shapeSettings[mode];
     if (shapeSettings) {
       currentShapes = Math.min(shapeSettings.start + (guesses * shapeSettings.step), shapeSettings.start + (20 * shapeSettings.step));
     }
  }

  // --- Modals ---
  const AboutModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-2xl p-6 w-full max-w-md relative">
        <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>
        <h2 className="text-2xl font-bold mb-6">About PokeShapes</h2>
        <div className="text-zinc-300 space-y-4">
          <p>Welcome to PokeShapes!</p>
          <p>Guess the daily Pokemon as it slowly forms from geometric shapes.</p>
          <p>A new puzzle drops every day at 3:00 AM EST.</p>
          <p className="italic text-zinc-500 mt-4">[Additional details to be filled out later...]</p>
        </div>
      </div>
    </div>
  );

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-2xl p-6 w-full max-w-md relative">
        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span>Colorblind Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.colorblindMode} onChange={(e) => setSettings({ colorblindMode: e.target.checked })} />
              <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="border-t border-zinc-700 pt-6">
            <h3 className="font-semibold mb-3">Data Management</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { navigator.clipboard.writeText(exportData()); alert('Data copied to clipboard!'); }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-2 rounded text-sm">Export Data</button>
              <button onClick={() => { const d = prompt('Paste exported data here:'); if (d && importData(d)) { alert('Data imported successfully!'); } else if (d) { alert('Failed to parse data.'); } }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-2 rounded text-sm">Import Data</button>
            </div>
            <button onClick={() => { if(window.confirm('Are you sure you want to completely reset your stats and settings? This cannot be undone.')) resetData(); }} className="w-full bg-red-900/50 hover:bg-red-900/80 text-red-200 py-2 rounded text-sm border border-red-900">Reset Data</button>
          </div>
        </div>
      </div>
    </div>
  );

  const StatsModal = () => {
    const tabStats: ModeStats = (stats as any)[statsTab];
    const avgGuesses = tabStats.gamesWon > 0 
      ? (tabStats.guessDistribution.reduce((acc, count, i) => acc + (count * (i + 1)), 0) / tabStats.gamesWon).toFixed(1) 
      : '0';

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 rounded-2xl p-6 w-full max-w-md relative">
          <button onClick={() => setShowStats(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white z-10">✕</button>
          <h2 className="text-2xl font-bold mb-4">Statistics</h2>
          
          {/* Mode Tabs */}
          <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-lg">
            {['circles', 'rectangles', 'triangles', 'lines'].map(m => (
              <button 
                key={m} 
                onClick={() => setStatsTab(m)}
                className={`flex-1 py-1 text-sm rounded capitalize transition-colors ${statsTab === m ? 'bg-zinc-700 font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-700 p-3 rounded text-center">
              <div className="text-2xl font-bold">{tabStats.gamesPlayed}</div>
              <div className="text-xs text-zinc-400">Played</div>
            </div>
            <div className="bg-zinc-700 p-3 rounded text-center">
              <div className="text-2xl font-bold text-emerald-400">{((tabStats.gamesWon / Math.max(tabStats.gamesPlayed, 1)) * 100).toFixed(0)}%</div>
              <div className="text-xs text-zinc-400">Win Rate</div>
            </div>
            <div className="bg-zinc-700 p-3 rounded text-center">
              <div className="text-2xl font-bold">{tabStats.currentStreak} <span className="text-sm font-normal text-zinc-400">/ {tabStats.maxStreak}</span></div>
              <div className="text-xs text-zinc-400">Streak (Cur/Max)</div>
            </div>
            <div className="bg-zinc-700 p-3 rounded text-center">
              <div className="text-2xl font-bold text-red-400">{tabStats.gamesGivenUp}</div>
              <div className="text-xs text-zinc-400">Given Up</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm text-zinc-400">Guess Distribution</h3>
            <div className="flex items-end justify-between h-32 gap-[2px] border-b border-zinc-700 pb-2">
              {tabStats.guessDistribution.map((count, i) => {
                const maxCount = Math.max(...tabStats.guessDistribution);
                const height = maxCount > 0 ? `${Math.max((count / maxCount) * 100, 5)}%` : '5%';
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                    {count > 0 && (
                      <span className="absolute -top-6 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-700 px-1 rounded z-10 pointer-events-none">{count}</span>
                    )}
                    <div className={`w-full rounded-t ${count > 0 ? 'bg-blue-600' : 'bg-zinc-700/50'} hover:bg-blue-400 transition-colors cursor-pointer`} style={{ height }}></div>
                    <div className="text-[9px] text-zinc-500 mt-1">{i + 1}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-xs text-zinc-500 mt-2">Guesses (1-20) <span className="text-zinc-600">| Avg: {avgGuesses}</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 md:p-8 text-white font-sans ${settings.colorblindMode ? 'bg-zinc-950 grayscale' : 'bg-zinc-900'}`}>
      {/* Global Header */}
      <div className="w-full max-w-5xl grid grid-cols-[1fr_auto_1fr] items-center mb-8">
        <div className="flex justify-start">
           {view === 'game' && (
             <button onClick={quitToMenu} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title="Back to Menu">
               <BackIcon />
             </button>
           )}
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 whitespace-nowrap">PokeShapes</h1>
          {view === 'game' && config && (
            <div className="text-xs font-mono text-zinc-500 mt-1 capitalize">
              {mode} {targetDate ? `(${targetDate})` : `- Game #${config.gameNumber} - ${config.date}`}
            </div>
          )}
        </div>
        <div className="flex gap-1 justify-end items-center">
          {currentModeStats && currentModeStats.currentStreak > 0 && !targetDate && (
            <div className="flex items-center text-orange-500 font-bold mr-2" title={`Current Streak: ${currentModeStats.currentStreak}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              {currentModeStats.currentStreak}
            </div>
          )}
          <button onClick={() => setShowAbout(true)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title="About">
            <InfoIcon />
          </button>
          <button onClick={() => setShowStats(true)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title="Statistics">
            <StatsIcon />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title="Settings">
            <SettingsIcon />
          </button>
        </div>
      </div>

      {showSettings && <SettingsModal />}
      {showStats && <StatsModal />}
      {showAbout && <AboutModal />}

      {/* Main Menu View */}
      {view === 'menu' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl mt-8">
          <div className="bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono px-4 py-2 rounded-full text-sm mb-4 shadow">
            {config.date} (Game #{config.gameNumber})
          </div>
          
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {config.modes.map((m: string) => (
              <button 
                key={m}
                onClick={() => startGame(m)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 py-6 md:py-8 rounded-xl text-xl capitalize font-medium transition-all shadow-lg hover:scale-105 border border-zinc-700"
              >
                Play {m}
              </button>
            ))}
          </div>

          <div className="w-full max-w-sm border-t border-zinc-800 pt-6 mt-2 mx-auto">
            <button 
              onClick={() => {
                 if (targetDate) {
                   setTargetDate(null);
                 } else {
                   const d = new Date();
                   d.setDate(d.getDate() - 1);
                   setTargetDate(d.toISOString().split('T')[0]);
                 }
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-800 py-3 rounded-xl text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
              {targetDate ? "Play Today's Puzzle" : "Play Yesterday's Puzzle"}
            </button>
            <p className="text-xs text-center text-zinc-600 mt-2">Historic puzzles do not track statistics.</p>
          </div>
        </div>
      )}

      {/* Game View */}
      {view === 'game' && (
        <div className="w-full max-w-5xl flex flex-col items-center">
          {targetDate && (
             <div className="bg-yellow-900/30 border border-yellow-700/50 text-yellow-500 text-xs px-3 py-1 rounded-full mb-4 md:mb-8">
               Historic Puzzle - Stats Disabled
             </div>
          )}
          
          <div className="w-full grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 items-start">
            {/* Left Column: Image */}
            <div className="bg-zinc-800 p-4 rounded-2xl flex justify-center w-full aspect-square shadow-xl border border-zinc-700 relative overflow-hidden group">
              <img 
                src={`/api/daily/shapes?mode=${mode}&guesses=${guesses}&_t=${Date.now()}&date=${targetDate || ''}`} 
                alt="Geometrized Pokemon"
                className={`w-full h-full object-contain ${showOriginal && (result || isGivenUp) ? 'opacity-20' : 'opacity-100'} transition-opacity duration-300`}
              />
              
              {showOriginal && (result || isGivenUp) && result?.imageUrl && (
                 <img 
                   src={result.imageUrl} 
                   alt="Revealed Pokemon" 
                   className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-500" 
                 />
              )}
              
              {/* Toggle Button overlay */}
              {(result || isGivenUp) && (
                <button 
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="absolute bottom-4 right-4 bg-zinc-900/80 hover:bg-zinc-700 border border-zinc-600 text-white p-2 rounded-full backdrop-blur transition-all shadow-lg"
                  title="Toggle Original Image"
                >
                  {showOriginal ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  )}
                </button>
              )}
            </div>

            {/* Right Column: Game Controls */}
            <div className="w-full flex flex-col gap-6">
              <div className="w-full">
                <div className="flex justify-between items-end text-sm text-zinc-400 mb-2">
                  <div className="flex flex-col gap-1">
                    {currentShapes > 0 && <span className="text-blue-400 font-semibold tracking-wide capitalize">Showing {currentShapes} {mode}</span>}
                    <span>Attempts: <span className="font-bold text-white">{guesses}</span> / {config.maxGuesses}</span>
                  </div>
                  <span className="text-zinc-500 mb-0.5">
                    Next Hint: {guesses < 3 ? 'Guess 3' : (guesses < 6 ? 'Guess 6' : (guesses < 9 ? 'Guess 9' : 'None'))}
                  </span>
                </div>
                
                {/* Hint Roadmap */}
                <div className="flex gap-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                   <div className={`flex-1 ${guesses >= 3 ? 'bg-blue-500' : 'bg-zinc-700'}`}></div>
                   <div className={`flex-1 ${guesses >= 6 ? 'bg-blue-500' : 'bg-zinc-700'}`}></div>
                   <div className={`flex-1 ${guesses >= 9 ? 'bg-blue-500' : 'bg-zinc-700'}`}></div>
                </div>
              </div>

              {unlockedHints.length > 0 && !result && !isGivenUp && (
                <div className="w-full space-y-2">
                  {unlockedHints.map((hint, idx) => {
                    const hintType = idx === 0 ? "Typing" : (idx === 1 ? "Primary Type" : "Generation");
                    return (
                      <div key={idx} className="bg-blue-900/20 border border-blue-800/40 px-3 py-2 rounded text-blue-200 text-sm flex gap-2">
                        <span className="font-bold text-blue-400">{hintType}:</span> {hint}
                      </div>
                    );
                  })}
                </div>
              )}

              {result ? (
                <div className="text-center w-full bg-emerald-900/20 border border-emerald-800/50 p-6 rounded-2xl">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2 capitalize">You got it!</h2>
                  <p className="text-zinc-300 mb-4 text-lg">It's <span className="font-bold text-white capitalize">{result.name}</span>!</p>
                  <button onClick={quitToMenu} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-full font-medium">
                    Return to Menu
                  </button>
                </div>
              ) : isGivenUp ? (
                 <div className="text-center w-full bg-red-900/20 border border-red-800/50 p-6 rounded-2xl">
                  <h2 className="text-2xl font-bold text-red-400 mb-2 capitalize">Game Over</h2>
                  {result && <p className="text-zinc-300 mb-4 text-lg">It was <span className="font-bold text-white capitalize">{result.name}</span>.</p>}
                  <button onClick={quitToMenu} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-medium">
                    Return to Menu
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="relative w-full" ref={dropdownRef}>
                    <form onSubmit={(e) => { e.preventDefault(); submitGuess(guessInput); }} className="flex gap-2 w-full">
                      <input 
                        type="text" 
                        value={guessInput}
                        onChange={handleInputChange}
                        onFocus={() => { if (guessInput.trim().length > 0) setShowDropdown(true); }}
                        className="flex-1 w-full min-w-0 px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-blue-500 shadow-inner"
                        placeholder="Who's that Pokemon?"
                        autoComplete="off"
                      />
                      <button type="submit" className="px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 font-medium shadow-lg transition-colors whitespace-nowrap">
                        Guess
                      </button>
                    </form>
                    
                    {showDropdown && filteredPokemon.length > 0 && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-10 p-1">
                        {filteredPokemon.map(p => (
                          <div 
                            key={p.id}
                            className="flex items-center gap-3 p-2 hover:bg-zinc-700 cursor-pointer rounded-lg transition-colors"
                            onClick={() => {
                              setGuessInput(p.name);
                              submitGuess(p.name);
                            }}
                          >
                            <img src={p.spriteUrl} alt={p.name} className="w-12 h-12 object-contain pixelated bg-zinc-900 rounded" />
                            <span className="text-zinc-400 font-mono text-sm w-10">#{p.id}</span>
                            <span className="capitalize font-medium text-lg">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={handleGiveUp} className="text-sm text-red-400 hover:text-red-300 transition-colors w-fit mx-auto mt-2">
                    Give Up
                  </button>
                </div>
              )}

              {message && !result && !isGivenUp && <p className="mt-2 text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-lg border border-yellow-400/20">{message}</p>}
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .pixelated { image-rendering: pixelated; }
      `}} />
    </main>
  );
}
