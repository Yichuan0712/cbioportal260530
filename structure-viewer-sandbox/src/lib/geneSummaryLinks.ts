/** NCBI / Ensembl link helpers aligned with cBioPortal GeneSummary. */

const NCBI_BASE = 'https://www.ncbi.nlm.nih.gov';

export function getNCBIlink(
    pathOrOptions:
        | string
        | { pathname: string; query: Record<string, string> }
): string {
    if (typeof pathOrOptions === 'string') {
        const path = pathOrOptions.startsWith('/')
            ? pathOrOptions
            : `/${pathOrOptions}`;
        return `${NCBI_BASE}${path}`;
    }

    const params = new URLSearchParams(pathOrOptions.query);
    return `${NCBI_BASE}${pathOrOptions.pathname}?${params.toString()}`;
}

export const DEFAULT_TRANSCRIPT_SUMMARY_URL_TEMPLATE =
    'http://grch37.ensembl.org/homo_sapiens/Transcript/Summary?t=<%= transcriptId %>';

export function getTranscriptSummaryUrl(transcriptId: string): string {
    return DEFAULT_TRANSCRIPT_SUMMARY_URL_TEMPLATE.replace(
        '<%= transcriptId %>',
        transcriptId
    );
}

export function getVersionedEnsemblTranscriptId(
    transcriptId: string,
    transcriptIdVersion?: string
): string {
    if (!transcriptId) {
        return '';
    }
    return transcriptIdVersion
        ? `${transcriptId}.${transcriptIdVersion}`
        : transcriptId;
}
