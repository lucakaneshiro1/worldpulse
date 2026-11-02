# 寰球视野 · WorldPulse

一个带左侧栏入口的 DSH Web 插件：实时全球新闻、国际局势研判、以及可执行的旅行路线规划。

## 功能

- **全球快讯**：并行聚合 France 24、Sky News、NPR、UN News、Fox News、中国新闻网、CGTN 的公开 RSS，并用实时搜索补充；按地区与议题筛选，保留原始信源链接。
- **局势研判**：从新闻标题与摘要中识别热点、地区热度、议题结构，生成风险仪表盘、安全/经济/气候观察与未来 72 小时关注清单。
- **行程规划**：输入出发城市、目的地、天数、预算、节奏与偏好，生成逐日路线、天气窗口、预算区间、行李与安全提示。对高风险/战乱地区默认拦截，并给出同区域替代目的地。
- **机票与住宿建议**：按出发地/目的地估算飞行时长、直飞/中转方案与参考票价；给出住宿区域、适合人群、通勤与预订提示。
- **交通与常用软件**：机场进城方式、当地交通卡/打车/铁路建议，以及目的地常用的地图、打车、购票、翻译与上网 App。
- **全平台比价入口**：Google Flights、Skyscanner、Kayak、去哪儿、携程、飞猪、Booking、Agoda、Airbnb、Google Hotels 等一键跳转。
- **双语界面**：中文优先，可切换 English；偏好保存在本地。
- **自动刷新**：新闻与研判每 5 分钟刷新一次；也可手动刷新。

## 数据与边界

- 新闻标题、摘要与发布时间来自公开 RSS 与搜索服务；插件不抓取付费墙内容，摘要只用于索引，阅读全文请回到原始信源。
- 天气与地理编码来自 [Open-Meteo](https://open-meteo.com/)（无需 API Key）。
- **机票、住宿、交通和平台价格为参考区间，不是实时库存或报价**；插件不代订、不收款。实际价格、余票、退改与签证要求以下单页和官方渠道为准。
- 风险分级是**机器辅助提示**，不是官方安全评估。出行前请以中国领事服务网、目的地使领馆、当地官方通告与专业旅行保险建议为准。
- 高风险名单会随局势变化调整；插件优先保证“不把用户送进明显战乱地区”，但不能替代实时现场判断。

## 安装

### 从 npm 安装（公开发布）

```powershell
npm install dsh-worldpulse
```

包名：`dsh-worldpulse`。安装后在 DSH 的插件安装入口选择该 bundle，或在插件目录中加载它。

### 从本地目录安装

```powershell
# 在 DSH 插件管理器中指向本目录
C:\Users\杨苗煜\Documents\deepseek-harness\default-workspace\worldpulse
```

安装后左侧栏出现「寰球视野」图标，点击进入即可。

## 开发

- `index.js`：Host 半，注册 `/worldpulse/api/health|news|briefing|plan` 四个同源 JSON 路由，使用 DSH 的 `ctx.web` 访问实时网络。
- `client.js`：Client 半，自包含 React 模块，注册 `sidebar.panellist` 与 `main` 的 `worldpulse` 槽位，不依赖 Harness 内部 UI 包。

```powershell
node --check .\index.js
node --check .\client.js
```
