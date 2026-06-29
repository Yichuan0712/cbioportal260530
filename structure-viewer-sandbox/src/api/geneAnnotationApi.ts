/** MyGene + UniProt lookups for GeneSummary (matches react-mutation-mapper DefaultMutationMapperDataFetcher). */

const MYGENE_API_BASE =
    import.meta.env.VITE_MYGENE_URL ||
    (import.meta.env.DEV ? '/mygene-api' : 'https://mygene.info');

const UNIPROT_API_BASE =
    import.meta.env.VITE_UNIPROT_URL ||
    (import.meta.env.DEV ? '/uniprot-api' : 'https://rest.uniprot.org');

export async function fetchSwissProtAccession(
    entrezGeneId: number
): Promise<string | string[] | undefined> {
    if (!entrezGeneId || entrezGeneId < 1) {
        return undefined;
    }

    const url = `${MYGENE_API_BASE}/v3/gene/${entrezGeneId}?fields=uniprot`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`MyGene request failed (${response.status})`);
    }

    const data = await response.json();
    return data?.uniprot?.['Swiss-Prot'];
}

export async function fetchUniprotEntryName(
    swissProtAccession: string
): Promise<string> {
    const params = new URLSearchParams({
        query: `accession:${swissProtAccession}`,
        format: 'tsv',
        fields: 'id',
    });
    const url = `${UNIPROT_API_BASE}/uniprotkb/search?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`UniProt request failed (${response.status})`);
    }

    const text = await response.text();
    return text.split('\n')[1]?.trim() || '';
}

export async function fetchUniprotEntryNameForGene(
    entrezGeneId: number
): Promise<string> {
    try {
        const accession = await fetchSwissProtAccession(entrezGeneId);
        const swissProt = Array.isArray(accession) ? accession[0] : accession;
        if (!swissProt) {
            return '';
        }
        return await fetchUniprotEntryName(swissProt);
    } catch {
        return '';
    }
}
