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
  ChevronLeft,
  Maximize2, 
  BarChart2, 
  Flame,
  CheckCircle,
  FileCode,
  Play,
  RefreshCw,
  Copy,
  Download,
  ArrowRight,
  Info,
  Cpu,
  Terminal,
  ArrowLeft
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_BASE || (
  window.location.port && (window.location.port === '5173' || window.location.port === '5174' || window.location.port === '5175') 
    ? 'http://localhost:8000/api' 
    : '/api'
);

export default function App() {
  // Theme and UI States
  const [theme, setTheme] = useState('dark'); // Premium dark mode default
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [activeTab, setActiveTab] = useState('results'); // 'results', 'files', 'performance'
  
  // Selected File States for side-panel
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFileLoading, setSelectedFileLoading] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [copying, setCopying] = useState(false);
  
  // Benchmark and History States
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [recentQueries, setRecentQueries] = useState(() => {
    const saved = localStorage.getItem('search_history');
    return saved ? JSON.parse(saved) : ['algorithms', 'operating system', 'apple', 'database'];
  });
  const [showHistory, setShowHistory] = useState(false);

  // Workload Simulator States
  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulatedConsole, setSimulatedConsole] = useState([]);
  const [benchmarkHistory, setBenchmarkHistory] = useState([]);
  const [fileFilter, setFileFilter] = useState('');
  const [customBenchmarkTerm, setCustomBenchmarkTerm] = useState('');

  const autocompleteRef = useRef(null);

  // Initialize Theme and Stats
  useEffect(() => {
    // Force dark mode for premium look initially
    document.documentElement.classList.add('dark');
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
    const term = searchQuery !== undefined ? searchQuery : query;
    if (!term.trim()) return;

    setLoading(true);
    setSuggestions([]);
    setSearchPerformed(true);
    setActiveTab('results');
    
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
        // Add to history of runs if not running simulation
        setBenchmarkHistory(prev => {
          const exists = prev.some(h => h.query === term);
          if (exists) return prev;
          return [...prev.slice(-4), res.data]; // Keep last 5
        });
      }
    } catch (err) {
      console.error('Background benchmark error:', err);
    }
  };

  // Run Workload Simulation Test Suite
  const runWorkloadSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimulationProgress(0);
    setSimulatedConsole([
      `[SYSTEM] Initializing search workload simulation...`,
      `[SYSTEM] Binary backend: C++ Trie & Inverted Index Engine`,
      `[SYSTEM] Corpus directory: test_files (55 documents)`,
      `----------------------------------------------------------------`
    ]);

    const testQueries = ['algorithms', 'operating system', 'database', 'singapore', 'computer monitor'];
    const completedHistory = [];

    for (let i = 0; i < testQueries.length; i++) {
      const term = testQueries[i];
      setSimulatedConsole(prev => [...prev, `[WORKLOAD] Running query benchmark: "${term}"`]);
      setSimulationProgress(Math.floor(((i + 0.5) / testQueries.length) * 100));

      try {
        const res = await axios.get(`${API_BASE}/benchmark`, { params: { q: term } });
        if (res.data && res.data.status === 'success') {
          const run = res.data;
          completedHistory.push(run);
          setBenchmarkHistory([...completedHistory]);
          setBenchmarkResult(run); // set as active
          
          setSimulatedConsole(prev => [
            ...prev,
            `  -> Results Match: ${run.indexCount} files`,
            `  -> Linear Scan: ${run.linearTimeMs.toFixed(4)} ms`,
            `  -> Inverted Index: ${run.indexTimeMs.toFixed(4)} ms`,
            `  -> Relative Speedup: ${run.speedup.toFixed(1)}x faster`
          ]);
        }
      } catch (err) {
        console.error('Workload step failed:', err);
        setSimulatedConsole(prev => [...prev, `  -> [ERROR] Query benchmark failed for "${term}"`]);
      }

      await new Promise(r => setTimeout(r, 700));
    }

    setSimulationProgress(100);
    setSimulating(false);
    
    const avgSpeedup = completedHistory.length > 0
      ? (completedHistory.reduce((acc, h) => acc + h.speedup, 0) / completedHistory.length).toFixed(1)
      : 0;

    setSimulatedConsole(prev => [
      ...prev,
      `----------------------------------------------------------------`,
      `[SYSTEM] Simulation test suite complete!`,
      `[SYSTEM] Average query optimization speedup: ${avgSpeedup}x`
    ]);
  };

  // Run a single benchmark for custom terms
  const runSingleBenchmark = async (termToRun) => {
    const term = (typeof termToRun === 'string' ? termToRun : customBenchmarkTerm).trim();
    if (!term) return;

    setSimulating(true);
    setSimulatedConsole(prev => [
      ...prev,
      `[WORKLOAD] Starting custom benchmark for term: "${term}"...`
    ]);

    try {
      const res = await axios.get(`${API_BASE}/benchmark`, { params: { q: term } });
      if (res.data && res.data.status === 'success') {
        const run = res.data;
        setBenchmarkResult(run);
        
        setBenchmarkHistory(prev => {
          const exists = prev.some(h => h.query === term);
          if (exists) return prev.map(h => h.query === term ? run : h);
          return [...prev, run];
        });

        setSimulatedConsole(prev => [
          ...prev,
          `  [SUCCESS] Query term: "${term}"`,
          `  -> Results Match: ${run.indexCount} files`,
          `  -> Linear Scan: ${run.linearTimeMs.toFixed(4)} ms`,
          `  -> Index Lookup: ${run.indexTimeMs.toFixed(4)} ms`,
          `  -> Speedup Ratio: ${run.speedup.toFixed(1)}x faster`,
          `----------------------------------------------------------------`
        ]);
        
        // Clear custom input
        setCustomBenchmarkTerm('');
      }
    } catch (err) {
      console.error('Single benchmark error:', err);
      setSimulatedConsole(prev => [
        ...prev,
        `  -> [ERROR] Failed to benchmark query "${term}"`
      ]);
    } finally {
      setSimulating(false);
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

  // Active matches in selected file
  const currentFileMatches = results.find(r => r.fileName === selectedFileName)?.matchingLines || [];

  const nextMatch = () => {
    if (currentFileMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % currentFileMatches.length;
    setCurrentMatchIdx(nextIdx);
    scrollToLine(currentFileMatches[nextIdx].lineNumber);
  };

  const prevMatch = () => {
    if (currentFileMatches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + currentFileMatches.length) % currentFileMatches.length;
    setCurrentMatchIdx(prevIdx);
    scrollToLine(currentFileMatches[prevIdx].lineNumber);
  };

  const scrollToLine = (lineNum) => {
    const lineEl = document.getElementById(`line-el-${lineNum}`);
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto scroll to first match when selecting file
  useEffect(() => {
    setCurrentMatchIdx(0);
    if (selectedFileName && results.length > 0) {
      const fileMatches = results.find(r => r.fileName === selectedFileName)?.matchingLines || [];
      if (fileMatches.length > 0) {
        setTimeout(() => {
          scrollToLine(fileMatches[0].lineNumber);
        }, 300);
      }
    }
  }, [selectedFileName, results]);

  const handleCopyCode = () => {
    if (selectedFileContent) {
      navigator.clipboard.writeText(selectedFileContent.lines.join('\n'));
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handleDownloadFile = () => {
    if (selectedFileContent) {
      const element = document.createElement("a");
      const file = new Blob([selectedFileContent.lines.join('\n')], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = selectedFileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Helper to highlight terms
  const highlightText = (text, highlight, isActiveMatch = false) => {
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    const parts = highlight.trim().split(/\s+/);
    const pattern = parts.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, caseSensitive ? 'g' : 'gi');
    const splitText = text.split(regex);
    
    return (
      <span>
        {splitText.map((part, i) => 
          regex.test(part) ? (
            <span 
              key={i} 
              className={isActiveMatch ? "search-highlight-active animate-pulse" : "search-highlight"}
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getFileBadge = (fileName) => {
    const ext = fileName.split('.').pop();
    if (ext === 'cpp') return <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono px-2 py-0.5 rounded border border-sky-500/20">C++ Source</span>;
    if (ext === 'h') return <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono px-2 py-0.5 rounded border border-purple-500/20">Header</span>;
    return <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20 font-medium">Text</span>;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop();
    if (ext === 'cpp' || ext === 'h') return <FileCode className="w-4 h-4 text-indigo-500" />;
    return <FileText className="w-4 h-4 text-emerald-500" />;
  };

  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.tfidfScore || 0)) : 1;

  // Chart config for Latency Bar
  const getActiveChartOptions = () => {
    if (!benchmarkResult) return {};
    const isDark = theme === 'dark';
    return {
      title: {
        text: `Active Query: "${benchmarkResult.query}" Latency`,
        left: 'center',
        textStyle: {
          color: isDark ? '#e4e4e7' : '#1f2937',
          fontSize: 13,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#0b0b0f' : '#ffffff',
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        textStyle: { color: isDark ? '#fafafa' : '#09090b', fontFamily: 'JetBrains Mono' }
      },
      grid: { left: '4%', right: '8%', bottom: '5%', top: '24%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Time (ms)',
        nameTextStyle: { color: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? '#1e1e24' : '#f3f4f6' } },
        axisLabel: { color: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 }
      },
      yAxis: {
        type: 'category',
        data: ['Linear Scan', 'Index Lookup'],
        axisLabel: { color: isDark ? '#e4e4e7' : '#1f2937', fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#27272a' : '#e5e7eb' } }
      },
      series: [
        {
          name: 'Latency',
          type: 'bar',
          barWidth: '40%',
          data: [
            {
              value: parseFloat(benchmarkResult.linearTimeMs.toFixed(4)),
              itemStyle: { 
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }]
                },
                borderRadius: [0, 6, 6, 0]
              }
            },
            {
              value: parseFloat(benchmarkResult.indexTimeMs.toFixed(4)),
              itemStyle: { 
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }]
                },
                borderRadius: [0, 6, 6, 0]
              }
            }
          ],
          label: {
            show: true,
            position: 'right',
            formatter: '{c} ms',
            color: isDark ? '#f4f4f5' : '#1f2937',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10
          }
        }
      ]
    };
  };

  // Chart config for Speedup Line
  const getLineChartOptions = () => {
    if (benchmarkHistory.length === 0) return {};
    const isDark = theme === 'dark';
    const xData = benchmarkHistory.map(h => h.query);
    const speedups = benchmarkHistory.map(h => parseFloat(h.speedup.toFixed(1)));
    
    return {
      title: {
        text: 'Index Speedup Factor per Query',
        left: 'center',
        textStyle: {
          color: isDark ? '#e4e4e7' : '#1f2937',
          fontSize: 13,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#0b0b0f' : '#ffffff',
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        textStyle: { color: isDark ? '#fafafa' : '#09090b', fontFamily: 'JetBrains Mono' },
        formatter: '{b}: {c}x Speedup'
      },
      grid: { left: '4%', right: '6%', bottom: '8%', top: '24%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: isDark ? '#a1a1aa' : '#71717a', fontSize: 10, rotate: 10 },
        axisLine: { lineStyle: { color: isDark ? '#27272a' : '#e5e7eb' } }
      },
      yAxis: {
        type: 'value',
        name: 'Speedup Ratio',
        nameTextStyle: { color: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? '#1e1e24' : '#f3f4f6' } },
        axisLabel: { color: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 }
      },
      series: [
        {
          name: 'Speedup',
          type: 'line',
          data: speedups,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#6366f1'
          },
          itemStyle: {
            color: '#4f46e5',
            borderColor: isDark ? '#060609' : '#ffffff',
            borderWidth: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(99, 102, 241, 0.35)' },
                { offset: 1, color: 'rgba(99, 102, 241, 0)' }
              ]
            }
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}x',
            color: isDark ? '#a1a1aa' : '#4b5563',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9
          }
        }
      ]
    };
  };

  // Filter indexed files
  const filteredFiles = stats?.files
    ? stats.files.filter(f => f.fileName.toLowerCase().includes(fileFilter.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-zinc-50 dark:bg-[#060609] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* Liquid Ambient Blurs */}
      <div className="glow-orb w-[450px] h-[450px] bg-indigo-500/15 dark:bg-indigo-600/10 top-[-80px] left-[-80px] animate-float-1" />
      <div className="glow-orb w-[550px] h-[550px] bg-emerald-500/15 dark:bg-emerald-600/10 bottom-[-180px] right-[-80px] animate-float-2" />
      <div className="glow-orb w-[350px] h-[350px] bg-purple-500/15 dark:bg-purple-600/5 top-[35%] right-[15%] animate-float-1" />

      {/* 1. Landing Center Page */}
      {!searchPerformed ? (
        <div className="min-h-screen flex flex-col justify-between p-6 relative z-10">
          {/* Header Bar */}
          <header className="flex justify-between items-center max-w-[1400px] w-full mx-auto">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg shadow-md text-white">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-extrabold tracking-tight text-md bg-gradient-to-r from-zinc-900 via-indigo-900 to-zinc-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                NEXUS
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  setSearchPerformed(true);
                  setActiveTab('files');
                }}
                className="btn-glass-secondary py-1.5 px-3.5 text-xs rounded-xl flex items-center space-x-1.5"
              >
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>Explore Database</span>
              </button>
              <button 
                onClick={() => {
                  setSearchPerformed(true);
                  setActiveTab('performance');
                }}
                className="btn-glass-secondary py-1.5 px-3.5 text-xs rounded-xl flex items-center space-x-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                <span>Engine Simulator</span>
              </button>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Centered Search console */}
          <main className="max-w-[720px] w-full mx-auto text-center flex flex-col items-center justify-center py-20 flex-1">
            <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-mono mb-6">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>C++ Trie & Inverted Index System Active</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              Futuristic C++ Search Engine
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-lg leading-relaxed">
              Search a high-performance database corpus instantly with microsecond lookup speeds and advanced TF-IDF document ranking.
            </p>

            {/* Input Bar Card */}
            <div className="w-full liquid-glass rounded-2xl p-4 shadow-xl border border-zinc-200/40 dark:border-white/5 relative z-20 mb-6">
              <div className="flex items-center space-x-2 relative" ref={autocompleteRef}>
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search terms, phrases or files (e.g. algorithms, CPU)..."
                    className="w-full bg-white/60 dark:bg-black/25 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 text-zinc-950 dark:text-zinc-100 shadow-inner"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#0c0c12]/95 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-30 py-1.5">
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQuery(sug);
                            handleSearch(sug);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-600 hover:text-white dark:text-zinc-200 transition-colors flex items-center space-x-2 cursor-pointer font-mono"
                        >
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
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
                  <span>Search</span>
                </button>
              </div>

              {/* Advanced controls */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30 text-xs">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 cursor-pointer">
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
                    className="flex items-center space-x-1.5 text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Recent History</span>
                  </button>
                </div>

                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  Ranking: TF-IDF
                </span>
              </div>

              {/* History list */}
              {showHistory && (
                <div className="mt-3 p-3 bg-black/5 dark:bg-black/30 border border-zinc-200/20 dark:border-zinc-800/20 rounded-xl flex flex-wrap gap-2 text-left">
                  {recentQueries.map((hist, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(hist);
                        handleSearch(hist);
                      }}
                      className="px-3 py-1 text-xs bg-zinc-200/60 dark:bg-zinc-800/40 hover:bg-indigo-500/20 hover:text-indigo-500 dark:text-zinc-300 dark:hover:text-indigo-400 rounded-full transition-all flex items-center space-x-1 cursor-pointer border border-zinc-200/40 dark:border-zinc-700/20"
                    >
                      <span>{hist}</span>
                    </button>
                  ))}
                  {recentQueries.length === 0 && (
                    <span className="text-zinc-500 text-xs">No query history.</span>
                  )}
                </div>
              )}
            </div>

            {/* Quick searches */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <span className="text-xs text-zinc-400 mr-2 font-mono">Suggested:</span>
              {['algorithms', 'operating system', 'database', 'tokyo', 'spreadsheet'].map((term, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(term);
                    handleSearch(term);
                  }}
                  className="px-3.5 py-1 text-xs bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl hover:border-indigo-500/50 hover:text-indigo-500 dark:text-zinc-300 dark:hover:text-indigo-400 transition-all cursor-pointer font-medium"
                >
                  {term}
                </button>
              ))}
            </div>
          </main>

          {/* Overview KPI Stats Footer */}
          <footer className="max-w-[1400px] w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-zinc-200/30 dark:border-zinc-800/30">
            <div className="liquid-glass rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Files Indexed</p>
                <p className="text-lg font-bold">{stats ? stats.documentCount : 'Loading...'}</p>
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Unique Terms</p>
                <p className="text-lg font-bold">{stats ? stats.uniqueWords : 'Loading...'}</p>
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Max Latency</p>
                <p className="text-lg font-bold">~0.10 ms</p>
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Trie Search</p>
                <p className="text-lg font-bold text-amber-500">Active</p>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        // 2. Results Header Page (Dynamic Workspace)
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 relative z-10 min-h-screen flex flex-col">
          
          {/* Header Console */}
          <header className="liquid-glass rounded-2xl p-4 mb-6 border border-zinc-200/40 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Logo */}
            <div 
              onClick={() => {
                setSearchPerformed(false);
                setQuery('');
                setResults([]);
              }}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl shadow-md text-white group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-zinc-900 via-indigo-900 to-zinc-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent flex items-center">
                  NEXUS
                  <ArrowLeft className="w-3.5 h-3.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                </h1>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                  C++ Inverted Index & Trie Search Engine
                </p>
              </div>
            </div>

            {/* Compact Search Input */}
            <div className="flex-1 max-w-[500px] relative flex items-center" ref={autocompleteRef}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search corpus..."
                className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl py-2 pl-10 pr-16 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-zinc-950 dark:text-zinc-100 font-mono transition-all"
              />
              <button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 py-1 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <span>Run</span>
              </button>

              {/* suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#0c0c12]/95 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-30 py-1 font-mono text-xs">
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(sug);
                        handleSearch(sug);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white dark:text-zinc-200 transition-colors flex items-center space-x-2"
                    >
                      <ChevronRight className="w-3 h-3 opacity-60" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Workspace Controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Quick tab controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-6 bg-zinc-200/40 dark:bg-zinc-900/40 p-1.5 rounded-xl self-start max-w-full overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'results' 
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Search Results</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'files' 
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Indexed Files Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'performance' 
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Performance Cockpit</span>
            </button>
          </div>

          {/* Main workspace layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-0">
            
            {/* Left Content Column */}
            <main className="flex-1 transition-all duration-300">
              
              {/* TAB 1: Search Results */}
              {activeTab === 'results' && (
                <>
                  {loading ? (
                    <div className="liquid-glass rounded-2xl p-16 flex flex-col items-center justify-center space-y-4">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Running C++ index searches...</p>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Found {results.length} files matching in <strong>{searchTime}ms</strong></span>
                        </div>
                        {benchmarkResult && (
                          <div className="text-xs text-amber-500 flex items-center font-mono">
                            <TrendingUp className="w-3.5 h-3.5 mr-1" />
                            <span>{benchmarkResult.speedup.toFixed(1)}x Index Boost</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {results.map((r, i) => {
                          const relativeTfidf = ((r.tfidfScore || 0) / maxScore) * 100;
                          const isSelected = selectedFileName === r.fileName;
                          return (
                            <div 
                              key={i} 
                              onClick={() => handleFileClick(r.fileName)}
                              className={`liquid-glass rounded-2xl p-5 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-lg cursor-pointer transition-all duration-300 ${
                                isSelected 
                                  ? 'ring-2 ring-indigo-500/80 bg-indigo-50/5 dark:bg-indigo-950/10 border-indigo-500/40' 
                                  : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-2.5">
                                  <div className="p-1.5 bg-zinc-200/50 dark:bg-zinc-800/60 rounded-lg">
                                    {getFileIcon(r.fileName)}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                                      {r.fileName}
                                    </h3>
                                    <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                                      Ranking priority: TF-IDF
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getFileBadge(r.fileName)}
                                  <span className="text-[10px] bg-zinc-200/50 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-mono px-2 py-0.5 rounded-full border border-zinc-250 dark:border-zinc-700/20">
                                    Matches: {r.matchCount}
                                  </span>
                                  {r.tfidfScore > 0 && (
                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-indigo-500/20">
                                      Score: {r.tfidfScore.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Relevance indicator */}
                              {r.tfidfScore > 0 && (
                                <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800/80 rounded-full mb-4 overflow-hidden relative">
                                  <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500 animate-shine"
                                    style={{ width: `${relativeTfidf}%` }}
                                  />
                                </div>
                              )}

                              {/* Line snippets */}
                              <div className="space-y-2 mt-2">
                                {r.matchingLines.slice(0, 3).map((line, idx) => (
                                  <div key={idx} className="text-xs bg-zinc-100/40 dark:bg-black/15 p-3 rounded-xl border border-zinc-200/30 dark:border-zinc-800/15 font-mono flex items-start space-x-2.5">
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 select-none w-8 text-right">
                                      L{line.lineNumber}
                                    </span>
                                    <p className="text-zinc-700 dark:text-zinc-300 flex-1 break-all leading-relaxed whitespace-pre-wrap">
                                      {highlightText(line.text, query)}
                                    </p>
                                  </div>
                                ))}
                                {r.matchingLines.length > 3 && (
                                  <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pl-11 pt-1 flex items-center">
                                    <Info className="w-3 h-3 mr-1 opacity-75" />
                                    <span>+ {r.matchingLines.length - 3} more matching line(s) in this file</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="liquid-glass rounded-2xl p-16 text-center">
                      <Layers className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4 animate-pulse" />
                      <h3 className="font-bold text-lg dark:text-zinc-200">No matching files found</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                        Try modifying case sensitivity flags or searching for keywords like <strong>algorithms</strong>, <strong>cairo</strong>, <strong>apple</strong>, or <strong>ram</strong>.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: File Index Explorer */}
              {activeTab === 'files' && (
                <div className="liquid-glass rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-zinc-200/30 dark:border-zinc-800/30">
                    <div>
                      <h2 className="text-md font-bold flex items-center">
                        <Database className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                        <span>Indexed Database Corpus</span>
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Showing all documents compiled in the C++ memory indices.
                      </p>
                    </div>
                    {/* Filter Input */}
                    <div className="w-full sm:w-[250px]">
                      <input 
                        type="text"
                        placeholder="Filter files by name..."
                        value={fileFilter}
                        onChange={(e) => setFileFilter(e.target.value)}
                        className="w-full bg-zinc-100/50 dark:bg-black/20 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>
                  </div>

                  {filteredFiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
                      {filteredFiles.map((file, i) => {
                        const isSelected = selectedFileName === file.fileName;
                        return (
                          <div 
                            key={i}
                            onClick={() => handleFileClick(file.fileName)}
                            className={`p-4 rounded-xl bg-white/40 dark:bg-black/10 border border-zinc-200/40 dark:border-zinc-800/30 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-md cursor-pointer transition-all flex justify-between items-center ${
                              isSelected ? 'ring-2 ring-indigo-500/60 bg-indigo-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="p-2 bg-zinc-200/50 dark:bg-zinc-850 rounded-lg">
                                {getFileIcon(file.fileName)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                                  {file.fileName}
                                </h4>
                                <div className="flex items-center space-x-2 mt-1 text-[10px] text-zinc-400 font-mono">
                                  <span>Lines: {file.linesCount}</span>
                                  <span>•</span>
                                  <span>Words: {file.wordCount}</span>
                                </div>
                              </div>
                            </div>
                            
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-zinc-500">
                      No files matching "{fileFilter}"
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Performance Cockpit */}
              {activeTab === 'performance' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Left: Workload Simulator */}
                  <div className="liquid-glass rounded-2xl p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200/30 dark:border-zinc-800/30">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-bold text-sm">Workload stress simulator</h3>
                      </div>
                      <button 
                        onClick={runWorkloadSimulation}
                        disabled={simulating}
                        className="btn-glass-primary py-1.5 px-3 text-xs rounded-xl flex items-center space-x-1"
                      >
                        {simulating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Simulating...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Run Suite Stress</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Progress indicator */}
                    {simulating && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-[10px] font-mono text-indigo-500 mb-1">
                          <span>Executing query thread loops...</span>
                          <span>{simulationProgress}%</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${simulationProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Explanation Alert Card */}
                    <div className="mb-4 bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10 text-xs leading-relaxed text-zinc-650 dark:text-zinc-350">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center mb-1">
                        <Info className="w-4 h-4 mr-1.5" />
                        What is this Simulator?
                      </span>
                      C++ Search Engines use two approaches: <strong>Linear Scanning</strong> (which traverses every file line-by-line) and <strong>Index Lookup</strong> (using an Inverted Index and Trie structure). This simulator runs latency benchmarks on both algorithms to measure search speeds and calculate the speedup efficiency.
                    </div>

                    {/* Custom Query Benchmarking */}
                    <div className="mb-4 bg-zinc-100/50 dark:bg-black/25 p-3.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/30">
                      <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center">
                        <Zap className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                        <span>Run Custom Benchmarks</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3">
                        Enter any search term to test C++ query latencies (Linear Scan vs Inverted Index lookup) and plot it on the speedup chart.
                      </p>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={customBenchmarkTerm}
                          onChange={(e) => setCustomBenchmarkTerm(e.target.value)}
                          placeholder="e.g. apple, system, india..."
                          className="flex-1 bg-white/60 dark:bg-black/25 border border-zinc-200/50 dark:border-zinc-800/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-zinc-950 dark:text-zinc-100 font-mono"
                          onKeyDown={(e) => e.key === 'Enter' && runSingleBenchmark()}
                        />
                        <button
                          onClick={() => runSingleBenchmark()}
                          disabled={!customBenchmarkTerm.trim() || simulating}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer transition-all shadow-sm"
                        >
                          Test Term
                        </button>
                      </div>
                      
                      {query && (
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-200/20 dark:border-zinc-800/20 pt-2.5">
                          <span className="text-[10px] text-zinc-550 dark:text-zinc-450 font-mono">
                            Active search: <strong className="text-indigo-600 dark:text-indigo-400">"{query}"</strong>
                          </span>
                          <button
                            onClick={() => {
                              runSingleBenchmark(query);
                            }}
                            disabled={simulating}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center font-semibold cursor-pointer"
                          >
                            Benchmark "{query}" now <ChevronRight className="w-3 h-3 ml-0.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Console box */}
                    <div className="flex-1 font-mono text-[11px] bg-black/85 text-emerald-400 p-4 rounded-xl border border-zinc-800 min-h-[180px] max-h-[300px] overflow-y-auto leading-relaxed shadow-inner font-mono">
                      {simulatedConsole.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                      {simulatedConsole.length === 0 && (
                        <div className="text-zinc-500 text-center py-16">
                          Ready to execute benchmark workload suite test.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Charts */}
                  <div className="space-y-6">
                    {/* Active Benchmark stats */}
                    {benchmarkResult ? (
                      <div className="liquid-glass rounded-2xl p-4">
                        <div className="bg-white/40 dark:bg-black/10 p-2 rounded-xl border border-zinc-200/20 dark:border-zinc-800/20">
                          <ReactECharts option={getActiveChartOptions()} style={{ height: '170px' }} />
                        </div>
                        <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-zinc-500 px-1">
                          <span>Indexed: {benchmarkResult.indexTimeMs.toFixed(4)} ms</span>
                          <span className="text-emerald-500 font-bold">{benchmarkResult.speedup.toFixed(1)}x speedup</span>
                          <span>Linear: {benchmarkResult.linearTimeMs.toFixed(4)} ms</span>
                        </div>
                      </div>
                    ) : (
                      <div className="liquid-glass rounded-2xl p-8 text-center text-xs text-zinc-500">
                        Query a word or run simulation to view active query bar metrics.
                      </div>
                    )}

                    {/* Simulation history line chart */}
                    {benchmarkHistory.length > 0 ? (
                      <div className="liquid-glass rounded-2xl p-4">
                        <div className="bg-white/40 dark:bg-black/10 p-2 rounded-xl border border-zinc-200/20 dark:border-zinc-800/20">
                          <ReactECharts option={getLineChartOptions()} style={{ height: '170px' }} />
                        </div>
                      </div>
                    ) : (
                      <div className="liquid-glass rounded-2xl p-8 text-center text-xs text-zinc-500">
                        Workload speedup ratio graph will display after simulation.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* Right Slides Details Panel */}
            {selectedFileName && (
              <div 
                className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex justify-end pointer-events-auto lg:relative lg:bg-transparent lg:backdrop-blur-none lg:z-auto lg:p-0 lg:pointer-events-none transition-all duration-300"
                onClick={() => {
                  setSelectedFileName('');
                  setSelectedFileContent(null);
                }}
              >
                <aside 
                  className="w-full max-w-lg h-full lg:h-auto bg-zinc-950 dark:bg-[#07070a] lg:bg-transparent p-0 flex flex-col lg:w-[420px] relative pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="liquid-glass rounded-none lg:rounded-2xl p-5 sticky top-6 max-h-screen lg:max-h-[85vh] h-full lg:h-auto flex flex-col border-none lg:border border-zinc-200/40 dark:border-white/5 shadow-2xl">
                  {/* Sidebar Header */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200/30 dark:border-zinc-800/30">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        {getFileIcon(selectedFileName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-zinc-950 dark:text-zinc-50 truncate max-w-[180px]">
                          {selectedFileName}
                        </h3>
                        <p className="text-[9px] font-mono text-zinc-400 mt-0.5">
                          {selectedFileContent ? `${selectedFileContent.totalWords} words` : 'Loading...'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Navigator controls */}
                      {currentFileMatches.length > 0 && (
                        <div className="flex items-center space-x-1.5 bg-zinc-200/50 dark:bg-zinc-800/60 border border-zinc-250 dark:border-zinc-700/20 px-2 py-0.5 rounded-lg mr-1.5">
                          <button 
                            onClick={prevMatch}
                            className="p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-750 rounded transition text-zinc-500 dark:text-zinc-400 cursor-pointer"
                            title="Previous match"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[9px] font-mono text-zinc-700 dark:text-zinc-300 select-none">
                            {currentMatchIdx + 1}/{currentFileMatches.length}
                          </span>
                          <button 
                            onClick={nextMatch}
                            className="p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-750 rounded transition text-zinc-500 dark:text-zinc-400 cursor-pointer"
                            title="Next match"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => {
                          setSelectedFileName('');
                          setSelectedFileContent(null);
                        }}
                        className="p-1 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Code viewer */}
                  {selectedFileLoading ? (
                    <div className="flex-1 py-16 flex flex-col items-center justify-center space-y-4">
                      <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Accessing C++ file buffer...</p>
                    </div>
                  ) : selectedFileContent ? (
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] bg-zinc-100/50 dark:bg-black/35 p-3.5 rounded-xl border border-zinc-200/30 dark:border-zinc-850 max-h-[60vh] custom-scroll">
                      {selectedFileContent.lines.map((line, idx) => {
                        const lineNum = idx + 1;
                        const matchItem = currentFileMatches.find(ml => ml.lineNumber === lineNum);
                        const isMatch = !!matchItem;
                        const isActiveMatch = isMatch && currentFileMatches[currentMatchIdx]?.lineNumber === lineNum;

                        return (
                          <div 
                            key={idx} 
                            id={`line-el-${lineNum}`}
                            className={`flex items-start py-0.5 px-1 rounded transition-all duration-300 ${
                              isActiveMatch 
                                ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-2 border-amber-500 pl-1.5' 
                                : isMatch 
                                  ? 'bg-indigo-500/5 dark:bg-indigo-500/10 pl-1' 
                                  : ''
                            }`}
                          >
                            <span className="w-8 text-right pr-3.5 text-[9px] text-zinc-450 dark:text-zinc-600 select-none font-mono">
                              {lineNum}
                            </span>
                            <span className="flex-1 text-zinc-700 dark:text-zinc-300 break-all leading-relaxed whitespace-pre-wrap">
                              {isMatch ? highlightText(line, query, isActiveMatch) : line}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-zinc-500">Failed to render contents.</div>
                  )}

                  {/* Sidebar Footer Controls */}
                  <div className="mt-4 pt-3.5 border-t border-zinc-200/30 dark:border-zinc-800/30 flex justify-between gap-2.5">
                    <button 
                      onClick={handleCopyCode}
                      className="flex-1 btn-glass-secondary py-1.5 px-2.5 text-xs flex justify-center items-center space-x-1.5 rounded-xl"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{copying ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                    <button 
                      onClick={handleDownloadFile}
                      className="flex-1 btn-glass-secondary py-1.5 px-2.5 text-xs flex justify-center items-center space-x-1.5 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Download</span>
                    </button>
                    <div className="flex items-center text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2.5 rounded-xl border border-emerald-500/10 select-none">
                      Indexed
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          </div>

        </div>
      )}

    </div>
  );
}
