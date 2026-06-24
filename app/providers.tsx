"use client";

import { ProjectStoreProvider } from "@/components/ProjectStore";
import { RoutineStoreProvider } from "@/components/RoutineStore";
import { TaskStoreProvider } from "@/components/TaskStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProjectStoreProvider>
      <RoutineStoreProvider>
        <TaskStoreProvider>{children}</TaskStoreProvider>
      </RoutineStoreProvider>
    </ProjectStoreProvider>
  );
}
