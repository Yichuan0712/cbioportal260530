# 3D Structure Viewer Sandbox

独立开发 cBioPortal Mutation Mapper **3D Structure** 浮层面板的沙箱。  
**不会**自动部署到 cBioPortal 官网；要上线需把 `portable-to-cbioportal/structureViewer/` 拷回 `cbioportal-frontend`（见文末）。

默认对齐 [MSK Impact 50k + SOX9 的官网 Mutations 页](https://www.cbioportal.org/results/mutations?cancer_study_list=msk_impact_50k_2026&case_set_id=msk_impact_50k_2026_all&mutations_transcript_id=ENST00000245479&mutations_gene=SOX9)：**SOX9** / **NM_000346** / **ENST00000245479** / study **`msk_impact_50k_2026`**。PDB 3D 的链名仍可能显示 **SOX17**（G2S 自动选链，与官网相同现象）。

---

## 环境要求

| 项 | 说明 |
|----|------|
| **Node.js** | 建议 18+（能跑 Vite 5 即可） |
| **npm** | 与 Node 自带版本配套 |
| **网络** | 默认模式需访问 cBioPortal.org、Genome Nexus、AlphaFold EBI |
| **本地 G2S**（可选） | 默认走 `https://localhost:5443`；未启动时 PDB 链可能为空，仍可用 AlphaFold |

---

## 启动步骤

在仓库根目录打开终端（PowerShell 或 bash 均可）：

```powershell
cd structure-viewer-sandbox
npm install
npm run dev
```

首次 `npm install` 若报 peer dependency 冲突，项目已含 `.npmrc`（`legacy-peer-deps=true`），一般直接重试即可。

浏览器打开：**http://localhost:5173**（Vite 固定端口 5173，`strictPort: true`）。

### 页面上怎么用

1. 等待顶部 **Initializing… / Loading…** 结束  
2. 左侧为 **demo meta 列**（转录本、Driver/VUS filter、突变频率等——仅沙箱，不拷回主项目）  
3. 点击 **View 3D Structure** 打开 3D 浮层  
4. 在面板里可选 **PDB / AlphaFold**、着色模式、PyMol 导出等  

### 其它命令

```powershell
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览 build 产物
npm run test     # Vitest 单测（AlphaFold / 突变密度等 utils）
```

---

## 数据从哪来（默认 vs Mock）

### 默认（推荐）：公网 + 可选本地 G2S

| 数据 | 来源 |
|------|------|
| 突变 | cBioPortal REST（经 Vite 代理 `/cbioportal-api`） |
| 转录本 / variant annotation | Genome Nexus（`/genomenexus-api`） |
| PDB 对齐 | 本地 G2S（`/g2s-api` → `localhost:5443`），失败时链列表可能为空 |
| AlphaFold | EBI（开发环境走 `/alphafold-files`、`/alphafold-api` 代理） |

默认仅 **`msk_impact_50k_2026`** 拉 SOX9 突变（live 约 **1354** 条，与官网 API 一致）。沙箱无 OQL / 结构变异；左栏 Driver 过滤为 demo。

### Mock：完全离线

复制 `.env.example` 为 `.env.local`（或 `.env.development`），例如：

```env
VITE_USE_MOCK_DATA=true
VITE_USE_MOCK_MUTATIONS=true
```

- `VITE_USE_MOCK_DATA=true`：G2S / PDB 用 fixtures  
- `VITE_USE_MOCK_MUTATIONS=true`：突变用 fixtures  

---

## 常用环境变量

见 `.env.example`。摘要：

| 变量 | 作用 |
|------|------|
| `VITE_HUGO_GENE` | 默认 `SOX9` |
| `VITE_CBIOPORTAL_STUDY_IDS` | 默认 `msk_impact_50k_2026` |
| `VITE_REFSEQ_TRANSCRIPT` | 默认 `NM_000346` |
| `VITE_PREFERRED_PDB` | 留空 = 与官网一样自动选 G2S 排名第一的链（勿设 `4euw` 除非要对 SOX9 PDB） |
| `VITE_USE_MOCK_DATA` | `true` = mock G2S/PDB |
| `VITE_USE_MOCK_MUTATIONS` | `true` = mock 突变 |

开发代理在 `vite.config.ts` 的 `server.proxy` 中配置，一般无需改。

---

## 目录说明

| 路径 | 说明 |
|------|------|
| **`portable-to-cbioportal/structureViewer/`** | **可拷回主项目的 3D 模块**（只在这里改 3D 核心） |
| `portable-to-cbioportal/copy-back.ps1` | 一键覆盖到 `cbioportal-frontend/.../structureViewer/` |
| `portable-to-cbioportal/sync-from-official.ps1` | 从官方拉最新 structureViewer 到 portable（防 drift） |
| `src/App.tsx` | 沙箱 demo 壳，**不要**拷回 |
| `src/components/SandboxMutationMetaColumn.tsx` | 左侧 filter demo，**不要**拷回 |
| `src/store/`、`src/mocks/`、`src/commons/` | 沙箱专用 stub / mock |

`structure-viewer-sandbox-v0530/` 为只读归档，勿修改。

---

## 与官网的差异（预期行为）

- **突变来源**默认已与上述 MSK 50k + SOX9 链接对齐；左栏 **Driver/VUS 过滤** 仍为沙箱 demo。  
- **PDB 链名**可能与官网一样出现 **SOX17**（查询基因仍是 SOX9）；**AlphaFold** 应为 **SOX9 / P48436**。  
- 官网 Results 含 **structural variants** 等 profile；沙箱只拉 **mutation** profile。

---

## 拷回 cBioPortal 主项目

在**仓库根目录**：

```powershell
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

然后在 `cbioportal-frontend` 启动主站，打开 Mutation Mapper → **View 3D Structure** 验证。

---

## 常见问题

**端口 5173 被占用**  
关闭占用进程，或临时改 `vite.config.ts` 里 `server.port`（同时改 `strictPort`）。

**一直 Loading / 报错**  
- 检查网络能否访问 cbioportal.org、genomenexus.org  
- 本地 G2S 未起：可忽略 PDB 部分，或设 mock；AlphaFold 仍可用  

**和官网颜色不完全一样**  
沙箱用独立突变源与 demo filter；对比 3D 请以 **copy-back 后在主项目** 同一查询为准。

---

## 技术栈

React 17 · MobX 6 · 3Dmol.js · Bootstrap 3 · Vite 5 · Vitest
