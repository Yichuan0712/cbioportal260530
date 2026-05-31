# 3D Structure Viewer Sandbox

从 cBioPortal Mutation Mapper 中**原样提取**的 3D Structure 浮层面板，用于独立开发和后续 AlphaFold 集成（见仓库根目录 `our_goal.md`）。

**未修改** cBioPortal 主项目任何文件；所有代码位于 `structure-viewer-sandbox/` 目录。

## 包含内容

| 目录 | 说明 |
|------|------|
| `src/shared/components/structureViewer/` | 浮层面板 + 3Dmol 渲染（从上游拷贝） |
| `src/shared/cache/` | Mock 版 `PdbHeaderCache` / `ResidueMappingCache` |
| `src/mocks/fixtures.ts` | 静态测试数据（默认 4u4a / BRCA1） |
| `src/commons/` | 精简版 `DefaultTooltip` 等 UI 依赖 |

## 快速开始

```bash
cd structure-viewer-sandbox
npm install
npm run dev
```

> 若 `npm install` 遇到 peer dependency 冲突，项目已包含 `.npmrc`（`legacy-peer-deps=true`）。

浏览器打开 Vite 提示的本地地址（默认 `http://localhost:5173`）。

## Mock 数据说明

- **PDB 结构**：3Dmol 从 RCSB 在线加载 `4u4a`（需网络）
- **PDB 标题 / 链信息**：`src/mocks/fixtures.ts` 中的 `PDB_HEADER_4U4A`
- **突变映射**：默认 `EMPTY_RESIDUE_MAPPINGS`，会显示与线上一致的红色警告

要演示突变着色，在 `src/App.tsx` 中将 `SHOW_MAPPED_MUTATIONS` 改为 `true`。

## 后续改造建议

1. 在 `StructureViewerPanel` 外包一层，用扁平 props 替代 Store 依赖
2. 在 `StructureVisualizer3D.loadPdb()` 旁增加 AlphaFold mmCIF 加载
3. 验证通过后再回灌 `cbioportal-frontend`

## 技术栈

React 17 · MobX 6 · 3Dmol.js · Bootstrap 3 · Vite
