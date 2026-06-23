"use client";

type CheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
};

/** A small Notion-style square checkbox. */
export default function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
        checked
          ? "border-neutral-800 bg-neutral-800 text-white"
          : "border-neutral-300 bg-white hover:border-neutral-400"
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path
            d="M3.5 8.5l3 3 6-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
