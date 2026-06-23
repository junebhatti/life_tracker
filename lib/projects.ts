// Projects act as the "filters" tasks can be tagged with.
// Each has a color used for the dot shown next to a task.

export type Project = {
  id: string;
  name: string;
  color: string;
};

export const PROJECTS: Project[] = [
  { id: "black-diamond", name: "Black Diamond Services", color: "#b91c1c" },
  { id: "el-dorado", name: "El Dorado Pools", color: "#db2777" },
  { id: "fetter-pools", name: "Fetter Pools SEO Project", color: "#9333ea" },
  { id: "glacier-precast", name: "Glacier Precast Concrete", color: "#c2410c" },
  { id: "grizzly-loans", name: "Grizzly Home Loans SEO Project", color: "#a16207" },
  { id: "hill-media", name: "Hill Media Group", color: "#0d9488" },
  { id: "home", name: "Home", color: "#2563eb" },
  { id: "jerad-wp", name: "Jerad WP", color: "#16a34a" },
];

export function getProject(id: string | undefined): Project | undefined {
  if (!id) return undefined;
  return PROJECTS.find((p) => p.id === id);
}
