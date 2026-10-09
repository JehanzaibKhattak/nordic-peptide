import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.postgresql.prisma",
  migrations: { path: "migrations-postgresql", seed: "tsx prisma/seed.ts" },
});
