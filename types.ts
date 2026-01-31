export interface RawDataPoint {
  [key: string]: string | number;
}

export interface ProcessedDataPoint {
  date: string;
  openInterest: number; // Official Open Interest from report
  assetManagerLong: number;
  assetManagerShort: number;
  leveragedFundsLong: number;
  leveragedFundsShort: number;
  dealerLong: number;
  dealerShort: number;
  otherLong: number;
  otherShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
  totalLong: number; // Calculated Total from components
  totalShort: number; // Calculated Total from components
  netAssetManager: number;
  netLeveragedFunds: number;
  netDealer: number;
  netOther: number;
  netNonReportable: number;
}

export interface DetailedCategoryStat {
  category: string;
  long: number;
  longChange: number;
  longPctOI: number;
  short: number;
  shortChange: number;
  shortPctOI: number;
  net: number;
  netChange: number;
}

export type Unit = 'btc' | 'contracts';

export enum ReportType {
  FuturesOnly = 'Tylko Futures',
}

export enum TimeRange {
  M1 = '1M',
  M3 = '3M',
  M6 = '6M',
  YTD = 'YTD',
  ALL = 'MAX',
}

export type CustomTimeFrame = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'CUSTOM';

export enum ChartMode {
  Net = 'Pozycja Netto',
  Long = 'Tylko Long',
  Short = 'Tylko Short'
}

export interface CategoryInfo {
  name: string;
  plName: string;
  description: string;
  insight: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Asset Manager': '#f97316', // Orange-500 (Bitcoin Orange)
  'Leveraged Funds': '#ef4444', // Red-500
  'Dealer': '#3b82f6', // Blue-500
  'Other Reportables': '#a8a29e', // Stone-400
  'Nonreportable': '#64748b', // Slate-500
};