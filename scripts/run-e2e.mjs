import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const baseURL = "http://127.0.0.1:3000/";
const nextCLI = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const playwrightCLI = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);

async function reachable() {
  try {
    const response = await fetch(baseURL, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

if (await reachable()) {
  console.error(
    "Port 3000 is already in use. Stop that server before running the browser tests.",
  );
  process.exitCode = 1;
} else {
  const server = spawn(
    process.execPath,
    [nextCLI, "start", "--hostname", "127.0.0.1"],
    {
      stdio: "inherit",
      windowsHide: true,
    },
  );
  const serverClosed = new Promise((resolve) => server.once("close", resolve));
  let runner;
  const stop = () => {
    runner?.kill("SIGKILL");
    server.kill("SIGKILL");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const deadline = Date.now() + 30000;
    while (!(await reachable())) {
      if (server.exitCode !== null)
        throw new Error(
          `Next exited with code ${server.exitCode}. Run npm run build first.`,
        );
      if (Date.now() > deadline)
        throw new Error(
          "Next did not become ready on port 3000 within 30 seconds.",
        );
      await delay(250);
    }
    runner = spawn(
      process.execPath,
      [playwrightCLI, "test", ...process.argv.slice(2)],
      {
        stdio: "inherit",
        windowsHide: true,
      },
    );
    const exitCode = await new Promise((resolve, reject) => {
      runner.once("error", reject);
      runner.once("close", (code) => resolve(code));
    });
    process.exitCode = exitCode ?? 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.kill("SIGKILL");
    await Promise.race([serverClosed, delay(3000)]);
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
