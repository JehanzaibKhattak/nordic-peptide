"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";

const RESIDUE_MASSES: Record<string, number> = {
  A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388,
  E: 129.1155, Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594,
  L: 113.1594, K: 128.1741, M: 131.1926, F: 147.1766, P: 97.1167,
  S: 87.0782, T: 101.1051, W: 186.2132, Y: 163.176, V: 99.1326,
};

export function SequenceCalculator() {
  const t = useTranslations("calculator");
  const [sequence, setSequence] = useState("");
  const normalized = sequence.replace(/[\s-]/g, "").toUpperCase();
  const invalid = normalized.length > 0 && [...normalized].some((aa) => !(aa in RESIDUE_MASSES));
  const result = normalized.length > 0 && !invalid
    ? [...normalized].reduce((sum, aa) => sum + RESIDUE_MASSES[aa], 18.01528)
    : null;

  return (
    <div className="grid gap-8 rounded-2xl border border-[#e6dfd2] bg-white p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-9">
      <div>
        <label htmlFor="peptide-sequence" className="text-sm font-semibold text-primary">{t("sequenceLabel")}</label>
        <Textarea
          id="peptide-sequence"
          value={sequence}
          onChange={(event) => setSequence(event.target.value)}
          placeholder={t("placeholder")}
          maxLength={400}
          spellCheck={false}
          autoCapitalize="characters"
          className="mt-3 min-h-28 resize-y font-mono uppercase tracking-[0.12em]"
          aria-invalid={invalid}
          aria-describedby="sequence-help sequence-error"
        />
        <p id="sequence-help" className="mt-2 text-sm text-muted-foreground">{t("hint")}</p>
        <p id="sequence-error" aria-live="polite" className="mt-2 min-h-5 text-sm text-destructive">
          {invalid ? t("invalid") : ""}
        </p>
      </div>

      <div className="flex min-h-48 flex-col justify-center rounded-xl bg-[#f6f2e9] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#82907f]">{t("resultLabel")}</p>
        <p aria-live="polite" className="mt-3 font-serif text-4xl font-semibold tracking-tight text-primary">
          {result === null ? "—" : result.toFixed(2)}
          {result !== null && <span className="ml-2 text-base font-normal">Da</span>}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {normalized.length > 0 && !invalid ? t("residueCount", { count: normalized.length }) : t("emptyResult")}
        </p>
      </div>

      <p className="text-xs leading-5 text-muted-foreground md:col-span-2">{t("calculationNote")}</p>
    </div>
  );
}
