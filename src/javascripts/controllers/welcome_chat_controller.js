import { Controller } from "@hotwired/stimulus";
import { dispatchRecentChatsRefresh } from "../utils/recentChats";

const STORAGE_KEY = "last_chat_url";

export default class extends Controller {
  static targets = ["input", "prompt"];
  static values = {
    chatUrl: String,
    chatsUrl: String,
    autoMessage: String,
  };

  connect() {
    if (this.hasAutoMessageValue && this.autoMessageValue.trim()) {
      void this.#goToChat(this.autoMessageValue.trim());
    }
  }

  async submit(event) {
    event.preventDefault();
    const message = this.#messageFromInput();
    if (!message) return;
    await this.#goToChat(message);
  }

  async startFromPrompt(event) {
    event.preventDefault();
    const message = event.currentTarget.dataset.message?.trim();
    if (!message) return;
    await this.#goToChat(message);
  }

  onInputKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void this.submit(event);
    }
  }

  async #goToChat(message) {
    const button = this.element.querySelector('[type="submit"]');
    if (button) button.disabled = true;

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
      if (button) button.disabled = false;
      window.alert("无法创建会话，请稍后重试");
    }
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

  #messageFromInput() {
    const el = this.hasInputTarget ? this.inputTarget : this.element.querySelector("textarea");
    return el?.value?.trim() || "";
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
