#!/usr/bin/env node

import { spawn } from "child_process";
import os from "os";
import qrcode from "qrcode-terminal";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import open from "open";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

// __dirname replacement in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default config
let config = {
  server: {
    qr: true,
    network: "private",
    port: 5173,
    fallbackPort: true,
    https: false,
    openBrowser: false,
    autoRetry: true,
    strictPort: false,
  },
};

// Load user config
const loadUserConfig = async () => {
  try {
    const configPath = path.resolve("quapp.config.json");
    if (existsSync(configPath)) {
      const data = await fs.readFile(configPath, "utf-8");
      const userConfig = JSON.parse(data);
      config = {
        ...config,
        ...userConfig,
        server: { ...config.server, ...userConfig.server },
      };
    }
  } catch (err) {
    console.warn("⚠️ Failed to read quapp.config.json. Using default config.");
    console.warn(err.message);
  }
};

// Get IP address
const getIP = (networkType = "local") => {
  if (networkType === "private") {
    const interfaces = os.networkInterfaces();
    for (const key in interfaces) {
      for (const iface of interfaces[key] ?? []) {
        if (!iface.internal && iface.family === "IPv4") {
          return iface.address;
        }
      }
    }
  }
  return "localhost";
};

// Start Vite server
const startVite = (port, attempt = 0) => {
  const host = config.server.network === "private" ? getIP("private") : "localhost";
  const protocol = config.server.https ? "https" : "http";
  const url = `${protocol}://${host}:${port}`;

  const viteArgs = [
    "--host",
    host,
    "--port",
    port,
    ...(config.server.strictPort || !config.server.autoRetry ? ["--strictPort"] : []),
    ...(config.server.https ? ["--https"] : []),
  ];

  const viteBinary = path.resolve(
    "node_modules",
    ".bin",
    process.platform === "win32" ? "vite.cmd" : "vite"
  );

  if (!existsSync(viteBinary)) {
    console.error("❌ vite binary not found. Try running `npm install vite`.");
    process.exit(1);
  }

  const vite = spawn("npx", ["vite", ...viteArgs], {
    stdio: "pipe",
    shell: true,
  });

  vite.stdout.on("data", (data) => process.stdout.write(data));
  vite.stderr.on("data", (data) => process.stderr.write(data));

  setTimeout(() => {
    console.log(`\n🌍 Access your app from LAN at: ${url}`);
    if (config.server.qr) {
      console.log(`\n📱 Scan the QR code below:\n`);
      qrcode.generate(url, { small: true });
    }
    if (config.server.openBrowser) {
      open(url);
    }
  }, 1500);

  vite.on("exit", (code) => {
    if (
      code !== 0 &&
      config.server.fallbackPort &&
      config.server.autoRetry &&
      attempt < 10
    ) {
      console.log(`⚠️ Port ${port} in use. Trying port ${port + 1}...`);
      startVite(port + 1, attempt + 1);
    } else if (code !== 0) {
      console.error(`❌ Vite exited with code ${code}`);
    }
  });
};

// Main
const main = async () => {
  await loadUserConfig();
  startVite(config.server.port);
};

main();