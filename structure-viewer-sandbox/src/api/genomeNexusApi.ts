import { EnsemblTranscript, PdbHeader } from 'genome-nexus-ts-api-client';
import {
    GENOME_NEXUS_API_BASE,
    SANDBOX_ISOFORM_OVERRIDE_SOURCE,
} from './sandboxApiConfig';

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `Genome Nexus request failed (${response.status}): ${text || response.statusText}`
        );
    }
    return response.json();
}

export async function fetchCanonicalTranscriptByHugoSymbol(
    hugoSymbol: string
): Promise<EnsemblTranscript> {
    const params = new URLSearchParams({
        isoformOverrideSource: SANDBOX_ISOFORM_OVERRIDE_SOURCE,
    });
    const url = `${GENOME_NEXUS_API_BASE}/ensembl/canonical-transcript/hgnc?${params}`;

    const transcripts = await parseJson<EnsemblTranscript[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([hugoSymbol]),
        })
    );

    if (!transcripts || transcripts.length === 0 || !transcripts[0].transcriptId) {
        throw new Error(`No canonical transcript found for ${hugoSymbol}`);
    }

    return transcripts[0];
}

export async function fetchPdbHeaders(pdbIds: string[]): Promise<PdbHeader[]> {
    if (pdbIds.length === 0) {
        return [];
    }

    const url = `${GENOME_NEXUS_API_BASE}/pdb/header`;
    return parseJson<PdbHeader[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pdbIds.map(id => id.toLowerCase())),
        })
    );
}
