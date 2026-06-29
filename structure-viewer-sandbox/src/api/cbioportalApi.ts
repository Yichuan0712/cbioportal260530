import _ from 'lodash';
import { Gene, Mutation, Sample } from 'cbioportal-ts-api-client';
import {
    CBIOPORTAL_API_BASE,
    CBIOPORTAL_CASE_SET_ID,
    CBIOPORTAL_MUTATION_PROFILE_IDS,
    CBIOPORTAL_STUDY_IDS,
} from './sandboxApiConfig';

export type MolecularProfileSummary = {
    molecularProfileId: string;
    molecularAlterationType: string;
    studyId: string;
    name?: string;
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
export async function fetchMutationMolecularProfilesForStudies(
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<MolecularProfileSummary[]> {
    if (studyIds.length === 0) {
        return [];
    }

    const profilesByStudy = await Promise.all(
        studyIds.map(studyId => fetchMolecularProfilesForStudy(studyId))
    );

    return profilesByStudy
        .flat()
        .filter(p => p.molecularAlterationType === 'MUTATION_EXTENDED');
}

export async function resolveMutationProfileIdsForStudies(
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<string[]> {
    if (studyIds.length === 0) {
        return CBIOPORTAL_MUTATION_PROFILE_IDS;
    }

    return _.uniq(
        (await fetchMutationMolecularProfilesForStudies(studyIds)).map(
            p => p.molecularProfileId
        )
    );
}

export async function fetchSamplesForStudies(
    studyIds: string[] = CBIOPORTAL_STUDY_IDS,
    sampleListId: string = CBIOPORTAL_CASE_SET_ID
): Promise<Sample[]> {
    if (studyIds.length === 0) {
        return [];
    }

    const sampleListIds = studyIds.map(studyId =>
        sampleListId && sampleListId !== 'all'
            ? sampleListId
            : `${studyId}_all`
    );
    const url = `${CBIOPORTAL_API_BASE}/api/samples/fetch?projection=SUMMARY`;

    return parseJson<Sample[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sampleListIds: _.uniq(sampleListIds) }),
        })
    );
}

async function fetchMutationsInProfile(
    molecularProfileId: string,
    entrezGeneId: number,
    sampleListId?: string
): Promise<Mutation[]> {
    const url = `${CBIOPORTAL_API_BASE}/api/molecular-profiles/${encodeURIComponent(molecularProfileId)}/mutations/fetch?projection=DETAILED`;
    const filter: Record<string, unknown> = { entrezGeneIds: [entrezGeneId] };
    if (sampleListId) {
        filter.sampleListId = sampleListId;
    }

    return parseJson<Mutation[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filter),
        })
    );
}

export async function fetchMutationsForGene(
    entrezGeneId: number,
    molecularProfileIds?: string[],
    sampleListId: string = CBIOPORTAL_CASE_SET_ID
): Promise<Mutation[]> {
    const profileIds =
        molecularProfileIds ??
        (await resolveMutationProfileIdsForStudies(CBIOPORTAL_STUDY_IDS));

    if (profileIds.length === 0) {
        return [];
    }

    const results = await Promise.all(
        profileIds.map(profileId =>
            fetchMutationsInProfile(profileId, entrezGeneId, sampleListId)
        )
    );

    return _.uniqBy(
        results.flat(),
        m => m.uniqueSampleKey + (m.proteinChange || '') + m.startPosition
    );
}
