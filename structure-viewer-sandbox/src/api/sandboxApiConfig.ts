/** Local G2S (pdb-alignment-web :5443). Vite proxies /g2s-api -> https://localhost:5443 */
export const G2S_API_BASE =
    import.meta.env.VITE_G2S_URL || '/g2s-api';

/** Public Genome Nexus for canonical transcript + PDB headers. */
export const GENOME_NEXUS_API_BASE =
    import.meta.env.VITE_GENOMENEXUS_URL || '/genomenexus-api';

/** Public cBioPortal REST API (mutations). */
export const CBIOPORTAL_API_BASE =
    import.meta.env.VITE_CBIOPORTAL_URL || '/cbioportal-api';

/**
 * Matches the Mutation Mapper screenshot: SOX9 / NM_000346 / ENST00000245479 (509 aa).
 */
export const SANDBOX_HUGO_GENE =
    import.meta.env.VITE_HUGO_GENE || 'SOX9';

export const SANDBOX_ISOFORM_OVERRIDE_SOURCE =
    import.meta.env.VITE_ISOFORM_OVERRIDE_SOURCE || 'mskcc';

/** Optional: force this PDB when G2S returns multiple chains (empty = best ranked). */
export const SANDBOX_PREFERRED_PDB = (
    import.meta.env.VITE_PREFERRED_PDB || ''
).toLowerCase();

export const USE_MOCK_G2S_DATA =
    import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const USE_MOCK_MUTATIONS =
    import.meta.env.VITE_USE_MOCK_MUTATIONS === 'true';

/** Default studies: pan-cancer set (stable 3D coloring). Override via VITE_CBIOPORTAL_STUDY_IDS. */
export const CBIOPORTAL_STUDY_IDS: string[] = (
    import.meta.env.VITE_CBIOPORTAL_STUDY_IDS ||
    [
        'msk_impact_2017',
        'msk_impact_50k_2026',
        'brca_tcga',
        'luad_tcga_pan_can_atlas_2018',
        'gbm_tcga_pan_can_atlas_2018',
        'coadread_tcga_pan_can_atlas_2018',
        'lgg_tcga_pan_can_atlas_2018',
        'skcm_tcga_pan_can_atlas_2018',
        'hnsc_tcga_pan_can_atlas_2018',
        'blca_tcga_pan_can_atlas_2018',
        'esca_tcga_pan_can_atlas_2018',
        'paad_tcga_pan_can_atlas_2018',
        'stad_tcga_pan_can_atlas_2018',
        'ucec_tcga_pan_can_atlas_2018',
        'thca_tcga_pan_can_atlas_2018',
        'prad_tcga_pan_can_atlas_2018',
        'kirc_tcga_pan_can_atlas_2018',
        'lihc_tcga_pan_can_atlas_2018',
        'ov_tcga_pan_can_atlas_2018',
    ].join(',')
)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/** Fallback when CBIOPORTAL_STUDY_IDS is empty. Override via VITE_CBIOPORTAL_MUTATION_PROFILES. */
export const CBIOPORTAL_MUTATION_PROFILE_IDS: string[] = (
    import.meta.env.VITE_CBIOPORTAL_MUTATION_PROFILES ||
    [
        'msk_impact_2017_mutations',
        'msk_impact_50k_2026_mutations',
        'brca_tcga_mutations',
        'luad_tcga_pan_can_atlas_2018_mutations',
        'gbm_tcga_pan_can_atlas_2018_mutations',
        'coadread_tcga_pan_can_atlas_2018_mutations',
        'lgg_tcga_pan_can_atlas_2018_mutations',
        'skcm_tcga_pan_can_atlas_2018_mutations',
        'hnsc_tcga_pan_can_atlas_2018_mutations',
        'blca_tcga_pan_can_atlas_2018_mutations',
        'esca_tcga_pan_can_atlas_2018_mutations',
        'paad_tcga_pan_can_atlas_2018_mutations',
        'stad_tcga_pan_can_atlas_2018_mutations',
        'ucec_tcga_pan_can_atlas_2018_mutations',
        'thca_tcga_pan_can_atlas_2018_mutations',
        'prad_tcga_pan_can_atlas_2018_mutations',
        'kirc_tcga_pan_can_atlas_2018_mutations',
        'lihc_tcga_pan_can_atlas_2018_mutations',
        'ov_tcga_pan_can_atlas_2018_mutations',
    ].join(',')
).split(',').map(s => s.trim()).filter(Boolean);
