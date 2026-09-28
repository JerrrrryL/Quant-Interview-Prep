(() => {
  const questions = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
  const storageKey = "quant-interview-prep-v3";
  const startedAt = Date.now();

  const elements = {
    sidebar: document.querySelector(".sidebar"),
    sidebarBackdrop: document.querySelector("#sidebar-backdrop"),
    mobileMenu: document.querySelector("#mobile-menu"),
    categoryList: document.querySelector("#category-list"),
    searchInput: document.querySelector("#search-input"),
    bankTotal: document.querySelector("#bank-total"),
    sessionCount: document.querySelector("#session-count"),
    masteredCount: document.querySelector("#mastered-count"),
    sessionTime: document.querySelector("#session-time"),
    sessionProgress: document.querySelector("#session-progress"),
    chapterLabel: document.querySelector("#chapter-label"),
    sectionLabel: document.querySelector("#section-label"),
    questionIndex: document.querySelector("#question-index"),
    pageLabel: document.querySelector("#page-label"),
    difficultyLabel: document.querySelector("#difficulty-label"),
    sourceLink: document.querySelector("#source-link"),
    questionCard: document.querySelector("#question-card"),
    questionKicker: document.querySelector("#question-kicker"),
    questionTitle: document.querySelector("#question-title"),
    questionPrompt: document.querySelector("#question-prompt"),
    scratchpadInput: document.querySelector("#scratchpad-input"),
    clearNotes: document.querySelector("#clear-notes"),
    revealButton: document.querySelector("#reveal-button"),
    solutionPanel: document.querySelector("#solution-panel"),
    hideSolution: document.querySelector("#hide-solution"),
    solutionContent: document.querySelector("#solution-content"),
    ocrNoteText: document.querySelector("#ocr-note-text"),
    questionStage: document.querySelector(".question-stage"),
    emptyState: document.querySelector("#empty-state"),
    emptyReset: document.querySelector("#empty-reset"),
    previousButton: document.querySelector("#previous-button"),
    nextButton: document.querySelector("#next-button"),
    navPosition: document.querySelector("#nav-position"),
    randomButton: document.querySelector("#random-button"),
    resetButton: document.querySelector("#reset-button"),
    questionTime: document.querySelector("#question-time"),
    toast: document.querySelector("#toast")
  };

  const saved = loadSavedState();
  const state = {
    activeCategory: "All questions",
    search: "",
    filtered: questions.slice(),
    currentIndex: 0,
    questionStartedAt: Date.now(),
    reviewedThisSession: new Set(),
    ratings: saved.ratings || {},
    notes: saved.notes || {}
  };

  function loadSavedState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ ratings: state.ratings, notes: state.notes })
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function textToParagraphs(value) {
    return String(value)
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
      .join("");
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function categories() {
    const grouped = new Map();
    questions.forEach((question) => {
      grouped.set(question.chapter, (grouped.get(question.chapter) || 0) + 1);
    });
    return [["All questions", questions.length], ...grouped.entries()];
  }

  function renderCategories() {
    elements.categoryList.innerHTML = categories()
      .map(([category, count], index) => {
        const active = category === state.activeCategory;
        const chapterNumber = index === 0 ? "∞" : String(index).padStart(2, "0");
        return `
          <button class="category-button${active ? " active" : ""}" type="button" data-category="${escapeHtml(category)}">
            <span class="chapter-number">${chapterNumber}</span>
            <span class="category-name">${escapeHtml(category)}</span>
            <span class="category-count">${count}</span>
          </button>`;
      })
      .join("");
  }

  function applyFilters({ keepCurrent = false } = {}) {
    const currentId = keepCurrent ? currentQuestion()?.id : null;
    const needle = state.search.trim().toLowerCase();
    state.filtered = questions.filter((question) => {
      const inCategory =
        state.activeCategory === "All questions" || question.chapter === state.activeCategory;
      const haystack = `${question.title} ${question.section} ${question.prompt}`.toLowerCase();
      return inCategory && (!needle || haystack.includes(needle));
    });

    const retainedIndex = currentId
      ? state.filtered.findIndex((question) => question.id === currentId)
      : -1;
    state.currentIndex = retainedIndex >= 0 ? retainedIndex : 0;
    renderCategories();
    renderQuestion();
  }

  function currentQuestion() {
    return state.filtered[state.currentIndex] || null;
  }

  function renderQuestion() {
    const question = currentQuestion();
    const hasQuestion = Boolean(question);
    elements.questionCard.hidden = !hasQuestion;
    elements.emptyState.hidden = hasQuestion;
    document.querySelector(".question-navigation").hidden = !hasQuestion;

    if (!question) {
      elements.chapterLabel.textContent = "Question bank";
      elements.sectionLabel.textContent = "No matches";
      return;
    }

    state.questionStartedAt = Date.now();
    elements.chapterLabel.textContent = question.chapter;
    elements.sectionLabel.textContent = question.section;
    elements.questionIndex.textContent = `Question ${state.currentIndex + 1}`;
    elements.pageLabel.textContent =
      question.pageEnd && question.pageEnd !== question.page
        ? `Book pages ${question.page}–${question.pageEnd}`
        : `Book page ${question.page}`;
    elements.difficultyLabel.textContent = question.difficulty || "Core";
    elements.sourceLink.href = `./assets/green-book.pdf#page=${question.pdfPage || question.page + 16}`;
    elements.questionKicker.textContent = question.section;
    elements.questionTitle.textContent = question.title;
    elements.questionPrompt.innerHTML = textToParagraphs(question.prompt);
    elements.solutionContent.innerHTML = textToParagraphs(question.solution);
    elements.ocrNoteText.textContent =
      question.confidence === "low"
        ? "OCR is uncertain here. Check the original page for exact notation."
        : question.confidence === "medium"
          ? "Formula-heavy scan. Check the original page for exact notation and diagrams."
          : "Extracted from the scanned book. Use the original page for equations and diagrams.";
    elements.sourceLink.title =
      question.confidence === "high"
        ? "Open the original scanned page"
        : "Open the original scan to verify notation";
    elements.questionCard.dataset.sequence = `${String(state.currentIndex + 1).padStart(2, "0")}.${String(state.filtered.length).padStart(2, "0")}`;
    elements.solutionPanel.hidden = true;
    elements.revealButton.hidden = false;
    elements.scratchpadInput.value = state.notes[question.id] || "";
    elements.navPosition.textContent = `${state.currentIndex + 1} / ${state.filtered.length}`;
    elements.previousButton.disabled = state.filtered.length < 2;
    elements.nextButton.disabled = state.filtered.length < 2;

    document.querySelectorAll("[data-rating]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.rating === state.ratings[question.id]);
    });
  }

  function revealSolution() {
    const question = currentQuestion();
    if (!question) return;
    elements.solutionPanel.hidden = false;
    elements.revealButton.hidden = true;
    state.reviewedThisSession.add(question.id);
    updateStats();
    window.setTimeout(() => {
      elements.solutionPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 40);
  }

  function hideSolution() {
    elements.solutionPanel.hidden = true;
    elements.revealButton.hidden = false;
    elements.revealButton.focus();
  }

  function move(direction) {
    if (state.filtered.length < 2) return;
    state.currentIndex =
      (state.currentIndex + direction + state.filtered.length) % state.filtered.length;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function randomQuestion() {
    if (state.filtered.length < 2) return;
    let nextIndex = state.currentIndex;
    while (nextIndex === state.currentIndex) {
      nextIndex = Math.floor(Math.random() * state.filtered.length);
    }
    state.currentIndex = nextIndex;
    renderQuestion();
    showToast("Random question selected");
  }

  function rateQuestion(rating) {
    const question = currentQuestion();
    if (!question) return;
    state.ratings[question.id] = rating;
    state.reviewedThisSession.add(question.id);
    saveState();
    updateStats();
    document.querySelectorAll("[data-rating]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.rating === rating);
    });
    const labels = { again: "Marked for another pass", hard: "Marked as hard", "got-it": "Marked as got it" };
    showToast(labels[rating]);
  }

  function resetFilters() {
    state.activeCategory = "All questions";
    state.search = "";
    elements.searchInput.value = "";
    applyFilters();
  }

  function updateStats() {
    const reviewed = state.reviewedThisSession.size;
    const mastered = [...state.reviewedThisSession].filter(
      (id) => state.ratings[id] === "got-it"
    ).length;
    elements.sessionCount.textContent = reviewed;
    elements.masteredCount.textContent = mastered;
    elements.sessionProgress.style.width = `${questions.length ? (reviewed / questions.length) * 100 : 0}%`;
  }

  let toastTimer;
  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 1800);
  }

  function setSidebar(open) {
    elements.sidebar.classList.toggle("open", open);
    elements.mobileMenu.setAttribute("aria-expanded", String(open));
    elements.sidebarBackdrop.hidden = !open;
    if (
      !open &&
      window.matchMedia("(max-width: 820px)").matches &&
      elements.sidebar.contains(document.activeElement)
    ) {
      elements.mobileMenu.focus();
    }
  }

  elements.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.activeCategory = button.dataset.category;
    applyFilters();
    setSidebar(false);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    applyFilters({ keepCurrent: true });
  });

  elements.scratchpadInput.addEventListener("input", (event) => {
    const question = currentQuestion();
    if (!question) return;
    state.notes[question.id] = event.target.value;
    saveState();
  });

  elements.clearNotes.addEventListener("click", () => {
    const question = currentQuestion();
    if (!question) return;
    elements.scratchpadInput.value = "";
    delete state.notes[question.id];
    saveState();
    showToast("Scratchpad cleared");
  });

  elements.revealButton.addEventListener("click", revealSolution);
  elements.hideSolution.addEventListener("click", hideSolution);
  elements.previousButton.addEventListener("click", () => move(-1));
  elements.nextButton.addEventListener("click", () => move(1));
  elements.randomButton.addEventListener("click", randomQuestion);
  elements.resetButton.addEventListener("click", resetFilters);
  elements.emptyReset.addEventListener("click", resetFilters);
  elements.mobileMenu.addEventListener("click", () => setSidebar(true));
  elements.sidebarBackdrop.addEventListener("click", () => setSidebar(false));

  document.querySelector(".rating-actions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-rating]");
    if (button) rateQuestion(button.dataset.rating);
  });

  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      elements.searchInput.focus();
      return;
    }
    if (typing) return;
    if (event.code === "Space") {
      event.preventDefault();
      elements.solutionPanel.hidden ? revealSolution() : hideSolution();
    } else if (event.key.toLowerCase() === "j") {
      move(1);
    } else if (event.key.toLowerCase() === "k") {
      move(-1);
    } else if (event.key.toLowerCase() === "r") {
      randomQuestion();
    } else if (["1", "2", "3"].includes(event.key) && !elements.solutionPanel.hidden) {
      rateQuestion({ "1": "again", "2": "hard", "3": "got-it" }[event.key]);
    } else if (event.key === "Escape") {
      setSidebar(false);
    }
  });

  window.setInterval(() => {
    elements.sessionTime.textContent = formatTime((Date.now() - startedAt) / 1000);
    elements.questionTime.textContent = formatTime((Date.now() - state.questionStartedAt) / 1000);
  }, 1000);

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {
        // Browsers without a complete WebMCP implementation can ignore these helpers.
      }
    };

    register({
      name: "list_question_categories",
      title: "List question categories",
      description: "List the available quant interview chapters and the number of practice topics in each.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return { categories: categories().map(([name, count]) => ({ name, count })) };
      }
    });

    register({
      name: "open_practice_question",
      title: "Open a practice question",
      description: "Open one question in the visible practice workspace using its stable question ID.",
      inputSchema: {
        type: "object",
        properties: { questionId: { type: "string" } },
        required: ["questionId"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const questionId = typeof input?.questionId === "string" ? input.questionId : "";
        const index = questions.findIndex((question) => question.id === questionId);
        if (index < 0) throw new Error("Question ID not found.");
        state.activeCategory = "All questions";
        state.search = "";
        elements.searchInput.value = "";
        state.filtered = questions.slice();
        state.currentIndex = index;
        renderCategories();
        renderQuestion();
        return { questionId, title: questions[index].title, opened: true };
      }
    });

    register({
      name: "reveal_current_solution",
      title: "Reveal the current solution",
      description: "Reveal the worked solution for the question currently visible in the practice workspace.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        const question = currentQuestion();
        if (!question) throw new Error("No question is currently open.");
        revealSolution();
        return { questionId: question.id, solutionRevealed: true };
      }
    });

    register({
      name: "rate_current_question",
      title: "Rate the current question",
      description: "Save a self-assessment for the current question as again, hard, or got-it.",
      inputSchema: {
        type: "object",
        properties: { rating: { type: "string", enum: ["again", "hard", "got-it"] } },
        required: ["rating"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!["again", "hard", "got-it"].includes(input?.rating)) {
          throw new Error("Rating must be again, hard, or got-it.");
        }
        const question = currentQuestion();
        if (!question) throw new Error("No question is currently open.");
        rateQuestion(input.rating);
        return { questionId: question.id, rating: input.rating, saved: true };
      }
    });

    window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  }

  elements.bankTotal.textContent = questions.length;
  renderCategories();
  renderQuestion();
  updateStats();
  registerWebMcpTools();
})();
