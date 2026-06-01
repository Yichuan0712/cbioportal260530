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
 * Default matches official Results / Mutations (MSK Impact 50k, SOX9, ENST00000245479):
 * https://www.cbioportal.org/results/mutations?...&cancer_study_list=msk_impact_50k_2026
 *   &mutations_gene=SOX9&mutations_transcript_id=ENST00000245479
 * PDB 3D may still show a SOX17 experimental structure name (G2S top-ranked chain).
 */
export const SANDBOX_HUGO_GENE =
    import.meta.env.VITE_HUGO_GENE || 'SOX9';

export const SANDBOX_ISOFORM_OVERRIDE_SOURCE =
    import.meta.env.VITE_ISOFORM_OVERRIDE_SOURCE || 'mskcc';

/** RefSeq label in meta column (live ENST/UniProt from Genome Nexus). */
export const SANDBOX_REFSEQ_TRANSCRIPT_ID =
    import.meta.env.VITE_REFSEQ_TRANSCRIPT || 'NM_000346';

/** Optional: force PDB when G2S returns many chains. Leave empty to match official auto-select. */
export const SANDBOX_PREFERRED_PDB = (
    import.meta.env.VITE_PREFERRED_PDB || ''
).toLowerCase();

export const USE_MOCK_G2S_DATA =
    import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const USE_MOCK_MUTATIONS =
    import.meta.env.VITE_USE_MOCK_MUTATIONS === 'true';

/** Default: single study msk_impact_50k_2026 (official link above). */
export const CBIOPORTAL_STUDY_IDS: string[] = (
    import.meta.env.VITE_CBIOPORTAL_STUDY_IDS || 'msk_impact_50k_2026'
)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/** Fallback when CBIOPORTAL_STUDY_IDS is empty. */
export const CBIOPORTAL_MUTATION_PROFILE_IDS: string[] = (
    import.meta.env.VITE_CBIOPORTAL_MUTATION_PROFILES ||
    'msk_impact_50k_2026_mutations'
).split(',').map(s => s.trim()).filter(Boolean);
