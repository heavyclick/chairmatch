import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // react-hooks/immutability is an experimental React Compiler rule
      // (eslint-plugin-react-hooks v7) that produces confirmed false
      // positives on plain `window.location.href = url` assignments
      // inside async event-handler functions -- it incorrectly treats
      // them as render-scope mutations in some files with multiple
      // early-return conditional branches, even though identical code
      // passes cleanly elsewhere in this same codebase. Inline
      // eslint-disable comments do not suppress this rule (tested),
      // so it's disabled at the config level instead. Revisit once a
      // stable, non-experimental version of this rule ships.
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
