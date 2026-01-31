import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, Legend, Brush } from 'recharts';
import { ProcessedDataPoint, ReportType, CATEGORY_COLORS, TimeRange, ChartMode, Unit, CustomTimeFrame } from '../types';
import { formatValue, filterByTimeRange, getChangeStats, generateDetailedStatsCustom, getUnitValue, getDataPointByDate, getDataPointAgo } from '../utils';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, PieChart as PieIcon, Layers, BarChart2, Table as TableIcon, LayoutDashboard, Calendar, ArrowRight, Clock } from 'lucide-react';

interface Props {
  data: ProcessedDataPoint[];
  timeRange: TimeRange;
  unit: Unit;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/95 border border-slate-700 p-4 rounded shadow-2xl backdrop-blur-md z-50">
        <p className="text-gray-400 text-xs mb-2 font-mono">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
              <span className="text-xs text-gray-300">{entry.name}:</span>
            </div>
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              {entry.unit === 'pct' ? `${entry.value.toFixed(1)}%` : formatValue(Math.abs(entry.value), unit)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<Props> = ({ data, timeRange, unit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');
  const [chartMode, setChartMode] = useState<ChartMode>(ChartMode.Net);
  
  // Available dates for dropdowns (latest first)
  const availableDates = useMemo(() => {
    return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(d => d.date);
  }, [data]);

  // --- Snapshot State ---
  const [snapshotDate, setSnapshotDate] = useState<string>('');

  // --- Comparison State ---
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTimeFrameBtn, setActiveTimeFrameBtn] = useState<CustomTimeFrame>('1W');

  // Initialize dates on data load
  useEffect(() => {
    if (availableDates.length > 0) {
      if (!snapshotDate) setSnapshotDate(availableDates[0]);
      if (!endDate) setEndDate(availableDates[0]);
      if (!startDate && availableDates.length > 1) setStartDate(availableDates[1]);
    }
  }, [availableDates]);

  // --- Data Processing for Snapshot View ---
  const snapshotData = useMemo(() => {
    return data.find(d => d.date === snapshotDate);
  }, [data, snapshotDate]);

  const totalSnapshotVolume = useMemo(() => {
    if (!snapshotData) return 0;
    return (
        snapshotData.assetManagerLong + snapshotData.assetManagerShort +
        snapshotData.leveragedFundsLong + snapshotData.leveragedFundsShort +
        snapshotData.dealerLong + snapshotData.dealerShort +
        snapshotData.otherLong + snapshotData.otherShort +
        snapshotData.nonReportableLong + snapshotData.nonReportableShort
    );
  }, [snapshotData]);

  const marketShareData = useMemo(() => {
    if (!snapshotData) return [];
    // Total Interest = Longs + Shorts
    return [
      { name: 'Asset Manager', value: getUnitValue(snapshotData.assetManagerLong + snapshotData.assetManagerShort, unit), color: CATEGORY_COLORS['Asset Manager'] },
      { name: 'Leveraged Funds', value: getUnitValue(snapshotData.leveragedFundsLong + snapshotData.leveragedFundsShort, unit), color: CATEGORY_COLORS['Leveraged Funds'] },
      { name: 'Dealer', value: getUnitValue(snapshotData.dealerLong + snapshotData.dealerShort, unit), color: CATEGORY_COLORS['Dealer'] },
      { name: 'Other Reportables', value: getUnitValue(snapshotData.otherLong + snapshotData.otherShort, unit), color: CATEGORY_COLORS['Other Reportables'] },
      { name: 'Nonreportable', value: getUnitValue(snapshotData.nonReportableLong + snapshotData.nonReportableShort, unit), color: CATEGORY_COLORS['Nonreportable'] },
    ].filter(i => i.value > 0);
  }, [snapshotData, unit]);

  const sentimentRatioData = useMemo(() => {
     if (!snapshotData) return [];
     // 100% Stacked Bar Data
     return [
        { name: 'Asset Mgr', long: snapshotData.assetManagerLong, short: snapshotData.assetManagerShort },
        { name: 'Lev Funds', long: snapshotData.leveragedFundsLong, short: snapshotData.leveragedFundsShort },
        { name: 'Dealer', long: snapshotData.dealerLong, short: snapshotData.dealerShort },
        { name: 'Other', long: snapshotData.otherLong, short: snapshotData.otherShort },
        { name: 'Retail', long: snapshotData.nonReportableLong, short: snapshotData.nonReportableShort },
     ].map(item => ({
        ...item,
        longVal: getUnitValue(item.long, unit),
        shortVal: getUnitValue(item.short, unit),
     }));
  }, [snapshotData, unit]);

  // --- Handlers & Existing Logic ---

  const handleTimeFrameClick = (tf: CustomTimeFrame) => {
    setActiveTimeFrameBtn(tf);
    if (availableDates.length < 2) return;

    const latest = availableDates[0];
    setEndDate(latest); 

    const latestDateObj = new Date(latest);
    let targetDateObj = new Date(latest);

    switch (tf) {
      case '1W':
        if (availableDates.length > 1) setStartDate(availableDates[1]);
        return;
      case '1M': targetDateObj.setMonth(targetDateObj.getMonth() - 1); break;
      case '3M': targetDateObj.setMonth(targetDateObj.getMonth() - 3); break;
      case '6M': targetDateObj.setMonth(targetDateObj.getMonth() - 6); break;
      case 'YTD': targetDateObj = new Date(latestDateObj.getFullYear(), 0, 1); break;
      case '1Y': targetDateObj.setFullYear(targetDateObj.getFullYear() - 1); break;
      default: return;
    }

    const closest = getDataPointByDate(data, targetDateObj);
    if (closest) setStartDate(closest.date);
  };
  
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    'Asset Manager': true, 'Leveraged Funds': true, 'Dealer': true, 'Other Reportables': false, 'Nonreportable': false,
  });

