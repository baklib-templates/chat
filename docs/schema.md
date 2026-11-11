# 字段

以设置项的 `id` 为准。界面上的中文来自语言包，改文案不会改字段名。

## 全站

| id | 类型 | 作用 |
| --- | --- | --- |
| `site_description` | 文本 | 站点副标题 |
| `company_name` | 文本 | 公司名称 |
| `robot_name` | 文本 | 机器人名称 |
| `ai_search_completed_text` | HTML | AI 回答底部提示 |
| `kb_menu_label` | 文本 | 知识库菜单名称 |
| `chat_delete_enabled` | 开关 | 允许删除对话 |
| `left_sidebar_width` | 范围 | 左侧栏宽度 |
| `header_height` | 范围 | 顶栏高度 |
| `copyright` | 文本 | 备案或版权 |
| `service_term_url` | 文本 | 服务条款链接 |
| `privacy_policy_url` | 文本 | 隐私政策链接 |
| `show_published_at` | 开关 | 显示发布时间 |
| `show_author` | 开关 | 显示作者 |
| `feedback_enabled` | 开关 | 打开页面反馈 |
| `show_page_tools_dropdown` | 开关 | 显示页面工具菜单 |
| `feedback_helper_text` | 多行文本 | 反馈调查说明 |
| `head_html` | HTML | 写入 `<head>` |

## 首页 `index.welcome`

子页面用 `page`。

| id | 类型 | 作用 |
| --- | --- | --- |
| `welcome_title` | 文本 | 欢迎标题 |
| `welcome_description` | 多行文本 | 欢迎描述 |
| `popular_searches` | 多行文本 | 热搜问题，一行一个 |
| `popular_searches_label` | 文本 | 热搜区标题 |
| `chat_input_placeholder` | 文本 | 输入框占位 |
| `chat_disclaimer` | 文本 | 输入框下方说明 |

## 正文页 `page`

子页面也用 `page`。

| id | 类型 | 能否改 | 作用 |
| --- | --- | --- | --- |
| `show_list` | 开关 | 可写 | 作为栏目页，列出子页面 |
| `icon` | 图片 | 可写 | 页面图标 |
| `title` | 文本 | 只读 | 来自知识库文章标题 |
| `description` | 多行文本 | 可写 | 摘要 |
| `tags` | 标签 | 可写 | 页面标签 |
| `thumb_image_url` | 图片 | 可写 | 封面图 |
| `content` | 富文本 | 只读 | 来自知识库正文 |

`search`、`tag`、`feedback_*` 没有设置项。
