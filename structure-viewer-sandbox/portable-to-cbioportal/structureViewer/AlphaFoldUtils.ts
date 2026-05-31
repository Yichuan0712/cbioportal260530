export const ALPHAFOLD_DEFAULT_CHAIN = 'A';
export const ALPHAFOLD_DEFAULT_ISOFORM = 1;
/** EBI currently serves v6; older v4 URLs return 404. */
export const ALPHAFOLD_MODEL_VERSION = 6;

const ALPHAFOLD_VERSION_FALLBACKS = [6, 4] as const;

export function getAlphaFoldModelId(
    uniprotId: string,
    isoform: number = ALPHAFOLD_DEFAULT_ISOFORM
): string {
    return `AF-${uniprotId.toUpperCase()}-F${isoform}`;
}

export function getAlphaFoldModelUrl(
    uniprotId: string,
    options?: {
        isoform?: number;
        version?: number;
        format?: 'cif' | 'pdb';
        baseUrl?: string;
    }
): string {
    const isoform = options?.isoform ?? ALPHAFOLD_DEFAULT_ISOFORM;
    const version = options?.version ?? ALPHAFOLD_MODEL_VERSION;
    const format = options?.format ?? 'cif';
    const baseUrl = (
        options?.baseUrl ?? 'https://alphafold.ebi.ac.uk/files'
    ).replace(/\/$/, '');
    const modelId = getAlphaFoldModelId(uniprotId, isoform);

    return `${baseUrl}/${modelId}-model_v${version}.${format}`;
}

export function getAlphaFoldEntryUrl(uniprotId: string): string {
    return `https://alphafold.ebi.ac.uk/entry/${uniprotId.toUpperCase()}`;
}

export type AlphaFoldPredictionMetadata = {
    entryId: string;
    uniprotAccession: string;
    uniprotDescription: string;
    gene?: string;
    organismScientificName: string;
    chainId: string;
    latestVersion: number;
    globalMetricValue?: number;
};

export function getAlphaFoldApiUrl(
    uniprotId: string,
    apiBaseUrl?: string
): string {
    const base = (apiBaseUrl ?? 'https://alphafold.ebi.ac.uk').replace(
        /\/$/,
        ''
    );

    return `${base}/api/prediction/${encodeURIComponent(
        uniprotId.toUpperCase()
    )}`;
}

export async function fetchAlphaFoldPredictionMetadata(
    uniprotId: string,
    apiBaseUrl?: string
): Promise<AlphaFoldPredictionMetadata | null> {
    const response = await fetch(getAlphaFoldApiUrl(uniprotId, apiBaseUrl));

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : null;

    if (!entry) {
        return null;
    }

    return {
        entryId: entry.entryId,
        uniprotAccession: entry.uniprotAccession,
        uniprotDescription: entry.uniprotDescription,
        gene: entry.gene,
        organismScientificName: entry.organismScientificName,
        chainId: entry.chainId || ALPHAFOLD_DEFAULT_CHAIN,
        latestVersion: entry.latestVersion,
        globalMetricValue: entry.globalMetricValue,
    };
}

export function generateAlphaFoldInfoSummary(
    metadata: AlphaFoldPredictionMetadata
): {
    modelInfo: string;
    moleculeInfo: string;
    entryId: string;
} {
    const versionLabel = metadata.latestVersion
        ? ` [model v${metadata.latestVersion}]`
        : '';
    const plddtLabel =
        metadata.globalMetricValue != null
            ? `, mean pLDDT ${metadata.globalMetricValue.toFixed(1)}`
            : '';
    const description = metadata.uniprotDescription.toLowerCase();

    return {
        entryId: metadata.entryId,
        modelInfo: `AlphaFold predicted structure of ${description} (${
            metadata.organismScientificName
        })${versionLabel}${plddtLabel}`,
        moleculeInfo: description,
    };
}

const predictionMetadataCache: {
    [uniprotId: string]: Promise<AlphaFoldPredictionMetadata | null>;
} = {};

export function fetchAlphaFoldPredictionMetadataCached(
    uniprotId: string,
    apiBaseUrl?: string
): Promise<AlphaFoldPredictionMetadata | null> {
    const key = `${uniprotId.toUpperCase()}_${apiBaseUrl || 'default'}`;

    if (!predictionMetadataCache[key]) {
        predictionMetadataCache[key] = fetchAlphaFoldPredictionMetadata(
            uniprotId,
            apiBaseUrl
        );
    }

    return predictionMetadataCache[key];
}

export function getAlphaFoldModelUrlCandidates(
    uniprotId: string,
    options?: {
        isoform?: number;
        format?: 'cif' | 'pdb';
        baseUrl?: string;
        versions?: readonly number[];
    }
): string[] {
    const versions = options?.versions ?? ALPHAFOLD_VERSION_FALLBACKS;

    return versions.map(version =>
        getAlphaFoldModelUrl(uniprotId, {
            isoform: options?.isoform,
            version,
            format: options?.format,
            baseUrl: options?.baseUrl,
        })
    );
}

/** Fetch mmCIF/PDB text from AlphaFold DB (tries current version, then fallbacks). */
export async function fetchAlphaFoldModelText(
    uniprotId: string,
    options?: {
        baseUrl?: string;
        format?: 'cif' | 'pdb';
    }
): Promise<string> {
    const format = options?.format ?? 'cif';
    const urls = getAlphaFoldModelUrlCandidates(uniprotId, {
        baseUrl: options?.baseUrl,
        format,
    });

    let lastError: Error | null = null;

    for (const url of urls) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                lastError = new Error(
                    `AlphaFold model fetch failed (${response.status}): ${url}`
                );
                continue;
            }

            return await response.text();
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error
                    : new Error('AlphaFold model fetch failed');
        }
    }

    throw (
        lastError ??
        new Error(`No AlphaFold model found for UniProt ${uniprotId}`)
    );
}
