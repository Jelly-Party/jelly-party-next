export interface Logger {
  info(message: string, data?: object): void;
  warn(message: string, data?: object): void;
}

export function createLogger(namespace: string): Logger {
  const write = (level: "info" | "warn", message: string, data?: object): void => {
    const entry = JSON.stringify({
      level,
      msg: `[${namespace}] ${message}`,
      ts: Date.now(),
      ...data,
    });
    if (level === "warn") console.warn(entry);
    else console.log(entry);
  };

  return {
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
  };
}
