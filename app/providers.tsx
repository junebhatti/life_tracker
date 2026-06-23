"use client";

import { ProjectStoreProvider } from "@/components/ProjectStore";
import { TaskStoreProvider } from "@/components/TaskStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProjectStoreProvider>
      <TaskStoreProvider>{children}</TaskStoreProvider>
    </ProjectStoreProvider>
  );
}
