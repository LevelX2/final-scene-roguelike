export function createStartFlowApi(context) {
  const {
    HERO_CLASSES,
    getHeroClassAssets,
    classOptionsElement,
    heroNameInputElement,
    saveHeroNameButtonElement,
    loadHeroName,
    loadHeroClassId,
    saveHeroName,
    saveHeroClassId,
    initializeGame,
    getState,
    renderSelf,
    focusGameSurface,
  } = context;

  function resetStartIdentityFeedback() {
    saveHeroNameButtonElement.textContent = "Ins erste Studio";
  }

  function renderClassOptions(selectedClassId) {
    classOptionsElement.innerHTML = "";

    Object.values(HERO_CLASSES).forEach((heroClass) => {
      const label = document.createElement("label");
      label.className = `class-option${heroClass.id === selectedClassId ? " selected" : ""}`;
      label.tabIndex = 0;
      const classIconUrl = getHeroClassAssets(heroClass.id).iconUrl;
      label.innerHTML = `
        <input type="radio" name="heroClass" value="${heroClass.id}" ${heroClass.id === selectedClassId ? "checked" : ""}>
        <div class="class-option-art" aria-hidden="true"${classIconUrl ? ` style="--class-icon: url('${classIconUrl}')"` : ""}></div>
        <div class="class-option-copy">
          <strong class="class-option-title">${heroClass.label}</strong>
          <span class="class-option-tagline">${heroClass.tagline}</span>
          <div class="class-option-passive">
            <div class="class-option-passive-heading">
              <span class="class-option-passive-label">Spezialfähigkeit</span>
              <strong class="class-option-passive-name">${heroClass.passiveName}</strong>
            </div>
            <span class="class-option-passive-copy">${heroClass.passiveSummary}</span>
          </div>
        </div>
      `;

      const input = label.querySelector('input[name="heroClass"]');
      const getOptions = () => Array.from(classOptionsElement.querySelectorAll(".class-option"));
      const syncOptionFocusability = (activeOption) => {
        getOptions().forEach((option) => {
          option.tabIndex = option === activeOption ? 0 : -1;
        });
      };
      const applySelection = ({ focus = false } = {}) => {
        if (!input) {
          return;
        }

        input.checked = true;
        getOptions().forEach((option) => {
          option.classList.toggle("selected", option === label);
        });
        syncOptionFocusability(label);
        if (focus) {
          label.focus();
        }
      };
      const moveSelection = (direction) => {
        const options = getOptions();
        const currentIndex = options.indexOf(label);
        if (currentIndex < 0) {
          return;
        }

        const nextIndex = (currentIndex + direction + options.length) % options.length;
        const nextOption = options[nextIndex];
        const nextInput = nextOption?.querySelector('input[name="heroClass"]');
        if (!nextOption || !nextInput) {
          return;
        }

        nextInput.checked = true;
        options.forEach((option) => {
          option.classList.toggle("selected", option === nextOption);
        });
        syncOptionFocusability(nextOption);
        nextOption.focus();
      };

      label.addEventListener("click", () => applySelection({ focus: true }));
      label.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          applySelection({ focus: true });
          return;
        }

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveSelection(1);
          return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveSelection(-1);
        }
      });
      input?.addEventListener("change", () => applySelection());
      classOptionsElement.appendChild(label);

      if (heroClass.id === selectedClassId) {
        syncOptionFocusability(label);
      }
    });
  }

  function syncStartModalControls() {
    const fallbackName = getState()?.player?.name ?? loadHeroName();
    const fallbackClassId = getState()?.player?.classId ?? loadHeroClassId();
    heroNameInputElement.value = fallbackName;
    resetStartIdentityFeedback();
    renderClassOptions(fallbackClassId);
  }

  function openStartModal() {
    const state = getState();
    if (!state) {
      return;
    }

    syncStartModalControls();
    state.modals.startOpen = true;
    renderSelf();
    window.setTimeout(() => {
      const selectedOption = classOptionsElement.querySelector(".class-option.selected");
      if (selectedOption instanceof HTMLElement) {
        selectedOption.focus();
      }
    }, 0);
  }

  function closeStartModal() {
    const state = getState();
    if (!state) {
      return;
    }

    state.modals.startOpen = false;
    renderSelf();
  }

  function returnToStartScreen(options = {}) {
    initializeGame(
      {},
      {
        openStartModal: Boolean(options.openStartModal),
        clearSavedGame: Boolean(options.clearSavedGame),
        view: "start",
      },
    );
    syncStartModalControls();
  }

  function applyStartProfile() {
    const selectedClass = classOptionsElement.querySelector('input[name="heroClass"]:checked')?.value ?? loadHeroClassId();
    const nextName = saveHeroName(heroNameInputElement.value);
    const nextClassId = saveHeroClassId(selectedClass);

    initializeGame(
      { heroName: nextName, heroClassId: nextClassId },
      { openStartModal: false, clearSavedGame: false, reuseExistingFloor: true, view: "game" },
    );
    window.setTimeout(() => focusGameSurface?.(), 0);
  }

  return {
    syncStartModalControls,
    openStartModal,
    closeStartModal,
    returnToStartScreen,
    applyStartProfile,
  };
}
