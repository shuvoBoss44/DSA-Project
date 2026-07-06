import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, 
  History, 
  Zap, 
  FileText, 
  Database, 
  Layers, 
  Clock, 
  TrendingUp, 
  Sun, 
  Moon, 
  X, 
  ChevronRight, 
  Maximize2, 
  BarChart2, 
  Flame,
  CheckCircle,
  FileCode
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = window.location.port && (window.location.port === '5173' || window.location.port === '5174' || window.location.port === '5175') 
  ? 'http://localhost:8000/api' 
  : '/api';

export default function App() {
  // Theme and UI States
  const [theme, setTheme] = useState('light');
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  
  // Selected File States for side-panel
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFileLoading, setSelectedFileLoading] = useState(false);
  
  // Benchmark and History States
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [recentQueries, setRecentQueries] = useState(() => {
    const saved = localStorage.getItem('search_history');
    return saved ? JSON.parse(saved) : ['algorithms', 'operating system', 'apple', 'database'];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);

  const autocompleteRef = useRef(null);

  // Initialize Theme and Stats
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    fetchStats();

    // Click outside handler for autocomplete
    const handleOutsideClick = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`);
      if (res.data && res.data.status === 'success') {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Autocomplete prefix query
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        // Autocomplete suggestions are case-insensitive
        const cleanQuery = query.trim().split(' ').pop();
        if (cleanQuery.length >= 2) {
          const res = await axios.get(`${API_BASE}/autocomplete`, {
            params: { prefix: cleanQuery }
          });
          if (res.data && res.data.status === 'success') {
            setSuggestions(res.data.suggestions || []);
          }
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Execute Search
  const handleSearch = async (searchQuery) => {
    const term = searchQuery || query;
    if (!term.trim()) return;

    setLoading(true);
    setSuggestions([]);
    
    // Save to history
    const updatedHistory = [term, ...recentQueries.filter(q => q !== term)].slice(0, 10);
    setRecentQueries(updatedHistory);
    localStorage.setItem('search_history', JSON.stringify(updatedHistory));

    const startTime = performance.now();
    try {
      const res = await axios.get(`${API_BASE}/search`, {
        params: { q: term, caseSensitive }
      });
      const endTime = performance.now();
      setSearchTime((endTime - startTime).toFixed(2));

      if (res.data && res.data.status === 'success') {
        setResults(res.data.results || []);
        
        // Auto-benchmark this query in background to update KPI metrics
        runBackgroundBenchmark(term);
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runBackgroundBenchmark = async (term) => {
    try {
      const res = await axios.get(`${API_BASE}/benchmark`, { params: { q: term } });
      if (res.data && res.data.status === 'success') {
        setBenchmarkResult(res.data);
      }
    } catch (err) {
      console.error('Background benchmark error:', err);
    }
  };

  const triggerBenchmarkModal = async (term) => {
    const q = term || query || 'database';
    setBenchmarking(true);
    setShowBenchmarkModal(true);
    try {
      const res = await axios.get(`${API_BASE}/benchmark`, { params: { q } });
      if (res.data && res.data.status === 'success') {
        setBenchmarkResult(res.data);
      }
    } catch (err) {
      console.error('Modal benchmark error:', err);
    } finally {
      setBenchmarking(false);
    }
  };

  // Fetch full file content
  const handleFileClick = async (fileName) => {
    setSelectedFileName(fileName);
    setSelectedFileLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/file`, { params: { name: fileName } });
      if (res.data && res.data.status === 'success') {
        setSelectedFileContent(res.data);
      }
    } catch (err) {
      console.error('File load error:', err);
      setSelectedFileContent(null);
    } finally {
      setSelectedFileLoading(false);
    }
  };

  // Helper to highlight terms
  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    const parts = highlight.trim().split(/\s+/);
    // Escape regex chars
    const pattern = parts.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, caseSensitive ? 'g' : 'gi');
    const splitText = text.split(regex);
    
    return (
      <span>
        {splitText.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="search-highlight">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Calculate maximum score for sparkline scaling
  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.tfidfScore || 0)) : 1;

  // Chart config for ECharts
  const getChartOptions = () => {
    if (!benchmarkResult) return {};
    const isDark = theme === 'dark';
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
        textStyle: { color: isDark ? '#fafafa' : '#09090b' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Time (ms)',
        nameTextStyle: { color: isDark ? '#a1a1aa' : '#71717a' },
        splitLine: { lineStyle: { color: isDark ? '#27272a' : '#e4e4e7' } },
        axisLabel: { color: isDark ? '#a1a1aa' : '#71717a' }
      },
      yAxis: {
        type: 'category',
        data: ['Linear Search', 'Index Search'],
        axisLabel: { color: isDark ? '#a1a1aa' : '#71717a' }
      },
      series: [
        {
          name: 'Search Duration',
          type: 'bar',
          data: [
            {
              value: benchmarkResult.linearTimeMs.toFixed(4),
              itemStyle: { color: '#ef4444' }
            },
            {
              value: benchmarkResult.indexTimeMs.toFixed(4),
              itemStyle: { color: '#10b981' }
            }
          ],
          label: {
            show: true,
            position: 'right',
            formatter: '{c} ms',
            color: isDark ? '#fafafa' : '#09090b'
          }
        }
      ]
    };
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      
      {/* Liquid Ambient Blurs */}
      <div className="glow-orb w-[500px] h-[500px] bg-indigo-500/20 dark:bg-indigo-600/10 top-[-100px] left-[-100px]" />
      <div className="glow-orb w-[600px] h-[600px] bg-emerald-500/20 dark:bg-emerald-600/10 bottom-[-200px] right-[-100px]" />
      <div className="glow-orb w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/5 top-[30%] right-[20%]" />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 relative z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-200/50 dark:border-zinc-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-950 via-indigo-950 to-zinc-950 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                NEXUS SEARCH
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                C++ Inverted Index & Trie Search Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => triggerBenchmarkModal()}
              className="btn-glass-secondary flex items-center space-x-2 py-1.5 px-3 text-xs rounded-lg"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Benchmark Hub</span>
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* KPI Metrics Dashboard Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="liquid-glass rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Files Indexed</p>
              <p className="text-xl font-bold dark:text-zinc-100">{stats ? stats.documentCount : 'Loading...'}</p>
            </div>
          </div>

          <div className="liquid-glass rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Unique Terms</p>
              <p className="text-xl font-bold dark:text-zinc-100">{stats ? stats.uniqueWords : 'Loading...'}</p>
            </div>
          </div>

          <div className="liquid-glass rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Search Speed</p>
              <p className="text-xl font-bold dark:text-zinc-100">
                {results.length > 0 ? `${searchTime} ms` : '0.00 ms'}
              </p>
            </div>
          </div>

          <div className="liquid-glass rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Index Boost</p>
              <p className="text-xl font-bold text-amber-500 flex items-center">
                {benchmarkResult && benchmarkResult.speedup > 1 ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {benchmarkResult.speedup.toFixed(1)}x
                  </>
                ) : (
                  'Active'
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Layout Workspace Split */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* Main Results Table & Search Hub */}
          <main className={`flex-1 transition-all duration-500`}>
            
            {/* Search Input Bar Console */}
            <div className="liquid-glass rounded-xl p-5 mb-6 relative">
              <div className="flex items-center space-x-2 relative" ref={autocompleteRef}>
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search terms, phrases or files (e.g. algorithms, Apple)..."
                    className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 text-zinc-950 dark:text-zinc-100 shadow-inner"
                  />
                  
                  {/* Autocomplete suggestions dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white/95 dark:bg-[#0c0c12]/95 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-30 py-1.5">
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQuery(sug);
                            handleSearch(sug);
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-600 hover:text-white dark:text-zinc-200 transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <ChevronRight className="w-3 h-3 opacity-60" />
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="btn-glass-primary flex items-center space-x-2 px-5 py-3 h-[46px]"
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              {/* Advanced search choices */}
              <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30 text-xs">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Case Sensitive</span>
                  </label>
                  <span className="text-zinc-300 dark:text-zinc-800">|</span>
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center space-x-1.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Recent History</span>
                  </button>
                </div>

                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                  TF-IDF Ranking Enabled
                </span>
              </div>

              {/* History list panel */}
              {showHistory && (
                <div className="mt-3 p-3 bg-black/10 dark:bg-black/30 border border-zinc-200/20 dark:border-zinc-800/20 rounded-lg flex flex-wrap gap-2">
                  {recentQueries.map((hist, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(hist);
                        handleSearch(hist);
                      }}
                      className="px-2.5 py-1 text-xs bg-zinc-200/50 dark:bg-zinc-800/40 hover:bg-indigo-500/20 hover:text-indigo-500 dark:text-zinc-300 dark:hover:text-indigo-400 rounded-full transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{hist}</span>
                    </button>
                  ))}
                  {recentQueries.length === 0 && (
                    <span className="text-zinc-500 dark:text-zinc-500 text-xs">No search history.</span>
                  )}
                </div>
              )}
            </div>

            {/* Results Grid / Table */}
            {loading ? (
              <div className="liquid-glass rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">Rebuilding dynamic index results...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    Found {results.length} matching files in {searchTime}ms
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {results.map((r, i) => {
                    const relativeTfidf = ((r.tfidfScore || 0) / maxScore) * 100;
                    const isSelected = selectedFileName === r.fileName;
                    return (
                      <div 
                        key={i} 
                        onClick={() => handleFileClick(r.fileName)}
                        className={`liquid-glass rounded-xl p-5 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-lg cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-500/80 bg-indigo-50/10 dark:bg-indigo-950/10 border-indigo-500/40' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2.5">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                              {r.fileName}
                            </h3>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] bg-zinc-200/50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-mono px-2 py-0.5 rounded-full mr-2">
                              Matches: {r.matchCount}
                            </span>
                            {r.tfidfScore > 0 && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono px-2 py-0.5 rounded-full">
                                TF-IDF: {r.tfidfScore.toFixed(4)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sparkline Relevance Bar */}
                        {r.tfidfScore > 0 && (
                          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800/80 rounded-full mb-4 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${relativeTfidf}%` }}
                            />
                          </div>
                        )}

                        {/* Line Snippets */}
                        <div className="space-y-2 mt-2">
                          {r.matchingLines.slice(0, 3).map((line, idx) => (
                            <div key={idx} className="text-xs bg-zinc-100/50 dark:bg-black/10 p-2.5 rounded-lg border border-zinc-200/20 dark:border-zinc-800/10 font-sans flex items-start space-x-2">
                              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                                L{line.lineNumber}
                              </span>
                              <p className="text-zinc-700 dark:text-zinc-300 flex-1 break-all line-clamp-2">
                                {highlightText(line.text, query)}
                              </p>
                            </div>
                          ))}
                          {r.matchingLines.length > 3 && (
                            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 pl-8 pt-1">
                              + {r.matchingLines.length - 3} more matching line(s) in file
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="liquid-glass rounded-xl p-16 text-center">
                <Layers className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4 animate-bounce" />
                <h3 className="font-bold text-lg dark:text-zinc-200">No Query Results</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
                  Type a query in the search bar above or choose a term from your recent history. The inverted index will fetch results in microseconds.
                </p>
              </div>
            )}
          </main>

          {/* Details Investigation Slide Panel */}
          {selectedFileName && (
            <aside className="w-full lg:w-[420px] transition-all duration-500 flex flex-col">
              <div className="liquid-glass rounded-xl p-5 sticky top-6 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200/30 dark:border-zinc-800/30">
                  <div className="flex items-center space-x-2.5">
                    <FileCode className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 max-w-[240px] truncate">{selectedFileName}</h3>
                      <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                        {selectedFileContent ? `${selectedFileContent.totalWords} words` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedFileName('');
                      setSelectedFileContent(null);
                    }}
                    className="p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedFileLoading ? (
                  <div className="flex-1 py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Reading document disk blocks...</p>
                  </div>
                ) : selectedFileContent ? (
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs bg-zinc-100/50 dark:bg-black/35 p-3 rounded-lg border border-zinc-200/30 dark:border-zinc-800/30 max-h-[60vh]">
                    {selectedFileContent.lines.map((line, idx) => {
                      // Check if this line is in the matching lines to give it a soft focus
                      const isMatch = results.find(r => r.fileName === selectedFileName)
                        ?.matchingLines.some(ml => ml.lineNumber === idx + 1);

                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start py-0.5 px-1 rounded transition-colors ${isMatch ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                        >
                          <span className="w-8 text-right pr-3 text-[10px] text-zinc-400 dark:text-zinc-600 select-none">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-zinc-700 dark:text-zinc-300 break-all leading-relaxed whitespace-pre-wrap">
                            {highlightText(line, query)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">Failed to load content.</div>
                )}

                {/* File Action Controls */}
                <div className="mt-4 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30 flex space-x-2">
                  <button 
                    onClick={() => {
                      // Open file content directly in the browser via dynamic action or show raw info
                      if (selectedFileContent) {
                        const blob = new Blob([selectedFileContent.lines.join('\n')], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      }
                    }}
                    className="flex-1 btn-glass-secondary py-2 text-xs flex justify-center items-center space-x-1"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>View Raw</span>
                  </button>
                  <div className="flex items-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-3 bg-zinc-200/20 dark:bg-zinc-800/20 border border-zinc-200/30 dark:border-zinc-800/30 rounded-lg">
                    <CheckCircle className="w-3 h-3 text-emerald-500 mr-1.5" />
                    Indexed
                  </div>
                </div>
              </div>
            </aside>
          )}

        </div>

      </div>

      {/* Benchmark Hub Modal Overlay */}
      {showBenchmarkModal && (
        <div className="fixed inset-0 bg-zinc-950/65 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-glass rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative border border-white/20 dark:border-zinc-800/40">
            <button 
              onClick={() => setShowBenchmarkModal(false)}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Performance Analytics Hub</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Evaluating algorithms: Linear Scan $O(N \times M)$ vs Inverted Index $O(1)$
                </p>
              </div>
            </div>

            {/* Test Term Selector */}
            <div className="mb-6 flex flex-wrap gap-2 items-center bg-zinc-100/50 dark:bg-black/20 p-3 rounded-xl border border-zinc-200/20 dark:border-zinc-800/20">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mr-2">Test term:</span>
              {['algorithms', 'apple', 'computer', 'singapore', 'data structures'].map((term, i) => (
                <button
                  key={i}
                  onClick={() => triggerBenchmarkModal(term)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                    benchmarkResult?.query === term 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                      : 'bg-white/40 dark:bg-zinc-800/40 hover:bg-white/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/30 dark:border-zinc-700/20'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>

            {benchmarking ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Running C++ benchmark cycles...</p>
              </div>
            ) : benchmarkResult ? (
              <div className="space-y-6">
                
                {/* KPI Metrics Side-by-Side */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 text-center">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Linear Scan</p>
                    <p className="text-lg font-bold text-red-500 font-mono mt-1">
                      {benchmarkResult.linearTimeMs.toFixed(4)} <span className="text-xs font-normal">ms</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{benchmarkResult.linearCount} matches</p>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 text-center">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Index Lookup</p>
                    <p className="text-lg font-bold text-emerald-500 font-mono mt-1">
                      {benchmarkResult.indexTimeMs.toFixed(4)} <span className="text-xs font-normal">ms</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{benchmarkResult.indexCount} matches</p>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 text-center flex flex-col justify-center items-center">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Relative Speedup</p>
                    <p className="text-lg font-extrabold text-amber-500 font-mono mt-1">
                      {benchmarkResult.speedup > 1 ? `${benchmarkResult.speedup.toFixed(1)}x` : '1.0x'}
                    </p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">FASTER</p>
                  </div>
                </div>

                {/* EChart Rendering */}
                <div className="bg-white/40 dark:bg-black/10 p-3 rounded-xl border border-zinc-200/20 dark:border-zinc-800/20">
                  <ReactECharts option={getChartOptions()} style={{ height: '220px' }} />
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
                  ⚡ <strong>Analysis:</strong> The index-based lookup runs in near $O(1)$ average time by bypassing directory scanning entirely. As the dataset size grows, the performance gap scales exponentially.
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">Choose a query to execute benchmark metrics.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
