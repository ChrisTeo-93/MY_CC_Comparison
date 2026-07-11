const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Explicit monorepo wiring so Metro resolves @kadcompare/core (a sibling
// workspace package, symlinked into the monorepo root's node_modules) —
// belt-and-suspenders alongside Expo's built-in workspace auto-detection.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
