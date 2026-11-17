# M5.4 知识库与图标扩充 · 2026-11-17

目标：把技术/品牌知识库扩到 200+，补常用与小众图标，并让生成器主动拒绝非法 kind、重复 ID 与别名冲突。

## 规模

| 项 | 之前 | 现在 |
|---|---|---|
| `knowledge/tech.json` 条目 | 114 | **212** |
| 品牌图标（Iconify logos） | 123 | **167** |
| 分类 | 11 | 11 |
| 规范层 | 10 | 10 |

- 新增技术覆盖：Express/Fastify/Koa/Hono、Drizzle/TypeORM/Sequelize/Kysely/Knex、DuckDB/Neo4j/InfluxDB/Pinecone/Weaviate/Qdrant、Airflow/Dagster/Prefect/dbt/Spark/Flink、Helm/Envoy/Argo/Jenkins/Pulumi、OpenTelemetry/Splunk/Loki/Jaeger、Keycloak/Vault/Snyk/SonarQube、OAuth/OIDC/JWT/SAML/NextAuth、pnpm/Yarn/npm/Nx/Turborepo/Biome、PayPal/Square/Paddle/Resend/Segment/Mixpanel/Amplitude、Zoom/Daily/Google Calendar/Outlook/Calendly/Cal.com 等。
- 新增图标包含 Express、Nx、Drizzle、Hono、Fastify、Koa、pnpm/Yarn/npm、Turborepo、Helm、Envoy、Argo、Jenkins、Pulumi、OpenTelemetry（紧凑图标）、Splunk、Vault、Snyk、SonarQube、PayPal、Square、Resend、Segment、Mixpanel、Amplitude、PagerDuty、LaunchDarkly、Temporal、dbt、Airflow、Spark、Databricks、Neo4j、InfluxDB、Pinecone、Weaviate、Qdrant、Strapi、TypeORM、Sequelize、Zoom、Daily、Linear、Jira、Confluence。

## 校验

`scripts/gen-knowledge.mjs` 现在会拒绝：

- 未知 category、未知 layer；
- 未知 kind（对照 core 的 17 个已知 kind）；
- 重复技术 ID；
- 归一化后重复的 ID/名称/别名（跨条目别名冲突）。

`scripts/gen-brands.mjs` 也增加品牌 ID/名称/别名冲突检查。启用后立即发现 `nextjs-icon` 与重复的 `nextjs` 条目冲突，已移除重复条目；品牌数从 168 变为 **167**，不再静默保留两个同名入口。

生成文件：

- `knowledge/tech.json` 约 45KB；
- `viewer/src/brands.generated.ts` 约 577KB；
- 单文件 HTML 约 2.2MB（仍离线）。

## 视觉抽样

用 8 个节点的 Brand QA 图验证：

```text
express, nx, drizzle, opentelemetry-icon, prisma, postgresql, stripe, nextjs-icon
```

- Nx、Drizzle、OpenTelemetry、Prisma、PostgreSQL、Stripe、Next.js 图标清晰。
- OpenTelemetry 使用 `opentelemetry-icon` 紧凑标记，不再显示宽字标。
- 宽字标按 2.5:1 以上放大绘制槽；Stripe 可读。
- **Express 仍是官方宽字标**，在 fit 缩放下约 5px 高、偏小；放大后可读。没有合适的紧凑官方符号，暂不做字母替代；记录为已知视觉边界，后续可考虑手工紧凑标记。

## 回归

- `npm run gen:brands`：167 个，冲突检查通过。
- `npm run gen:knowledge`：212 个，kind/ID/别名检查通过。
- `npm run test:brands`：Express/Nx/Drizzle/Prisma/PostgreSQL/OpenTelemetry 解析通过。
- 29 项核心测试、typecheck、build、CLI、test:hosts、test:package、原版 browser-check、脱敏扫描通过。
- 前端/后端/Cal.com 图使用新技术栈时不再缺少品牌回退。

## 边界

- 212 条是分类提示，不是逐条官方事实认证；分类/层/kind 是候选，不是唯一部署关系。
- 167 个图标未逐个视觉验收；本轮抽样 8 个关键项。
- 商标归各品牌所有，CC0 只覆盖图标素材；开源说明仍需保留“仅用于识别”的声明。
- 未增加新的品牌法律审查或图标下载网络依赖；仍由构建期生成、提交生成文件。

## 下一步

M5.5：公开仓库、按脱敏清单复核、发布 v0.4.0；发布前把本节纳入验收记录。
