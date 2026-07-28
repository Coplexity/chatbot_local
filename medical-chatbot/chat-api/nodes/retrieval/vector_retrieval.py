import asyncio
from collections import defaultdict

from langchain_openai import OpenAIEmbeddings

from core import config
from core.database import DatabaseManager
from core.schemas import RouterState


class VectorRetrievalNode:
    """Retrieve chunks per active version and preserve source metadata."""

    def __init__(self):
        self.db_manager = DatabaseManager()
        self.top_chunks_per_version = 8
        if config.EMBEDDING_MODEL.startswith("text-embedding-"):
            self.embed_model = OpenAIEmbeddings(model=config.EMBEDDING_MODEL, api_key=config.OPENAI_API_KEY)
            self._embed = self.embed_model.embed_query
        else:
            from sentence_transformers import SentenceTransformer
            self.embed_model = SentenceTransformer(config.EMBEDDING_MODEL)
            self._embed = lambda text: self.embed_model.encode(text).tolist()

    async def process(self, state: RouterState) -> dict:
        version_ids = state.get("active_version_ids", [])
        if not version_ids:
            return {"document_contexts": []}
        query = state.get("hypothetical_document") or state.get("query", "")
        vector = await asyncio.to_thread(self._embed, query)
        literal = "[" + ",".join(map(str, vector)) + "]"
        def fetch():
            conn = cursor = None
            try:
                conn = self.db_manager.get_connection(); cursor = conn.cursor()
                cursor.execute("""
                    WITH ranked AS (
                        SELECT c.chunk_id, c.text, c.text_abstract, gv.version_id,
                               g.guideline_id, g.chu_de, g.loai_van_ban, g.authors,
                               row_number() OVER (PARTITION BY gv.version_id ORDER BY c.embedding <=> %s::halfvec(3072)) AS rank
                        FROM chunks c
                        JOIN guideline_versions gv ON gv.version_id = c.version_id
                        JOIN guidelines g ON g.guideline_id = gv.guideline_id
                        WHERE c.version_id = ANY(%s) AND c.embedding IS NOT NULL
                    ) SELECT chunk_id, text, text_abstract, version_id, guideline_id, chu_de, loai_van_ban, authors
                    FROM ranked WHERE rank <= %s ORDER BY version_id, rank
                """, (literal, version_ids, self.top_chunks_per_version))
                return cursor.fetchall()
            finally:
                if cursor: cursor.close()
                if conn: conn.close()
        rows = await asyncio.to_thread(fetch)
        grouped = defaultdict(list)
        metadata = {}
        for chunk_id, text, abstract, version_id, guideline_id, topic, doc_type, authors in rows:
            grouped[version_id].append(f"[{chunk_id}]" + (f"\nTÓM TẮT: {abstract}" if abstract else "") + f"\nNỘI DUNG: {text}")
            metadata[version_id] = (guideline_id, topic or "", doc_type or "", list(authors or []))
        contexts = []
        for rank, (version_id, chunks) in enumerate(grouped.items(), 1):
            guideline_id, topic, doc_type, authors = metadata[version_id]
            contexts.append({"version_id": version_id, "guideline_id": guideline_id, "chu_de": topic, "loai_van_ban": doc_type, "authors": authors, "doc_rank": rank, "context": "\n\n".join(chunks)})
        return {"document_contexts": contexts}
