import asyncio
import re
import unicodedata

from app.workflow import MedicalWorkflow
from basic_mode.workflow import BasicMedicalWorkflow
from basic_mode.nodes.reasoning.citation_transformer import CitationStreamTransformer


class MarkdownStreamSanitizer:
    """Remove accidental top-level markdown fences from streamed model output."""

    _OPENING_FENCE_RE = re.compile(r"^\s*```(?:markdown|md)?\s*\n", re.IGNORECASE)
    _TRAILING_FENCE_RE = re.compile(r"\n?```\s*$")

    def __init__(self):
        self._prefix_buffer = ""
        self._tail_buffer = ""
        self._started = False

    def _strip_opening_once(self, text: str) -> str:
        return self._OPENING_FENCE_RE.sub("", text, count=1)

    def _stream_with_tail_guard(self, text: str) -> str:
        combined = self._tail_buffer + text
        # Keep a short suffix to safely detect trailing ``` at stream end.
        keep = 6
        if len(combined) <= keep:
            self._tail_buffer = combined
            return ""
        emit = combined[:-keep]
        self._tail_buffer = combined[-keep:]
        return emit

    def feed(self, text: str) -> str:
        if not text:
            return ""

        if not self._started:
            self._prefix_buffer += text
            # Wait until we have enough content to decide whether opening fence exists.
            if "\n" not in self._prefix_buffer and len(self._prefix_buffer) < 64:
                return ""
            cleaned = self._strip_opening_once(self._prefix_buffer)
            self._prefix_buffer = ""
            self._started = True
            return self._stream_with_tail_guard(cleaned)

        return self._stream_with_tail_guard(text)

    def flush(self) -> str:
        if not self._started:
            remaining = self._strip_opening_once(self._prefix_buffer)
        else:
            remaining = self._prefix_buffer

        remaining += self._tail_buffer
        remaining = self._TRAILING_FENCE_RE.sub("", remaining)

        self._prefix_buffer = ""
        self._tail_buffer = ""
        self._started = False
        return remaining


class MarkdownStreamFormatter:
    """Normalize streamed markdown layout without touching fenced code blocks."""

    def __init__(self):
        self._buffer = ""
        self._in_fence = False

    @staticmethod
    def _normalize_outside_fence(text: str) -> str:
        # Ensure headings start on a new line if they are glued to previous text.
        text = re.sub(r"([^\n])(#{2,6}\s)", r"\1\n\2", text)
        # Ensure bullet lists start on a new line after punctuation.
        text = re.sub(r"([\.:;])\s*-\s+", r"\1\n- ", text)
        # Ensure bullets are not glued right after a heading line.
        text = re.sub(r"(#{2,6}[^\n]*?)\s+-\s+", r"\1\n- ", text)
        return text

    def _process_with_fence_state(self, text: str) -> str:
        out = []
        while text:
            idx = text.find("```")
            if idx == -1:
                if self._in_fence:
                    out.append(text)
                else:
                    out.append(self._normalize_outside_fence(text))
                break

            prefix = text[:idx]
            if self._in_fence:
                out.append(prefix)
            else:
                out.append(self._normalize_outside_fence(prefix))

            out.append("```")
            self._in_fence = not self._in_fence
            text = text[idx + 3 :]

        return "".join(out)

    def feed(self, text: str) -> str:
        if not text:
            return ""

        self._buffer += text
        # Keep a short suffix so patterns split across chunks can still be normalized.
        hold = 80
        if len(self._buffer) <= hold:
            return ""

        emit = self._buffer[:-hold]
        self._buffer = self._buffer[-hold:]
        return self._process_with_fence_state(emit)

    def flush(self) -> str:
        if not self._buffer:
            return ""
        tail = self._process_with_fence_state(self._buffer)
        self._buffer = ""
        return tail


