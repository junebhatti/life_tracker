"use client";

import { TaskStoreProvider } from "@/components/TaskStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TaskStoreProvider>{children}</TaskStoreProvider>;
}
