import pandas as pd
import requests
import io
import gspread
import json
import os
from google.oauth2.service_account import Credentials

def run():
    # 1. Logowanie do Arkusza Google
    info = json.loads(os.environ['GCP_SERVICE_ACCOUNT_KEY'])
    creds = Credentials.from_service_account_info(info, scopes=[
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ])
    gc = gspread.authorize(creds)
    sh = gc.open("BTC_COT_DATA")
    ws = sh.get_worksheet(0)

    # 2. Odczytanie ostatniej daty, którą masz w Arkuszu
    existing_records = ws.get_all_records()
    if existing_records:
        df_existing = pd.DataFrame(existing_records)
        # Upewniamy się, że kolumna daty jest czytana jako data
        df_existing['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_existing['Report_Date_as_YYYY-MM-DD'])
        last_saved_date = df_existing['Report_Date_as_YYYY-MM-DD'].max()
    else:
        last_saved_date = pd.Timestamp('1900-01-01')

    # 3. Pobranie TYLKO najnowszego raportu (plik .txt zamiast .zip)
    # Jest to tekstowy odpowiednik strony .htm, którą podałeś
    url_latest = "https://www.cftc.gov/dea/futures/financial_lf.txt"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    response = requests.get(url_latest, headers=headers)
    if response.status_code != 200:
        print("Nie udało się połączyć ze stroną CFTC.")
        return

    # Wczytanie danych z tekstu
    df_new = pd.read_csv(io.StringIO(response.text), low_memory=False)
    
    # Filtrowanie tylko dla Bitcoina (CME)
    target = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE'
    df_btc_new = df_new[df_new['Market_and_Exchange_Names'].str.strip() == target].copy()
    
    if df_btc_new.empty:
        print("W najnowszym raporcie nie znaleziono danych dla Bitcoina.")
        return

    df_btc_new['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df_btc_new['Report_Date_as_YYYY-MM-DD'])
    newest_web_date = df_btc_new['Report_Date_as_YYYY-MM-DD'].max()

    # 4. Decyzja o aktualizacji
    if newest_web_date > last_saved_date:
        print(f"Znaleziono nowy raport z dnia: {newest_web_date.date()}. Dopisywanie...")
        
        # Przygotowanie danych do wstawienia (zamiana daty na tekst)
        df_btc_new['Report_Date_as_YYYY-MM-DD'] = df_btc_new['Report_Date_as_YYYY-MM-DD'].dt.strftime('%Y-%m-%d')
        
        # Wstawiamy nowy wiersz na samej górze (pod nagłówkiem, czyli w 2. wierszu)
        new_row = df_btc_new.values.tolist()[0]
        ws.insert_row(new_row, 2)
        print("Arkusz zaktualizowany o najnowsze dane.")
    else:
        print(f"Brak nowych danych. Ostatni raport w Arkuszu pochodzi z: {last_saved_date.date()}.")

if __name__ == "__main__":
    run()
