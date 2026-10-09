import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

export const databaseUrl = `file:${resolve("tmp/commerce-e2e.db")}`;
export const sessionSecret = "e2e-only-session-secret-never-use-in-production-123456789";

export default async function setup() {
  mkdirSync("tmp", { recursive: true });
  writeFileSync("tmp/commerce-e2e.db", "");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" });
  const db = new PrismaClient({ datasourceUrl: databaseUrl });
  await db.category.create({ data: { id: "e2e-category", slug: "research", name: { en: "Research", es: "Investigación" } } });
  await db.product.create({ data: {
    id: "e2e-product", slug: "e2e-sample", sku: "E2E-SAMPLE", name: { en: "Research Sample", es: "Muestra de investigación" }, shortDescription: { en: "Test sample" }, description: { en: "Test sample" },
    categoryId: "e2e-category", form: "SERUM", specs: { keyPeptides: [], inci: "", skinTypes: [], texture: "", ph: "", pao: "", shelfLife: "", usage: "" }, images: ["/window.svg"], relatedIds: [], faqs: {}, researchApproved: true, approvedCountries: ["ES"],
    variants: { create: { id: "e2e-variant", label: "10 mg", sizeMl: 1, priceCents: 2000, stock: 100, sku: "E2E-VARIANT" } },
  } });
  await db.shippingApproval.create({ data: { country: "ES", approved: true } });
  await db.purchaser.create({ data: { id: "e2e-buyer", email: "researcher@example.com", emailVerifiedAt: new Date(), organization: "Example Lab", registrationId: "LAB-12345", website: "https://example.com", researchPurpose: "Institutional analytical research at Example Lab with independent verification.", status: "APPROVED", approvedUntil: new Date(Date.now() + 86400000) } });
  await db.$disconnect();
}
