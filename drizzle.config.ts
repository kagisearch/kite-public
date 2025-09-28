import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Adjust this to point to your schema definition files
  schema: "./src/lib/db/schema/**/*.{ts,js}",
  out: "./drizzle", // where migrations & generated types will live

  // Required in drizzle-kit ≥0.30
  dialect: "postgresql",

  // Uncomment if you keep migrations elsewhere
  // migrationsFolder: "./src/migrations",
}); 