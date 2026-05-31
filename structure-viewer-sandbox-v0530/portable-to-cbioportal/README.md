# 可直接拷回 cBioPortal 的代码

**只改这个文件夹里的文件。** 沙箱 demo（`App.tsx`、mock、按钮布局等）不要拷回主项目。

## 目录对应关系

```
portable-to-cbioportal/structureViewer/
    ↓ 整文件夹覆盖
cbioportal-frontend/src/shared/components/structureViewer/
```

## 一键同步到主项目（Windows）

在仓库根目录执行：

```powershell
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

或手动复制：

```powershell
Copy-Item -Recurse -Force `
  structure-viewer-sandbox\portable-to-cbioportal\structureViewer\* `
  cbioportal-frontend\src\shared\components\structureViewer\
```

## 包含文件

| 文件 | 说明 |
|------|------|
| `StructureViewerPanel.tsx` | 3D 浮层面板 UI |
| `StructureViewer.tsx` | React 容器 |
| `StructureVisualizer3D.ts` | 3Dmol 渲染 |
| `StructureVisualizer.ts` | 样式枚举与基类 |
| `PyMolScriptGenerator.ts` | PyMol 脚本导出 |
| `PdbResidueUtils.ts` | 残基映射工具 |
| `structureViewer.module.scss` | 面板样式 |

## 拷回后请在主项目验证

1. 启动 cBioPortal frontend（`:3000`）
2. 打开 Mutation Mapper → **View 3D Structure**
3. 确认 G2S / PDB 数据仍正常（沙箱 mock 不会一起过去）

## 不要拷回的内容

- `structure-viewer-sandbox/src/App.tsx` — demo 页面
- `structure-viewer-sandbox/src/mocks/` — 假数据
- `structure-viewer-sandbox/src/shared/cache/` — mock 缓存
- `structure-viewer-sandbox/src/commons/` — 精简 stub
