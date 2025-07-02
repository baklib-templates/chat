import { marked } from "marked";
import { Controller } from "@hotwired/stimulus";

// 配置 marked 使所有链接在新窗口打开
marked.setOptions({
  renderer: new marked.Renderer(),
});

marked.use({
  renderer: {
    link({ href, text }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  }
});

export default class extends Controller {
  static targets = ["content"];

  connect() {
    this.render();
  }

  render() {
    if (!this.hasContentTarget) return;

    const content = this.contentTarget.textContent;
    if (!content) return;

    const html = marked(content);
    this.contentTarget.innerHTML = html;
  }
}
