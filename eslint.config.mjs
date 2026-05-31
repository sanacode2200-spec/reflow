import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
  {
    files: [
      "app/(dashboard)/patients/patients-client.tsx",
      "components/features/staff/staff-table.tsx",
      "app/(dashboard)/documents/**/*.tsx",
      "components/features/documents/b21-plan-form.tsx",
    ],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
