import antfu from "@antfu/eslint-config";

export default antfu({
  type: "app",
  stylistic: {
    semi: true,
    indent: 2,
    quotes: "double",
  },
  typescript: {
    overrides: {
      "ts/consistent-type-imports": "off",
      "ts/consistent-type-definitions": "off",
      "perfectionist/sort-imports": "off",
      "perfectionist/sort-exports": "off",
      "perfectionist/sort-named-imports": "off",
      "perfectionist/sort-named-exports": "off",
      "perfectionist/sort-type-exports": "off",
      "perfectionist/sort-type-imports": "off",
      "unicorn/prefer-node-protocol": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": "warn",
      "node/prefer-global/process": "off",
      "node/prefer-global/buffer": "off",
    },
  },
  jsonc: false,
  markdown: false,
  yaml: false,
  toml: false,
});
