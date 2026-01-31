import { RawDataPoint, ProcessedDataPoint, ReportType, TimeRange, DetailedCategoryStat, Unit, CustomTimeFrame } from './types';

const CONTRACT_SIZE_BTC = 5;

/**
 * Fetches CSV data from a URL and parses it.
 */
export const fetchCSVData = async (url: string): Promise<RawDataPoint[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error("Error fetching CSV data:", error);
    throw error;
  }
};

export const parseCSV = (csv: string): RawDataPoint[] => {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Robust CSV Header Splitting (handling potential quotes)
  // Simple split by comma is usually fine for Google Sheets export unless titles have commas.
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data: RawDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle rows that might be empty or malformed
    if (!lines[i].trim()) continue;

    // Split logic handling quotes matches standard CSV parsing
    // This regex splits by comma only if not inside quotes
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    // Fallback to simple split if regex fails or returns wildly different length
    // (Google sheets simple numeric export usually doesn't need complex regex)
    const splitRow = row && row.length === headers.length ? row : lines[i].split(',');

    if (splitRow.length < headers.length) continue;
    
    const rowData: RawDataPoint = {};
    headers.forEach((header, index) => {
      // Remove quotes if present
      let val = splitRow[index]?.trim().replace(/^"|"$/g, '') || '';
      
      // Attempt to convert to number if possible
      // Check if it looks like a number and not an empty string or date-like string
      // Note: We want to keep dates as strings initially to parse them specifically later if needed
      if (!isNaN(Number(val)) && val !== '' && !val.includes('-')) {
        rowData[header] = Number(val);
      } else if (val === '.') {
         rowData[header] = 0; // Handle missing data points represented by '.'
      } else {
        rowData[header] = val;
      }
    });
    data.push(rowData);
  }
  return data;
};

