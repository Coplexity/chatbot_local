export function TypingIndicator() {
  return (
    <div className="flex gap-1 text-cite">
      <span className="animate-bounce">●</span>
      <span className="animate-bounce" style={{ animationDelay: "100ms" }}>
        ●
      </span>
      <span className="animate-bounce" style={{ animationDelay: "200ms" }}>
        ●
      </span>
    </div>
  );
}
