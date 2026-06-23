import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TasksWorkspace from "@/components/TasksWorkspace";

export default function TasksPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={null}>
          <TasksWorkspace />
        </Suspense>
      </main>
    </div>
  );
}
