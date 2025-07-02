import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "button"]

  connect() {
    this.loading = false
    this.hasScrolled = false
    this.lastLoadTime = 0
    this.throttleDelay = 500 // 500ms

    this.handleScrollBound = this.handleScroll.bind(this)

    // 延迟添加滚动监听，避免页面加载时触发
    setTimeout(() => {
      window.addEventListener('scroll', this.handleScrollBound)
    }, 1000)
  }

  disconnect() {
    window.removeEventListener('scroll', this.handleScrollBound)
  }

  handleScroll() {
    if (this.loading) return

    const now = Date.now()
    if (now - this.lastLoadTime < this.throttleDelay) return

    this.hasScrolled = true

    const rect = this.containerTarget.getBoundingClientRect()
    const distanceToBottom = rect.bottom - window.innerHeight
    if (this.hasScrolled && distanceToBottom <= 200) {
      this.lastLoadTime = now
      this.loadMore()
    }
  }

  async loadMore() {
    if (this.loading) return

    this.loading = true
    const button = this.buttonTarget
    button.classList.add('opacity-50')

    try {
      const url = button.dataset.loadMoreUrlValue
      const response = await fetch(url)
      const html = await response.text()

      // 解析返回的 HTML
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // 获取新内容并直接追加
      const newContent = doc.querySelector(`#${this.containerTarget.id}`)
      this.containerTarget.insertAdjacentHTML('beforeend', newContent.innerHTML)
      const nextButton = doc.querySelector("#load-more");
      if (nextButton) {
        const nextPageUrl = nextButton.getAttribute("data-load-more-url-value");
        this.buttonTarget.setAttribute("data-load-more-url-value", nextPageUrl);
      } else {
        this.buttonTarget.remove(); // No more pages, remove the button
        window.removeEventListener('scroll', this.handleScrollBound)
      }
    } catch (error) {
      console.error('Error loading more content:', error)
    } finally {
      this.loading = false
      if (document.body.contains(button)) {
        button.classList.remove('opacity-50')
      }
    }
  }
}
