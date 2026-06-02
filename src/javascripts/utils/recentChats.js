export function dispatchRecentChatsRefresh(detail = {}) {
  document.dispatchEvent(
    new CustomEvent("recent-chats:refresh", { bubbles: true, detail }),
  );
}
