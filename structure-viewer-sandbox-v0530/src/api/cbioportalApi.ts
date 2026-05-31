import _ from 'lodash';
import { Gene, Mutation } from 'cbioportal-ts-api-client';
import {
    CBIOPORTAL_API_BASE,
    CBIOPORTAL_MUTATION_PROFILE_IDS,
    CBIOPORTAL_STUDY_IDS,
} from './sandboxApiConfig';

type MolecularProfileSummary = {
    molecularProfileId: string;
    molecularAlterationType: string;
    studyId: string;
};

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `cBioPortal request failed (${response.status}): ${text || response.statusText}`
        );
    }
    return response.json();
}

export async function fetchGeneByHugoSymbol(hugoSymbol: string): Promise<Gene> {
    return parseJson<Gene>(
        await fetch(
            `${CBIOPORTAL_API_BASE}/api/genes/${encodeURIComponent(hugoSymbol)}`
        )
    );
}

export async function fetchMolecularProfilesForStudy(
    studyId: string
): Promise<MolecularProfileSummary[]> {
    return parseJson<MolecularProfileSummary[]>(
        await fetch(
            `${CBIOPORTAL_API_BASE}/api/studies/${encodeURIComponent(studyId)}/molecular-profiles?projection=SUMMARY`
        )
    );
}

/** Resolve mutation molecular profile IDs from study IDs (official API, same as Results View data source). */
export async function resolveMutationProfileIdsForStudies(
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<string[]> {
    if (studyIds.length === 0) {
        return CBIOPORTAL_MUTATION_PROFILE_IDS;
    }

    const profilesByStudy = await Promise.all(
        studyIds.map(studyId => fetchMolecularProfilesForStudy(studyId))
    );

    return _.uniq(
        profilesByStudy
            .flat()
            .filter(p => p.molecularAlterationType === 'MUTATION_EXTENDED')
            .map(p => p.molecularProfileId)
    );
}

export async function fetchMutationsForGene(
    entrezGeneId: number,
    molecularProfileIds?: string[]
): Promise<Mutation[]> {
    const profileIds =
        molecularProfileIds ??
        (await resolveMutationProfileIdsForStudies(CBIOPORTAL_STUDY_IDS));

    if (profileIds.length === 0) {
        return [];
    }

    const url = `${CBIOPORTAL_API_BASE}/api/mutations/fetch?projection=DETAILED`;
    return parseJson<Mutation[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                entrezGeneIds: [entrezGeneId],
                molecularProfileIds: profileIds,
            }),
        })
    );
}
