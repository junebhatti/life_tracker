"use client";

import { AuthProvider, useAuth } from "@/components/AuthProvider";
import LoginScreen from "@/components/LoginScreen";
import SupabaseSetupNotice from "@/components/SupabaseSetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BudgetStoreProvider } from "@/components/BudgetStore";
import { LibraryStoreProvider } from "@/components/LibraryStore";
import { PeopleStoreProvider } from "@/components/PeopleStore";
import { ProjectStoreProvider } from "@/components/ProjectStore";
import { RoutineStoreProvider } from "@/components/RoutineStore";
import { TaskStoreProvider } from "@/components/TaskStore";

/** Renders the signed-out screen, or the data stores once a session exists. */
function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <ProjectStoreProvider>
      <RoutineStoreProvider>
        <PeopleStoreProvider>
          <LibraryStoreProvider>
            <BudgetStoreProvider>
              <TaskStoreProvider>{children}</TaskStoreProvider>
            </BudgetStoreProvider>
          </LibraryStoreProvider>
        </PeopleStoreProvider>
      </RoutineStoreProvider>
    </ProjectStoreProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />;
  }

  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
