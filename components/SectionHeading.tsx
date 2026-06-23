type SectionHeadingProps = {
  title: string;
  /** Optional small text or action shown on the right (e.g. "View all"). */
  action?: string;
};

/** Small uppercase label used to title each section, Notion-style. */
export default function SectionHeading({ title, action }: SectionHeadingProps) {
  return (
    <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {title}
      </h2>
      {action && (
        <button
          type="button"
          className="text-[11px] text-muted transition-colors hover:text-foreground"
        >
          {action} →
        </button>
      )}
    </div>
  );
}
