import { Controller } from "@hotwired/stimulus";
import { buildUrl } from "../utils/index.js";
import { dispatchRecentChatsRefresh } from "../utils/recentChats";

const STORAGE_KEY = "last_chat_url";

export default class extends Controller {
  static targets = [
    "modal",
    "modalInput",
    "resultsScroll",
    "previewFrame",
    "hotSection",
    "aiSection",
    "aiLink",
  ];
  static values = {
    searchUrl: String,
    previewUrl: String,
    chatUrl: String,
    chatsUrl: String,
    askAiMessageTemplate: String,
    debounceMs: { type: Number, default: 220 },
  };

  connect() {
    this._onDocKeydown = (event) => this.#onDocKeydown(event);
    document.addEventListener("keydown", this._onDocKeydown);

    this._onDialogClose = () => {
      setTimeout(() => this.#resetModalState(), 200);
    };
    if (this.hasModalTarget) {
      this.modalTarget.addEventListener("close", this._onDialogClose);
    }

    if (this.hasPreviewFrameTarget) {
      this._onPreviewFrameLoad = (event) => {
        if (event.target === this.previewFrameTarget) this.#afterPreviewFrameLoad();
      };
      this.previewFrameTarget.addEventListener("turbo:frame-load", this._onPreviewFrameLoad);
      this._onPreviewMouseOver = (event) => this.#onPreviewMouseOver(event);
      this.previewFrameTarget.addEventListener("mouseover", this._onPreviewMouseOver);
    }

    this.debounceTimer = null;
    this.selectedIndex = null;
  }

  disconnect() {
    document.removeEventListener("keydown", this._onDocKeydown);
    if (this.hasModalTarget) {
      this.modalTarget.removeEventListener("close", this._onDialogClose);
    }
    if (this.hasPreviewFrameTarget && this._onPreviewFrameLoad) {
      this.previewFrameTarget.removeEventListener("turbo:frame-load", this._onPreviewFrameLoad);
    }
    if (this.hasPreviewFrameTarget && this._onPreviewMouseOver) {
      this.previewFrameTarget.removeEventListener("mouseover", this._onPreviewMouseOver);
    }
    this.#clearDebounce();
  }

  openModal(event) {
    event?.preventDefault();
    if (!this.hasModalTarget) return;
    this.#clearDebounce();
    this.#clearPreviewFrame();
    this.selectedIndex = null;
    if (this.hasResultsScrollTarget) this.resultsScrollTarget.scrollTop = 0;
    this.modalTarget.showModal();
    this.#syncSearchPanelsVisibility();
    this.#updateAiLink();
    requestAnimationFrame(() => this.modalInputTarget?.focus());
  }

  closeModal() {
    if (!this.hasModalTarget) return;
    if (this.modalTarget.open) this.modalTarget.close();
  }

  onModalInput() {
    this.#syncSearchPanelsVisibility();
    this.#debouncedLoadPreview();
    this.#updateAiLink();
  }

  onModalKeydown(event) {
    if (event.key === "Enter") {
      const href = this.#selectedHref();
      if (!href) return;
      event.preventDefault();
      this.#visitUrl(href);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const n = this.previewFrameTarget?.querySelectorAll("[data-search-item]").length ?? 0;
    if (n === 0) return;

    event.preventDefault();

    if (this.selectedIndex == null) {
      this.selectedIndex = event.key === "ArrowDown" ? 0 : n - 1;
    } else if (event.key === "ArrowDown") {
      this.selectedIndex = (this.selectedIndex + 1) % n;
    } else {
      this.selectedIndex = (this.selectedIndex - 1 + n) % n;
    }

    this.#paintSelection();
    this.#scrollSelectedIntoView();
  }

  #onPreviewMouseOver(event) {
    if (!this.hasPreviewFrameTarget) return;
    const row = event.target.closest?.("[data-search-item]");
    if (!row || !this.previewFrameTarget.contains(row)) return;
    const idx = Number(row.dataset.index);
    if (!Number.isFinite(idx)) return;
    this.selectedIndex = idx;
    this.#paintSelection();
  }

  clearListSelection() {
    this.selectedIndex = null;
    this.#paintSelection();
  }

  resultsEnter() {
    const n = this.previewFrameTarget?.querySelectorAll("[data-search-item]").length ?? 0;
    if (this.selectedIndex == null && n > 0) {
      this.selectedIndex = 0;
      this.#paintSelection();
    }
  }

  async askAiFromSearch(event) {
    event?.preventDefault();
    const q = (this.modalInputTarget?.value || "").trim();
    if (!q || !this.hasChatUrlValue || !this.chatUrlValue) return;

    const tpl = this.hasAskAiMessageTemplateValue ? this.askAiMessageTemplateValue : "%{query}";
    const message = tpl.includes("%{query}") ? tpl.replace("%{query}", q) : `${tpl} ${q}`.trim();

    this.closeModal();

    try {
      const chatId = await this.#createChat();
      dispatchRecentChatsRefresh({ chatId });
      const url = new URL(this.chatUrlValue, window.location.origin);
      url.searchParams.set("id", chatId);
      url.searchParams.set("message", message);
      const href = url.pathname + url.search;
      try {
        localStorage.setItem(STORAGE_KEY, href);
      } catch {
        /* ignore */
      }
      window.location.assign(href);
    } catch {
      window.alert("无法创建会话，请稍后重试");
    }
  }

  applyHotKeyword(event) {
    event?.preventDefault();
    const kw = (event.currentTarget?.dataset?.kw || "").trim();
    if (!kw || !this.hasModalInputTarget) return;

    const fillKeyword = () => {
      this.modalInputTarget.value = kw;
      this.modalInputTarget.dispatchEvent(new Event("input", { bubbles: true }));
      this.modalInputTarget.focus();
    };

    if (this.hasModalTarget && !this.modalTarget.open) {
      this.openModal(event);
      requestAnimationFrame(fillKeyword);
      return;
    }

    fillKeyword();
  }

  toggleModal() {
    if (!this.hasModalTarget) return;
    if (this.modalTarget.open) this.closeModal();
    else this.openModal();
  }

  #onDocKeydown(event) {
    if (event.key === "Escape" && !event.isComposing) {
      if (this.hasModalTarget && this.modalTarget.open) {
        event.preventDefault();
        this.closeModal();
      }
      return;
    }

    if (event.key !== "k" && event.key !== "K") return;
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.altKey || event.shiftKey) return;