  const toggleCategory = (cat: string) => {
    setVisibleCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const [visibleAreaCategories, setVisibleAreaCategories] = useState<Record<string, boolean>>({
    'Asset Manager': true, 'Leveraged Funds': true, 'Dealer': true, 'Other Reportables': true, 'Nonreportable': true,
  });

  const toggleAreaCategory = (cat: string) => {
    setVisibleAreaCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredData = useMemo(() => {
    const rawFiltered = filterByTimeRange(data, timeRange);
    return rawFiltered.map(d => {
      const converted: any = { ...d };
      Object.keys(d).forEach(key => {
        if (typeof (d as any)[key] === 'number') {
           converted[key] = getUnitValue((d as any)[key], unit);
        }
      });
      return converted;
    });
  }, [data, timeRange, unit]);

  const stats = useMemo(() => getChangeStats(data), [data]);
  const latest = stats?.latest;
  const prevWeek = stats?.oneWeek;

  const comparisonStats = useMemo(() => {
    if (!startDate || !endDate) return [];
    const startPoint = data.find(d => d.date === startDate);
    const endPoint = data.find(d => d.date === endDate);
    if (!startPoint || !endPoint) return [];
    return generateDetailedStatsCustom(endPoint, startPoint);
  }, [data, startDate, endDate]);

  const totalStats = useMemo(() => {
    return comparisonStats.reduce((acc, curr) => ({
      long: acc.long + curr.long,
      longChange: acc.longChange + curr.longChange,
      short: acc.short + curr.short,
      shortChange: acc.shortChange + curr.shortChange,
      net: acc.net + curr.net,
      netChange: acc.netChange + curr.netChange
    }), { long: 0, longChange: 0, short: 0, shortChange: 0, net: 0, netChange: 0 });
  }, [comparisonStats]);

  if (!stats || !latest || !prevWeek) return <div className="text-center p-10 text-gray-500">Ładowanie danych analitycznych...</div>;

  const changeData = comparisonStats.map(s => ({
    name: s.category,
    changeLong: getUnitValue(s.longChange, unit),
    changeShort: getUnitValue(s.shortChange, unit),
    changeNet: getUnitValue(s.netChange, unit)
  }));

  const ringStats = generateDetailedStatsCustom(latest, prevWeek); 
  const ringDataLong = ringStats.map(s => ({ name: s.category, value: getUnitValue(s.long, unit), color: CATEGORY_COLORS[s.category] }));
  const ringDataShort = ringStats.map(s => ({ name: s.category, value: getUnitValue(s.short, unit), color: CATEGORY_COLORS[s.category] }));

  // --- SUB-COMPONENTS ---

  const StatCard = ({ title, value, prevValue }: any) => {
    const unitVal = getUnitValue(value, unit);
    const prevUnitVal = getUnitValue(prevValue, unit);
    const diff = unitVal - prevUnitVal;
    const percent = prevUnitVal !== 0 ? (diff / Math.abs(prevUnitVal)) * 100 : 0;
    const isPositive = diff > 0;

    return (
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:border-orange-500/20 transition-all group flex flex-col justify-between">
        <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 group-hover:text-orange-500 transition-colors">{title}</h3>
        <div className="text-2xl font-bold font-mono text-white mb-2 tracking-tight">
          {formatValue(value, unit, false)}
        </div>
        <div className={`flex items-center text-xs font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, {maximumFractionDigits:0})} ({Math.abs(percent).toFixed(2)}%)
        </div>
      </div>
    );
  };

  const DetailedReportView = () => (
    <div className="space-y-8 animate-fade-in">
      {/* 1. SECTION: CUSTOM CHANGE CHART (Delta) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6">
             <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-orange-500" />
                Analiza Zmian Pozycji (Delta)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Zmiana pozycji pomiędzy dwiema wybranymi datami raportów.
                </p>
             </div>
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {(['1W', '1M', '3M', '6M', 'YTD', '1Y'] as CustomTimeFrame[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => handleTimeFrameClick(tf)}
                            className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${activeTimeFrameBtn === tf ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <label className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">Początek (Od)</label>
                      <select 
                        className="bg-transparent text-xs text-white outline-none font-mono cursor-pointer hover:text-orange-400 transition-colors"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setActiveTimeFrameBtn('CUSTOM');
                        }}
                      >
                        {availableDates.map(d => (
                          <option key={`start-${d}`} value={d} className="bg-slate-900 text-gray-300">
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-600" />
                    <div className="flex flex-col">
                      <label className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">Koniec (Do)</label>
                       <select 
                        className="bg-transparent text-xs text-white outline-none font-mono cursor-pointer hover:text-orange-400 transition-colors"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setActiveTimeFrameBtn('CUSTOM');
                        }}
                      >
                        {availableDates.map(d => (
                          <option key={`end-${d}`} value={d} className="bg-slate-900 text-gray-300">
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                </div>
             </div>
        </div>
        <div className="h-[350px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={changeData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
               <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
               <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
               <Tooltip 
                  cursor={{fill: 'transparent'}}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black/90 border border-slate-700 p-3 rounded shadow-xl backdrop-blur-md">
                          <p className="text-gray-400 text-xs mb-2">{label} (Zmiana)</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className={`text-xs font-mono mb-1 ${entry.dataKey === 'changeLong' ? 'text-green-400' : 'text-red-400'}`}>
                              {entry.name}: {entry.value > 0 ? '+' : ''}{entry.value.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
               />
               <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
               <ReferenceLine y={0} stroke="#475569" />
               <Bar dataKey="changeLong" name="Zmiana Long (Kupno)" fill="#22c55e" radius={[2, 2, 0, 0]} />
               <Bar dataKey="changeShort" name="Zmiana Short (Sprzedaż)" fill="#ef4444" radius={[2, 2, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
      
       <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
           <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-orange-500" />
              Tabela Pozycji (Raport)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Dane dla daty końcowej: <span className="text-white font-mono">{endDate}</span> (Zmiany względem: {startDate})
            </p>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-slate-800">
                <th className="p-4 border-r border-slate-800 sticky left-0 bg-slate-950 z-10">Kategoria</th>
                <th colSpan={3} className="p-4 text-center border-r border-slate-800 text-green-500/80 bg-green-900/10">Long (Byki)</th>
                <th colSpan={3} className="p-4 text-center border-r border-slate-800 text-red-500/80 bg-red-900/10">Short (Niedźwiedzie)</th>
                <th colSpan={2} className="p-4 text-center">Netto</th>
              </tr>
              <tr className="text-xs text-gray-400 border-b border-slate-800 font-mono bg-slate-900">
                <th className="p-3 border-r border-slate-800 sticky left-0 bg-slate-900">Uczestnik</th>
                <th className="p-3 text-right bg-green-900/5">Pozycje</th>
                <th className="p-3 text-right bg-green-900/5">% OI</th>
                <th className="p-3 text-right bg-green-900/5">Zmiana</th>
                <th className="p-3 text-right border-l border-slate-800 bg-red-900/5">Pozycje</th>
                <th className="p-3 text-right bg-red-900/5">% OI</th>
                <th className="p-3 text-right bg-red-900/5">Zmiana</th>
                <th className="p-3 text-right border-l border-slate-800">Pozycja</th>
                <th className="p-3 text-right">Zmiana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {comparisonStats.map((row) => {
                const l = getUnitValue(row.long, unit);
                const lChg = getUnitValue(row.longChange, unit);
                const s = getUnitValue(row.short, unit);
                const sChg = getUnitValue(row.shortChange, unit);
                const n = getUnitValue(row.net, unit);
                const nChg = getUnitValue(row.netChange, unit);
                return (
                <tr key={row.category} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4 text-sm font-bold text-gray-200 border-r border-slate-800 sticky left-0 bg-slate-900 group-hover:bg-slate-800/50 flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[row.category] }}></div>
                    {row.category}
                  </td>
                  <td className="p-4 text-right font-mono text-white bg-green-900/5">{l.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  <td className="p-4 text-right font-mono text-gray-400 text-xs bg-green-900/5">{row.longPctOI.toFixed(1)}%</td>
                  <td className="p-4 text-right font-mono bg-green-900/5"><span className={`text-[10px] px-1.5 py-0.5 rounded ${lChg > 0 ? 'bg-green-500/20 text-green-400' : lChg < 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-600'}`}>{lChg > 0 ? '+' : ''}{lChg.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></td>
                  <td className="p-4 text-right font-mono text-white border-l border-slate-800 bg-red-900/5">{s.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  <td className="p-4 text-right font-mono text-gray-400 text-xs bg-red-900/5">{row.shortPctOI.toFixed(1)}%</td>
                  <td className="p-4 text-right font-mono bg-red-900/5"><span className={`text-[10px] px-1.5 py-0.5 rounded ${sChg > 0 ? 'bg-red-500/20 text-red-400' : sChg < 0 ? 'bg-green-500/20 text-green-400' : 'text-gray-600'}`}>{sChg > 0 ? '+' : ''}{sChg.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></td>
                  <td className="p-4 text-right font-mono font-bold text-white border-l border-slate-800">{n.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  <td className="p-4 text-right font-mono"><span className={`text-[10px] px-1.5 py-0.5 rounded ${nChg > 0 ? 'bg-green-500/20 text-green-400' : nChg < 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-600'}`}>{nChg > 0 ? '+' : ''}{nChg.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></td>
                </tr>
              )})}
            </tbody>
            <tfoot>
               <tr className="bg-slate-950/80 border-t border-slate-700 font-bold text-xs uppercase tracking-wider text-white">
                 <td className="p-4 border-r border-slate-800 sticky left-0 bg-slate-950">TOTAL</td>
                 <td className="p-4 text-right font-mono text-green-400 bg-green-900/5">{formatValue(totalStats.long, unit, false)}</td>
                 <td className="p-4 text-right font-mono text-gray-500 bg-green-900/5">100%</td>
                 <td className="p-4 text-right font-mono bg-green-900/5"><span className={`px-1.5 py-0.5 rounded ${totalStats.longChange > 0 ? 'bg-green-500/20 text-green-400' : totalStats.longChange < 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-600'}`}>{totalStats.longChange > 0 ? '+' : ''}{formatValue(totalStats.longChange, unit, false)}</span></td>
                 <td className="p-4 text-right font-mono text-red-400 border-l border-slate-800 bg-red-900/5">{formatValue(totalStats.short, unit, false)}</td>
                 <td className="p-4 text-right font-mono text-gray-500 bg-red-900/5">100%</td>
                 <td className="p-4 text-right font-mono bg-red-900/5"><span className={`px-1.5 py-0.5 rounded ${totalStats.shortChange > 0 ? 'bg-red-500/20 text-red-400' : totalStats.shortChange < 0 ? 'bg-green-500/20 text-green-400' : 'text-gray-600'}`}>{totalStats.shortChange > 0 ? '+' : ''}{formatValue(totalStats.shortChange, unit, false)}</span></td>
                 <td className="p-4 text-right font-mono border-l border-slate-800 text-gray-500">0</td>
                  <td className="p-4 text-right font-mono text-gray-500">0</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  const OverviewView = () => (
    <div className="space-y-8 animate-fade-in">
       
       {/* NEW: MARKET SNAPSHOT (DATE SELECTABLE) */}
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
             <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-orange-500" />
                  Migawka Rynku (Snapshot)
                </h2>
                <p className="text-xs text-gray-500 mt-1">Struktura kapitału oraz sentyment dla wybranej daty.</p>
             </div>
             <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <div className="flex flex-col">
                    <label className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">Wybierz Datę</label>
                    <select 
                      className="bg-transparent text-xs text-white outline-none font-mono cursor-pointer hover:text-orange-400 transition-colors"
                      value={snapshotDate}
                      onChange={(e) => setSnapshotDate(e.target.value)}
                    >
                      {availableDates.map(d => (
                        <option key={`snap-${d}`} value={d} className="bg-slate-900 text-gray-300">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* LEFT: Market Share Ring (Total OI) */}
             <div className="bg-black/20 rounded-xl p-4 border border-slate-800/50 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        Udział w Rynku
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">Suma pozycji Long + Short</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Łączne Zaangażowanie</p>
                        <p className="text-lg font-bold text-white font-mono">{formatValue(totalSnapshotVolume, unit, true)}</p>
                    </div>
                </div>
                
                <div className="h-[250px] w-full relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie 
                        data={marketShareData} 
                        cx="50%"
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={3} 
                        dataKey="value"
                        stroke="none"
                       >
                          {marketShareData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                       </Pie>
                       <Tooltip content={<CustomTooltip unit={unit} />} />
                       <Legend iconSize={8} wrapperStyle={{fontSize: '11px', color: '#9ca3af'}} layout="vertical" verticalAlign="middle" align="right" />
                     </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* RIGHT: Long vs Short Ratio (Stacked Bar) */}
             <div className="bg-black/20 rounded-xl p-4 border border-slate-800/50">
                <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4 text-green-400" />
                   Sentyment: Long vs Short
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      layout="vertical" 
                      data={sentimentRatioData} 
                      stackOffset="expand" // This creates the 0-100% normalized view
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                       <XAxis type="number" hide />
                       <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 600}} 
                          width={80} 
                       />
                       <Tooltip 
                          cursor={{fill: 'transparent'}}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const longVal = payload[0].payload.longVal;
                              const shortVal = payload[0].payload.shortVal;
                              const total = longVal + shortVal;
                              const longPct = (longVal / total) * 100;
                              const shortPct = (shortVal / total) * 100;
                              
                              return (
                                <div className="bg-black/95 border border-slate-700 p-3 rounded shadow-xl backdrop-blur-md">
                                  <p className="text-white text-xs mb-2 font-bold">{label}</p>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-green-400">Long: {longPct.toFixed(1)}% ({formatValue(longVal, unit, false)})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs text-red-400">Short: {shortPct.toFixed(1)}% ({formatValue(shortVal, unit, false)})</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                       />
                       <Bar dataKey="longVal" stackId="a" fill="#22c55e" barSize={20} radius={[4, 0, 0, 4]} />
                       <Bar dataKey="shortVal" stackId="a" fill="#ef4444" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                 <div className="flex justify-center gap-6 mt-2 text-[10px] uppercase font-bold tracking-wider">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-green-500 rounded sm:rounded-sm"></div>
                       <span className="text-green-500">Long</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-red-500 rounded sm:rounded-sm"></div>
                       <span className="text-red-500">Short</span>
                    </div>
                 </div>
             </div>
          </div>
       </div>

       {/* EXISTING: RING CHARTS (Structure) - Keeping as supplementary */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center shadow-lg overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 z-10">
              <Layers className="w-4 h-4 text-green-500" />
              Struktura Longów (Kto kupuje?)
            </h3>
            <div className="h-[300px] w-full z-10 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                    data={ringDataLong} 
                    cx="50%"
                    cy="45%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    stroke="none"
                   >
                      {ringDataLong.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip unit={unit} />} />
                   <Legend iconSize={8} wrapperStyle={{fontSize: '11px', color: '#9ca3af'}} layout="horizontal" verticalAlign="bottom" align="center" />
                 </PieChart>
               </ResponsiveContainer>
               
               {/* Center Info */}
               <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total</span>
                  <div className="text-xl font-bold text-white">{formatValue(latest.totalLong, unit, false)}</div>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center shadow-lg overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 z-10">
              <Layers className="w-4 h-4 text-red-500" />
              Struktura Shortów (Kto sprzedaje?)
            </h3>
            <div className="h-[300px] w-full z-10 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                    data={ringDataShort} 
                    cx="50%"
                    cy="45%"
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    stroke="none"
                   >
                      {ringDataShort.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip unit={unit} />} />
                   <Legend iconSize={8} wrapperStyle={{fontSize: '11px', color: '#9ca3af'}} layout="horizontal" verticalAlign="bottom" align="center" />
                 </PieChart>
               </ResponsiveContainer>

               {/* Center Info */}
               <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total</span>
                  <div className="text-xl font-bold text-white">{formatValue(latest.totalShort, unit, false)}</div>
               </div>
            </div>
          </div>
       </div>

       {/* 1. TOTAL OPEN INTEREST STACKED CHART (With Toggles) - LINEAR */}
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
            <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Layers className="w-5 h-5 text-purple-500" />
                 Całkowity Open Interest (Wielkość Rynku)
               </h2>
               <p className="text-xs text-gray-500 mt-1">Suma pozycji długich. Wybierz grupy, aby zobaczyć ich udział.</p>
            </div>
             <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <button
                    key={`area-${cat}`}
                    onClick={() => toggleAreaCategory(cat)}
                    className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all border ${
                      visibleAreaCategories[cat] 
                        ? 'bg-slate-800 text-white border-slate-600' 
                        : 'bg-slate-950 text-gray-600 border-transparent hover:border-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block mr-2" style={{ backgroundColor: CATEGORY_COLORS[cat] }}></span>
                    {cat === 'Asset Manager' ? 'Asset Mgr' : cat === 'Leveraged Funds' ? 'Lev Funds' : cat === 'Other Reportables' ? 'Other' : cat}
                  </button>
                ))}
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('pl-PL', {month:'short', year:'2-digit'})} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <Legend iconSize={8} wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                
                {visibleAreaCategories['Asset Manager'] && (
                   <Area type="linear" stackId="1" dataKey="assetManagerLong" name="Asset Mgr" fill={CATEGORY_COLORS['Asset Manager']} stroke={CATEGORY_COLORS['Asset Manager']} fillOpacity={0.8} />
                )}
                {visibleAreaCategories['Leveraged Funds'] && (
                   <Area type="linear" stackId="1" dataKey="leveragedFundsLong" name="Lev Funds" fill={CATEGORY_COLORS['Leveraged Funds']} stroke={CATEGORY_COLORS['Leveraged Funds']} fillOpacity={0.8} />
                )}
                {visibleAreaCategories['Dealer'] && (
                   <Area type="linear" stackId="1" dataKey="dealerLong" name="Dealer" fill={CATEGORY_COLORS['Dealer']} stroke={CATEGORY_COLORS['Dealer']} fillOpacity={0.8} />
                )}
                {visibleAreaCategories['Other Reportables'] && (
                   <Area type="linear" stackId="1" dataKey="otherLong" name="Other" fill={CATEGORY_COLORS['Other Reportables']} stroke={CATEGORY_COLORS['Other Reportables']} fillOpacity={0.8} />
                )}
                {visibleAreaCategories['Nonreportable'] && (
                   <Area type="linear" stackId="1" dataKey="nonReportableLong" name="Retail" fill={CATEGORY_COLORS['Nonreportable']} stroke={CATEGORY_COLORS['Nonreportable']} fillOpacity={0.8} />
                )}
                
                {/* Zoom Slider */}
                <Brush 
                    dataKey="date" 
                    height={30} 
                    stroke="#f97316" 
                    fill="#0f172a" 
                    tickFormatter={(val) => new Date(val).toLocaleDateString('pl-PL', { month: 'numeric', year: '2-digit' })}
                    travellerWidth={10}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>

      {/* 3. MAIN CATEGORY BREAKDOWN CHART - LINEAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Detale Pozycjonowania (Wg Grup)
            </h2>
            <div className="flex items-center gap-2 mt-2">
               {Object.values(ChartMode).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${chartMode === mode ? 'bg-slate-700 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {mode}
                  </button>
               ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(CATEGORY_COLORS).map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all border ${
                  visibleCategories[cat] 
                    ? 'bg-slate-800 text-white border-slate-600' 
                    : 'bg-slate-950 text-gray-600 border-transparent hover:border-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full inline-block mr-2" style={{ backgroundColor: CATEGORY_COLORS[cat] }}></span>
                {cat === 'Asset Manager' ? 'Asset Mgr' : cat === 'Leveraged Funds' ? 'Lev Funds' : cat === 'Other Reportables' ? 'Other' : cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                tickMargin={10}
                tickFormatter={(val) => new Date(val).toLocaleDateString('pl-PL', {month:'short', day:'numeric', year: '2-digit'})} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                width={40}
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              
              {/* Lines rendering based on visibility state - LINEAR */}
              {visibleCategories['Asset Manager'] && (
                <Line 
                  type="linear" 
                  dataKey={chartMode === ChartMode.Net ? "netAssetManager" : chartMode === ChartMode.Long ? "assetManagerLong" : "assetManagerShort"} 
                  name="Asset Manager" 
                  stroke={CATEGORY_COLORS['Asset Manager']} 
                  strokeWidth={3} 
                  dot={false} 
                />
              )}
              {visibleCategories['Leveraged Funds'] && (
                <Line 
                  type="linear" 
                  dataKey={chartMode === ChartMode.Net ? "netLeveragedFunds" : chartMode === ChartMode.Long ? "leveragedFundsLong" : "leveragedFundsShort"} 
                  name="Leveraged Funds" 
                  stroke={CATEGORY_COLORS['Leveraged Funds']} 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
              {visibleCategories['Dealer'] && (
                <Line 
                  type="linear" 
                  dataKey={chartMode === ChartMode.Net ? "netDealer" : chartMode === ChartMode.Long ? "dealerLong" : "dealerShort"} 
                  name="Dealer" 
                  stroke={CATEGORY_COLORS['Dealer']} 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
              {visibleCategories['Other Reportables'] && (
                <Line 
                  type="linear" 
                  dataKey={chartMode === ChartMode.Net ? "netOther" : chartMode === ChartMode.Long ? "otherLong" : "otherShort"} 
                  name="Other Reportables" 
                  stroke={CATEGORY_COLORS['Other Reportables']} 
                  strokeWidth={1} 
                  strokeDasharray="4 4" 
                  dot={false} 
                />
              )}
              {visibleCategories['Nonreportable'] && (
                <Line 
                  type="linear" 
                  dataKey={chartMode === ChartMode.Net ? "netNonReportable" : chartMode === ChartMode.Long ? "nonReportableLong" : "nonReportableShort"} 
                  name="Retail" 
                  stroke={CATEGORY_COLORS['Nonreportable']} 
                  strokeWidth={1} 
                  strokeDasharray="2 2" 
                  dot={false} 
                />
              )}

              {/* Zoom Slider */}
              <Brush 
                dataKey="date" 
                height={30} 
                stroke="#f97316" 
                fill="#0f172a" 
                tickFormatter={(val) => new Date(val).toLocaleDateString('pl-PL', { month: 'numeric', year: '2-digit' })}
                travellerWidth={10}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );

  return (
    <div>
      {/* KPI Cards - Always Visible as "Menu Cards" */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Asset Mgr Net (Smart Money)" value={latest.netAssetManager} prevValue={stats.oneWeek.netAssetManager} />
        <StatCard title="Lev Funds Net (Speculative)" value={latest.netLeveragedFunds} prevValue={stats.oneWeek.netLeveragedFunds} />
        <StatCard title="Dealer Net (Hedging)" value={latest.netDealer} prevValue={stats.oneWeek.netDealer} />
        
        {/* Basis Trade Indicator */}
        <div className="bg-gradient-to-br from-orange-900/10 to-slate-900 border border-orange-500/20 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Basis Trade (Short Lev Funds)
            </h3>
            <div className="text-2xl font-bold font-mono text-white mb-1">
              {formatValue(latest.leveragedFundsShort, unit, false)}
            </div>
            <p className="text-[10px] text-gray-500">{unit === 'contracts' ? 'Kontraktów' : 'BTC'}</p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Wykresy & Struktura
          </button>
          <button 
            onClick={() => setActiveTab('detailed')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'detailed' ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <TableIcon className="w-4 h-4" />
            Tabela & Zmiany
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? <OverviewView /> : <DetailedReportView />}
    </div>
  );
};

export default Dashboard;