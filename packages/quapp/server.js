import { spawn } from "child_process";
import os from "os";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import open from "open";

// Load config
let config = {
  server: {
    qr: true,
    network: "private",
    port: 5173,
    fallbackPort: true,
    https: false,
    openBrowser: false,
    autoRetry: true,
    strictPort: false
  }
};

try {
  const configPath = path.resolve("quapp.config.json");
  if (fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config = {
      ...config,
      ...userConfig,
      server: { ...config.server, ...userConfig.server }
    };
  }
} catch (err) {
  console.warn("⚠️ Failed to read quapp.config.json. Using default config.");
}

// Get local or LAN IP
function getIP(networkType = "local") {
  if (networkType === "private") {
    const interfaces = os.networkInterfaces();
    for (const key in interfaces) {
      for (const iface of interfaces[key] || []) {
        if (!iface.internal && iface.family === "IPv4") {
          return iface.address;
        }
      }
    }
  }
  return "localhost";
}

// Start Vite with fallback logic
function startVite(port, attempt = 0) {
  const host = config.server.network === "private" ? getIP("private") : "localhost";
  const url = `${config.server.https ? "https" : "http"}://${host}:${port}`;

  const viteArgs = [
    "--host",
    host,
    "--port",
    port,
    // 🛠 Automatically enable strictPort if autoRetry is false
    ...(config.server.strictPort || !config.server.autoRetry ? ["--strictPort"] : []),
    ...(config.server.https ? ["--https"] : [])
  ];

  const viteProcess = spawn("vite", viteArgs, { shell: true });

  let shown = false;

  viteProcess.stdout.on("data", (data) => {
    const output = data.toString();

    const portMatch = output.match(/http[s]?:\/\/.*:(\d+)/);
    if (portMatch && !shown) {
      const usedPort = parseInt(portMatch[1]);
      const finalUrl = `${config.server.https ? "https" : "http"}://${host}:${usedPort}`;

      console.log(`\n\n🌍 Access your app from LAN at: ${finalUrl}`);
      if (config.server.qr) {
        console.log(`\n📱 Scan the QR code below to open on any device:\n`);
        qrcode.generate(finalUrl, { small: true });
      }

      if (config.server.openBrowser) {
        open(finalUrl); // ✅ Uses external open package
      }

      shown = true;
    }

    process.stdout.write(data);
  });

  viteProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  viteProcess.on("exit", (code) => {
    if (
      code !== 0 &&
      config.server.fallbackPort &&
      config.server.autoRetry &&
      attempt < 10
    ) {
      console.log(`⚠️ Port ${port} might be in use. Retrying on port ${port + 1}...`);
      startVite(port + 1, attempt + 1);
    } else {
      console.log(`❌ Vite exited with code ${code}`);
    }
  });
}
// Check if Vite is installed
function checkViteInstalled() {
  try {
    require.resolve("vite");
    return true;
  } catch (err) {
    return false;
  }
}
// Check if Vite is installed
if (checkViteInstalled()) {
  console.error("❌ Vite is not installed. Please install it globally or in your project.");
  process.exit(1);
}

// Kickoff
startVite(config.server.port);
