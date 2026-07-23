/**
 * Patches react-native-css-interop/babel.js to remove the
 * "react-native-worklets/plugin" line which is only valid for
 * react-native-reanimated v4+. We use v3 (SDK 54 compatible).
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-css-interop",
  "babel.js"
);

if (!fs.existsSync(filePath)) {
  console.log("patch-css-interop: file not found, skipping");
  process.exit(0);
}

const original = fs.readFileSync(filePath, "utf8");
const patched = original.replace(
  /\/\/ Use this plugin in reanimated 4 and later\n\s*"react-native-worklets\/plugin",?\n/,
  "      // react-native-worklets/plugin skipped (reanimated v3, SDK 54)\n"
);

if (original === patched) {
  console.log("patch-css-interop: already patched or pattern not found");
} else {
  fs.writeFileSync(filePath, patched, "utf8");
  console.log("patch-css-interop: patched successfully");
}
