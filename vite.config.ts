import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { PlaywrightBrowserRuntime } from "./dev/browser-runtime-server";

function browserRuntimeApiPlugin() {
  const runtime = new PlaywrightBrowserRuntime();

  return {
    name: "browser-runtime-api",
    configureServer(server: { middlewares: { use: (cb: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/browser-runtime")) {
          next();
          return;
        }

        const sendJson = (statusCode: number, data: unknown) => {
          res.statusCode = statusCode;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        const readBody = async () =>
          new Promise<string>((resolve, reject) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => resolve(data));
            req.on("error", reject);
          });

        const execute = async () => {
          try {
            const method = req.method ?? "GET";
            const pathname = req.url?.split("?")[0] ?? "";

            if (method === "POST" && pathname === "/api/browser-runtime/sessions") {
              const rawBody = await readBody();
              const body = rawBody ? JSON.parse(rawBody) : {};
              const response = await runtime.createSession(body.scenario);
              sendJson(200, response);
              return;
            }

            const stepMatch = pathname.match(/^\/api\/browser-runtime\/sessions\/([^/]+)\/steps$/);
            if (method === "POST" && stepMatch) {
              const sessionId = decodeURIComponent(stepMatch[1]);
              const rawBody = await readBody();
              const body = rawBody ? JSON.parse(rawBody) : {};
              const response = await runtime.executeStep(sessionId, body.step, body.timeoutMs ?? 30_000);
              sendJson(200, response);
              return;
            }

            const sessionMatch = pathname.match(/^\/api\/browser-runtime\/sessions\/([^/]+)$/);
            if (method === "DELETE" && sessionMatch) {
              const sessionId = decodeURIComponent(sessionMatch[1]);
              await runtime.terminateSession(sessionId);
              res.statusCode = 204;
              res.end();
              return;
            }

            sendJson(404, { error: "not_found" });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            sendJson(500, { error: "runtime_error", message });
          }
        };

        void execute();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), browserRuntimeApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
