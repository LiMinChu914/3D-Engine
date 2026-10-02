function stringifyContext(context) {
    if (context === undefined) return "";
    if (typeof context === "string") return context;
    try { return JSON.stringify(context); }
    catch { return String(context); }
}

/** Connect a Logger instance to the optional diagnostics drawer in index.html. */
export function mountLoggerPanel(logger) {
    const panel = document.querySelector("#logger-panel");
    const toggle = document.querySelector("#logger-toggle");
    const close = document.querySelector("#logger-close");
    const clear = document.querySelector("#logger-clear");
    const list = document.querySelector("#logger-entries");
    const count = document.querySelector("#logger-count");
    const filters = [...document.querySelectorAll("[data-log-filter]")];
    if (!panel || !toggle || !list) return () => {};

    let filter = "all";
    const render = (_, entries) => {
        const visible = filter === "all" ? entries : entries.filter((entry) => entry.level === filter);
        list.replaceChildren(...visible.slice(-80).reverse().map((entry) => {
            const item = document.createElement("li");
            item.className = `log-entry ${entry.level}`;
            const time = document.createElement("time");
            time.textContent = entry.timestamp.toLocaleTimeString("zh-TW", { hour12: false });
            const scope = document.createElement("b");
            scope.textContent = entry.scope;
            const message = document.createElement("span");
            message.textContent = entry.message;
            item.append(time, scope, message);
            const context = stringifyContext(entry.context);
            if (context) {
                const detail = document.createElement("code");
                detail.textContent = context;
                item.append(detail);
            }
            return item;
        }));
        count.textContent = String(entries.length);
        list.dataset.empty = visible.length === 0 ? "true" : "false";
    };

    const setOpen = (open) => {
        panel.dataset.open = String(open);
        toggle.setAttribute("aria-expanded", String(open));
        if (open) render(null, logger.entries);
    };
    toggle.addEventListener("click", () => setOpen(panel.dataset.open !== "true"));
    close?.addEventListener("click", () => setOpen(false));
    clear?.addEventListener("click", () => logger.clear());
    filters.forEach((button) => button.addEventListener("click", () => {
        filter = button.dataset.logFilter;
        filters.forEach((candidate) => candidate.classList.toggle("selected", candidate === button));
        render(null, logger.entries);
    }));
    const unsubscribe = logger.subscribe(render);
    render(null, logger.entries);
    return unsubscribe;
}
