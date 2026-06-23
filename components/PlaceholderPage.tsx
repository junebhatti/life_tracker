import Sidebar from "@/components/Sidebar";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

/** Simple scaffold for sections that aren't built out yet. */
export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">{description}</p>
        </div>
      </main>
    </div>
  );
}
