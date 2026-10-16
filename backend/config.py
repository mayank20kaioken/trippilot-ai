import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env explicitly
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "").strip()
TINYFISH_SEARCH_URL = "https://api.search.tinyfish.ai"
TINYFISH_FETCH_URL = "https://api.fetch.tinyfish.ai"

REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "25.0"))
MAX_FETCH_URLS_PER_QUERY = int(os.getenv("MAX_FETCH_URLS_PER_QUERY", "2"))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8765"))

