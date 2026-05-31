import { Alignment } from 'genome-nexus-ts-api-client';
import { G2S_API_BASE } from './sandboxApiConfig';

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `G2S request failed (${response.status}): ${text || response.statusText}`
        );
    }
    return response.json();
}

export async function fetchAlignmentsByEnsembl(
    ensemblTranscriptId: string
): Promise<Alignment[]> {
    const id = encodeURIComponent(ensemblTranscriptId);
    const url = `${G2S_API_BASE}/api/alignments/ensembl/${id}`;
    return parseJson<Alignment[]>(await fetch(url));
}

export async function fetchResidueMappingByPdb(
    uniprotId: string,
    pdbId: string,
    chainId: string,
    uniprotPositions: number[]
): Promise<Alignment[]> {
    if (uniprotPositions.length === 0) {
        return [];
    }

    const pdb = pdbId.toLowerCase();
    const chain = chainId.toUpperCase();
    const id = encodeURIComponent(uniprotId);
    const params = new URLSearchParams();
    params.set('positionList', uniprotPositions.map(String).join(','));

    const url = `${G2S_API_BASE}/api/alignments/uniprot/${id}/pdb/${pdb}_${chain}/residueMapping?${params}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });

    return parseJson<Alignment[]>(response);
}