class ChatbotApp:
    def __init__(self):
        # Khởi tạo toàn bộ luồng từ file workflow
        self.deep_workflow = MedicalWorkflow()
        self.basic_workflow = BasicMedicalWorkflow()
        self.app = self.deep_workflow.app

    @staticmethod
    def _stream_tokens(text):
        """Stream text word-by-word"""
        tokens = re.findall(r"\S+\s*", text or "")
        return tokens if tokens else [text or ""]

    @staticmethod
    def _normalize_mode(mode: str | None) -> str:
        value = (mode or "").strip().lower()
        if value in {"basic", "deep"}:
            return value
        return "basic"

    @staticmethod
    def _default_user_ids(user_ids: int | str | None) -> int | str:
        """Fallback to user_id=1 when backend/request does not provide user_ids."""
        if user_ids is None:
            return 1
        if isinstance(user_ids, str) and not user_ids.strip():
            return 1
        return user_ids

    @staticmethod
    def _is_tram_y_te_shortcut(role: str | None) -> bool:
        return (role or "").strip().lower() == "bac_si_tramyte"

    @staticmethod
    def _normalize_specialty_alias(text: str) -> str:
        normalized = unicodedata.normalize("NFD", text or "")
        normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        normalized = normalized.lower().strip().replace("-", "_").replace(" ", "_")
        normalized = re.sub(r"_+", "_", normalized)
        return normalized

    def _resolve_tram_y_te_specialty_name(self, valid_domains=None) -> str:
        tram_y_te_alias = "tram_y_te"
        valid_domains = valid_domains if valid_domains is not None else self.deep_workflow.router._load_valid_domains()
        for domain in valid_domains:
            if self._normalize_specialty_alias(domain) == tram_y_te_alias:
                return domain
        return tram_y_te_alias

    async def _stream_answer_events_basic(
        self,
        query: str,
        role: str | None = None,
        user_ids: int | str | None = None,
    ):
        """Run one query and yield typed events: ('trace'|'chunk', payload)."""
        workflow = self.basic_workflow
        user_ids = self._default_user_ids(user_ids)
        state = {"query": query, "role": role or "", "user_ids": user_ids}
        markdown_sanitizer = MarkdownStreamSanitizer()
        markdown_formatter = MarkdownStreamFormatter()

        def emit_clean(chunk_text: str):
            cleaned = markdown_sanitizer.feed(chunk_text)
            if not cleaned:
                return ""
            return markdown_formatter.feed(cleaned)

        def flush_clean():
            sanitized_tail = markdown_sanitizer.flush()
            formatted_from_sanitized = markdown_formatter.feed(sanitized_tail) if sanitized_tail else ""
            formatted_tail = markdown_formatter.flush()
            return (formatted_from_sanitized or "") + (formatted_tail or "")

        # 0) Validate question
        yield "trace", "Xác nhận: Đang kiểm tra câu hỏi..."
        state.update(workflow.validator.process(state))
        validation_category = state.get("validation_category", "medical")

        # Handle greeting
        if validation_category == "greeting":
            yield "trace", "Xác nhận: Đây là lời chào hỏi 👋"
            greeting_response = workflow._greeting_response(state)
            response_text = greeting_response.get("response", "")
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return

        # Handle off-topic
        if validation_category == "off_topic":
            yield "trace", "Xác nhận: Câu hỏi không liên quan y tế"
            off_topic_response = workflow._off_topic_response(state)
            response_text = off_topic_response.get("response", "")
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return

        yield "trace", "Xác nhận: Câu hỏi liên quan y tế ✓"

        yield "trace", "Lọc guidelines: Đang lọc guideline theo user_id..."
        state.update(workflow.guideline_filter.process(state))
        yield "trace", f"Lọc guidelines: Tìm thấy {len(state.get('filtered_guideline_ids', []))} guideline phù hợp."

        # 1) Intent routing
        yield "trace", "Định tuyến: Đang phân tích ý định và chuyên khoa liên quan"
        state.update(workflow.router.process(state))

        routed_specialties = [item.get("name") for item in state.get("analyzed_specialties", []) if item.get("name")]
        formatted_specialties = ", ".join(routed_specialties) if routed_specialties else "không có"
        yield "trace", f"Định tuyến: Điều phối đến các chuyên khoa: {formatted_specialties}"
        if workflow.route_logic(state) == "synthesis_node":
            yield "trace", "Định tuyến: Không xác định được chuyên khoa, chuyển thẳng sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 2) Disease routing
        yield "trace", "Định tuyến bệnh: Đang định tuyến bệnh theo từng chuyên khoa..."
        state.update(await workflow.disease_router.process(state))

        routed_diseases = state.get("routed_diseases", {})
        total_diseases = sum(len(items) for items in routed_diseases.values())
        yield "trace", f"Định tuyến bệnh: Tổng số bệnh định tuyến được: {total_diseases}"
        if workflow.disease_route_logic(state) == "synthesis_node":
            yield "trace", "Định tuyến bệnh: Không có bệnh phù hợp, chuyển sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 3) Active version filtering
        yield "trace", "Lọc phiên bản: Đang lọc phiên bản hướng dẫn còn hoạt động..."
        state.update(workflow.version_filter.process(state))
        active_version_ids = state.get("active_version_ids", [])
        yield "trace", f"Lọc phiên bản: Tên các phiên bản đang hoạt động: {active_version_ids}"
        if workflow.version_filter_logic(state) == "synthesis_node":
            yield "trace", "Lọc phiên bản: Không có phiên bản đang hoạt động phù hợp, chuyển sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 4) Retrieval + experts
        yield "trace", f"Truy xuất: Đang truy xuất trên {len(active_version_ids)} phiên bản đang hoạt động..."
        state.update(await workflow.retriever.process(state))
        specialty_contexts = state.get("specialty_contexts", {})

        # Single-specialty path previously bypassed synthesizer and returned one-shot text.
        # Stream expert output directly here to achieve true streaming behavior.
        if len(specialty_contexts) == 1:
            domain_name, context = next(iter(specialty_contexts.items()))
            transformer = CitationStreamTransformer()
            async for chunk in workflow.experts.stream_single_report(state["query"], domain_name, context):
                delta = transformer.feed(chunk)
                if delta:
                    cleaned = emit_clean(delta)
                    if cleaned:
                        yield "chunk", cleaned
            tail = transformer.flush()
            if tail:
                cleaned = emit_clean(tail)
                if cleaned:
                    yield "chunk", cleaned
            final_tail = flush_clean()
            if final_tail:
                yield "chunk", final_tail
            return

        yield "trace", "Chuyên gia: Đang tạo báo cáo cho nhiều chuyên khoa..."
        state.update(await workflow.experts.process(state))

        # 5) Final synthesis streaming
        yield "trace", "Tổng hợp: Đang tổng hợp báo cáo liên chuyên khoa..."
        async for chunk in workflow.synthesizer.stream_process(state):
            cleaned = emit_clean(chunk)
            if cleaned:
                yield "chunk", cleaned

        final_tail = flush_clean()
        if final_tail:
            yield "chunk", final_tail

    async def stream_answer_events(
        self,
        query: str,
        role: str | None = None,
        mode: str | None = None,
        user_ids: int | str | None = None,
    ):
        selected_mode = self._normalize_mode(mode)
        user_ids = self._default_user_ids(user_ids)
        if selected_mode == "deep":
            async for event, payload in self._stream_answer_events_deep(query, role, user_ids):
                yield event, payload
            return

        async for event, payload in self._stream_answer_events_basic(query, role, user_ids):
            yield event, payload

    async def _stream_answer_events_deep(
        self,
        query: str,
        role: str | None = None,
        user_ids: int | str | None = None,
    ):
        """Run one query and yield typed events: ('trace'|'chunk', payload)."""
        workflow = self.deep_workflow
        user_ids = self._default_user_ids(user_ids)
        state = {"query": query, "role": role or "", "user_ids": user_ids}
        markdown_sanitizer = MarkdownStreamSanitizer()
        markdown_formatter = MarkdownStreamFormatter()

        def emit_clean(chunk_text: str):
            cleaned = markdown_sanitizer.feed(chunk_text)
            if not cleaned:
                return ""
            return markdown_formatter.feed(cleaned)

        def flush_clean():
            sanitized_tail = markdown_sanitizer.flush()
            formatted_from_sanitized = markdown_formatter.feed(sanitized_tail) if sanitized_tail else ""
            formatted_tail = markdown_formatter.flush()
            return (formatted_from_sanitized or "") + (formatted_tail or "")

        # 0) Validate question
        yield "trace", "Xác nhận: Đang kiểm tra câu hỏi..."
        state.update(workflow.validator.process(state))
        validation_category = state.get("validation_category", "medical")
        
        # Handle greeting
        if validation_category == "greeting":
            yield "trace", "Xác nhận: Đây là lời chào hỏi 👋"
            greeting_response = workflow._greeting_response(state)
            response_text = greeting_response.get("response", "")
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return
        
        # Handle off-topic
        if validation_category == "off_topic":
            yield "trace", "Xác nhận: Câu hỏi không liên quan y tế"
            off_topic_response = workflow._off_topic_response(state)
            response_text = off_topic_response.get("response", "")
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return

        yield "trace", "Xác nhận: Câu hỏi liên quan y tế ✓"

        yield "trace", "Lọc guidelines: Đang lọc guideline theo user_id..."
        state.update(workflow.guideline_filter.process(state))
        yield "trace", f"Lọc guidelines: Tìm thấy {len(state.get('filtered_guideline_ids', []))} guideline phù hợp."

        shortcut_active = self._is_tram_y_te_shortcut(role)
        if shortcut_active:
            tram_y_te_specialty = self._resolve_tram_y_te_specialty_name(state.get("filtered_specialties"))
            tram_y_te_diseases = workflow.disease_router._load_disease_candidates(
                tram_y_te_specialty,
                state.get("filtered_guideline_ids"),
            )
            # Shortcut for tram y te doctors: skip intent routing and force one specialty.
            state.update(
                {
                    "analyzed_specialties": [{"name": tram_y_te_specialty}],
                    "routed_diseases": {tram_y_te_specialty: tram_y_te_diseases} if tram_y_te_diseases else {},
                    "hypothetical_document": query,
                }
            )
            yield "trace", (
                "Shortcut: Role bac_si_tramyte -> bỏ qua intent routing, cố định chuyên khoa tram_y_te "
                f"và nạp trước {len(tram_y_te_diseases)} bệnh từ DB."
            )
        else:
            # 1) Intent routing
            yield "trace", "Định tuyến: Đang phân tích ý định và chuyên khoa liên quan"
            state.update(workflow.router.process(state))

        routed_specialties = [item.get("name") for item in state.get("analyzed_specialties", []) if item.get("name")]
        formatted_specialties = ", ".join(routed_specialties) if routed_specialties else "không có"
        yield "trace", f"Định tuyến: Điều phối đến các chuyên khoa: {formatted_specialties}"
        if workflow.route_logic(state) == "synthesis_node":
            yield "trace", "Định tuyến: Không xác định được chuyên khoa, chuyển thẳng sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 2) Disease routing
        if not shortcut_active:
            yield "trace", "Định tuyến bệnh: Đang định tuyến bệnh theo từng chuyên khoa..."
            state.update(await workflow.disease_router.process(state))

        routed_diseases = state.get("routed_diseases", {})
        total_diseases = sum(len(items) for items in routed_diseases.values())
        yield "trace", f"Định tuyến bệnh: Tổng số bệnh định tuyến được: {total_diseases}"
        if not shortcut_active and workflow.disease_route_logic(state) == "synthesis_node":
            yield "trace", "Định tuyến bệnh: Không có bệnh phù hợp, chuyển sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 3) Active version filtering
        yield "trace", "Lọc phiên bản: Đang lọc phiên bản hướng dẫn còn hoạt động..."
        state.update(workflow.version_filter.process(state))
        active_version_ids = state.get("active_version_ids", [])
        yield "trace", f"Lọc phiên bản: Tên các phiên bản đang hoạt động: {active_version_ids}"
        if workflow.version_filter_logic(state) == "synthesis_node":
            yield "trace", "Lọc phiên bản: Không có phiên bản đang hoạt động phù hợp, chuyển sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 4) Retrieval + experts
        yield "trace", f"Truy xuất: Đang truy xuất trên {len(active_version_ids)} phiên bản đang hoạt động..."
        state.update(await workflow.retriever.process(state))

        document_contexts = state.get("document_contexts", [])
        context_count = len(document_contexts)
        yield "trace", f"Truy xuất: Đã giữ lại {context_count} văn bản liên quan sau lọc retrieval."

        if context_count == 0:
            yield "trace", "Truy xuất: Không còn văn bản phù hợp, chuyển sang tổng hợp."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        yield "trace", "Chuyên gia: Đang tạo báo cáo cho nhiều chuyên khoa..."
        state.update(await workflow.experts.process(state))

        document_reports = state.get("document_reports", [])
        yield "trace", f"Chuyên gia: Đã tạo {len(document_reports)} báo cáo theo văn bản."

        if len(document_reports) == 1:
            yield "trace", (
                "Hard-bypass: Chỉ có 1 văn bản sau expert -> bỏ qua tổng hợp bệnh/chuyên khoa, "
                "chuyển thẳng sang tổng hợp cuối."
            )
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 4.2) Disease aggregation
        yield "trace", "Tổng hợp bệnh: Đang gộp báo cáo các văn bản theo từng bệnh..."
        state.update(await workflow.disease_aggregator.process(state))

        disease_reports = state.get("disease_reports", [])
        yield "trace", f"Tổng hợp bệnh: Đã tạo {len(disease_reports)} báo cáo theo bệnh."

        if not disease_reports:
            yield "trace", "Tổng hợp bệnh: Không có báo cáo bệnh, chuyển sang tổng hợp cuối."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 4.3) Specialty aggregation
        yield "trace", "Tổng hợp chuyên khoa: Đang gộp báo cáo bệnh theo từng chuyên khoa..."
        state.update(await workflow.specialty_aggregator.process(state))

        specialty_report_items = state.get("specialty_report_items", [])
        yield "trace", f"Tổng hợp chuyên khoa: Đã tạo {len(specialty_report_items)} báo cáo chuyên khoa."

        if not specialty_report_items:
            yield "trace", "Tổng hợp chuyên khoa: Không có báo cáo chuyên khoa, chuyển sang tổng hợp cuối."
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 5) Final synthesis streaming
        yield "trace", "Tổng hợp: Đang tổng hợp báo cáo liên chuyên khoa..."
        async for chunk in workflow.synthesizer.stream_process(state):
            cleaned = emit_clean(chunk)
            if cleaned:
                yield "chunk", cleaned

        final_tail = flush_clean()
        if final_tail:
            yield "chunk", final_tail

    async def stream_answer(
        self,
        query: str,
        role: str | None = None,
        mode: str | None = None,
        user_ids: int | str | None = None,
    ):
        """Backward-compatible text-only stream for existing consumers."""
        async for event, payload in self.stream_answer_events(query, role, mode, user_ids):
            if event == "chunk":
                yield payload

    async def run_chat_loop(self):
        print("\n" + "=" * 80)
        print("💻 MEDICAL RAG SYSTEM (OOP ARCHITECTURE)")
        print("=" * 80)

        while True:
            q = input("\n> [User Input] (gõ 'exit' để thoát): ")
            if q.lower() == 'exit':
                break

            try:
                # Chạy luồng đồ thị và stream dần câu trả lời ra terminal.
                print("\n[System Output]: ")
                async for chunk in self.stream_answer(q):
                    print(chunk, end="", flush=True)
                print()
            except Exception as e:
                print(f"\n❌ [Lỗi hệ thống]: {e}")


if __name__ == "__main__":
    chatbot = ChatbotApp()
    asyncio.run(chatbot.run_chat_loop())
