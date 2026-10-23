"use client";

import { useSearchParams } from "next/navigation";
import { REF_PATTERN } from "@/lib/ref";
import { CopyButton } from "./copy-button";

type RefText = { label: string; hint: string; fallback: string; copy: string; copied: string };

export function SuccessRef(text: RefText) {
  const ref = useSearchParams().get("ref");
  return <RefBox {...text} value={ref && REF_PATTERN.test(ref) ? ref : null} />;
}

export function RefBox({ label, hint, fallback, copy, copied, value }: RefText & { value: string | null }) {
  return (
    <div className="rounded-xl border-2 border-brand/20 bg-white p-6 text-center">
      {value ? (
        <>
          <p className="text-sm font-medium text-muted">{label}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <p className="font-mono text-2xl font-bold tracking-wider text-brand sm:text-3xl">{value}</p>
            <CopyButton value={value} labels={{ copy, copied }} className="text-brand" />
          </div>
          <p className="mt-2 text-sm text-muted">{hint}</p>
        </>
      ) : (
        <p className="py-4 font-medium text-ink">{fallback}</p>
      )}
    </div>
  );
}
