import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page, type Request, type Response } from "playwright";

type BrowserScenario = {
  id: string;
  title: string;
  targetUrl: string;
  steps: BrowserScenarioStep[];
};

type BrowserScenarioStep = {
  id: string;
  label: string;
  expected: string;
  action?:
    | { kind: "navigate"; url?: string; waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeoutMs?: number }
    | { kind: "click"; selector: string; timeoutMs?: number }
    | { kind: "type"; selector: string; value: string; clear?: boolean; timeoutMs?: number }
    | { kind: "wait_for"; selector?: string; timeoutMs?: number; state?: "visible" | "hidden" | "attached" | "detached" }
    | { kind: "assert_text"; selector: string; contains: string; timeoutMs?: number }
    | { kind: "press"; selector: string; key: string; timeoutMs?: number };
};

type AdapterExecutionStepResult = {
  status: "passed" | "failed";
  note?: string;
  screenshotUri?: string;
  consoleEvents?: BrowserConsoleEvent[];
  networkEvents?: BrowserNetworkEvent[];
  uiFindings?: string[];
  durationMs?: number;
};

type BrowserAdapterSession = {
  externalSessionId: string;
  summary?: string;
};

type BrowserConsoleEvent = {
  id: string;
  level: "log" | "warning" | "error";
  message: string;
  timestampIso: string;
};

type BrowserNetworkEvent = {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  timestampIso: string;
};

interface RuntimeSession {
  id: string;
  scenario: BrowserScenario;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAtIso: string;
  consoleEvents: BrowserConsoleEvent[];
  networkEvents: BrowserNetworkEvent[];
  consoleCursor: number;
  networkCursor: number;
}

const ARTIFACT_ROOT = path.resolve(process.cwd(), ".artifacts/browser-runtime");

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeConsoleLevel(type: string): BrowserConsoleEvent["level"] {
  if (type === "error") return "error";
  if (type === "warning") return "warning";
  return "log";
}

function toArtifactUri(filePath: string) {
  const relative = path.relative(ARTIFACT_ROOT, filePath).split(path.sep).join("/");
  return `artifact://browser-runtime/${relative}`;
}

export class PlaywrightBrowserRuntime {
  private readonly sessions = new Map<string, RuntimeSession>();

  async createSession(scenario: BrowserScenario): Promise<BrowserAdapterSession> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const sessionId = makeId("pw_session");

    const session: RuntimeSession = {
      id: sessionId,
      scenario,
      browser,
      context,
      page,
      startedAtIso: nowIso(),
      consoleEvents: [],
      networkEvents: [],
      consoleCursor: 0,
      networkCursor: 0,
    };

    page.on("console", (message) => {
      session.consoleEvents.push({
        id: makeId("console"),
        level: normalizeConsoleLevel(message.type()),
        message: message.text(),
        timestampIso: nowIso(),
      });
    });

    page.on("response", (response: Response) => {
      const request: Request = response.request();
      session.networkEvents.push({
        id: makeId("network"),
        method: request.method(),
        url: response.url(),
        statusCode: response.status(),
        timestampIso: nowIso(),
      });
    });

    try {
      await page.goto(scenario.targetUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
      this.sessions.set(sessionId, session);
      return {
        externalSessionId: sessionId,
        summary: `Playwright session started for ${scenario.title}`,
      };
    } catch (error) {
      await context.close();
      await browser.close();
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`target not reachable: ${message}`);
    }
  }

  async executeStep(sessionId: string, step: BrowserScenarioStep, timeoutMs: number): Promise<AdapterExecutionStepResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("session interrupted: browser session is unavailable");
    }

    const startedAt = Date.now();

    try {
      await this.performStep(session, step, timeoutMs);

      return {
        status: "passed",
        note: `${step.label} passed`,
        durationMs: Date.now() - startedAt,
        ...this.flushEvents(session),
      };
    } catch (error) {
      const screenshotUri = await this.captureFailureScreenshot(session, step.id);
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "failed",
        note: message,
        screenshotUri,
        durationMs: Date.now() - startedAt,
        ...this.flushEvents(session),
      };
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    await session.context.close();
    await session.browser.close();
  }

  private async performStep(session: RuntimeSession, step: BrowserScenarioStep, defaultTimeoutMs: number) {
    const action = step.action;
    if (!action) {
      await session.page.waitForLoadState("domcontentloaded", { timeout: defaultTimeoutMs });
      return;
    }

    switch (action.kind) {
      case "navigate": {
        await session.page.goto(action.url ?? session.scenario.targetUrl, {
          timeout: action.timeoutMs ?? defaultTimeoutMs,
          waitUntil: action.waitUntil ?? "domcontentloaded",
        });
        return;
      }
      case "click": {
        await session.page.locator(action.selector).click({ timeout: action.timeoutMs ?? defaultTimeoutMs });
        return;
      }
      case "type": {
        const locator = session.page.locator(action.selector);
        await locator.waitFor({ timeout: action.timeoutMs ?? defaultTimeoutMs });
        if (action.clear !== false) {
          await locator.fill("");
        }
        await locator.fill(action.value, { timeout: action.timeoutMs ?? defaultTimeoutMs });
        return;
      }
      case "wait_for": {
        if (action.selector) {
          await session.page.locator(action.selector).waitFor({
            timeout: action.timeoutMs ?? defaultTimeoutMs,
            state: action.state ?? "visible",
          });
        } else {
          await session.page.waitForLoadState("networkidle", { timeout: action.timeoutMs ?? defaultTimeoutMs });
        }
        return;
      }
      case "assert_text": {
        const text = await session.page.locator(action.selector).textContent({ timeout: action.timeoutMs ?? defaultTimeoutMs });
        if (!text || !text.includes(action.contains)) {
          throw new Error(`assertion failed: expected text containing '${action.contains}' in ${action.selector}`);
        }
        return;
      }
      case "press": {
        const locator = session.page.locator(action.selector);
        await locator.waitFor({ timeout: action.timeoutMs ?? defaultTimeoutMs });
        await locator.press(action.key, { timeout: action.timeoutMs ?? defaultTimeoutMs });
        return;
      }
      default: {
        throw new Error(`unsupported step action: ${(action as { kind: string }).kind}`);
      }
    }
  }

  private flushEvents(session: RuntimeSession): Pick<AdapterExecutionStepResult, "consoleEvents" | "networkEvents"> {
    const consoleEvents = session.consoleEvents.slice(session.consoleCursor);
    const networkEvents = session.networkEvents.slice(session.networkCursor);
    session.consoleCursor = session.consoleEvents.length;
    session.networkCursor = session.networkEvents.length;
    return {
      consoleEvents,
      networkEvents,
    };
  }

  private async captureFailureScreenshot(session: RuntimeSession, stepId: string) {
    try {
      await fs.mkdir(ARTIFACT_ROOT, { recursive: true });
      const fileName = `${session.id}-${stepId}-${Date.now()}.png`;
      const destination = path.join(ARTIFACT_ROOT, fileName);
      await session.page.screenshot({ path: destination, fullPage: true });
      return toArtifactUri(destination);
    } catch {
      return undefined;
    }
  }
}
