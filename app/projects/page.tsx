"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import NewProjectForm from "@/components/NewProjectForm";
import { useProjects } from "@/components/ProjectStore";
import {
  PROJECT_TYPE_GROUPS,
  projectHours,
  projectProgress,
  type ProjectType,
} from "@/lib/projects";

function targetLabel(target?: string) {
  if (!target) return null;
  const [y, m, d] = target.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `Target ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function ProjectsPage() {
  const { projects, hydrated } = useProjects();
  const [formType, setFormType] = useState<ProjectType | null>(null);

  const activeCount = projects.filter((p) => p.type !== "area" && p.type !== "practice").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Active Work
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                Projects
              </h1>
            </div>
            <span className="text-xs text-muted">
              {hydrated ? `${activeCount} active · ${projects.length} total` : " "}
            </span>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormType("practice")}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground"
            >
              + New Practice
            </button>
            <button
              type="button"
              onClick={() => setFormType("area")}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground"
            >
              + New Area
            </button>
            <button
              type="button"
              onClick={() => setFormType("active")}
              className="rounded-md bg-[#2323e8] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
            >
              + New Project
            </button>
          </div>

          {/* Grouped lists */}
          <div className="mt-8 space-y-8">
            {!hydrated && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded bg-hover"
                  />
                ))}
              </div>
            )}

            {hydrated && projects.length === 0 && (
              <p className="text-sm text-muted">
                No projects yet. Create one with “+ New Project”.
              </p>
            )}

            {hydrated &&
              PROJECT_TYPE_GROUPS.map(({ type, label }) => {
                const list = projects.filter((p) => p.type === type);
                if (list.length === 0) return null;
                return (
                  <section key={type}>
                    <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                      {label} · {list.length}
                    </h2>
                    <div className="flex flex-col">
                      {list.map((p) => {
                        const progress = projectProgress(p);
                        const hours = projectHours(p);
                        return (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="border-b border-border py-3 transition-colors hover:bg-hover"
                          >
                            <div className="flex items-center gap-2 px-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: p.color }}
                                aria-hidden="true"
                              />
                              <span className="text-lg font-medium text-foreground">
                                {p.name}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pl-6 text-[11px] uppercase tracking-wide text-muted">
                              {p.client && <span>{p.client}</span>}
                              <span>{hours.toFixed(1)}h logged</span>
                              {p.milestones.length > 0 && (
                                <span>
                                  {progress.doneCount}/{progress.total} milestones
                                </span>
                              )}
                              {targetLabel(p.target) && (
                                <span>{targetLabel(p.target)}</span>
                              )}
                              {p.type === "retainer" && <span>· Retainer</span>}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

            {hydrated && (() => {
              const practiceProjects = projects.filter((p) => p.type === "practice");
              return (
                <section>
                  <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Practice · {practiceProjects.length + 3}
                  </h2>
                  <div className="flex flex-col">
                    <Link
                      href="/flashcards"
                      className="border-b border-border py-3 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-center gap-2 px-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2323e8]" aria-hidden="true" />
                        <span className="text-lg font-medium text-foreground">Flashcards</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pl-6 text-[11px] uppercase tracking-wide text-muted">
                        <span>English Vocabulary or Urdu</span>
                      </div>
                    </Link>
                    <Link
                      href="/vocabulary"
                      className="border-b border-border py-3 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-center gap-2 px-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0d9488]" aria-hidden="true" />
                        <span className="text-lg font-medium text-foreground">English Vocabulary</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pl-6 text-[11px] uppercase tracking-wide text-muted">
                        <span>Word list & definitions</span>
                      </div>
                    </Link>
                    <Link
                      href="/podcasts"
                      className="border-b border-border py-3 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-center gap-2 px-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d4ed8]" aria-hidden="true" />
                        <span className="text-lg font-medium text-foreground">Podcast Notes</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pl-6 text-[11px] uppercase tracking-wide text-muted">
                        <span>Listening log → Library</span>
                      </div>
                    </Link>
                    {practiceProjects.map((p) => {
                      const progress = projectProgress(p);
                      const hours = projectHours(p);
                      return (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="border-b border-border py-3 transition-colors hover:bg-hover"
                        >
                          <div className="flex items-center gap-2 px-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: p.color }}
                              aria-hidden="true"
                            />
                            <span className="text-lg font-medium text-foreground">{p.name}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pl-6 text-[11px] uppercase tracking-wide text-muted">
                            {p.client && <span>{p.client}</span>}
                            <span>{hours.toFixed(1)}h logged</span>
                            {p.milestones.length > 0 && (
                              <span>{progress.doneCount}/{progress.total} milestones</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>
        </div>
      </main>

      {formType && (
        <NewProjectForm
          defaultType={formType}
          onClose={() => setFormType(null)}
        />
      )}
    </div>
  );
}
