import next from "eslint-config-next";

/** eslint-config-next 16 ships a native flat-config array — use it directly
 *  rather than the FlatCompat shim, which has a circular-structure bug on
 *  ESLint 10. */
const eslintConfig = [
  ...next,
  {
    ignores: ["node_modules/**", ".next/**", "src/types/database.types.ts"],
  },
];

export default eslintConfig;
