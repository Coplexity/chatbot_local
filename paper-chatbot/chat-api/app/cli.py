import asyncio
import re
import unicodedata

from app.workflow import ScientificSearchWorkflow

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
        # Khởi tạo toàn bộ luồng scientific search từ file workflow.
        self.deep_workflow = ScientificSearchWorkflow()
        self.app = self.deep_workflow.app

    @staticmethod
    def _stream_tokens(text):
        """Stream text word-by-word"""
        tokens = re.findall(r"\S+\s*", text or "")
        return tokens if tokens else [text or ""]

    @staticmethod
    def _normalize_mode(mode: str | None) -> str:
        # The API has one scientific execution path.  Keep accepting the old
        # field during rollout so older clients do not fail validation.
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
    def _normalize_topic_alias(text: str) -> str:
        normalized = unicodedata.normalize("NFD", text or "")
        normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        normalized = normalized.lower().strip().replace("-", "_").replace(" ", "_")
        normalized = re.sub(r"_+", "_", normalized)
        return normalized

    async def stream_answer_events(
        self,
        query: str,
        role: str | None = None,
        mode: str | None = None,
        user_ids: int | str | None = None,
    ):
        user_ids = self._default_user_ids(user_ids)
        async for event, payload in self._stream_answer_events_basic(query, role, user_ids):
            yield event, payload

    async def _stream_answer_events_basic(
        self,
        query: str,
        role: str | None = None,
        user_ids: int | str | None = None,
    ):
        """Run one query through the scientific pipeline and yield typed events:
        ('trace'|'chunk', payload).

        Pipeline (đã chốt):
          0) QuestionValidatorNode     -> intent
          1) GuidelineOwnerFilterNode  -> filtered_guideline_ids, filtered_topics
          2) TopicRoutingNode          -> selected_topics, hypothetical_document
          3) ActiveVersionFilterNode   -> active_version_ids
          4) VectorRetrievalNode       -> document_contexts
          5) DocumentExpertsNode       -> document_reports
          6) TopicAggregatorNode       -> topic_reports
          7) GlobalSynthesizerNode     -> synthesized_answer and final output
        """
        workflow = self.deep_workflow   
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

        async def run_synthesis_and_stop():
            """Gọi GlobalSynthesizerNode.stream_process rồi kết thúc generator."""
            async for chunk in workflow.synthesizer.stream_process(state):
                cleaned = emit_clean(chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail

        # 0) Validate câu hỏi / phân loại intent
        yield "trace", "Xác nhận: Đang kiểm tra câu hỏi..."
        state.update(workflow.question_validator.process(state))
        validation_category = state.get("intent", "aggregate")

        # Handle greeting
        if validation_category == "greeting":
            yield "trace", "Xác nhận: Đây là lời chào hỏi 👋"
            response_text = "Xin chào! Tôi có thể giúp bạn tìm và tổng hợp tài liệu khoa học theo chủ đề, loại văn bản, DOI hoặc tác giả."
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return

        # Handle off-topic
        if validation_category == "off_topic":
            yield "trace", "Phân loại: off_topic"
            response_text = "Tôi chỉ hỗ trợ tra cứu và tổng hợp tài liệu khoa học.\n- Tìm bài viết về chủ đề X\n- Liệt kê tài liệu của tác giả Y\n- Tổng hợp kết quả nghiên cứu về Z"
            for chunk in self._stream_tokens(response_text):
                yield "chunk", chunk
            return

        yield "trace", f"Phân loại: {validation_category}"

        # 1) Guideline owner filter
        yield "trace", "Lọc guidelines: Đang lọc guideline theo user_id..."
        state.update(workflow.guideline_filter.process(state))
        yield "trace", f"Lọc guidelines: Tìm thấy {len(state.get('filtered_guideline_ids', []))} guideline phù hợp."

        if validation_category == "text_to_sql":
            yield "trace", "Catalogue: extracting safe filters and querying permitted documents..."
            outcome = workflow.catalogue_search.process(state)

            if "error_response" in outcome:
                for chunk in self._stream_tokens(outcome["error_response"]):
                    yield "chunk", chunk
                return

            rows, columns = outcome["rows"], outcome["columns"]

            yield "trace", "Catalogue: đang diễn giải kết quả sang ngôn ngữ tự nhiên..."
            async for text_chunk in workflow.catalogue_nl_formatter.stream_process(query, rows, columns):
                cleaned = emit_clean(text_chunk)
                if cleaned:
                    yield "chunk", cleaned
            tail = flush_clean()
            if tail:
                yield "chunk", tail
            return

        # 2) Topic routing
        yield "trace", "Chủ đề: Đang chọn chu_de từ catalogue được cấp quyền..."
        state.update(workflow.topic_router.process(state))

        routed_topics = [item.get("name") for item in state.get("selected_topics", []) if item.get("name")]
        formatted_topics = ", ".join(routed_topics) if routed_topics else "không có"
        yield "trace", f"Chủ đề: Đã chọn {formatted_topics}"
        if workflow.route_logic(state) == "synthesis_node":
            yield "trace", "Chủ đề: Không chọn được chủ đề phù hợp."
            async for event, payload in run_synthesis_and_stop():
                yield event, payload
            return

        # 3) Active version filtering
        yield "trace", "Phiên bản: Đang lọc guideline_versions có trạng thái active..."
        state.update(workflow.version_filter.process(state))
        active_version_ids = state.get("active_version_ids", [])
        yield "trace", f"Phiên bản: Đã chọn {len(active_version_ids)} version active."
        if workflow.version_filter_logic(state) == "synthesis_node":
            yield "trace", "Phiên bản: Không có version active phù hợp."
            async for event, payload in run_synthesis_and_stop():
                yield event, payload
            return

        # 4) Vector retrieval
        yield "trace", f"Truy xuất: Đang lấy chunks từ {len(active_version_ids)} version active..."
        state.update(await workflow.retriever.process(state))

        document_contexts = state.get("document_contexts", [])
        context_count = len(document_contexts)
        yield "trace", f"Truy xuất: Đã giữ lại {context_count} văn bản liên quan sau lọc retrieval."

        if context_count == 0:
            yield "trace", "Truy xuất: Không còn văn bản phù hợp, chuyển sang tổng hợp."
            async for event, payload in run_synthesis_and_stop():
                yield event, payload
            return

        # 5) Document experts
        yield "trace", "Chuyên gia: Đang tạo báo cáo cho từng tài liệu..."
        state.update(await workflow.experts.process(state))

        document_reports = state.get("document_reports", [])
        yield "trace", f"Chuyên gia: Đã tạo {len(document_reports)} báo cáo theo văn bản."

        if not document_reports:
            yield "trace", "Chuyên gia: Không có báo cáo văn bản nào, chuyển sang tổng hợp."
            async for event, payload in run_synthesis_and_stop():
                yield event, payload
            return

        # 6) Topic aggregation
        yield "trace", "Tổng hợp chủ đề: Đang gộp báo cáo theo chủ đề..."
        state.update(await workflow.topic_aggregator.process(state))

        topic_reports = state.get("topic_reports", [])
        yield "trace", f"Tổng hợp chủ đề: Đã tạo {len(topic_reports)} báo cáo."

        # 7) Final synthesis streaming — GlobalSynthesizerNode tự gộp
        # topic_reports/document_reports và viết câu trả lời cuối trong 1 bước.
        yield "trace", "Tổng hợp: Đang tạo câu trả lời cuối..."
        async for event, payload in run_synthesis_and_stop():
            yield event, payload

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
        print("💻 SCIENTIFIC DOCUMENT RAG SYSTEM (OOP ARCHITECTURE)")
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