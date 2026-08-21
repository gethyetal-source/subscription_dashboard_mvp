import { spawn } from "node:child_process";

const restartDelayMs = 1000;
let stopping = false;
let child = null;

function stop(signal) {
  stopping = true;
  if (child && !child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMetro() {
  while (!stopping) {
    child = spawn("pnpm", ["dev:metro"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    const exitCode = await new Promise((resolve) => {
      child.once("exit", (code) => resolve(code ?? 0));
    });

    child = null;
    if (stopping) {
      process.exit(exitCode);
    }

    console.warn(
      `[metro-supervisor] Metro exited with code ${exitCode}; restarting in ${restartDelayMs}ms.`,
    );
    await wait(restartDelayMs);
  }
}

runMetro().catch((error) => {
  console.error("[metro-supervisor] Unable to restart Metro:", error);
  process.exit(1);
});
