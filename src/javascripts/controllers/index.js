import { Application } from "@hotwired/stimulus"
import LoadMoreController from "./load_more_controller"
import NavTreeController from "./nav_tree_controller"
import TurboNavTreeController from "./turbo_nav_tree_controller"
import MarkdownRendererController from "./markdown_renderer_controller"
import AiSearchCompletionController from "./ai_search_completion_controller"
import MarkdownController from "./markdown_controller"
import CopyButtonController from "./copy_button_controller"
import AiPipController from "./ai_pip_controller"
import WelcomeChatController from "./welcome_chat_controller"

if (!window.Stimulus) {
  window.Stimulus = Application.start()
}
const application = window.Stimulus
application.register("load-more", LoadMoreController)
application.register("nav-tree", NavTreeController)
application.register("turbo-nav-tree", TurboNavTreeController)
application.register("markdown-renderer", MarkdownRendererController)
application.register("ai-search", AiSearchCompletionController)
application.register("markdown", MarkdownController)
application.register("copy-button", CopyButtonController)
application.register("ai-pip", AiPipController)
application.register("welcome-chat", WelcomeChatController)
