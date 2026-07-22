import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";
import { fileLoader } from "nest-typed-config";

const CONFIG_FOLDER = "config";
const CONFIG_NAMES = ["default", "config", env.NODE_ENV];
const CONFIG_DIRECTORIES = [CONFIG_FOLDER, ""];
const CONFIG_EXTENSIONS = ["yml", "yaml"];

type ConfigLoader = () => Record<string, unknown>;
type EnvOverrideEntry = {
  paths: string[][];
  envs: Array<string | undefined>;
  parse?: (value: string | undefined) => unknown;
};

const ENV_OVERRIDE_ENTRIES: EnvOverrideEntry[] = [
  entry(["app", "name"], [env.APP_NAME]),
  entry(["app", "port"], [env.APP_PORT], toNumber),

  entry(["jwt", "algorithm"], [env.JWT_ALGORITHM]),
  entry(["jwt", "expiresIn"], [env.JWT_EXPIRES_IN]),
  entry(["jwt", "secret"], [env.JWT_SECRET]),
  entry(["jwt", "privateKeyPath"], [env.JWT_PRIVATE_KEY_PATH]),
  entry(["jwt", "publicKeyPath"], [env.JWT_PUBLIC_KEY_PATH]),

  entry(["cors", "allowedOrigins"], [env.CORS_ALLOWED_ORIGINS], toStringArray),
  entry(["cors", "allowCredentials"], [env.CORS_ALLOW_CREDENTIALS], toBoolean),

  entry(["db", "host"], [env.DB_HOST]),
  entry(["db", "port"], [env.DB_PORT], toNumber),
  entry(["db", "database"], [env.DB_NAME]),
  entry(["db", "username"], [env.DB_USER]),
  entry(["db", "password"], [env.DB_PASS]),
  entry(["db", "synchronize"], [env.DB_SYNCHRONIZE], toBoolean),
  entry(["db", "logging"], [env.DB_LOGGING], toBoolean),

  entry(["redis", "host"], [env.REDIS_HOST]),
  entry(["redis", "port"], [env.REDIS_PORT, env.REDIS_PORT], toNumber),

  entry(["mailer", "host"], [env.MAILER_HOST]),
  entry(["mailer", "port"], [env.MAILER_PORT], toNumber),
  entry(["mailer", "secure"], [env.MAILER_SECURE], toBoolean),
  entry(["mailer", "user"], [env.MAILER_USER]),
  entry(["mailer", "pass"], [env.MAILER_PASS]),
  entry(["mailer", "from"], [env.MAILER_FROM]),

  entry(["chatApi", "url"], [env.CHAT_API_URL]),

  entry(["google", "clientID"], [env.GOOGLE_CLIENT_ID]),
  entry(["google", "clientSecret"], [env.GOOGLE_CLIENT_SECRET]),
  entry(["google", "callbackURL"], [env.GOOGLE_CALLBACK_URL]),
  entry(["google", "scope"], [env.GOOGLE_SCOPE]),

  entry(["github", "clientID"], [env.GITHUB_CLIENT_ID]),
  entry(["github", "clientSecret"], [env.GITHUB_CLIENT_SECRET]),
  entry(["github", "callbackURL"], [env.GITHUB_CALLBACK_URL]),
  entry(["github", "scope"], [env.GITHUB_SCOPE]),
];

export function createConfigLoaders(): ConfigLoader[] {
  const fileLoaders = CONFIG_NAMES
    .filter((configName): configName is string => Boolean(configName))
    .map(createFileLoaderForConfigName)
    .filter((loader): loader is ConfigLoader => Boolean(loader));

  return [...fileLoaders, buildEnvOverrideConfig];
}

function createFileLoaderForConfigName(baseName: string): ConfigLoader | null {
  const configPath = resolveConfigPath(baseName);
  if (!configPath) {
    return null;
  }

  return fileLoader({
    absolutePath: configPath,
    ignoreEnvironmentVariableSubstitution: true,
  });
}

function resolveConfigPath(baseName: string): string | null {
  const candidates = CONFIG_DIRECTORIES.flatMap(directory =>
    CONFIG_EXTENSIONS.map(extension =>
      directory
        ? join(globalThis.appRoot, directory, `${baseName}.${extension}`)
        : join(globalThis.appRoot, `${baseName}.${extension}`),
    ),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildEnvOverrideConfig(): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  for (const overrideEntry of ENV_OVERRIDE_ENTRIES) {
    const rawValue = firstDefined(overrideEntry.envs);
    const parsedValue = overrideEntry.parse ? overrideEntry.parse(rawValue) : rawValue;

    for (const path of overrideEntry.paths) {
      assignIfDefined(overrides, path, parsedValue);
    }
  }

  return overrides;
}

function entry(paths: string[] | string[][], envs: Array<string | undefined>, parse?: (value: string | undefined) => unknown): EnvOverrideEntry {
  return {
    paths: Array.isArray(paths[0]) ? paths as string[][] : [paths as string[]],
    envs,
    parse,
  };
}

function firstDefined(values: Array<string | undefined>): string | undefined {
  return values.find(value => value !== undefined);
}

function assignIfDefined(target: Record<string, unknown>, path: string[], value: unknown): void {
  if (value === undefined) {
    return;
  }

  let current = target;
  for (const key of path.slice(0, -1)) {
    const next = current[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[path[path.length - 1]] = value;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return Number(value);
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function toStringArray(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.split(",").map(item => item.trim()).filter(Boolean);
}
