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
import HeaderSearchController from "./header_search_controller"
import TocController from "./toc_controller"
import ImagesViewerController from "./images_viewer_controller"
import LinkTargetController from "./link_target_controller"
import ClipboardController from "./clipboard_controller"
import CopyPageController from "./copy_page_controller"
import PageToolsController from "./page_tools_controller"

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
application.register("header-search", HeaderSearchController)
application.register("toc", TocController)
application.register("images-viewer", ImagesViewerController)
application.register("link-target", LinkTargetController)
application.register("clipboard", ClipboardController)
application.register("copy-page", CopyPageController)
application.register("page-tools", PageToolsController)
