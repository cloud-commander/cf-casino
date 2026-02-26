import { Env } from "../worker";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export class Logger {
  private traceId: string;

  constructor(
    private env: Env,
    private ctx?: ExecutionContext,
    traceId?: string,
  ) {
    this.traceId = traceId || crypto.randomUUID();
  }

  public debug(message: string, context?: Record<string, unknown>) {
    this.log("DEBUG", message, context);
  }

  public info(message: string, context?: Record<string, unknown>) {
    this.log("INFO", message, context);
  }

  public warn(message: string, context?: Record<string, unknown>) {
    this.log("WARN", message, context);
  }

  public error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ) {
    this.log("ERROR", message, {
      ...context,
      error_message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (this.env.ROLLBAR_TOKEN && this.env.ENVIRONMENT !== "local") {
      this.sendToRollbar(message, error, context);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const payload = {
      level,
      traceId: this.traceId,
      message,
      environment: this.env.ENVIRONMENT,
      version: this.env.VERSION,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Output structured JSON (easily ingested by Logflare/Logpush)
    if (level === "ERROR" || level === "WARN") {
      console.error(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  }

  /**
   * Fire-and-forget to Rollbar API for exception tracking natively
   * (Does not block the main response execution)
   */
  private sendToRollbar(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ) {
    const rollbarPayload = {
      access_token: this.env.ROLLBAR_TOKEN,
      data: {
        environment: this.env.ENVIRONMENT,
        body: {
          trace:
            error instanceof Error
              ? {
                  frames: [
                    { filename: "unknown", lineno: 0, method: "unknown" },
                  ],
                  exception: {
                    class: error.name,
                    message: `${message}: ${error.message}`,
                    description: error.stack,
                  },
                }
              : {
                  message: {
                    body: message,
                    extra: { error: String(error) },
                  },
                },
        },
        level: "error",
        custom: {
          traceId: this.traceId,
          version: this.env.VERSION,
          ...context,
        },
      },
    };

    const promise = fetch("https://api.rollbar.com/api/1/item/", {
      method: "POST",
      body: JSON.stringify(rollbarPayload),
      headers: { "Content-Type": "application/json" },
    }).catch((e) => console.error("Rollbar transmission failed", e));

    if (this.ctx) {
      this.ctx.waitUntil(promise);
    }
  }
}
