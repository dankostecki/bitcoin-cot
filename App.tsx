import React, { useState, useEffect } from 'react';
import { fetchCSVData, processData } from './utils';
import { DATA_URL } from './constants';
import { ReportType, TimeRange, Unit, ProcessedDataPoint } from './types';
import Dashboard from './components/Dashboard';
import EducationDrawer from './components/EducationDrawer';
import { Bitcoin, BookOpen, Calendar, BarChart2, Coins, Layers, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const reportType = ReportType.FuturesOnly;
  
  const [data, setData] = useState<ProcessedDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.M6);
  const [unit, setUnit] = useState<Unit>('btc');
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Using the util function for fetching and parsing
      const raw = await fetchCSVData(DATA_URL);
      
      if (raw.length === 0) {
         throw new Error("Pobrany plik jest pusty lub ma nieprawidłowy format.");
      }

      const processed = processData(raw, reportType);
      if (processed.length === 0) {
        throw new Error("Nie udało się przetworzyć danych. Sprawdź format CSV.");
      }
      
      setData(processed);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Wystąpił nieoczekiwany błąd podczas pobierania danych.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // --- RENDER: LOADING / ERROR SCREEN ---
  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-black text-gray-200 font-inter flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl shadow-lg shadow-orange-500/20 inline-block mb-8">
            <Bitcoin className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
            Wall Street <span className="text-orange-500">Bitcoin</span> Insight
          </h1>

          {isLoading ? (
            <div className="mt-8 flex flex-col items-center animate-fade-in">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Pobieranie najnowszych danych (Live)...</p>
              <p className="text-gray-600 text-xs mt-2 font-mono">Connecting to Google Sheets...</p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center animate-fade-in">
              <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="text-red-400 font-bold mb-1">Błąd Pobierania Danych</h3>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="min-h-screen bg-black text-gray-200 selection:bg-orange-500 selection:text-white pb-20 font-inter">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-orange-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg shadow-lg shadow-orange-500/20">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Wall Street <span className="text-orange-500">Bitcoin</span> Insight
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest hidden sm:block font-medium">Analiza Kontraktów Futures (COT)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={handleRefresh}
                className="group p-2 rounded-full bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800 transition-all mr-2"
                title="Odśwież dane"
            >
                <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </button>

            <button 
                onClick={() => setIsEducationOpen(true)}
                className="group p-2 rounded-full bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800 transition-all"
                title="Słownik"
            >
                <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="border-b border-white/5 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Unit Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Coins className="w-4 h-4 text-orange-500" />
             <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
               <button
                  onClick={() => setUnit('btc')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                    unit === 'btc' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
               >
                 BTC
               </button>
               <button
                  onClick={() => setUnit('contracts')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                    unit === 'contracts' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
               >
                 Kontrakty
               </button>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded border border-slate-800 opacity-60">
             <Layers className="w-3 h-3 text-gray-400" />
             <span className="text-xs text-gray-400 font-mono">Raport: Futures Only</span>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
            <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
              {Object.values(TimeRange).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap min-w-[3rem] ${
                    timeRange === range 
                      ? 'bg-slate-800 text-white border border-slate-700 shadow' 
                      : 'text-gray-500 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard 
          data={data} 
          timeRange={timeRange}
          unit={unit}
        />
        
        {/* Footer Notes */}
        <div className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <div className="text-center md:text-left flex flex-col gap-1">
            <p>
              Źródło Danych:{" "}
              <a 
                href="https://www.cftc.gov/dea/futures/financial_lf.htm" 
                target="_blank" 
                rel="noreferrer" 
                className="text-gray-400 hover:text-orange-500 transition-colors"
              >
                CFTC Financial Futures
              </a>
              {" | "}
              <a 
                href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm" 
                target="_blank" 
                rel="noreferrer" 
                className="text-gray-400 hover:text-orange-500 transition-colors"
              >
                Historical Compressed
              </a>
            </p>
            <p className="opacity-70">1 Kontrakt = 5 BTC.</p>
          </div>
        </div>
      </main>

      <EducationDrawer 
        isOpen={isEducationOpen} 
        onClose={() => setIsEducationOpen(false)} 
      />
    </div>
  );
};

export default App;