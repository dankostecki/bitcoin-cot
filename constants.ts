import { CategoryInfo } from './types';

// URL to the live CSV data (Google Sheets Export)
export const DATA_URL = "https://docs.google.com/spreadsheets/d/1K4Hgbe7O93tUxrpI5Mpmmhgkg140kJ7wFpctBwvqdu4/export?format=csv";

// Placeholder, cleared as requested
export const CSV_DATA = "";

export const EDUCATIONAL_CONTENT: Record<string, CategoryInfo> = {
  'Asset Manager': {
    name: 'Asset Manager',
    plName: 'Inwestorzy Instytucjonalni (Asset Manager)',
    description: 'Instytucje zarządzające aktywami, takie jak fundusze emerytalne, towarzystwa ubezpieczeniowe czy fundusze inwestycyjne. Są to zazwyczaj inwestorzy typu "real money", którzy rzadziej spekulują, a częściej akumulują lub zabezpieczają portfele.',
    insight: 'Asset Managerowie często są "long-only" (grają na wzrosty) lub używają futures do zabezpieczania ekspozycji. Wzrost pozycji Net Long w tej grupie jest silnym sygnałem akumulacji instytucjonalnej i długoterminowego byczego sentymentu.'
  },
  'Leveraged Funds': {
    name: 'Leveraged Funds',
    plName: 'Fundusze Lewarowane (Leveraged Funds)',
    description: 'Fundusze hedgingowe (Hedge Funds) oraz doradcy w handlu towarami (CTA). Uczestnicy ci są wysoce spekulacyjni, używają dźwigni finansowej, by maksymalizować zyski.',
    insight: 'WAŻNE: Duża pozycja SHORT w tej grupie na Bitcoinie NIE zawsze oznacza zakład na spadki. Bardzo często jest to tzw. "Cash and Carry" (Basis Trade) – fundusz kupuje Bitcoina na rynku spot i sprzedaje kontrakt futures, zarabiając na różnicy cen (funding rate/premium) bez ryzyka kierunkowego.'
  },
  'Dealer': {
    name: 'Dealer',
    plName: 'Animatorzy Rynku (Dealers)',
    description: 'Strona podażowa rynku ("sell side"). Duże banki inwestycyjne i dealerzy, którzy tworzą rynek, zajmując drugą stronę transakcji swoich klientów.',
    insight: 'Dealerzy głównie zabezpieczają swoje księgi (delta hedging). Jeśli są Net Short, prawdopodobnie sprzedali klientom (np. ETF-om lub korporacjom) ekspozycję na wzrosty i zabezpieczają to na kontraktach futures. Ich pozycje są lustrem sentymentu "ulicy" lub innych instytucji.'
  },
  'Other Reportables': {
    name: 'Other Reportables',
    plName: 'Inne Podmioty Raportujące',
    description: 'Inwestorzy, którzy nie pasują do powyższych kategorii, ale są wystarczająco duzi, by podlegać obowiązkowi raportowania.',
    insight: 'Często są to mniejsze korporacje zarządzające swoim skarbcem (treasury) lub prywatne firmy tradingowe (prop trading).'
  },
  'Nonreportable': {
    name: 'Nonreportable',
    plName: 'Inwestorzy Detaliczni (Nonreportable)',
    description: 'Mniejsi inwestorzy, których pozycje są poniżej progu raportowania CFTC. Reprezentują sentyment detaliczny ("ulicę").',
    insight: 'Często traktowani jako wskaźnik kontrariański w ekstremalnych punktach zwrotnych rynku. Gdy ulica jest ekstremalnie nastawiona na wzrosty, może to zwiastować korektę.'
  }
};

export const COMMERCIAL_VS_NONCOMM: CategoryInfo[] = [
  {
    name: 'Commercials',
    plName: 'Podmioty Komercyjne (Commercials)',
    description: 'Podmioty wykorzystujące kontrakty futures głównie do zabezpieczania działalności operacyjnej (hedging).',
    insight: 'W raporcie Disaggregated (którego używamy), ta grupa składa się głównie z kategorii "Dealer" oraz częściowo "Asset Manager".'
  },
  {
    name: 'Non-Commercials',
    plName: 'Podmioty Niekomercyjne (Non-Commercials)',
    description: 'Spekulanci, którzy nie zabezpieczają ryzyka biznesowego, lecz dążą do osiągnięcia zysku ze zmian cen.',
    insight: 'W tym raporcie odpowiada to głównie kategoriom "Leveraged Funds" oraz "Other Reportables". To tutaj szukamy spekulacyjnego "flow".'
  }
];