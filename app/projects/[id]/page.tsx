import Sidebar from "@/components/Sidebar";
import ProjectDetail from "@/components/ProjectDetail";

export default function ProjectPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ProjectDetail />
      </main>
    </div>
  );
}
