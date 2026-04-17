"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { loginAction, type LoginState } from "@/actions/auth";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );

  const error = state && "error" in state ? state.error : null;

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-[var(--space-4)]"
    >
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div>
        <label
          htmlFor="name"
          className="block text-xs font-medium mb-[var(--space-2)]"
          style={{ color: "var(--text-secondary)" }}
        >
          Namn
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="username"
          autoFocus
          required
          disabled={pending}
          className="w-full px-[var(--space-4)] py-[var(--space-3)] text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        />
      </div>

      <div>
        <label
          htmlFor="pin"
          className="block text-xs font-medium mb-[var(--space-2)]"
          style={{ color: "var(--text-secondary)" }}
        >
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          disabled={pending}
          className="w-full px-[var(--space-4)] py-[var(--space-3)] text-sm font-mono outline-none transition-colors"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            letterSpacing: "0.2em",
          }}
        />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs px-[var(--space-3)] py-[var(--space-2)]"
          style={{
            color: "var(--error)",
            background: "var(--error-muted)",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium transition-all disabled:opacity-40 mt-[var(--space-2)]"
        style={{
          background: "var(--accent)",
          color: "var(--text-inverse)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {pending ? "Loggar in..." : "Logga in"}
      </button>
    </motion.form>
  );
}
