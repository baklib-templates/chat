import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = {
    url: String,
  };

  connect() {
    this._onRefresh = () => this.refresh();
    document.addEventListener("recent-chats:refresh", this._onRefresh);
  }

  disconnect() {
    document.removeEventListener("recent-chats:refresh", this._onRefresh);
  }

  refresh() {
    const frame = document.getElementById("recent_chats");
    if (!frame || !this.hasUrlValue) return;

    const url = new URL(this.urlValue, window.location.origin);
    const currentChatId = new URLSearchParams(window.location.search).get("id") || "";
    if (currentChatId) url.searchParams.set("current_chat_id", currentChatId);
    else url.searchParams.delete("current_chat_id");

    const nextSrc = url.pathname + url.search;
    const prevSrc = frame.getAttribute("src");
    if (prevSrc) {
      const prev = new URL(prevSrc, window.location.origin);
      if (prev.pathname + prev.search === nextSrc) return;
    }

    frame.src = nextSrc;
  }
}
