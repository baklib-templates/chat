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
