type SectionHeadingProps = {
  title: string;
  /** Optional node rendered on the right (e.g. a "View all" or "+ Add" link). */
  action?: React.ReactNode;
};

/** Small uppercase label used to title each section, Notion-style. */
export default function SectionHeading({ title, action }: SectionHeadingProps) {
  return (
    <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {title}
      </h2>
      {action && <div className="text-[11px] text-muted">{action}</div>}
    </div>
  );
}
