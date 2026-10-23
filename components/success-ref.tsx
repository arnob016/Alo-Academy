"use client";

import { useSearchParams } from "next/navigation";
import { REF_PATTERN } from "@/lib/ref";

export function SuccessRef({ label, hint, fallback }: { label: string; hint: string; fallback: string }) {
  const ref = useSearchParams().get("ref");
  return <RefBox label={label} hint={hint} fallback={fallback} value={ref && REF_PATTERN.test(ref) ? ref : null} />;
}

export function RefBox({
  label,
  hint,
  fallback,
  value,
}: {
  label: string;
  hint: string;
  fallback: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border-2 border-brand/20 bg-white p-6 text-center">
      {value ? (
        <>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-brand sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm text-muted">{hint}</p>
        </>
      ) : (
        <p className="py-4 font-medium text-ink">{fallback}</p>
      )}
    </div>
  );
}
