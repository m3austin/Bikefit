import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/*
 * ESLint flat config. eslint-config-next v16 ships native flat-config arrays,
 * so we spread them directly (no FlatCompat bridge). Next 16 removed the
 * `next lint` command; `npm run lint` runs eslint against this config.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
