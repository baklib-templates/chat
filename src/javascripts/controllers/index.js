import { Application } from "@hotwired/stimulus"
import LoadMoreController from "./load_more_controller"
import NavTreeController from "./nav_tree_controller"
import MarkdownRendererController from "./markdown_renderer_controller"

if (!window.Stimulus) {
  window.Stimulus = Application.start()
}
const application = window.Stimulus
application.register("load-more", LoadMoreController)
application.register("nav-tree", NavTreeController)
application.register("markdown-renderer", MarkdownRendererController)
