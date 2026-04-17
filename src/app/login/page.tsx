import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-[var(--space-6)]"
      style={{ background: "var(--bg-root)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-8)]">
          <div
            className="w-9 h-9 flex items-center justify-center"
            style={{
              background: "var(--accent-muted)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <span className="font-heading text-sm font-bold" style={{ color: "var(--accent)" }}>
              SR
            </span>
          </div>
          <div>
            <div
              className="font-heading text-lg font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Sales Reflex
            </div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Logga in för att fortsätta
            </div>
          </div>
        </div>

        <LoginForm redirectTo={from} />
      </div>
    </main>
  );
}
