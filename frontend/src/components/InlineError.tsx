interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
}

export default function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <p className="font-mono text-xs text-accent-red">-- {message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="font-mono text-xs text-ink-muted hover:text-ink shrink-0"
          aria-label="Dismiss error"
        >
          &times;
        </button>
      )}
    </div>
  );
}
