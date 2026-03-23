import { execa, type ResultPromise } from "execa";
import chalk from "chalk";

export interface TunnelOptions {
  localPort: number;
  tunnelHost: string;
}

export interface TunnelResult {
  remotePort: number;
  url: string;
  process: ResultPromise;
  close: () => void;
}

/**
 * Start an SSH reverse tunnel: ssh -R 0:localhost:<localPort> <tunnelHost> -N
 * The remote server allocates a random port and forwards it to our local port.
 */
export async function startSSHTunnel(
  options: TunnelOptions
): Promise<TunnelResult> {
  const { localPort, tunnelHost } = options;

  // Extract hostname (strip user@ prefix if present) for URL display
  const hostname = tunnelHost.includes("@")
    ? tunnelHost.split("@")[1]
    : tunnelHost;

  return new Promise<TunnelResult>((resolve, reject) => {
    const sshProcess = execa("ssh", [
      "-R",
      `0:localhost:${localPort}`,
      tunnelHost,
      "-N",
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "ExitOnForwardFailure=yes",
      "-v", // verbose to capture port allocation info from stderr
    ]);

    let resolved = false;
    let stderrBuffer = "";

    const close = () => {
      if (!sshProcess.killed) {
        sshProcess.kill("SIGTERM");
      }
    };

    // SSH prints port allocation info to stderr in verbose mode
    // Look for: "Allocated port <N> for remote forward"
    sshProcess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderrBuffer += text;

      if (!resolved) {
        const match = text.match(/Allocated port (\d+) for remote forward/);
        if (match) {
          resolved = true;
          const remotePort = parseInt(match[1], 10);
          const url = `http://${hostname}:${remotePort}`;
          resolve({ remotePort, url, process: sshProcess, close });
        }
      }
    });

    sshProcess.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(`SSH tunnel failed to start: ${err.message}`)
        );
      }
    });

    sshProcess.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `SSH process exited with code ${code} before tunnel was established.\n${stderrBuffer}`
          )
        );
      }
    });

    // Timeout: if no port allocated within 15 seconds, fail
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        close();
        reject(
          new Error(
            `SSH tunnel timed out waiting for port allocation.\n${stderrBuffer}`
          )
        );
      }
    }, 15_000);
  });
}

/**
 * Print tunnel connection info to the terminal.
 */
export function printTunnelInfo(url: string): void {
  const border = "═".repeat(url.length + 6);
  console.log();
  console.log(chalk.green(`  ╔${border}╗`));
  console.log(chalk.green(`  ║   ${chalk.bold.white(url)}   ║`));
  console.log(chalk.green(`  ╚${border}╝`));
  console.log();
  console.log(
    chalk.dim("  Tunnel active — accessible from any device on the network")
  );
  console.log(chalk.dim("  Press Ctrl+C to stop"));
  console.log();
}

/**
 * Create HTTP Basic Auth middleware check.
 * Returns a function that validates the Authorization header.
 * Returns true if authorized, false if not.
 */
export function createAuthCheck(
  password: string
): (authHeader: string | undefined) => boolean {
  // Basic Auth with user "rw" and the given password
  const expected =
    "Basic " + Buffer.from(`rw:${password}`).toString("base64");

  return (authHeader: string | undefined) => {
    return authHeader === expected;
  };
}
