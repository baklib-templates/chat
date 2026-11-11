# Wiki Chat (`chat`)

English | [简体中文](README.zh-CN.md)

This is a conversation site projected from a wiki knowledge base. Use it for support chat and knowledge Q&A. Do not use it for long-form product docs or a FAQ help center.

Read `docs/` in this order. The rest of this file is the feature list and build notes, not the content model. The docs are in Chinese.

| File | Read it to learn |
| --- | --- |
| [docs/README.md](docs/README.md) | Index of the docs |
| [docs/overview.md](docs/overview.md) | What it is, and when to use it |
| [docs/structure.md](docs/structure.md) | Home variants and how pages relate |
| [docs/schema.md](docs/schema.md) | Field ids, and which ones are writable |
| [docs/usage.md](docs/usage.md) | How to set the site up |
| [docs/activation.yml](docs/activation.yml) | Get-started arrangement recipe |

## Features

- **Welcome home** — Hero, popular prompts, and inline chat input; questions start a new AI session
- **Chat workspace** — Streaming answers, source citations, PiP pop-out, optional session delete
- **Docs alongside chat** — Left sidebar for New Chat, knowledge-base entry, and recent sessions; `page.liquid` for full doc reading with nav tree and search modal
- **AI & search** — Header search with preview, configurable assistant name and post-AI footer text
- **Seven locales** — Runtime UI (`*.json`) and theme-editor copy (`*.schema.json`)
- **Frontend stack** — Tailwind CSS 4, daisyUI, Stimulus, Alpine.js, Turbo (built from `src/` into `assets/`)

## Requirements

- Node.js (for `yarn build` / `yarn dev`)
- Baklib site on **Wiki** scope with this theme installed

## Project layout

| Path | Purpose |
| --- | --- |
| `config/settings_schema.json` | Theme metadata, global settings, preview image paths |
| `layout/` | Base layouts (`theme.liquid`, `error.liquid`) |
| `templates/` | Welcome home, doc page, tag list, search, feedback Turbo Streams |
| `snippets/` | Shared chrome; `_chat_workspace.liquid`, `_left_sidebar.liquid`, `_recent_chats.liquid`, AI/search partials |
| `statics/` | Chat session, recent chats, nav tree, search preview, and other Liquid endpoints |
| `locales/` | Storefront strings (`*.json`) and editor labels (`*.schema.json`) |
| `src/` | Source CSS/JS (Tailwind CLI, esbuild) |
| `assets/` | Built stylesheets, scripts, and preview screenshots |

## Templates

### Home

`templates/index.welcome.liquid` — set as the site home template in Baklib.

Welcome hero, configurable popular prompts (one per line), chat input, and disclaimer. Submitting a question or clicking a prompt creates a session and navigates to the chat static endpoint.

Home settings include `welcome_title`, `welcome_description`, `popular_searches`, `chat_input_placeholder`, and `chat_disclaimer`.

### Documentation page

`templates/page.liquid` — knowledge-base content pages with left nav tree, document search modal (⌘K), Turbo frame content area, page tools, and feedback.

### Other

| File | Role |
| --- | --- |
| `templates/search.liquid` | Search route; starts a chat session from a query |
| `templates/tag.liquid` | Tag browsing with sidebar tag list |
| `templates/feedback_*_turbo_stream.liquid` | Turbo Stream responses for in-page feedback |
| `statics/chat.liquid` | Active chat session (renders `_chat_workspace`) |
| `statics/recent_chats.liquid` | Recent session list for the left sidebar |
| `statics/search_preview.liquid` | Search result preview for the header modal |
| `statics/nav_tree.liquid` | Nav tree static endpoint |

## Locales

Shipped for storefront and schema:

`en` · `zh-CN` · `zh-TW` · `ko` · `ja` · `de` · `fr`

Edit `locales/<locale>.json` (UI) and `locales/<locale>.schema.json` (editor). Register new languages under `theme_info.theme_languages` in `config/settings_schema.json`.

## Build

```bash
yarn install
yarn build
```

Development (watch CSS/JS):

```bash
yarn dev
```

Optional live reload for Liquid/locale edits (Ruby + `guard-livereload` from `Gemfile`):

```bash
bundle install
yarn livereload
```

## Preview images

**Theme card thumbnail** (all languages):

```text
assets/images/theme/thumb.png
```

**Preview screenshots** — configured in `config/settings_schema.json` (`theme_preview_images`):

```text
assets/images/theme/
├── index.webp
├── chat.webp
└── list.webp
```

Optional per-locale screenshots may be placed under `assets/images/theme/<lang>/` for marketing or admin use; paths are resolved via `theme_thumb_url` and `theme_preview_images` in `config/settings_schema.json`.

## Documentation

- Theme guide: <https://help.baklib.cn/themes/docs>
- Settings reference: <https://help.baklib.cn/themes/docs/settings>
- Template development: <https://dev.baklib.cn/guide/git>

## License

See [LICENSE](LICENSE) (or the parent repository if no `LICENSE` file is present).
