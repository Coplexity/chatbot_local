import asyncio
import math
from collections import defaultdict

from langchain_openai import OpenAIEmbeddings

from core import config
from core.database import DatabaseManager
from core.schemas import RouterState


class VectorRetrievalNode:
    def __init__(self):
        print("⏳ [Retriever] Loading Embedding Model...")
        self.embedding_backend = "sentence_transformers"
        self.retrieval_top_k = 10
        self.retrieval_candidate_k = 30
        self.document_limit_per_topic = 10
        # Keep only chunks whose vector distance to query is good enough.
        # Lower distance means more relevant.
        self.max_chunk_semantic_distance = 0.65
        # Keep top relative chunk set (per document) after rerank.
        # Example: 0.7 means keep top 70% reranked chunks.
        self.rerank_keep_percentile = 0.7
        # Keep a small minimum from the already distance-filtered set
        # so context is not too sparse for downstream reasoning.
        self.rerank_min_keep = 2
        self.rerank_model_name = "namdp-ptit/ViRanker"
        self.reranker = None

        # Use OpenAI embeddings when an OpenAI embedding model is configured.
        if config.EMBEDDING_MODEL.startswith("text-embedding-"):
            self.embed_model = OpenAIEmbeddings(
                model=config.EMBEDDING_MODEL,
                api_key=config.OPENAI_API_KEY,
            )
            self.embedding_backend = "openai"
        else:
            from sentence_transformers import SentenceTransformer

            self.embed_model = SentenceTransformer(config.EMBEDDING_MODEL)

        try:
            from FlagEmbedding import FlagReranker

            print(f"⏳ [Retriever] Loading reranker model: {self.rerank_model_name}...")
            self.reranker = FlagReranker(self.rerank_model_name, use_fp16=False)
        except Exception as e:
            print(f"⚠️ [Retriever] Không thể khởi tạo reranker, fallback về vector-only. Error: {e}")

        self.db_manager = DatabaseManager()

    def _embed_query(self, text: str):
        if self.embedding_backend == "openai":
            return self.embed_model.embed_query(text)
        return self.embed_model.encode(text).tolist()

    def _rerank_rows(self, query: str, rows):
        if not rows:
            return []
        if self.reranker is None:
            ranked = sorted(rows, key=lambda x: float(x[3]))
            return [(row, 1.0 / (1.0 + max(0.0, float(row[3])))) for row in ranked]

        pairs = []
        for row in rows:
            _, chunk_text, chunk_abstract, _ = row
            candidate_text = f"{chunk_abstract or ''}\n{chunk_text or ''}".strip()
            pairs.append([query, candidate_text[:3000]])

        try:
            scores = self.reranker.compute_score(pairs)
            ranked = sorted(zip(rows, scores), key=lambda x: float(x[1]), reverse=True)
            return [(row, float(score)) for row, score in ranked]
        except Exception as e:
            print(f"⚠️ [Retriever] Rerank thất bại, fallback vector-only. Error: {e}")
            ranked = sorted(rows, key=lambda x: float(x[3]))
            return [(row, 1.0 / (1.0 + max(0.0, float(row[3])))) for row in ranked]

    async def process(self, state: RouterState):
        query = state.get("query", "")
        hyde_text = state.get("hypothetical_document", "") or query
        active_version_ids = state.get("active_version_ids", [])
        selected_topics = state.get("selected_topics", [])

        if not active_version_ids:
            print("⚠️ [Retriever] Không có active version để truy xuất.")
            return {"document_contexts": []}

        topic_list = [item.get("name") for item in selected_topics if item.get("name")]
        if not topic_list:
            print("⚠️ [Retriever] Không có chủ đề nào đã route.")
            return {"document_contexts": []}

        print(f"🔍 [Retriever] Đang truy xuất trên {len(active_version_ids)} version active...")
        query_vec = self._embed_query(hyde_text)
        embedding_literal = "[" + ",".join(str(x) for x in query_vec) + "]"

        def fetch_from_db(chu_de):
            conn = None
            cursor = None
            try:
                conn = self.db_manager.get_connection()
                cursor = conn.cursor()
                cursor.execute(
                """
                WITH ranked_chunks AS (
                    SELECT
                        c.chunk_id,
                        c.text,
                        c.text_abstract,
                        gv.version_id,
                        g.guideline_id,
                        g.authors,
                        (c.embedding <=> %s::halfvec(3072)) AS semantic_distance,
                        ROW_NUMBER() OVER (
                            PARTITION BY gv.version_id
                            ORDER BY (c.embedding <=> %s::halfvec(3072))
                        ) AS rank_in_document
                    FROM chunks c
                    JOIN guideline_versions gv ON gv.version_id = c.version_id
                    JOIN guidelines g ON g.guideline_id = gv.guideline_id
                    WHERE c.version_id = ANY(%s)
                    AND g.chu_de = %s
                    AND c.embedding IS NOT NULL
                )
                SELECT
                    chunk_id,
                    text,
                    text_abstract,
                    version_id,
                    guideline_id,
                    authors,
                    semantic_distance
                FROM ranked_chunks
                WHERE rank_in_document <= %s
                ORDER BY semantic_distance
                LIMIT %s;
                """,
                (
                    embedding_literal,
                    embedding_literal,
                    active_version_ids,
                    chu_de,
                    self.retrieval_candidate_k,
                    self.document_limit_per_topic * self.retrieval_candidate_k,
                ),
            )
                return chu_de, cursor.fetchall()
            except Exception as e:
                print(f"❌ [Retriever DB Error] {chu_de}: {e}")
                return chu_de, []
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()

        tasks = [asyncio.to_thread(fetch_from_db, chu_de) for chu_de in topic_list]
        results = await asyncio.gather(*tasks) if tasks else []

        document_contexts = []
        for chu_de, rows in results:
            if not rows:
                continue

            rerank_query = (query or "").strip() or hyde_text
            rows_by_document = defaultdict(list)
            authors_by_document = {}
            for row in rows:
                chunk_id, chunk_text, chunk_abstract, version_id, guideline_id, authors, semantic_distance = row
                key = (version_id, guideline_id)
                rows_by_document[key].append((chunk_id, chunk_text, chunk_abstract, semantic_distance))
                authors_by_document[key] = authors or []

            ranked_documents = sorted(
                rows_by_document.items(),
                key=lambda item: min(chunk[-1] for chunk in item[1]),
            )

            for (version_id, guideline_id), document_rows in ranked_documents[: self.document_limit_per_topic]:
                # Bước 1: lọc theo ngưỡng khoảng cách ngữ nghĩa
                distance_filtered_rows = [
                    row for row in document_rows if float(row[3]) <= self.max_chunk_semantic_distance
                ]
                if not distance_filtered_rows:
                    continue

                # Bước 2: rerank
                ranked_rows_with_scores = self._rerank_rows(rerank_query, distance_filtered_rows)
                if not ranked_rows_with_scores:
                    continue

                # Bước 3: giữ top percentile sau rerank
                keep_count = int(math.ceil(len(ranked_rows_with_scores) * self.rerank_keep_percentile))
                keep_count = max(self.rerank_min_keep, keep_count)
                keep_count = min(keep_count, len(ranked_rows_with_scores))
                if keep_count <= 0:
                    continue
                percentile_rows = [row for row, _ in ranked_rows_with_scores[:keep_count]]

                final_rows = percentile_rows[: self.retrieval_top_k]
                if not final_rows:
                    continue

                # Build context_text từ các chunk còn lại sau lọc
                formatted_chunks = []
                for chunk_id, chunk_text, chunk_abstract, _ in final_rows:
                    ref_id = f"[{str(chunk_id)}]"
                    abstract_part = f"\nTÓM TẮT: {chunk_abstract}" if chunk_abstract else ""
                    formatted_chunks.append(f"{ref_id}{abstract_part}\nNỘI DUNG: {chunk_text}")

                context_text = "\n\n".join(formatted_chunks)

                document_contexts.append(
                    {
                        "version_id": version_id,
                        "guideline_id": guideline_id,
                        "chu_de": chu_de,
                        "authors": authors_by_document.get((version_id, guideline_id), []),
                        "context": context_text,
                    }
                )

        print(f"📄 [Retriever] Tổng hợp {len(document_contexts)} document_contexts.")
        return {"document_contexts": document_contexts}