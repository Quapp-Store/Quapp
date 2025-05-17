#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user command
const args = process.argv.slice(2);
const command = args[0];

// Path to files inside your package
const buildPath = path.join(__dirname, "../build.js");
const servePath = path.join(__dirname, "../server.js");

// Helper to run a file with Node
function runScript(scriptPath) {
  const child = spawn("node", [scriptPath], { stdio: "inherit" });
  child.on("close", (code) => process.exit(code));
}

switch (command) {
  case "build":
    runScript(buildPath);
    break;
  case "serve":
    runScript(servePath);
    break;
  default:
    console.log(`
\x1b[1m\x1b[34mQuapp CLI\x1b[0m

Usage:
  quapp build       Run production build and compress to dist.quapp
  quapp serve       Start local server for testing your app

Options:
  -h, --help        Show this help message

Examples:
  quapp build
  quapp serve
`);
    break;
}