# Wiki Chat（`chat`）

[English](README.md) | 简体中文

这是把知识库投影成对话站的模板。适合以提问为入口的知识问答和智能客服。不适合长文产品文档或常见问题列表式帮助中心。

要知道结构、字段和怎么用，按顺序读 `docs/`。本文件后半是构建和更新，不要从那里推断内容模型。

| 文件 | 读它是为了 |
| --- | --- |
| [docs/README.md](docs/README.md) | 分册目录 |
| [docs/overview.md](docs/overview.md) | 是什么、什么场合用 |
| [docs/structure.md](docs/structure.md) | 首页变体和页面关系 |
| [docs/schema.md](docs/schema.md) | 字段 id，以及能不能改 |
| [docs/usage.md](docs/usage.md) | 建站后怎么配 |
| [docs/activation.yml](docs/activation.yml) | 快速开始的编排配方 |

## 特性

- **欢迎首页** — Hero、热门提问与内嵌输入框；提交问题即创建 AI 会话
- **对话工作区** — 流式回答、引用来源、独立窗口（PiP）、可选会话删除
- **文档与对话并存** — 左侧栏新建会话、知识库入口与最近对话；`page.liquid` 提供完整文档阅读、目录树与搜索弹窗
- **AI 与搜索** — 顶栏搜索与预览、可配置助手名称与 AI 回答结束语
- **七种语言** — 前台文案（`*.json`）与主题编辑器文案（`*.schema.json`）
- **前端技术栈** — Tailwind CSS 4、daisyUI、Stimulus、Alpine.js、Turbo（由 `src/` 构建至 `assets/`）

## 环境要求

- Node.js（用于 `yarn build` / `yarn dev`）
- Baklib 站点使用 **Wiki** 范围并安装本主题

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `config/settings_schema.json` | 主题元数据、全局设置、预览图路径 |
| `layout/` | 基础布局（`theme.liquid`、`error.liquid`） |
| `templates/` | 欢迎首页、文档页、标签列表、搜索、反馈 Turbo Stream |
| `snippets/` | 公共片段；含 `_chat_workspace.liquid`、`_left_sidebar.liquid`、`_recent_chats.liquid` 及 AI/搜索相关 partial |
| `statics/` | 对话会话、最近会话、目录树、搜索预览等 Liquid 端点 |
| `locales/` | 前台文案（`*.json`）与编辑器文案（`*.schema.json`） |
| `src/` | 源码 CSS/JS（Tailwind CLI、esbuild） |
| `assets/` | 构建产物与预览截图 |

## 模板

### 首页

`templates/index.welcome.liquid` — 在 Baklib 后台设为站点首页模板。

欢迎 Hero、可配置热门提问（每行一条）、对话输入框与免责声明。提交问题或点击热门提问会创建会话并跳转至对话静态端点。

首页设置包括 `welcome_title`、`welcome_description`、`popular_searches`、`chat_input_placeholder`、`chat_disclaimer`。

### 文档页

`templates/page.liquid` — 知识库内容页，含左侧目录树、文档搜索弹窗（⌘K）、Turbo 正文区、页面工具与反馈。

### 其他

| 文件 | 作用 |
| --- | --- |
| `templates/search.liquid` | 搜索路由；根据查询词创建对话会话 |
| `templates/tag.liquid` | 按标签浏览，侧栏展示标签列表 |
| `templates/feedback_*_turbo_stream.liquid` | 页面反馈的 Turbo Stream 响应 |
| `statics/chat.liquid` | 当前对话会话（渲染 `_chat_workspace`） |
| `statics/recent_chats.liquid` | 左侧栏最近会话列表 |
| `statics/search_preview.liquid` | 顶栏搜索弹窗的结果预览 |
| `statics/nav_tree.liquid` | 目录树静态端点 |

## 支持的语言

前台与 schema 已包含：

`en` · `zh-CN` · `zh-TW` · `ko` · `ja` · `de` · `fr`

修改 `locales/<locale>.json`（前台）与 `locales/<locale>.schema.json`（编辑器）。新增语言请在 `config/settings_schema.json` 的 `theme_info.theme_languages` 中登记。

## 构建资源

```bash
yarn install
yarn build
```

开发监听（CSS/JS）：

```bash
yarn dev
```

可选：编辑 Liquid / 文案时自动刷新（需 Ruby，依赖见 `Gemfile`）：

```bash
bundle install
yarn livereload
```

## 预览图

**主题卡片缩略图**（全语言共用）：

```text
assets/images/theme/thumb.png
```

**预览截图** — 在 `config/settings_schema.json` 的 `theme_preview_images` 中配置：

```text
assets/images/theme/
├── index.webp
├── chat.webp
└── list.webp
```

可按需将各语言截图放入 `assets/images/theme/<lang>/`，供运营或后台展示；路径由 `config/settings_schema.json` 的 `theme_thumb_url`、`theme_preview_images` 解析。

## 文档

- 主题使用说明：<https://help.baklib.cn/themes/docs>
- 设置项参考：<https://help.baklib.cn/themes/docs/settings>
- 模板开发指南：<https://dev.baklib.cn/guide/git>

## 许可

见 [LICENSE](LICENSE)（若本目录无 LICENSE 文件，请以父仓库为准）。
