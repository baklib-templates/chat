import { Controller } from "@hotwired/stimulus";
import tippy from "tippy.js";
import { copyToClipboard } from "../utils/copyToClipboard";
import { dispatchRecentChatsRefresh } from "../utils/recentChats";

export default class extends Controller {
  static targets = [
    "messages",
    "messagesScroll",
    "error",
    "input",
    "send",
    "clearButton",
    "userMessageTemplate",
    "assistantMessageTemplate",
    "statusMessageTemplate",
    "retryButton",
  ];
  static classes = ["hidden"];
  static values = {
    url: String,
    chatsUrl: String,
    chatId: String,
    timeout: Number,
    autoSubmit: { type: Boolean, default: false },
    hasChatTitle: { type: Boolean, default: false },
    isHistoricalChat: { type: Boolean, default: false },
    chatTitleUrl: String,
    message: String,
    messages: Object,
    query: Object // 搜索查询参数
  };

  connect() {
    this.isStreaming = false;
    this.chatHistory = [];
    this.currentRound = null;
    this.shouldAutoScroll = true;
    this.titlePollStarted = false;
    this.#hydrateLaunchParamsFromUrl();
    this.#hydrateFromDom();
    if (this.chatHistory.length > 0) {
      this.isHistoricalChatValue = true;
    }
    this.#bindAutoScrollTracking();
    this.syncSendButton();
    this.#syncClearButtonVisibility();
    if (this.chatHistory.length > 0) {
      this.scrollToBottom(true);
    }
  }

