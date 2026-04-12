export function createLogView(context) {
  const {
    messageLogElement,
    getState,
    formatLogMessage,
  } = context;

  function renderLog() {
    const state = getState();
    const logMode = state.collapsedCards?.log ?? "compact";
    const visibleMessages = logMode === "full"
      ? state.messages
      : state.messages.slice(0, 3);

    messageLogElement.innerHTML = "";
    visibleMessages.forEach((message) => {
      const entry = document.createElement("div");
      entry.className = `log-entry ${message.tone}`.trim();
      entry.innerHTML = formatLogMessage(message.text);
      messageLogElement.appendChild(entry);
    });
  }

  return {
    renderLog,
  };
}
