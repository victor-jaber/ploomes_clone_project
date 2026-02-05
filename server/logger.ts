import chalk from "chalk";

type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "http";

interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
}

const LOG_COLORS = {
  info: chalk.blue,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta,
  http: chalk.cyan,
};

const LOG_ICONS = {
  info: "ℹ",
  success: "✓",
  warn: "⚠",
  error: "✗",
  debug: "⚙",
  http: "→",
};

const LOG_LABELS = {
  info: "INFO",
  success: "OK",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
  http: "HTTP",
};

function formatTimestamp(): string {
  const now = new Date();
  return chalk.gray(
    `${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
  );
}

function formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
  const color = LOG_COLORS[level];
  const icon = LOG_ICONS[level];
  const label = LOG_LABELS[level];
  
  const parts: string[] = [];
  
  if (options?.timestamp !== false) {
    parts.push(formatTimestamp());
  }
  
  parts.push(color(`${icon} ${label}`));
  
  if (options?.prefix) {
    parts.push(chalk.gray(`[${options.prefix}]`));
  }
  
  parts.push(message);
  
  return parts.join(" ");
}

export const logger = {
  info: (message: string, options?: LogOptions) => {
    console.log(formatMessage("info", message, options));
  },
  
  success: (message: string, options?: LogOptions) => {
    console.log(formatMessage("success", message, options));
  },
  
  warn: (message: string, options?: LogOptions) => {
    console.warn(formatMessage("warn", message, options));
  },
  
  error: (message: string, error?: Error, options?: LogOptions) => {
    console.error(formatMessage("error", message, options));
    if (error?.stack && process.env.NODE_ENV === "development") {
      console.error(chalk.gray(error.stack));
    }
  },
  
  debug: (message: string, options?: LogOptions) => {
    if (process.env.NODE_ENV === "development") {
      console.log(formatMessage("debug", message, options));
    }
  },
  
  http: (method: string, path: string, status?: number, duration?: number) => {
    const methodColor = method === "GET" ? chalk.green : 
                        method === "POST" ? chalk.yellow :
                        method === "PATCH" ? chalk.blue :
                        method === "DELETE" ? chalk.red : chalk.white;
    
    const statusColor = status ? (
      status < 300 ? chalk.green :
      status < 400 ? chalk.yellow :
      chalk.red
    ) : chalk.gray;
    
    const parts = [
      formatTimestamp(),
      chalk.cyan("→ HTTP"),
      methodColor(method.padEnd(6)),
      path,
    ];
    
    if (status) {
      parts.push(statusColor(`${status}`));
    }
    
    if (duration) {
      parts.push(chalk.gray(`${duration}ms`));
    }
    
    console.log(parts.join(" "));
  },
  
  divider: () => {
    console.log(chalk.gray("─".repeat(60)));
  },
  
  header: (title: string) => {
    console.log();
    console.log(chalk.bold.magenta(`╔${"═".repeat(title.length + 2)}╗`));
    console.log(chalk.bold.magenta(`║ ${title} ║`));
    console.log(chalk.bold.magenta(`╚${"═".repeat(title.length + 2)}╝`));
    console.log();
  },
  
  table: (data: Record<string, string | number | boolean | null>) => {
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
    Object.entries(data).forEach(([key, value]) => {
      const formattedValue = value === null ? chalk.gray("null") :
                            typeof value === "boolean" ? (value ? chalk.green("true") : chalk.red("false")) :
                            typeof value === "number" ? chalk.yellow(value.toString()) :
                            chalk.white(value);
      console.log(`  ${chalk.gray(key.padEnd(maxKeyLength))} : ${formattedValue}`);
    });
  },
  
  startup: (config: { port: number; env: string; database: boolean; redis: boolean; websocket: boolean }) => {
    logger.header("HERMES CRM");
    logger.table({
      "Porta": config.port,
      "Ambiente": config.env,
      "Banco de dados": config.database,
      "Redis Cache": config.redis,
      "WebSocket": config.websocket,
    });
    logger.divider();
    logger.success(`Servidor iniciado em http://localhost:${config.port}`);
    console.log();
  },
};

export default logger;
