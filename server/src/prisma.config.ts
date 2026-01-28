import { defineConfig } from "prisma/config";
import { config } from "./config/env";

export default defineConfig({
  datasource: {
    url: config.databaseUrl,
  },
});
