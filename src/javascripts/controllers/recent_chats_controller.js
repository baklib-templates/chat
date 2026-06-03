import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["frame", "chatLink", "chatItem", "headerSubtitle"];
  static values = {
    url: String,
    chatsUrl: String,
    currentChatId: String,
    deleteConfirm: String,
    deleteEnabled: { type: Boolean, default: false },
  };

  connect() {
    this._onRefresh = (event) => this.#handleRefresh(event);
    document.addEventListener("recent-chats:refresh", this._onRefresh);
  }

  disconnect() {
    document.removeEventListener("recent-chats:refresh", this._onRefresh);
  }

  async deleteChat(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.deleteEnabledValue) return;

    const chatId = String(event.currentTarget?.dataset?.chatId || "").trim();
    if (!chatId || !this.hasChatsUrlValue) return;

    const confirmMessage = (this.deleteConfirmValue || "").trim();
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const item = this.chatItemTargets.find((el) => el.dataset.chatId === chatId);
    const wasCurrent = this.#isViewingChat(chatId);

    if (item) item.classList.add("pointer-events-none", "opacity-40");

    try {
      const response = await fetch(`${this.chatsUrlValue}/${chatId}`, {
        method: "DELETE",
        headers: this.#jsonHeaders(),
        credentials: "same-origin",
      });

      if (!response.ok) throw new Error("delete failed");

      if (item) item.remove();

      if (wasCurrent) {
        window.Turbo?.visit?.("/") ?? (window.location.href = "/");
        return;
      }

      this.refresh();
    } catch {
      if (item) item.classList.remove("pointer-events-none", "opacity-40");
      this.refresh();
    }
  }

  #handleRefresh(event) {
    const { chatId, title } = event?.detail || {};
    if (title && chatId) {
      this.#applyChatTitle(chatId, title);
      return;
    }
    this.refresh();
  }

  #applyChatTitle(chatId, title) {
    const id = String(chatId);
    const trimmed = String(title).trim();
    if (!trimmed) return;

    this.chatLinkTargets
      .filter((link) => link.dataset.chatId === id)
      .forEach((link) => {
        link.textContent = trimmed;
        link.title = trimmed;
        link.dataset.hasTitle = "true";
      });

    if (!this.#isViewingChat(id)) return;

    this.headerSubtitleTargets.forEach((el) => {
      el.textContent = trimmed;
      el.classList.remove("hidden");
    });
    document.title = trimmed;
  }

  #isViewingChat(chatId) {
    const current = (this.currentChatIdValue || "").trim();
    return current !== "" && current === String(chatId);
  }

  refresh() {
    if (!this.hasFrameTarget || !this.hasUrlValue) return;

    const url = new URL(this.urlValue, window.location.origin);
    const currentChatId = (this.currentChatIdValue || "").trim();
    if (currentChatId) url.searchParams.set("current_chat_id", currentChatId);
    else url.searchParams.delete("current_chat_id");

    const nextSrc = url.pathname + url.search;
    const prevSrc = this.frameTarget.getAttribute("src");
    if (prevSrc) {
      const prev = new URL(prevSrc, window.location.origin);
      if (prev.pathname + prev.search === nextSrc) return;
    }

    this.frameTarget.src = nextSrc;
  }

  #jsonHeaders() {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    const token =
      document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || "";
    if (token) headers["X-CSRF-Token"] = token;
    return headers;
  }
}
