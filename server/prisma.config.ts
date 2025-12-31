import { defineConfig } from "prisma/config";
import { config } from "./src/config/env";

export default defineConfig({
  datasource: {
    url: config.databaseUrl,
  },
});
