"use client";

import { useEffect, useState } from "react";
import { PROJECT_COLORS, type ProjectType } from "@/lib/projects";
import { useProjects } from "./ProjectStore";

type NewProjectFormProps = {
  onClose: () => void;
  /** Preset type, e.g. "area" when launched from "+ New Area". */
  defaultType?: ProjectType;
};

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "retainer", label: "Retainer" },
  { value: "area", label: "Area" },
  { value: "practice", label: "Practice" },
];

/** Modal form for creating a project or area. */
export default function NewProjectForm({
  onClose,
  defaultType = "active",
}: NewProjectFormProps) {
  const { addProject } = useProjects();

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<ProjectType>(defaultType);
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [target, setTarget] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProject({
      name,
      client: client || undefined,
      type,
      color,
      target: target || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          New {type === "area" ? "area" : "project"}
        </h2>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "area" ? "Area name" : "Project name"}
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Client / Area
            </span>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. Hill Media Group"
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Target date
            </span>
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-md border border-border px-2 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Type
          </span>
          <div className="flex rounded-md border border-border p-0.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  type === opt.value
                    ? "bg-[#2323e8] text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Color
          </span>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  color === c
                    ? "scale-110 border-[#2323e8]"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-[#2323e8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1c1cba] disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
