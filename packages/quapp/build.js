import { execSync } from "child_process";
import fs from "fs";
import { rm } from "fs/promises";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";

// ASCII color codes for console
const c = {
  blue: "\x1b[34m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// __dirname workaround for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = process.cwd();
const distFolder = path.join(projectRoot, "dist");
const outputQpp = path.join(projectRoot, "dist.qpp");

console.log(`${c.blue}\n📦 Starting production build...${c.reset}`);

try {
  // Step 1: Run build
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch (err) {
    console.error(`${c.red}❌ Build process failed. Please check your build script.${c.reset}`);
    process.exit(1);
  }

  // Step 2: Verify dist/ exists
  if (!fs.existsSync(distFolder)) {
    console.error(`${c.red}❌ Build folder 'dist/' not found!${c.reset}`);
    process.exit(1);
  }

  // Step 3: Compress dist/ into dist.qpp using archiver
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputQpp);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`${c.green}\n✅ Project built and compressed → ${c.bold}dist.qpp${c.reset}`);
      resolve();
    });

    output.on("error", (err) => {
      console.error(`${c.red}❌ Failed to write output file: ${err.message}${c.reset}`);
      reject(err);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn(`${c.yellow}⚠️ Archive warning: ${err.message}${c.reset}`);
      } else {
        reject(err);
      }
    });

    archive.on("error", (err) => {
      console.error(`${c.red}❌ Archiving failed: ${err.message}${c.reset}`);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(distFolder, false);
    archive.finalize();
  });

  // Step 4: Remove dist folder
  try {
    await rm(distFolder, { recursive: true, force: true });
  } catch (err) {
    console.warn(`${c.yellow}⚠️ Could not remove dist/: ${err.message}${c.reset}`);
  }

} catch (err) {
  console.error(`${c.red}\n❌ Unexpected failure: ${err.message}${c.reset}`);
  process.exit(1);
}
