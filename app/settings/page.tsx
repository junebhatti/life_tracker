import Sidebar from "@/components/Sidebar";
import CalendarIntegrationStatus from "@/components/CalendarIntegrationStatus";
import ObsidianSync from "@/components/ObsidianSync";
import SessionStatus from "@/components/SessionStatus";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Settings
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Integrations
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Check that connected services are actually working.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <SessionStatus />
            <CalendarIntegrationStatus />
            <ObsidianSync />
          </div>
        </div>
      </main>
    </div>
  );
}
