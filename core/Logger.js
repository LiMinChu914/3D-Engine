const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });

function normalizeError(value) {
    if (!(value instanceof Error)) return value;
    return { name: value.name, message: value.message, stack: value.stack };
}

/** Structured logger shared by engine code and the in-page diagnostics console. */
export class Logger {
    constructor({ scope = "Flux3D", level = "debug", maxEntries = 250, state = null } = {}) {
        this.scope = scope;
        this.state = state ?? {
            level,
            maxEntries,
            entries: [],
            listeners: new Set(),
            timers: new Map()
        };
    }

    child(scope) {
        return new Logger({ scope: `${this.scope}:${scope}`, state: this.state });
    }

    setLevel(level) {
        if (!(level in LEVELS)) throw new Error(`Unknown log level: ${level}`);
        this.state.level = level;
        return this;
    }

    get entries() {
        return [...this.state.entries];
    }

    subscribe(listener) {
        this.state.listeners.add(listener);
        return () => this.state.listeners.delete(listener);
    }

    clear() {
        this.state.entries.length = 0;
        for (const listener of this.state.listeners) listener(null, []);
    }

    debug(message, context) { return this.write("debug", message, context); }
    info(message, context) { return this.write("info", message, context); }
    warn(message, context) { return this.write("warn", message, context); }
    error(message, context) { return this.write("error", message, context); }

    write(level, message, context = undefined) {
        if (LEVELS[level] < LEVELS[this.state.level]) return null;
        const entry = Object.freeze({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            timestamp: new Date(),
            level,
            scope: this.scope,
            message: String(message),
            context: normalizeError(context)
        });
        this.state.entries.push(entry);
        if (this.state.entries.length > this.state.maxEntries) this.state.entries.shift();

        const method = level === "debug" ? "debug" : level;
        console[method]?.(`[${entry.scope}] ${entry.message}`, entry.context ?? "");
        for (const listener of this.state.listeners) listener(entry, this.entries);
        return entry;
    }

    time(label) {
        this.state.timers.set(`${this.scope}:${label}`, performance.now());
    }

    timeEnd(label, context = {}) {
        const key = `${this.scope}:${label}`;
        const start = this.state.timers.get(key);
        if (start === undefined) return this.warn(`Unknown timer: ${label}`);
        this.state.timers.delete(key);
        const durationMs = Number((performance.now() - start).toFixed(2));
        this.debug(`${label} completed`, { ...context, durationMs });
        return durationMs;
    }
}

export const logger = new Logger();
