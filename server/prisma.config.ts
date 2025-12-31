import path from "path";
import { defineConfig } from "prisma/config";
import { config } from "./src/config/env";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: config.databaseUrl,
  },
});
