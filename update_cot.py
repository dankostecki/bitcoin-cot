import pandas as pd
import requests
import io
import gspread
import json
import os
from google.oauth2.service_account import Credentials

# --- KONFIGURACJA ---
SPREADSHEET_ID = "1K4Hgbe7O93tUxrpI5Mpmmhgkg140kJ7wFpctBwvqdu4"
SHEET_NAME = "Sheet1"
TARGET_ASSET = "BITCOIN - CHICAGO MERCANTILE EXCHANGE"
# --------------------

def run():
    print("--- ROZPOCZYNAM DIAGNOSTYKĘ ---")

    # 1. Logowanie
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
        ws = sh.get_worksheet(0)
        print(f"1. Połączono z arkuszem: {sh.title}")
    except Exception as e:
        print(f"BŁĄD logowania: {e}")
        return

    # 2. Pobieranie z CFTC
    print("2. Pobieranie pliku z CFTC...")
    url = "https://www.cftc.gov/dea/futures/financial_lf.txt"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        r = requests.get(url, headers=headers)
        print(f"   Status połączenia: {r.status_code}")
    except Exception as e:
        print(f"Błąd requestu: {e}")
        return

    # 3. Analiza pliku CFTC
    try:
        df = pd.read_csv(io.StringIO(r.text), low_memory=False)
        df.columns = df.columns.str.strip()
        df['Market_and_Exchange_Names'] = df['Market_and_Exchange_Names'].str.strip()
        
        df_btc = df[df['Market_and_Exchange_Names'] == TARGET_ASSET].copy()
        
        if df_btc.empty:
            print("!!! BŁĄD: Nie znaleziono Bitcoina w pobranym pliku! Może zmieniła się nazwa?")
            # Wypiszmy co znaleziono (pierwsze 5)
            print("Znalezione instrumenty (próbka):", df['Market_and_Exchange_Names'].unique()[:5])
            return

        df_btc['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc['Report_Date_as_YYYY-MM-DD'])
        cftc_date = df_btc['Report_Date_as_YYYY-MM-DD'].iloc[0]
        
        print(f"\n>>> DATA ZNALEZIONA W PLIKU CFTC: {cftc_date.date()} <<<\n")
        
    except Exception as e:
        print(f"Błąd analizy danych CFTC: {e}")
        return

    # 4. Analiza Arkusza
    try:
        existing = ws.get_all_records()
        last_sheet_date = pd.Timestamp("1900-01-01")
        
        if existing:
            df_sheet = pd.DataFrame(existing)
            # Szukamy kolumny z datą
            cols = [c for c in df_sheet.columns if "Date" in c or "date" in c]
            if cols:
                date_col = cols[0]
                df_sheet[date_col] = pd.to_datetime(df_sheet[date_col])
                last_sheet_date = df_sheet[date_col].max()
        
        print(f"\n>>> OSTATNIA DATA W TWOIM ARKUSZU: {last_sheet_date.date()} <<<\n")
        
    except Exception as e:
        print(f"Błąd odczytu arkusza: {e}")
        return

    # 5. Porównanie i Decyzja
    if cftc_date > last_sheet_date:
        print("WYNIK: Mamy nowe dane! Próbuję zapisać...")
        
        df_btc['Report_Date_as_YYYY-MM-DD'] = df_btc['Report_Date_as_YYYY-MM-DD'].dt.strftime('%Y-%m-%d')
        row = df_btc.values.tolist()[0]
        
        try:
            ws.insert_row(row, 2)
            print(">>> SUKCES: Nowy wiersz dodany! <<<")
        except Exception as e:
            print(f"!!! BŁĄD ZAPISU: {e} (Sprawdź uprawnienia Edytora dla bota)")
            
    elif cftc_date == last_sheet_date:
        print("WYNIK: Daty są identyczne. CFTC jeszcze nie zaktualizowało pliku .txt na serwerze.")
        print("To normalne - pliki tekstowe czasem wchodzą z opóźnieniem w weekendy.")
    else:
        print("WYNIK DZIWNY: Data w pliku jest STARSZA niż w arkuszu. Coś jest nie tak.")

if __name__ == "__main__":
    run()
