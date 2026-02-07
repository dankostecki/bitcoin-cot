import pandas as pd
import requests
import io
import gspread
import json
import os
from google.oauth2.service_account import Credentials

# Twoje nowe ID Arkusza
SPREADSHEET_ID = "1K4Hgbe7O93tUxrpI5Mpmmhgkg140kJ7wFpctBwvqdu4"

def run():
    print("--- START: Aktualizacja COT ---")
    
    # 1. Logowanie do Google (używa klucza z GitHub Secrets)
    if 'GCP_SERVICE_ACCOUNT_KEY' not in os.environ:
        print("BŁĄD: Brak klucza GCP_SERVICE_ACCOUNT_KEY w zmiennych środowiskowych.")
        return

    info = json.loads(os.environ['GCP_SERVICE_ACCOUNT_KEY'])
    creds = Credentials.from_service_account_info(info, scopes=[
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ])
    gc = gspread.authorize(creds)
    
    try:
        sh = gc.open_by_key(SPREADSHEET_ID)
        ws = sh.get_worksheet(0) # Pierwsza zakładka
    except Exception as e:
        print(f"BŁĄD DOSTĘPU DO ARKUSZA: {e}")
        print("Upewnij się, że udostępniłeś arkusz mailowi bota (client_email w JSON).")
        return

    # 2. Pobieranie danych z CFTC (Udajemy przeglądarkę, żeby ominąć blokadę)
    url = "https://www.cftc.gov/dea/futures/financial_lf.txt"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print("Pobieranie danych z serwera rządowego...")
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"Błąd pobierania pliku: {e}")
        return

    # 3. Przetwarzanie danych
    try:
        # Wczytujemy CSV z pamięci
        df = pd.read_csv(io.StringIO(response.text), low_memory=False)
    except Exception as e:
        print("Błąd odczytu CSV. Serwer mógł zwrócić błąd zamiast pliku.")
        return
    
    # Usuwamy spacje z nazw, żeby łatwiej szukać
    df['Market_and_Exchange_Names'] = df['Market_and_Exchange_Names'].str.strip()
    
    # Szukamy Bitcoina
    target = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE'
    df_btc = df[df['Market_and_Exchange_Names'] == target].copy()
    
    if df_btc.empty:
        print(f"Nie znaleziono instrumentu: {target}")
        return

    # Wyciągamy datę raportu
    df_btc['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc['Report_Date_as_YYYY-MM-DD'])
    newest_date = df_btc['Report_Date_as_YYYY-MM-DD'].iloc[0]
    newest_date_str = newest_date.strftime('%Y-%m-%d')
    
    print(f"Znaleziono dane z dnia: {newest_date_str}")

    # 4. Sprawdzenie czy trzeba aktualizować
    existing_data = ws.get_all_records()
    last_saved_date = "1900-01-01"
    
    if existing_data:
        df_existing = pd.DataFrame(existing_data)
        if 'Report_Date_as_YYYY-MM-DD' in df_existing.columns:
            # Zakładamy format YYYY-MM-DD w arkuszu
            df_existing['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_existing['Report_Date_as_YYYY-MM-DD'])
            last_saved_date = df_existing['Report_Date_as_YYYY-MM-DD'].max()
            
    print(f"Ostatnia data w Twoim arkuszu: {last_saved_date}")

    if newest_date > last_saved_date:
        print("AKTUALIZACJA: Nowe dane dostępne. Dopisywanie...")
        
        # Formatowanie daty na string
        df_btc['Report_Date_as_YYYY-MM-DD'] = df_btc['Report_Date_as_YYYY-MM-DD'].dt.strftime('%Y-%m-%d')
        
        # Konwersja wiersza na listę
        row_to_append = df_btc.values.tolist()[0]
        
        # Wstawienie wiersza na pozycji 2 (pod nagłówkiem)
        ws.insert_row(row_to_append, 2)
        print("SUKCES! Arkusz zaktualizowany.")
    else:
        print("Brak nowych danych. Arkusz jest aktualny.")

if __name__ == "__main__":
    run()
