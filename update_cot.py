import pandas as pd
import requests
import io
import gspread
import json
import os
import zipfile
import time
from google.oauth2.service_account import Credentials

# --- KONFIGURACJA ---
SPREADSHEET_ID = "1K4Hgbe7O93tUxrpI5Mpmmhgkg140kJ7wFpctBwvqdu4"
SHEET_NAME = "Sheet1"
TARGET_ASSET = "BITCOIN - CHICAGO MERCANTILE EXCHANGE"
# --------------------

def run():
    print("--- START: HYBRYDOWA AKTUALIZACJA DANYCH ---")
    
    # 1. Logowanie do Google
    if 'GCP_SERVICE_ACCOUNT_KEY' not in os.environ:
        print("BŁĄD: Brak klucza GCP!")
        return

    try:
        info = json.loads(os.environ['GCP_SERVICE_ACCOUNT_KEY'])
        creds = Credentials.from_service_account_info(info, scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ])
        gc = gspread.authorize(creds)
        sh = gc.open_by_key(SPREADSHEET_ID)
        try:
            ws = sh.worksheet(SHEET_NAME)
        except:
            ws = sh.get_worksheet(0)
    except Exception as e:
        print(f"Błąd logowania: {e}")
        return

    # 2. Sprawdzenie daty w Twoim Arkuszu
    existing = ws.get_all_records()
    last_sheet_date = pd.Timestamp("1900-01-01")
    if existing:
        df_sheet = pd.DataFrame(existing)
        cols = [c for c in df_sheet.columns if "Date" in c or "date" in c]
        if cols:
            # Konwersja na datę (ignorowanie błędów)
            df_sheet[cols[0]] = pd.to_datetime(df_sheet[cols[0]], errors='coerce')
            last_sheet_date = df_sheet[cols[0]].max()
    
    print(f"Data w Twoim arkuszu: {last_sheet_date.strftime('%Y-%m-%d')}")

    # --- METODA 1: Plik Tekstowy (z omijaniem cache) ---
    print("\n[Metoda 1] Sprawdzam szybki plik .txt...")
    # Dodajemy losowy parametr ?nocache=czas, żeby serwer nie wysłał starej wersji
    url_txt = f"https://www.cftc.gov/dea/futures/financial_lf.txt?nocache={int(time.time())}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
    
    df_new = None
    source_used = "TXT"

    try:
        r = requests.get(url_txt, headers=headers, timeout=30)
        if r.status_code == 200:
            df = pd.read_csv(io.StringIO(r.text), low_memory=False)
            df.columns = df.columns.str.strip()
            df['Market_and_Exchange_Names'] = df['Market_and_Exchange_Names'].str.strip()
            
            df_btc = df[df['Market_and_Exchange_Names'] == TARGET_ASSET].copy()
            if not df_btc.empty:
                df_btc['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc['Report_Date_as_YYYY-MM-DD'])
                txt_date = df_btc['Report_Date_as_YYYY-MM-DD'].iloc[0]
                print(f"   -> Data w pliku TXT: {txt_date.strftime('%Y-%m-%d')}")
                
                if txt_date > last_sheet_date:
                    df_new = df_btc
                else:
                    print("   -> Plik TXT ma stare dane.")
            else:
                print("   -> Brak Bitcoina w pliku TXT.")
    except Exception as e:
        print(f"   -> Błąd Metody 1: {e}")

    # --- METODA 2: Plik ZIP Historii 2026 (Jeśli Metoda 1 zawiodła) ---
    if df_new is None:
        print("\n[Metoda 2] Przełączam się na oficjalne archiwum ZIP (2026)...")
        # To jest "główny" plik historii rocznej, często aktualizowany szybciej niż txt
        url_zip = "https://www.cftc.gov/files/dea/history/fut_fin_txt_2026.zip"
        
        try:
            r = requests.get(url_zip, headers=headers, timeout=30)
            if r.status_code == 200:
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    filename = z.namelist()[0]
                    print(f"   -> Rozpakowano plik: {filename}")
                    with z.open(filename) as f:
                        df = pd.read_csv(f, low_memory=False)
                        
                df.columns = df.columns.str.strip()
                df['Market_and_Exchange_Names'] = df['Market_and_Exchange_Names'].str.strip()
                
                df_btc = df[df['Market_and_Exchange_Names'] == TARGET_ASSET].copy()
                if not df_btc.empty:
                    df_btc['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc['Report_Date_as_YYYY-MM-DD'])
                    # Bierzemy absolutnie najnowszą datę z historii
                    zip_date = df_btc['Report_Date_as_YYYY-MM-DD'].max()
                    print(f"   -> Najnowsza data w ZIP: {zip_date.strftime('%Y-%m-%d')}")
                    
                    if zip_date > last_sheet_date:
                        # Wybieramy wiersz z tą najnowszą datą
                        df_new = df_btc[df_btc['Report_Date_as_YYYY-MM-DD'] == zip_date]
                        source_used = "ZIP (Archiwum Roczne)"
                    else:
                        print("   -> Nawet archiwum ZIP nie ma jeszcze nowych danych.")
                else:
                    print("   -> Brak Bitcoina w archiwum ZIP.")
            else:
                print(f"   -> Plik ZIP 2026 jeszcze nie istnieje (Błąd {r.status_code}). Za wcześnie w roku?")
        except Exception as e:
            print(f"   -> Błąd Metody 2: {e}")

    # --- FINAŁ: Zapis ---
    if df_new is not None:
        print(f"\n>>> ZNALEZIONO NOWE DANE ({source_used})! Zapisuję... <<<")
        
        # Formatowanie daty na tekst
        df_new['Report_Date_as_YYYY-MM-DD'] = df_new['Report_Date_as_YYYY-MM-DD'].dt.strftime('%Y-%m-%d')
        
        # Jeśli pobraliśmy z ZIPa, może być kilka wierszy (rzadko), bierzemy pierwszy
        row = df_new.values.tolist()[0]
        
        try:
            ws.insert_row(row, 2)
            print("SUKCES! Arkusz zaktualizowany o najnowsze dane.")
        except Exception as e:
            print(f"BŁĄD ZAPISU DO ARKUSZA: {e}")
    else:
        print("\nWNIOSEK: Sprawdziłem plik szybki i archiwum ZIP. W obu są stare dane.")
        print("Mimo że PDF może być na stronie, baza danych dla robotów jeszcze nie została odświeżona przez CFTC.")

if __name__ == "__main__":
    run()
