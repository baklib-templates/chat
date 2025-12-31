import "@hotwired/turbo";
import Alpine from "alpinejs";
import videoPlayer from "./video_player";
import { tns } from "tiny-slider";
import './controllers';
window.tns = tns;

Alpine.data("videoPlayer", videoPlayer);
window.Alpine = Alpine;

Alpine.start();

(function () {
  // 定义 themeSwitcher class，用于切换主题
  class ThemeSwitcher {
    toggleTheme(name) {
      // console.log("toggleTheme", name)
      if (name === "dark" || name === "light") {
        document.documentElement.dataset.theme = name;
        localStorage.theme = name;
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      }
    }

    get storedTheme() {
      const theme = localStorage.theme;
      if (theme === "dark" || theme === "light") {
        return theme;
      }
      return null;
    }

    init() {
      // console.log("init theme switcher", this.storedTheme)
      const theme = this.storedTheme;
      if (theme) {
        this.toggleTheme(theme);
      }
      document
        .querySelectorAll(
          'input.theme-controller[type="checkbox"][value="dark"]',
        )
        .forEach((controller) => {
          controller.checked = this.storedTheme === "dark";
          this.mount(controller);
        });
    }

    mount(controller) {
      // console.log("mount theme controller")
      controller.addEventListener("click", (e) => {
        // console.log("click theme controller")
        localStorage.theme = e.target.checked ? "dark" : "light";
        this.toggleTheme(localStorage.theme);
      });
      const theme = this.storedTheme;
      if (theme) {
        this.toggleTheme(theme);
        controller.checked = theme === "dark";
      } else {
        controller.checked = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
      }
    }
  }

  window.themeSwitcher = new ThemeSwitcher();
  window.themeSwitcher.init();
  document.addEventListener("turbo:load", () => {
    window.themeSwitcher.init();
  });
})();

// 历史会话 URL 管理
(function () {
  const STORAGE_KEY = 'last_search_url';
  const SEARCH_PATH = '/-/search';
  const HISTORY_LINK_ID = 'js-history-link';

  /**
   * 检查 URL 是否包含 q 参数
   */
  function hasQueryParam(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.searchParams.has('q');
    } catch (e) {
      return false;
    }
  }

  /**
   * 更新 sidebar 中的历史会话链接（带重试机制）
   */
  function updateHistoryLink(retries = 5) {
    try {
      const historyLink = document.getElementById(HISTORY_LINK_ID);
      
      if (!historyLink) {
        // 如果元素不存在，且还有重试次数，则延迟重试
        if (retries > 0) {
          setTimeout(() => updateHistoryLink(retries - 1), 100);
        }
        return;
      }

      const lastSearchUrl = localStorage.getItem(STORAGE_KEY);
      
      if (lastSearchUrl && lastSearchUrl.startsWith(SEARCH_PATH)) {
        historyLink.setAttribute('href', lastSearchUrl);
        console.log('History link updated to:', lastSearchUrl);
      } else {
        // 如果没有保存的 URL，使用默认的搜索页面
        historyLink.setAttribute('href', SEARCH_PATH);
      }
    } catch (e) {
      console.error('Error updating history link:', e);
    }
  }

  /**
   * 保存历史会话 URL 到 localStorage
   */
  function saveHistoryUrl() {
    try {
      const loc = window.location;
      const isSearchPage = loc.pathname === SEARCH_PATH;
      
      if (isSearchPage) {
        const fullUrl = loc.pathname + (loc.search || '');
        
        // 只保存包含 q 参数的 URL
        if (hasQueryParam(fullUrl)) {
          localStorage.setItem(STORAGE_KEY, fullUrl);
          console.log('History URL saved:', fullUrl);
          // 保存后立即更新链接
          updateHistoryLink();
        }
      }
    } catch (e) {
      console.error('Error saving history URL:', e);
    }
  }

  /**
   * 初始化历史会话功能
   */
  function initHistorySession() {
    // 先更新链接（从 localStorage 读取）
    updateHistoryLink();
    
    // 然后保存当前页面的 URL（如果是搜索页面且包含 q 参数）
    saveHistoryUrl();
  }

  // 页面加载时初始化（立即执行一次，DOMContentLoaded 时再执行一次）
  initHistorySession();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initHistorySession, 50);
    });
  } else {
    setTimeout(initHistorySession, 50);
  }

  // Turbo 导航后重新初始化
  document.addEventListener('turbo:load', () => {
    setTimeout(initHistorySession, 50);
  });

  // Turbo frame 加载后也更新（因为 sidebar 可能在 frame 外）
  document.addEventListener('turbo:frame-load', () => {
    setTimeout(updateHistoryLink, 50);
  });

  // 监听 popstate 事件（浏览器前进/后退）
  window.addEventListener('popstate', () => {
    setTimeout(initHistorySession, 100);
  });

  // 监听 pushState 和 replaceState（手动 URL 变化）
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(() => {
      saveHistoryUrl();
      updateHistoryLink();
    }, 100);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(() => {
      saveHistoryUrl();
      updateHistoryLink();
    }, 100);
  };

  // 定期检查并更新（作为备用机制）
  setInterval(() => {
    updateHistoryLink(0);
  }, 1000);

  /**
   * 同步搜索参数到 chat-leftsidebar 的搜索框
   */
  function syncSearchInputFromStorage() {
    try {
      const searchInput = document.getElementById('js--search-input');
      if (!searchInput) return;

      const lastSearchUrl = localStorage.getItem(STORAGE_KEY);
      if (lastSearchUrl && lastSearchUrl.startsWith(SEARCH_PATH)) {
        try {
          const urlObj = new URL(lastSearchUrl, window.location.origin);
          const qParam = urlObj.searchParams.get('q');
          if (qParam && searchInput.value !== qParam) {
            searchInput.value = qParam;
            console.log('Search input synced from localStorage:', qParam);
          }
        } catch (e) {
          console.error('Error parsing stored URL:', e);
        }
      }
    } catch (e) {
      console.error('Error syncing search input:', e);
    }
  }

  /**
   * 初始化搜索输入框同步
   */
  function initSearchInputSync() {
    syncSearchInputFromStorage();
  }

  // 页面加载时同步搜索框
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initSearchInputSync, 100);
    });
  } else {
    setTimeout(initSearchInputSync, 100);
  }

  // Turbo 导航后同步
  document.addEventListener('turbo:load', () => {
    setTimeout(initSearchInputSync, 100);
  });

  // Turbo frame 加载后同步（chat-leftsidebar 的搜索框在 frame 外）
  document.addEventListener('turbo:frame-load', (event) => {
    if (event.target.id === 'frame--search-results') {
      setTimeout(initSearchInputSync, 100);
    }
  });

  // 定期同步（作为备用机制）
  setInterval(() => {
    syncSearchInputFromStorage();
  }, 2000);
})();
