# 知识问答助手建站技能


## Agent 能力协议 v2

以对话检索和回答授权知识，缺少资料时明确说明。

- 采用 `chat` 的实际数据模型。层级：page。正文语义字段为 `content`，以当前页面 schema 为准。
- 配置和内容优先；需要改变布局时，复制官方固定版本为组织模板，在独立候选中改代码，真实预览及模型检查通过后采用。不得修改公共模板、绕过只读来源或鉴权。
- 设计回退只恢复设计，保留当前 CMS / 知识库 / 资源 / 社区人工内容。
- 首次只建当前语言；缺少真实内容时显示准确空状态，不自动把示例作为客户事实。
- 事实边界：没有知识来源时不能虚构答案，AI 需实际配置。
- 资料、栏目、内容和媒体必须保留可追溯的真实来源；停止和重试不得重复创建。

## Agent v2 实际写入接口

本节优先于早期示例：默认创建空基础站点，不自动灌入行业示例或虚构客户数据。
公共字段由 `configure_site` 按真实类型写入：site_description、company_name、robot_name、kb_menu_label、left_sidebar_width、header_height、copyright、service_term_url、privacy_policy_url、show_published_at、show_author、feedback_enabled、show_page_tools_dropdown、feedback_helper_text。
`seed_content` 的 `fields` 接收当前页声明的真实字段 JSON；枚举必须是已有选项，依赖 `$site` 的选项先在公共设置中配置。
素材先用 `find_assets` 查询当前组织，再将返回的 `asset-编号` 写入对应 image_picker/video_picker/dam_picker 字段。图片、视频、音频和下载附件保持正式 DAM 引用；禁止伪造地址。
代码定制先 `read_template` 读完固定版本文件，再 `customize_template` 提交文件候选；后台渲染通过后，`manage_template_design` 经客户确认采用或回退。全部模板都允许该路径，但不能改变专用内容模型、只读来源字段、权限、真实身份、表单契约。
