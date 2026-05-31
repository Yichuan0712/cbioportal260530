# 3D Structure Viewer Sandbox

从 cBioPortal Mutation Mapper 中**原样提取**的 3D Structure 浮层面板，用于独立开发和后续 AlphaFold 集成（见仓库根目录 `our_goal.md`）。

**未修改** cBioPortal 主项目任何文件；所有代码位于 `structure-viewer-sandbox/` 目录。

## 目录结构

| 目录 | 说明 |
|------|------|
| **`portable-to-cbioportal/structureViewer/`** | **可拷回主项目的 7 个核心文件（只改这里）** |
| `portable-to-cbioportal/copy-back.ps1` | 一键同步到 `cbioportal-frontend` |
| `src/App.tsx` | demo 壳，不要拷回 |
| `src/mocks/` | 假数据，不要拷回 |
| `src/shared/cache/` | Mock 缓存，不要拷回 |

## 同步到主项目

```powershell
# 在仓库根目录执行
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

## 快速开始

```bash
cd structure-viewer-sandbox
npm install
npm run dev
```

> 若 `npm install` 遇到 peer dependency 冲突，项目已包含 `.npmrc`（`legacy-peer-deps=true`）。

浏览器打开 Vite 提示的本地地址（默认 `http://localhost:5173`）。

## Mock 数据说明

默认已接 **SOX9**，数据来自 **cBioPortal.org + g2s.genomenexus.org + v1.genomenexus.org**（与官网相同公网后端）：

- **3D 着色**：全部映射突变（与 Mutation Mapper 3D 面板逻辑一致；不含 Driver/VUS 表格 UI）
- **突变**：按 study 解析 profile 后 fetch（默认 pan-cancer study 列表，可用 `VITE_CBIOPORTAL_STUDY_IDS` 覆盖）
- **不自动选中位点**（无默认黄色侧链）

回退 mock：`VITE_USE_MOCK_DATA=true` 和/或 `VITE_USE_MOCK_MUTATIONS=true`。

## 后续改造建议

1. 在 `StructureViewerPanel` 外包一层，用扁平 props 替代 Store 依赖
2. 在 `StructureVisualizer3D.loadPdb()` 旁增加 AlphaFold mmCIF 加载
3. 验证通过后再回灌 `cbioportal-frontend`

## 技术栈

React 17 · MobX 6 · 3Dmol.js · Bootstrap 3 · Vite
