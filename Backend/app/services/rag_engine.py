import math
import re
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.knowledge.data import KNOWLEDGE_DOCUMENTS
from app.services.multilingual import expand_query_for_retrieval

class SemanticVectorStore:
    """
    Lightweight, deterministic, zero-external-dependency semantic vector engine.
    Compatible with both SQLite and PostgreSQL, computes cosine similarity over
    term-frequency, subword character n-grams, and keyword semantic vectors.
    """
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        self.vocabulary: Dict[str, int] = {}
        self.doc_vectors: List[Dict[int, float]] = []
        self.doc_norms: List[float] = []
        self.idf: Dict[int, float] = {}
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower()
        # Word tokens
        words = re.findall(r"\b[a-z0-9_]{2,}\b", text)
        # Add character 3-grams for fuzzy/subword semantic matching
        trigrams = []
        for w in words:
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    trigrams.append(w[i:i+3])
        return words + trigrams

    def _build_index(self):
        doc_count = len(self.documents)
        doc_term_freqs: List[Dict[str, int]] = []
        df: Dict[str, int] = {}

        # First pass: collect document frequencies
        for doc in self.documents:
            # Combine title, section, content, and keywords
            doc_text = f"{doc.get('title', '')} {doc.get('section', '')} {doc.get('content', '')} {' '.join(doc.get('keywords', []))}"
            tokens = self._tokenize(doc_text)
            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            doc_term_freqs.append(tf)

            for t in tf.keys():
                df[t] = df.get(t, 0) + 1

        # Build vocabulary with terms present in df
        for term in df.keys():
            self.vocabulary[term] = len(self.vocabulary)

        # Compute IDF
        for term, tid in self.vocabulary.items():
            # Standard smooth IDF formula
            self.idf[tid] = math.log((1 + doc_count) / (1 + df[term])) + 1.0

        # Second pass: compute normalized TF-IDF vectors
        for tf in doc_term_freqs:
            vec: Dict[int, float] = {}
            norm_sq = 0.0
            for term, count in tf.items():
                if term in self.vocabulary:
                    tid = self.vocabulary[term]
                    weight = (1 + math.log(count)) * self.idf[tid]
                    vec[tid] = weight
                    norm_sq += weight * weight
            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            self.doc_vectors.append(vec)
            self.doc_norms.append(norm)

    def _vectorize_query(self, query: str) -> Tuple[Dict[int, float], float]:
        tokens = self._tokenize(query)
        tf: Dict[str, int] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1

        vec: Dict[int, float] = {}
        norm_sq = 0.0
        for term, count in tf.items():
            if term in self.vocabulary:
                tid = self.vocabulary[term]
                weight = (1 + math.log(count)) * self.idf[tid]
                vec[tid] = weight
                norm_sq += weight * weight
        norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
        return vec, norm

    def search(
        self,
        query: str,
        top_k: int = 3,
        min_relevance: float = 0.70,
        category_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        expanded_query, _ = expand_query_for_retrieval(query)
        q_vec, q_norm = self._vectorize_query(expanded_query)

        if not q_vec or q_norm == 0:
            return []

        scored_docs = []
        for idx, d_vec in enumerate(self.doc_vectors):
            doc = self.documents[idx]
            if category_filter and doc.get("category") != category_filter:
                continue

            # Compute dot product
            dot = 0.0
            for tid, q_val in q_vec.items():
                if tid in d_vec:
                    dot += q_val * d_vec[tid]

            d_norm = self.doc_norms[idx]
            raw_cosine = dot / (q_norm * d_norm) if (q_norm * d_norm) > 0 else 0.0

            # Keyword match boost
            doc_kw = set(k.lower() for k in doc.get("keywords", []))
            q_words = set(w.lower() for w in self._tokenize(expanded_query))
            kw_overlap = len(doc_kw.intersection(q_words))
            kw_boost = min(0.24, kw_overlap * 0.08)

            # Calibrate similarity score
            # Irrelevant queries typically have raw_cosine < 0.12 and no domain keywords
            if raw_cosine < 0.10 and kw_overlap == 0:
                calibrated_score = round(raw_cosine * 2.0, 3)
            else:
                base_score = 0.48 + (raw_cosine * 0.78) + kw_boost
                calibrated_score = round(min(0.98, max(0.10, base_score)), 3)

            scored_docs.append({
                "id": doc.get("id"),
                "title": doc.get("title"),
                "section": doc.get("section"),
                "category": doc.get("category"),
                "content": doc.get("content"),
                "score": calibrated_score
            })

        # Deduplicate & Sort descending by score
        scored_docs.sort(key=lambda x: x["score"], reverse=True)

        # Filter by threshold
        results = [d for d in scored_docs if d["score"] >= min_relevance]

        return results[:top_k]

# Global singleton index
rag_vector_store = SemanticVectorStore(KNOWLEDGE_DOCUMENTS)

def retrieve_knowledge(
    query: str,
    top_k: Optional[int] = None,
    min_relevance: Optional[float] = None,
    max_context_chars: Optional[int] = None
) -> Dict[str, Any]:
    """
    RAG retrieval pipeline implementing:
    - Multilingual expansion
    - Semantic search
    - TOP_K selection
    - Relevance threshold filtering
    - Deduplication
    - Context-size limit
    - Source/section citations
    """
    k = top_k or settings.CHAT_TOP_K
    threshold = min_relevance or settings.CHAT_MIN_RELEVANCE
    max_chars = max_context_chars or settings.CHAT_MAX_CONTEXT_CHARS

    hits = rag_vector_store.search(query=query, top_k=k, min_relevance=threshold)

    citations = []
    context_chunks = []
    current_chars = 0
    seen_ids = set()

    for hit in hits:
        if hit["id"] in seen_ids:
            continue
        seen_ids.add(hit["id"])

        chunk_text = f"[{hit['title']} - {hit['section']}]: {hit['content']}"
        if current_chars + len(chunk_text) > max_chars:
            break

        context_chunks.append(chunk_text)
        current_chars += len(chunk_text)

        citations.append({
            "title": hit["title"],
            "section": hit["section"],
            "score": hit["score"]
        })

    max_score = citations[0]["score"] if citations else 0.0

    return {
        "context": "\n\n".join(context_chunks),
        "citations": citations,
        "is_sufficient": len(citations) > 0,
        "top_score": max_score
    }