  #hydrateLaunchParamsFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!this.chatIdValue && params.get("id")) {
        this.chatIdValue = params.get("id");
      }
      const urlMessage = params.get("message") || params.get("q");
      if (this.autoSubmitValue && urlMessage && !this.messageValue) {
        this.messageValue = urlMessage.trim();
      }
    } catch {
      /* ignore */
    }
  }

  exportState() {
    const messagesEl =
      this.#messagesElForVariant("desktop") ||
      this.#messagesElForVariant("pip") ||
      this.messagesTargets[0];
    const hasMessages =
      messagesEl &&
      messagesEl.querySelector(".ai-chat-user-round, .ai-chat-assistant-round");
    return {
      chatId: this.chatIdValue || "",
      messagesHtml: messagesEl?.innerHTML || "",
      showEmptyHint: !hasMessages,
    };
  }

  importState({ chatId, messagesHtml, showEmptyHint }) {
    const targets = this.messagesTargets.length
      ? this.messagesTargets
      : [this.#messagesElForVariant("desktop")].filter(Boolean);

    if (chatId) this.chatIdValue = chatId;
    else this.chatIdValue = "";

    targets.forEach((el) => {
      if (el && messagesHtml != null) el.innerHTML = messagesHtml;
    });

    this.chatHistory = [];
    this.currentRound = null;
    this.#hydrateFromDom();
    this.#toggleEmptyHint(showEmptyHint ?? this.chatHistory.length === 0);
    this.#syncClearButtonVisibility();
    this.syncSendButton();
  }

  #messagesElForVariant(variant) {
    return (
      this.messagesTargets.find((el) => el.dataset.aiSearchVariant === variant) || null
    );
  }

  disconnect() {
    this.#unbindAutoScrollTracking();
    this.stopStreaming();
  }

  #bindAutoScrollTracking() {
    const el = this.messagesScrollTargets[0];
    if (!el || this.autoScrollElement === el) return;

    this.#unbindAutoScrollTracking();
    this.autoScrollElement = el;
    this.onMessagesScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      this.shouldAutoScroll = isAtBottom;
    };
    el.addEventListener("scroll", this.onMessagesScroll, { passive: true });
  }

  #unbindAutoScrollTracking() {
    if (this.autoScrollElement && this.onMessagesScroll) {
      this.autoScrollElement.removeEventListener("scroll", this.onMessagesScroll);
    }
    this.autoScrollElement = null;
    this.onMessagesScroll = null;
  }

  messageValueChanged() {
    if (this.autoSubmitValue && this.messageValue) {
      this.#delayAutoSubmit();
    }
  }

  chatIdValueChanged() {
    this.#syncClearButtonVisibility();
  }

  sendFromWindow(event) {
    if (this.isStreaming) return;
    const text = event.detail?.message?.trim();
    if (!text) return;
    this.sendMessage(text);
  }

  send(event) {
    event?.preventDefault();
    this.#sendUserMessage();
  }

  onInputKeydown(event) {
    if (this.isStreaming) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.#sendUserMessage();
    }
  }

  syncSendButton() {
    if (!this.hasSendTarget) return;
    const hasText = this.hasInputTarget
      ? this.inputTargets.some((el) => el.value.trim())
      : false;
    this.sendTargets.forEach((btn) => {
      btn.disabled = !hasText || this.isStreaming;
    });
  }

  retryFromButton(event) {
    const idx = Number(event.currentTarget.dataset.idx);
    const round = this.chatHistory[idx];
    if (round?.retry) round.retry();
  }

  retryResponse(event) {
    event?.preventDefault();
    if (this.isStreaming) return;

    const trigger = event.currentTarget;
    const messageId =
      trigger.dataset.messageId ||
      trigger.closest(".ai-chat-assistant-round")?.dataset.messageId;
    if (!messageId) return;

    void this.#retryFromMessageId(messageId);
  }

  async copyResponse(event) {
    event?.preventDefault();
    const text = this.#assistantTextForCopy(event.currentTarget);
    if (!text) return;

    const button = event.currentTarget;
    const successText = this.messagesValue?.copy_success;
    const errorText = this.messagesValue?.copy_error;
    if (!successText || !errorText) return;

    try {
      await copyToClipboard(text);
      this.#showCopyToast(button, successText);
    } catch {
      this.#showCopyToast(button, errorText);
    }
  }

  #showCopyToast(anchor, message) {
    if (!anchor || !message) return;

    this._copyTippy?.destroy();
    this._copyTippy = tippy(anchor, {
      theme: "material",
      content: message,
      trigger: "manual",
      arrow: true,
      placement: "top",
    });
    this._copyTippy.show();
    window.clearTimeout(this._copyTippyTimer);
    this._copyTippyTimer = window.setTimeout(() => {
      this._copyTippy?.hide();
      this._copyTippy?.destroy();
      this._copyTippy = null;
    }, 1200);
  }

  #roundIdxForMessageId(messageId) {
    if (!messageId) return -1;
    const id = String(messageId);
    const fromHistory = this.chatHistory.findIndex(
      (round) => round.assistantMessageId === id || round.userMessageId === id,
    );
    if (fromHistory >= 0) return fromHistory;

    const primary = this.messagesTargets[0];
    if (!primary) return -1;
    const assistants = primary.querySelectorAll(".ai-chat-assistant-round");
    for (let i = 0; i < assistants.length; i++) {
      if (assistants[i].dataset.messageId === id) return i;
    }
    return -1;
  }

  #assistantRoundElAt(container, idx) {
    const rounds = container.querySelectorAll(".ai-chat-assistant-round");
    return rounds[idx] || null;
  }

  #assistantTextForCopy(triggerEl) {
    const roundEl = triggerEl?.closest?.(".ai-chat-assistant-round");
    if (!roundEl) return "";

    const idx = Number(roundEl.dataset.roundIdx);
    if (Number.isFinite(idx) && this.chatHistory[idx]?.ai) {
      return this.chatHistory[idx].ai.trim();
    }

    const contentEl = roundEl.querySelector("[data-markdown-target='content']");
    const fromPre = contentEl?.textContent?.trim();
    if (fromPre) return fromPre;

    return (
      roundEl.querySelector("[data-markdown-target='renderedContent']")?.innerText?.trim() || ""
    );
  }

  async clearChat() {
    if (this.isStreaming) this.stopStreaming();

    if (this.chatIdValue && this.chatsUrlValue) {
      try {
        await fetch(`${this.chatsUrlValue}/${this.chatIdValue}`, {
          method: "DELETE",
          headers: this.#jsonHeaders(),
          credentials: "same-origin",
        });
      } catch {
        /* ignore network errors, still clear UI */
      }
    }

    this.chatHistory = [];
    this.currentRound = null;
    this.messagesTargets.forEach((el) => {
      el.innerHTML = "";
    });
    this.chatIdValue = "";
    this.#toggleEmptyHint(true);
    this.#syncClearButtonVisibility();
  }

  #delayAutoSubmit() {
    if (this.delayAutoSubmitTimer) clearTimeout(this.delayAutoSubmitTimer);
    this.delayAutoSubmitTimer = setTimeout(() => {
      if (this.messageValue && !this.isStreaming) this.sendMessage(this.messageValue);
    }, 500);
  }

  #sendUserMessage() {
    if (this.isStreaming) return;
    const message = (this.inputTargets.find((el) => el.value.trim())?.value || "").trim();
    if (!message) return;
    this.inputTargets.forEach((el) => {
      el.value = "";
    });
    this.syncSendButton();
    this.sendMessage(message);
  }

  sendMessage(message) {
    if (!message || !this.url || this.isStreaming) return;

    this.#stripOneShotMessageFromUrl();

    this.#toggleEmptyHint(false);
    this.shouldAutoScroll = true;

    this.currentRound = {
      user: message,
      ai: "",
      status: "streaming",
      retry: null,
      userMessageId: null,
      assistantMessageId: null,
    };
    this.chatHistory.push(this.currentRound);
    this.#syncClearButtonVisibility();
    this.#hideAssistantActions();
    this.appendUserMessage(message);
    this.appendAssistantMessage("", "streaming", this.chatHistory.length - 1);

    const idx = this.chatHistory.length - 1;
    this.#streamAssistant(message, idx);
  }

  async #streamAssistant(message, idx, { replaceLastAssistant = false, resendMessageId = null } = {}) {
    const round = this.chatHistory[idx];
    if (!round) return;

    this.currentRound = round;
    this.isStreaming = true;
    this.syncSendButton();
    this.#hideAssistantActions();
    round.ai = "";
    round.status = "streaming";
    if (!replaceLastAssistant) {
      this.updateCurrentAssistantMessage("", "streaming", idx);
    }

    await this.#ensureChatId();
    const streamUrl = this.#buildStreamUrl({ message, resendMessageId });
    this.eventSource = new EventSource(streamUrl);
    this.startTimeoutTimer();

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      data.message ||= "";

      if (data.chat_id) {
        this.chatIdValue = String(data.chat_id);
      }

      this.resetTimeoutTimer();

      if (data.status === "meta") {
        this.#assignMessageIdsFromSSE(data, idx);
        return;
      }

      if (data.status === "started" || data.status === "reading") {
        this.updateCurrentAssistantMessage(this.messagesValue.reading, "status", idx);
        return;
      }

      if (data.status === "thinking") {
        this.updateCurrentAssistantMessage(this.messagesValue.thinking_status, "status", idx);
        return;
      }

      if (data.status === "system") {
        this.currentRound.ai = data.message;
        this.currentRound.status = "system";
        this.updateCurrentAssistantMessage(this.currentRound.ai, "system", idx);
        return;
      }

      if (data.status === "streaming") {
        if (this.currentRound.status !== "streaming") {
          this.currentRound.ai = "";
        }
        this.currentRound.status = "streaming";
        this.currentRound.ai += data.message;
        this.updateCurrentAssistantMessage(this.currentRound.ai, "streaming", idx);
        return;
      }

      if (data.status === "completed") {
        this.currentRound.ai += data.message;
        this.#assignMessageIdsFromSSE(data, idx);
        this.currentRound.status = "completed";
        this.#finishStreaming(idx);
        this.updateCurrentAssistantMessage(this.currentRound.ai, "completed", idx);
        this.#showAssistantActions();
        this.#maybePollChatTitle();
        return;
      }

      if (data.status === "error") {
        this.#handleStreamError(data.message, idx);
      }
    };

    this.eventSource.onerror = () => {
      this.#handleStreamError(this.messagesValue.network_error, idx);
    };
  }

  #handleStreamError(message, idx) {
    const round = this.chatHistory[idx];
    if (!round) return;

    this.currentRound = round;
    round.ai = message;
    round.status = "error";
    this.#finishStreaming(idx);
    round.retry = () => {
      const id = round.assistantMessageId || round.userMessageId;
      if (id) void this.#retryFromMessageId(id);
      else void this.#retryFromRoundIdx(idx);
    };
    this.updateCurrentAssistantMessage(
      round.ai,
      "error",
      idx,
      round.retry
    );
  }

  #finishStreaming() {
    this.eventSource?.close();
    this.isStreaming = false;
    this.clearTimeoutTimer();
    this.syncSendButton();
  }

  stopStreaming() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        /* ignore */
      }
    }
    this.isStreaming = false;
    this.clearTimeoutTimer();
    this.syncSendButton();
    if (this.hasErrorTarget) {
      this.errorTarget.classList.add(...this.hiddenClasses);
    }
  }

  #hydrateFromDom() {
    const primary = this.messagesTargets[0];
    if (!primary || primary.children.length === 0) return;

    const rounds = [];
    let pendingUser = null;
    let pendingUserEl = null;

    primary.querySelectorAll(".ai-chat-user-round, .ai-chat-assistant-round").forEach((el) => {
      if (el.matches(".ai-chat-user-round")) {
        pendingUser = el.querySelector(".ai-user-message")?.textContent?.trim() || "";
        pendingUserEl = el;
      } else if (el.matches(".ai-chat-assistant-round") && pendingUser != null) {
        const contentEl = el.querySelector("[data-markdown-target='content']");
        const ai = contentEl?.textContent?.trim() || "";
        const idx = rounds.length;
        rounds.push({
          user: pendingUser,
          ai,
          status: "completed",
          retry: null,
          userMessageId: pendingUserEl?.dataset.messageId || null,
          assistantMessageId: el.dataset.messageId || null,
        });
        pendingUser = null;
        pendingUserEl = null;
      }
    });

    if (rounds.length === 0) return;
    this.chatHistory = rounds;
    this.#toggleEmptyHint(false);
    this.#syncClearButtonVisibility();
    this.#showAssistantActions();
  }

  appendUserMessage(content, messageId = null) {
    if (!this.hasUserMessageTemplateTarget) return;
    this.messagesTargets.forEach((container) => {
      const tpl = this.userMessageTemplateTarget.content.cloneNode(true);
      const roundEl = tpl.querySelector(".ai-chat-user-round");
      const node = tpl.querySelector(".ai-user-message");
      if (node) node.textContent = content;
      if (roundEl && messageId) roundEl.dataset.messageId = String(messageId);
      container.appendChild(tpl);
    });
    this.scrollToBottom(true);
  }

  appendAssistantMessage(content, status, idx, retryFn) {
    if (!this.hasAssistantMessageTemplateTarget) return;
    this.messagesTargets.forEach((container) => {
      const tpl = this.assistantMessageTemplateTarget.content.cloneNode(true);
      this.#fillAssistantNode(tpl, content, status, idx, retryFn);
      container.appendChild(tpl);
    });
    if (status === "completed") this.#showAssistantActions();
    this.scrollToBottom(true);
  }

  updateCurrentAssistantMessage(content, status, idx, retryFn) {
    this.messagesTargets.forEach((container) => {
      const node = this.#assistantRoundElAt(container, idx);
      if (!node) return;
      this.#fillAssistantNode(node, content, status, idx, retryFn);
    });
    this.scrollToBottom();
  }

  #fillAssistantNode(node, content, status, idx, retryFn) {
    const roundEl =
      node instanceof Element && node.matches(".ai-chat-assistant-round")
        ? node
        : node.querySelector?.(".ai-chat-assistant-round");
    if (roundEl) {
      roundEl.dataset.roundIdx = String(idx);
      const actions = roundEl.querySelector(".ai-message-actions");
      if (actions) {
        actions.classList.toggle("hidden", status !== "completed" || this.isStreaming);
      }
    }

    const markdownRoot = node.querySelector("[data-controller~='markdown']");
    const contentEl = node.querySelector("[data-markdown-target='content']");
    const renderedEl = node.querySelector("[data-markdown-target='renderedContent']");
    const enableMarkdownStyle = () => renderedEl?.classList.add("chat-message");
    const disableMarkdownStyle = () => renderedEl?.classList.remove("chat-message");

    if (status === "error") {
      roundEl?.classList.remove("ai-chat-assistant-round--loading");
      roundEl?.setAttribute("aria-busy", "false");
      const button = this.retryButton.cloneNode(true);
      button.dataset.idx = String(idx);
      button.classList.remove("hidden");
      button.classList.add("shrink-0");
      if (renderedEl) {
        disableMarkdownStyle();
        renderedEl.innerHTML = `<div class="flex items-center gap-2 text-error"><span>${this.escapeHTML(content)}</span></div>`;
      }
      renderedEl?.querySelector("div")?.appendChild(button);
      if (retryFn) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          retryFn();
        });
      }
      this.scrollToBottom();
      return;
    }

    const isLoading = status === "status" || (status === "streaming" && !content);
    roundEl?.classList.toggle("ai-chat-assistant-round--loading", isLoading);
    roundEl?.setAttribute("aria-busy", isLoading ? "true" : "false");

    if (status === "canceled" || status === "status") {
      if (contentEl) contentEl.textContent = "";
      if (renderedEl) {
        disableMarkdownStyle();
        renderedEl.innerHTML = this.#renderStatusHtml(content);
      }
      this.scrollToBottom();
      return;
    }

    if (content) {
      enableMarkdownStyle();
      if (contentEl) contentEl.textContent = content;
      this.#triggerMarkdown(markdownRoot);
      if (status === "completed") {
        this.#renderCompletionHtml(markdownRoot, this.messagesValue?.completed);
      } else {
        this.#clearCompletionHtml(markdownRoot);
      }
    } else if (renderedEl) {
      disableMarkdownStyle();
      renderedEl.innerHTML = this.#renderStatusHtml(this.#defaultThinkingLabel());
    }

    this.scrollToBottom();
  }

  #defaultThinkingLabel() {
    return this.messagesValue?.thinking_status || this.messagesValue?.thinking || "";
  }

  #renderStatusHtml(text) {
    const label = (text || this.#defaultThinkingLabel()).trim();
    if (this.hasStatusMessageTemplateTarget) {
      const tpl = this.statusMessageTemplateTarget.content.cloneNode(true);
      const textEl = tpl.querySelector(".ai-chat-status-text");
      if (textEl) textEl.textContent = label;
      const mount = document.createElement("div");
      mount.appendChild(tpl);
      return mount.innerHTML;
    }

    return `<div class="ai-chat-status flex items-center gap-2 text-sm leading-relaxed text-base-content/60" role="status" aria-live="polite"><span class="loading loading-spinner loading-xs shrink-0 text-primary" aria-hidden="true"></span><span class="ai-chat-status-text">${this.escapeHTML(label)}</span></div>`;
  }

  #triggerMarkdown(markdownRoot) {
    if (!markdownRoot || !window.Stimulus) return;
    const ctrl = window.Stimulus.getControllerForElementAndIdentifier(markdownRoot, "markdown");
    ctrl?.renderContent();
  }

  #clearCompletionHtml(markdownRoot) {
    markdownRoot?.querySelector(".ai-completed-text")?.remove();
  }

  #renderCompletionHtml(markdownRoot, html) {
    this.#clearCompletionHtml(markdownRoot);
    const tail = (html || "").trim();
    if (!tail || !markdownRoot) return;

    const el = document.createElement("div");
    el.className = "ai-completed-text";
    el.innerHTML = tail;
    markdownRoot.appendChild(el);
  }

  #showAssistantActions() {
    if (this.isStreaming) {
      this.#hideAssistantActions();
      return;
    }

    this.messagesTargets.forEach((container) => {
      const rounds = container.querySelectorAll(".ai-chat-assistant-round");
      rounds.forEach((el, i) => {
        const actions = el.querySelector(".ai-message-actions");
        if (!actions) return;
        const show = this.chatHistory[i]?.status === "completed";
        actions.classList.toggle("hidden", !show);
      });
    });
  }

  #hideAssistantActions() {
    this.messagesTargets.forEach((container) => {
      container.querySelectorAll(".ai-message-actions").forEach((actions) => {
        actions.classList.add("hidden");
      });
    });
  }

  #removeAssistantRoundAndAfter(idx) {
    this.messagesTargets.forEach((container) => {
      const assistantEl = this.#assistantRoundElAt(container, idx);
      if (!assistantEl) return;

      let node = assistantEl;
      while (node) {
        const toRemove = node;
        node = node.nextElementSibling;
        toRemove.remove();
      }
    });
  }

  async #retryFromMessageId(messageId) {
    const idx = this.#roundIdxForMessageId(messageId);
    if (idx < 0) return;
    await this.#retryFromRoundIdx(idx, messageId);
  }

  async #retryFromRoundIdx(idx, resendMessageId = null) {
    const round = this.chatHistory[idx];
    if (!round?.user) return;
    if (this.isStreaming) this.stopStreaming();

    this.#removeAssistantRoundAndAfter(idx);
    this.chatHistory = this.chatHistory.slice(0, idx + 1);

    this.currentRound = round;
    await this.#ensureChatId();

    const messageId =
      resendMessageId || round.assistantMessageId || round.userMessageId;
    round.ai = "";
    round.status = "streaming";
    round.assistantMessageId = null;
    this.#hideAssistantActions();
    this.appendAssistantMessage("", "streaming", idx);

    if (messageId && this.chatIdValue) {
      this.#streamAssistant(null, idx, { replaceLastAssistant: true, resendMessageId: messageId });
      return;
    }

    this.#streamAssistant(round.user, idx, { replaceLastAssistant: true });
  }

  #toggleEmptyHint(show) {
    this.element.querySelectorAll(".chat-ai-empty-hint").forEach((el) => {
      el.classList.toggle("hidden", !show);
    });
    this.messagesScrollTargets
      .filter((el) => el.dataset.aiSearchVariant === "mobile")
      .forEach((el) => el.classList.toggle("hidden", show));
  }

  #buildStreamUrl({ message, resendMessageId }) {
    const base = (this.url || "").replace(/\/$/, "");
    const params = new URLSearchParams();
    const query = this.hasQueryValue ? this.queryValue : {};

    let streamUrl = base;
    if (this.chatIdValue) {
      streamUrl = `${base}/${this.chatIdValue}`;
    }

    if (resendMessageId) {
      params.append("message_id", String(resendMessageId));
    } else if (message) {
      params.append("message", message);
    }

    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== "") params.append(`query[${key}]`, value);
    });

    const qs = params.toString();
    return qs ? `${streamUrl}?${qs}` : streamUrl;
  }

  #assignMessageIdsFromSSE(data, idx) {
    const round = this.chatHistory[idx];
    if (!round) return;

    if (data.user_message_id) round.userMessageId = String(data.user_message_id);
    if (data.assistant_message_id) round.assistantMessageId = String(data.assistant_message_id);
    if (!round.assistantMessageId && data.message_id) {
      round.assistantMessageId = String(data.message_id);
    }

    this.#syncRoundMessageIdsToDom(idx, round);
  }

  #syncRoundMessageIdsToDom(idx, round) {
    this.messagesTargets.forEach((container) => {
      const userRounds = container.querySelectorAll(".ai-chat-user-round");
      const assistantRounds = container.querySelectorAll(".ai-chat-assistant-round");
      const userEl = userRounds[idx];
      const assistantEl = assistantRounds[idx];

      if (userEl && round.userMessageId) {
        userEl.dataset.messageId = round.userMessageId;
      }
      if (assistantEl && round.assistantMessageId) {
        assistantEl.dataset.messageId = round.assistantMessageId;
        const retryBtn = assistantEl.querySelector(
          ".ai-message-actions [data-action*='retryResponse']",
        );
        if (retryBtn) retryBtn.dataset.messageId = round.assistantMessageId;
      }
    });
  }

  async #ensureChatId() {
    if (this.chatIdValue || !this.chatsUrlValue) return this.chatIdValue;
    try {
      const response = await fetch(this.chatsUrlValue, {
        method: "POST",
        headers: this.#jsonHeaders(),
        credentials: "same-origin",
      });
      if (!response.ok) return this.chatIdValue;
      const data = await response.json();
      if (data?.id) {
        this.chatIdValue = String(data.id);
        dispatchRecentChatsRefresh({ chatId: this.chatIdValue });
      }
    } catch {
      /* ignore network errors, fallback to server auto chat */
    }
    return this.chatIdValue;
  }

  async #maybePollChatTitle() {
    if (
      this.hasChatTitleValue ||
      this.isHistoricalChatValue ||
      this.titlePollStarted ||
      !this.chatIdValue ||
      !this.hasChatTitleUrlValue
    ) {
      return;
    }
    this.titlePollStarted = true;

    const deadline = Date.now() + 20000; // 30s 后超时
    while (!this.hasChatTitleValue && Date.now() < deadline) {
      try {
        const url = new URL(this.chatTitleUrlValue, window.location.origin);
        url.searchParams.set("id", this.chatIdValue);
        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
        });
        if (response.ok) {
          const data = await response.json();
          const title = (data?.title || "").trim();
          if (title) {
            this.hasChatTitleValue = true;
            dispatchRecentChatsRefresh({ chatId: this.chatIdValue, title });
            return;
          }
        }
      } catch {
        /* ignore */
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000)); // 2s 后重试
    }
  }

  #stripOneShotMessageFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("message") && !url.searchParams.has("q")) return;
      url.searchParams.delete("message");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch {
      /* ignore */
    }
  }

  #jsonHeaders() {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    const token = this.#csrfToken();
    if (token) headers["X-CSRF-Token"] = token;
    return headers;
  }

  #csrfToken() {
    return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || "";
  }

  #syncClearButtonVisibility() {
    if (!this.hasClearButtonTarget) return;
    const historySize = Array.isArray(this.chatHistory) ? this.chatHistory.length : 0;
    const hasChat = Boolean(this.chatIdValue) || historySize > 0;
    this.clearButtonTargets.forEach((btn) => {
      btn.classList.toggle("hidden", !hasChat);
    });
  }

  #appendCompletionText(content, completionText) {
    const base = (content || "").trimEnd();
    const tail = (completionText || "").trim();
    if (!tail) return base;
    if (!base) return tail;
    return `${base}\n\n${tail}`;
  }

  escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  startTimeoutTimer() {
    if (!this.hasTimeoutValue) return;
    this.timeoutTimer = setTimeout(() => {
      if (!this.currentRound) return;
      const idx = this.chatHistory.indexOf(this.currentRound);
      if (idx < 0) return;
      this.#handleStreamError(this.messagesValue.timeout_error, idx);
    }, this.timeoutValue * 1000);
  }

  clearTimeoutTimer() {
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
  }

  resetTimeoutTimer() {
    this.clearTimeoutTimer();
    this.startTimeoutTimer();
  }

  scrollToBottom(force = false) {
    const shouldScroll = force || this.shouldAutoScroll || this.isStreaming;
    if (!shouldScroll) return;

    const run = () => {
      const scrollEls = this.hasMessagesScrollTarget
        ? this.messagesScrollTargets
        : this.messagesTargets;

      scrollEls.forEach((el) => {
        el.scrollTop = el.scrollHeight;
      });
    };

    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  }

  get url() {
    return this.hasUrlValue ? this.urlValue : null;
  }

  get retryButton() {
    if (this.hasRetryButtonTarget) return this.retryButtonTarget;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "btn btn-ghost btn-xs btn-square align-middle text-base-content/70";
    button.innerHTML = '<i class="ri-refresh-line leading-none" aria-hidden="true"></i>';
    return button;
  }
}
