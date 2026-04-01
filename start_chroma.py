"""Start ChromaDB locally on port 8001."""
import sys
from chromadb.cli.cli import app

sys.argv = ["chroma", "run", "--path", "./chroma_data", "--port", "8001"]
app()