export const processData = (rawData: RawDataPoint[], type: ReportType): ProcessedDataPoint[] => {
  // Filter for Futures Only based on the column 'FutOnly_or_Combined' if it exists.
  const filtered = rawData.filter(d => {
      if (d['FutOnly_or_Combined']) {
          return d['FutOnly_or_Combined'] === 'FutOnly';
      }
      return true;
  });

  const processed: ProcessedDataPoint[] = filtered.map(row => {
    // Helper to safely get number or 0
    const getNum = (key: string): number => {
      const val = row[key];
      return typeof val === 'number' ? val : 0;
    };

    // Date Parsing
    let dateStr = row['Report_Date_as_YYYY-MM-DD'] as string;
    
    // Ensure standard ISO format if Google Sheets returns different formats (e.g. M/D/YYYY)
    if (dateStr && !dateStr.includes('-')) {
       const dateObj = new Date(dateStr);
       if (!isNaN(dateObj.getTime())) {
           dateStr = dateObj.toISOString().split('T')[0];
       }
    }

    // Mapping Specific Columns requested
    const openInterest = getNum('Open_Interest_All') * CONTRACT_SIZE_BTC;
    
    const assetManagerLong = getNum('Asset_Mgr_Positions_Long_All') * CONTRACT_SIZE_BTC;
    const assetManagerShort = getNum('Asset_Mgr_Positions_Short_All') * CONTRACT_SIZE_BTC;
    
    const leveragedFundsLong = getNum('Lev_Money_Positions_Long_All') * CONTRACT_SIZE_BTC;
    const leveragedFundsShort = getNum('Lev_Money_Positions_Short_All') * CONTRACT_SIZE_BTC;
    
    // Mapping other columns for completeness (Dashboard requires them)
    // If Google Sheet is missing them, they default to 0
    const dealerLong = getNum('Dealer_Positions_Long_All') * CONTRACT_SIZE_BTC;
    const dealerShort = getNum('Dealer_Positions_Short_All') * CONTRACT_SIZE_BTC;
    
    const otherLong = getNum('Other_Rept_Positions_Long_All') * CONTRACT_SIZE_BTC;
    const otherShort = getNum('Other_Rept_Positions_Short_All') * CONTRACT_SIZE_BTC;
    
    const nonReportableLong = getNum('NonRept_Positions_Long_All') * CONTRACT_SIZE_BTC;
    const nonReportableShort = getNum('NonRept_Positions_Short_All') * CONTRACT_SIZE_BTC;

    return {
      date: dateStr,
      openInterest,
      
      assetManagerLong,
      assetManagerShort,
      leveragedFundsLong,
      leveragedFundsShort,
      dealerLong,
      dealerShort,
      otherLong,
      otherShort,
      nonReportableLong,
      nonReportableShort,
      
      // Totals (Derived)
      totalLong: assetManagerLong + leveragedFundsLong + dealerLong + otherLong + nonReportableLong,
      totalShort: assetManagerShort + leveragedFundsShort + dealerShort + otherShort + nonReportableShort,
      
      // Nets
      netAssetManager: assetManagerLong - assetManagerShort,
      netLeveragedFunds: leveragedFundsLong - leveragedFundsShort,
      netDealer: dealerLong - dealerShort,
      netOther: otherLong - otherShort,
      netNonReportable: nonReportableLong - nonReportableShort,
    };
  });

  // Filter out invalid dates and sort
  return processed
    .filter(p => p.date) 
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const filterByTimeRange = (data: ProcessedDataPoint[], range: TimeRange): ProcessedDataPoint[] => {
  if (range === TimeRange.ALL) return data;
  if (data.length === 0) return [];

  const now = new Date(data[data.length - 1].date);
  const cutoff = new Date(now);

  switch (range) {
    case TimeRange.M1:
      cutoff.setMonth(now.getMonth() - 1);
      break;
    case TimeRange.M3:
      cutoff.setMonth(now.getMonth() - 3);
      break;
    case TimeRange.M6:
      cutoff.setMonth(now.getMonth() - 6);
      break;
    case TimeRange.YTD:
      cutoff.setMonth(0);
      cutoff.setDate(1);
      cutoff.setFullYear(now.getFullYear());
      break;
  }

  return data.filter(d => new Date(d.date) >= cutoff);
};

export const getDataPointAgo = (data: ProcessedDataPoint[], periods: number) => {
  if (data.length <= periods) return null;
  return data[data.length - 1 - periods];
};

export const getDataPointByDate = (data: ProcessedDataPoint[], targetDate: Date) => {
  for (let i = data.length - 1; i >= 0; i--) {
    const d = new Date(data[i].date);
    if (d <= targetDate) {
      return data[i];
    }
  }
  return data[0];
};

// --- Custom Delta Logic for Change Charts ---

export const getComparisonDataPoint = (data: ProcessedDataPoint[], frame: CustomTimeFrame, customStart?: string): ProcessedDataPoint | null => {
  if (data.length < 2) return null;
  const latest = data[data.length - 1];
  const latestDate = new Date(latest.date);

  if (frame === 'CUSTOM' && customStart) {
    return getDataPointByDate(data, new Date(customStart));
  }

  const targetDate = new Date(latestDate);

  switch (frame) {
    case '1W':
      return data[data.length - 2];
    case '1M':
      targetDate.setMonth(targetDate.getMonth() - 1);
      break;
    case '3M':
      targetDate.setMonth(targetDate.getMonth() - 3);
      break;
    case '6M':
      targetDate.setMonth(targetDate.getMonth() - 6);
      break;
    case 'YTD':
      targetDate.setMonth(0);
      targetDate.setDate(1);
      targetDate.setFullYear(latestDate.getFullYear());
      break;
    case '1Y':
      targetDate.setFullYear(targetDate.getFullYear() - 1);
      break;
    default:
      return data[data.length - 2];
  }

  return getDataPointByDate(data, targetDate);
};

export const generateDetailedStatsCustom = (
  curr: ProcessedDataPoint, 
  prev: ProcessedDataPoint
): DetailedCategoryStat[] => {
  const marketSize = curr.totalLong; 

  const createStat = (
    catName: string, 
    long: number, prevLong: number, 
    short: number, prevShort: number,
    net: number, prevNet: number
  ): DetailedCategoryStat => ({
    category: catName,
    long,
    longChange: long - prevLong,
    longPctOI: marketSize > 0 ? (long / marketSize) * 100 : 0,
    short,
    shortChange: short - prevShort,
    shortPctOI: marketSize > 0 ? (short / marketSize) * 100 : 0,
    net,
    netChange: net - prevNet
  });

  return [
    createStat('Dealer', curr.dealerLong, prev.dealerLong, curr.dealerShort, prev.dealerShort, curr.netDealer, prev.netDealer),
    createStat('Asset Manager', curr.assetManagerLong, prev.assetManagerLong, curr.assetManagerShort, prev.assetManagerShort, curr.netAssetManager, prev.netAssetManager),
    createStat('Leveraged Funds', curr.leveragedFundsLong, prev.leveragedFundsLong, curr.leveragedFundsShort, prev.leveragedFundsShort, curr.netLeveragedFunds, prev.netLeveragedFunds),
    createStat('Other Reportables', curr.otherLong, prev.otherLong, curr.otherShort, prev.otherShort, curr.netOther, prev.netOther),
    createStat('Nonreportable', curr.nonReportableLong, prev.nonReportableLong, curr.nonReportableShort, prev.nonReportableShort, curr.netNonReportable, prev.netNonReportable),
  ];
};

export const getChangeStats = (data: ProcessedDataPoint[]) => {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const latestDate = new Date(latest.date);
  const oneWeekAgo = data[data.length - 2];
  
  return {
    latest,
    oneWeek: oneWeekAgo,
  };
};

// --- Formatting ---

export const getUnitValue = (valBTC: number, unit: Unit) => {
  return unit === 'contracts' ? valBTC / CONTRACT_SIZE_BTC : valBTC;
}

export const formatValue = (valBTC: number, unit: Unit, showSuffix = true) => {
  const val = getUnitValue(valBTC, unit);
  const numStr = val.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  if (!showSuffix) return numStr;
  return unit === 'contracts' ? `${numStr} Kont.` : `${numStr} BTC`;
};

// --- AI & Reports Helpers ---

export const generateAIContext = (data: ProcessedDataPoint[]): string => {
  if (!data || data.length === 0) return "Brak danych.";
  const latest = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;

  let context = `Raport COT (Futures Only) - Bitcoin\nData Raportu: ${latest.date}\n`;
  context += `Open Interest: ${latest.openInterest} BTC\n\n`;

  const groups = [
    { name: 'Asset Manager', l: latest.assetManagerLong, s: latest.assetManagerShort, n: latest.netAssetManager },
    { name: 'Leveraged Funds', l: latest.leveragedFundsLong, s: latest.leveragedFundsShort, n: latest.netLeveragedFunds },
    { name: 'Dealer', l: latest.dealerLong, s: latest.dealerShort, n: latest.netDealer },
    { name: 'Other Reportables', l: latest.otherLong, s: latest.otherShort, n: latest.netOther },
    { name: 'Retail (Nonreportable)', l: latest.nonReportableLong, s: latest.nonReportableShort, n: latest.netNonReportable },
  ];

  groups.forEach(g => {
    context += `[${g.name}]\nLong: ${g.l}\nShort: ${g.s}\nNet: ${g.n}\n`;
    if (prev) {
       // Ideally we could add prev values, but simple current state is usually enough for basic Q&A
    }
    context += '\n';
  });

  return context;
};

export const generateStaticReport = (data: ProcessedDataPoint[]): string => {
  if (data.length < 2) return "Brak wystarczających danych.";
  
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  
  const fmt = (v: number) => v.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const d = (c: number, p: number) => { const diff = c - p; return `${diff > 0 ? '+' : ''}${fmt(diff)}`; };

  return `## Raport COT - ${latest.date}

### Asset Managers (Smart Money)
* **Netto:** ${fmt(latest.netAssetManager)} (${d(latest.netAssetManager, prev.netAssetManager)})
* **Long:** ${fmt(latest.assetManagerLong)} (${d(latest.assetManagerLong, prev.assetManagerLong)})
* **Short:** ${fmt(latest.assetManagerShort)} (${d(latest.assetManagerShort, prev.assetManagerShort)})

### Leveraged Funds
* **Netto:** ${fmt(latest.netLeveragedFunds)} (${d(latest.netLeveragedFunds, prev.netLeveragedFunds)})
* **Long:** ${fmt(latest.leveragedFundsLong)} (${d(latest.leveragedFundsLong, prev.leveragedFundsLong)})
* **Short:** ${fmt(latest.leveragedFundsShort)} (${d(latest.leveragedFundsShort, prev.leveragedFundsShort)})

### Pozostali
* **Dealer Net:** ${fmt(latest.netDealer)} (${d(latest.netDealer, prev.netDealer)})
* **Retail Net:** ${fmt(latest.netNonReportable)} (${d(latest.netNonReportable, prev.netNonReportable)})
`;
};
