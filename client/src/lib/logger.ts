type LogLevel = "info" | "success" | "warn" | "error" | "debug";

const LOG_STYLES = {
  info: "color: #3b82f6; font-weight: bold;",
  success: "color: #10b981; font-weight: bold;",
  warn: "color: #f59e0b; font-weight: bold;",
  error: "color: #ef4444; font-weight: bold;",
  debug: "color: #8b5cf6; font-weight: bold;",
};

const LOG_ICONS = {
  info: "ℹ️",
  success: "✅",
  warn: "⚠️",
  error: "❌",
  debug: "🔧",
};

function formatMessage(level: LogLevel, prefix: string, message: string): [string, string] {
  return [`%c[${prefix}] ${LOG_ICONS[level]} ${message}`, LOG_STYLES[level]];
}

export const clientLogger = {
  info: (prefix: string, message: string) => {
    const [formatted, style] = formatMessage("info", prefix, message);
    console.log(formatted, style);
  },

  success: (prefix: string, message: string) => {
    const [formatted, style] = formatMessage("success", prefix, message);
    console.log(formatted, style);
  },

  warn: (prefix: string, message: string) => {
    const [formatted, style] = formatMessage("warn", prefix, message);
    console.warn(formatted, style);
  },

  error: (prefix: string, message: string, error?: Error) => {
    const [formatted, style] = formatMessage("error", prefix, message);
    console.error(formatted, style);
    if (error) {
      console.error(error);
    }
  },

  debug: (prefix: string, message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      const [formatted, style] = formatMessage("debug", prefix, message);
      console.log(formatted, style);
      if (data !== undefined) {
        console.log(data);
      }
    }
  },
};

export default clientLogger;
