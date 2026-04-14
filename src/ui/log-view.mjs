export function createLogView(context) {
  const {
    messageLogElement,
    getState,
    formatLogMessage,
  } = context;

  function renderLog() {
    const state = getState();
    messageLogElement.innerHTML = "";
    (Array.isArray(state.messages) ? state.messages : []).forEach((message) => {
      const text = typeof message === "string"
        ? message
        : typeof message?.text === "string"
          ? message.text
          : "";
      if (!text) {
        return;
      }

      const entry = document.createElement("div");
      entry.className = `log-entry ${typeof message?.tone === "string" ? message.tone : ""}`.trim();
      entry.innerHTML = formatLogMessage(text);
      messageLogElement.appendChild(entry);
    });
  }

  return {
    renderLog,
  };
}
