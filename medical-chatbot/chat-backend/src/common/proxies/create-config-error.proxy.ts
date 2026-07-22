import { ModuleConfigException } from "../exceptions/module-config.exception";

/**
 * Create Config Error Proxy
 * Returns a proxy that throws ModuleConfigException when any property or method is accessed
 */
export function createConfigErrorProxy<T extends object>(
  target: T,
  baseErrorMessage: string = "Required configuration is missing",
): T {
  const className = target?.constructor?.name || "Object";

  // Allow these properties to be accessed without throwing errors
  const allowedProperties = new Set([
    "constructor",
    "prototype",
    "__proto__",
    Symbol.toStringTag,
    Symbol.iterator,
    Symbol.asyncIterator,
  ]);

  // NestJS lifecycle hooks - return undefined if not present
  const lifecycleHooks = new Set([
    "onModuleInit",
    "onApplicationBootstrap",
    "onModuleDestroy",
    "beforeApplicationShutdown",
    "onApplicationShutdown",
  ]);

  const handler: ProxyHandler<T> = {
    get: (proxiedTarget: T, prop: string | symbol, receiver: any): any => {
      // Allow access to special JavaScript/NestJS internal properties
      if (allowedProperties.has(prop) || typeof prop === "symbol") {
        return Reflect.get(proxiedTarget, prop, receiver);
      }

      // Return undefined for 'then' to indicate this is not a Promise
      // This prevents NestJS from trying to await the proxy
      if (prop === "then") {
        return undefined;
      }

      // Return undefined for NestJS lifecycle hooks if not implemented
      // This allows NestJS to check for hooks without throwing errors
      if (lifecycleHooks.has(prop as string)) {
        return undefined;
      }

      const value = Reflect.get(proxiedTarget, prop, receiver);

      // If it's a function, wrap it to throw error when called
      if (typeof value === "function") {
        return function (this: any, ..._args: any[]) {
          const errorMessage = `${baseErrorMessage} for '${className}'. Cannot call method '${String(prop)}'.`;
          throw new ModuleConfigException(errorMessage);
        };
      }

      // For non-function properties, throw error immediately
      const errorMessage = `${baseErrorMessage} for '${className}'. Cannot access property '${String(prop)}'.`;
      throw new ModuleConfigException(errorMessage);
    },

    set: (proxiedTarget: T, prop: string | symbol, value: any, receiver: any): boolean => {
      // Allow setting internal properties
      if (allowedProperties.has(prop) || typeof prop === "symbol") {
        return Reflect.set(proxiedTarget, prop, value, receiver);
      }

      const errorMessage = `${baseErrorMessage} for '${className}'. Cannot set property '${String(prop)}'.`;
      throw new ModuleConfigException(errorMessage);
    },
  };

  return new Proxy(target, handler);
}
