import pandas as pd
import requests
import io
import gspread
import json
import os
from google.oauth2.service_account import Credentials

# --- KONFIGURACJA ---
# Twoje ID arkusza (wyciągnięte z linku, który podałeś)
SPREADSHEET_ID = "1K4Hgbe7O93tUxrpI5Mpmmhgkg140kJ7wFpctBwvqdu4"
SHEET_NAME = "Sheet1" # Upewnij się, że zakładka nazywa się Sheet1 (lub zmień tutaj)
TARGET_ASSET = "BITCOIN - CHICAGO MERCANTILE EXCHANGE"
# --------------------

def run():
    print("--- START SKRYPTU ---")

    # 1. Sprawdzenie klucza (Sekretu)
    if 'GCP_SERVICE_ACCOUNT_KEY' not in os.environ:
        print("BŁĄD KRYTYCZNY: Nie znaleziono sekretu GCP_SERVICE_ACCOUNT_KEY!")
        return
    
    print("1. Logowanie do Google...")
    try:
        info = json.loads(os.environ['GCP_SERVICE_ACCOUNT_KEY'])
        creds = Credentials.from_service_account_info(info, scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ])
        gc = gspread.authorize(creds)
        # Próba otwarcia arkusza
        sh = gc.open_by_key(SPREADSHEET_ID)
        try:
            ws = sh.worksheet(SHEET_NAME)
        except gspread.WorksheetNotFound:
            # Jeśli nie znajdzie po nazwie, bierze pierwszy z brzegu
            print(f"Uwaga: Nie znaleziono zakładki '{SHEET_NAME}', używam pierwszej dostępnej.")
            ws = sh.get_worksheet(0)
            
        print(f"   -> Połączono z arkuszem: {sh.title}")
    except Exception as e:
        print(f"BŁĄD logowania/dostępu do arkusza: {e}")
        print("CZY NA PEWNO DODAŁEŚ MAILA BOTA DO 'UDOSTĘPNIJ' W ARKUSZU?")
        return

    # 2. Pobieranie danych z CFTC
    print("2. Pobieranie danych z CFTC (omijanie Cloudflare)...")
    url = "https://www.cftc.gov/dea/futures/financial_lf.txt"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            print(f"Błąd HTTP: {response.status_code}")
            return
    except Exception as e:
        print(f"Błąd połączenia: {e}")
        return

    # 3. Przetwarzanie danych
    try:
        # Wczytujemy jako CSV
        df = pd.read_csv(io.StringIO(response.text), low_memory=False)
        # Usuwamy białe znaki z nazw kolumn i wartości
        df.columns = df.columns.str.strip()
        df['Market_and_Exchange_Names'] = df['Market_and_Exchange_Names'].str.strip()
    except Exception as e:
        print(f"Błąd parsowania CSV: {e}")
        return

    # Filtrowanie Bitcoina
    df_btc = df[df['Market_and_Exchange_Names'] == TARGET_ASSET].copy()
    
    if df_btc.empty:
        print(f"BŁĄD: Nie znaleziono instrumentu '{TARGET_ASSET}' w pobranym pliku.")
        return

    # Pobieramy datę z raportu
    df_btc['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc['Report_Date_as_YYYY-MM-DD'])
    newest_date = df_btc['Report_Date_as_YYYY-MM-DD'].iloc[0]
    newest_date_str = newest_date.strftime('%Y-%m-%d')
    
    print(f"   -> Znaleziono dane BTC z dnia: {newest_date_str}")

    # 4. Sprawdzenie co mamy w Arkuszu
    existing_records = ws.get_all_records()
    last_sheet_date = pd.Timestamp("1900-01-01")

    if existing_records:
        df_sheet = pd.DataFrame(existing_records)
        # Szukamy kolumny z datą (może mieć różną nazwę nagłówka)
        date_col = next((col for col in df_sheet.columns if "Date" in col or "date" in col), None)
        
        if date_col:
            df_sheet[date_col] = pd.to_datetime(df_sheet[date_col], errors='coerce')
            last_sheet_date = df_sheet[date_col].max()
            if pd.isna(last_sheet_date):
                last_sheet_date = pd.Timestamp("1900-01-01")
        
    print(f"   -> Ostatnia data w Twoim arkuszu: {last_sheet_date.strftime('%Y-%m-%d')}")

    # 5. Decyzja
    if newest_date > last_sheet_date:
        print("5. AKTUALIZACJA! Wstawiam nowy wiersz...")
        
        # Konwersja daty na string dla JSON/Sheets
        df_btc['Report_Date_as_YYYY-MM-DD'] = df_btc['Report_Date_as_YYYY-MM-DD'].dt.strftime('%Y-%m-%d')
        
        # Przygotowanie wiersza
        row_values = df_btc.values.tolist()[0]
        
        # Wstawienie w 2. wierszu (pod nagłówkiem)
        try:
            ws.insert_row(row_values, 2)
            print("SUKCES! Arkusz został zaktualizowany.")
        except Exception as e:
            print(f"BŁĄD ZAPISU DO ARKUSZA: {e}")
    else:
        print("DANE SĄ AKTUALNE. Nie trzeba nic dopisywać.")
        
    print("--- KONIEC ---")

if __name__ == "__main__":
    run()