    const el = event.target;
    const tag = el && el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
      return;
    }

    event.preventDefault();
    this.toggleModal();
  }

  #resetModalState() {
    this.#clearDebounce();
    if (this.hasModalInputTarget) this.modalInputTarget.value = "";
    this.selectedIndex = null;
    this.#syncSearchPanelsVisibility();
    this.#updateAiLink();
  }

  #clearPreviewFrame() {
    if (!this.hasPreviewFrameTarget) return;
    this.previewFrameTarget.removeAttribute("src");
    this.previewFrameTarget.innerHTML = "";
  }

  #debouncedLoadPreview() {
    this.#clearDebounce();
    this.debounceTimer = window.setTimeout(() => this.#loadPreview(), this.debounceMsValue);
  }

  #clearDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  #loadPreview() {
    if (!this.hasPreviewUrlValue || !this.previewUrlValue || !this.hasPreviewFrameTarget) return;
    const q = (this.modalInputTarget?.value || "").trim();
    if (!q) {
      this.#clearPreviewFrame();
      this.selectedIndex = null;
      this.#paintSelection();
      this.#syncSearchPanelsVisibility();
      return;
    }
    this.previewFrameTarget.src = buildUrl(this.previewUrlValue, { q });
  }

  #afterPreviewFrameLoad() {
    const n = this.previewFrameTarget?.querySelectorAll("[data-search-item]").length ?? 0;
    this.selectedIndex = n > 0 ? 0 : null;
    this.#paintSelection();
  }

  #selectedHref() {
    if (this.selectedIndex == null || !this.hasPreviewFrameTarget) return null;
    const rows = this.previewFrameTarget.querySelectorAll("[data-search-item]");
    return rows[this.selectedIndex]?.getAttribute("href") || null;
  }

  #paintSelection() {
    if (!this.hasPreviewFrameTarget) return;
    this.previewFrameTarget.querySelectorAll("[data-search-item]").forEach((el) => {
      const idx = Number(el.dataset.index);
      const on = this.selectedIndex != null && idx === this.selectedIndex;
      el.toggleAttribute("data-search-item-selected", on);
      el.classList.toggle("bg-base-200", on);
      el.classList.toggle("ring-1", on);
      el.classList.toggle("ring-base-300/70", on);
      const chev = el.querySelector(".search-modal__chev");
      if (chev) chev.classList.toggle("opacity-100", on);
    });
  }

  #scrollSelectedIntoView() {
    if (!this.hasPreviewFrameTarget || this.selectedIndex == null) return;
    const rows = this.previewFrameTarget.querySelectorAll("[data-search-item]");
    rows[this.selectedIndex]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }

  #visitUrl(url) {
    if (this.hasModalTarget && this.modalTarget.open) this.modalTarget.close();
    this.#resetModalState();
    if (window.Turbo?.visit) {
      window.Turbo.visit(url, { action: "advance" });
    } else {
      window.location.assign(url);
    }
  }

  #syncSearchPanelsVisibility() {
    const q = (this.modalInputTarget?.value || "").trim();
    const hasQuery = !!q;

    if (this.hasResultsScrollTarget) {
      this.resultsScrollTarget.classList.toggle("hidden", !hasQuery);
    }
    if (this.hasAiSectionTarget) {
      this.aiSectionTarget.classList.toggle("hidden", !hasQuery);
    }

    if (this.hasHotSectionTarget) {
      const hasHot = !!this.hotSectionTarget.querySelector("[data-kw]");
      this.hotSectionTarget.classList.toggle("hidden", !hasHot || hasQuery);
    }
  }

  #updateAiLink() {
    if (!this.hasAiLinkTarget) return;
    const q = (this.modalInputTarget?.value || "").trim();
    const strong = this.aiLinkTarget.querySelector(".search-modal-ai-q");
    if (!strong) return;
    const ellipsis = this.aiLinkTarget.dataset.headerSearchAskAiEllipsisValue || "…";
    const displayTpl = this.aiLinkTarget.dataset.headerSearchAskAiQueryDisplayValue || "%{query}";
    strong.textContent = q ? displayTpl.replace("%{query}", q) : ellipsis;
  }

  async #createChat() {
    const chatsUrl = (this.chatsUrlValue || "").trim();
    if (!chatsUrl) throw new Error("missing chats url");

    const response = await fetch(chatsUrl, {
      method: "POST",
      headers: this.#jsonHeaders(),
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("create chat failed");
    const data = await response.json();
    if (!data?.id) throw new Error("missing chat id");
    return String(data.id);
  }

  #jsonHeaders() {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    const token = document.querySelector("meta[name='csrf-token']")?.getAttribute("content");
    if (token) headers["X-CSRF-Token"] = token;
    return headers;
  }
}
