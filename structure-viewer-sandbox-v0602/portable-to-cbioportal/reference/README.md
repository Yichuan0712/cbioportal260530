# Host reference (not copy-back)

Files here are **snapshots for merge / review**. `copy-back.ps1` does **not** copy them into `cbioportal-frontend`.

| File | Purpose |
|------|---------|
| `MutationMapper.tsx` | Full reference with `indexedVariantAnnotations` wired in `structureViewerPanel` |

After a cBioPortal upgrade, diff your live `MutationMapper.tsx` against this file and re-apply the `structureViewerPanel` block (search for `indexedVariantAnnotations`).

See [../INTEGRATION.md](../INTEGRATION.md).
