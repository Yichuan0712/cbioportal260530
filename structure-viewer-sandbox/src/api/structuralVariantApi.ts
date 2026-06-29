import { Mutation } from 'cbioportal-ts-api-client';
import {
    CBIOPORTAL_API_BASE,
    CBIOPORTAL_STUDY_IDS,
} from './sandboxApiConfig';

export interface StructuralVariant {
    sampleId: string;
    patientId: string;
    studyId: string;
    uniqueSampleKey: string;
    uniquePatientKey: string;
    molecularProfileId: string;
    site1EntrezGeneId?: number;
    site1HugoSymbol?: string;
    site1Chromosome?: string;
    site1Position?: number;
    site2EntrezGeneId?: number;
    site2HugoSymbol?: string;
    site2Chromosome?: string;
    site2Position?: number;
    variantClass?: string;
    svStatus?: string;
    ncbiBuild?: string;
    comments?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `Structural variant request failed (${response.status}): ${text || response.statusText}`
        );
    }
    return response.json();
}

export async function resolveStructuralVariantProfileIds(
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<string[]> {
    const profiles = await Promise.all(
        studyIds.map(async studyId => {
            const url = `${CBIOPORTAL_API_BASE}/api/studies/${encodeURIComponent(studyId)}/molecular-profiles?projection=SUMMARY`;
            return parseJson<
                Array<{
                    molecularProfileId: string;
                    molecularAlterationType: string;
                }>
            >(await fetch(url));
        })
    );

    return profiles
        .flat()
        .filter(p => p.molecularAlterationType === 'STRUCTURAL_VARIANT')
        .map(p => p.molecularProfileId);
}

export async function fetchStructuralVariantsForGene(
    entrezGeneId: number,
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<StructuralVariant[]> {
    const molecularProfileIds =
        await resolveStructuralVariantProfileIds(studyIds);

    if (molecularProfileIds.length === 0) {
        return [];
    }

    const url = `${CBIOPORTAL_API_BASE}/api/structural-variant/fetch?projection=DETAILED`;
    return parseJson<StructuralVariant[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                entrezGeneIds: [entrezGeneId],
                molecularProfileIds,
            }),
        })
    );
}

export function buildProteinChangeFromStructuralVariant(
    sv: StructuralVariant
): string {
    const genes: string[] = [];

    if (sv.site1HugoSymbol) {
        genes.push(sv.site1HugoSymbol);
    }

    if (sv.site2HugoSymbol && sv.site2HugoSymbol !== sv.site1HugoSymbol) {
        genes.push(sv.site2HugoSymbol);
    }

    if (genes.length === 2) {
        return `${genes[0]}-${genes[1]} Fusion`;
    }

    if (genes.length === 1) {
        return `${genes[0]} intragenic`;
    }

    return 'Fusion';
}

/** Convert SV to Mutation shape for MutationMapper (matches ResultsViewPageStore). */
export function structuralVariantToMutation(
    sv: StructuralVariant,
    hugoGeneSymbol: string,
    entrezGeneId: number
): Mutation {
    return {
        center: 'N/A',
        chr: sv.site1Chromosome || sv.site2Chromosome,
        entrezGeneId,
        keyword: sv.comments,
        molecularProfileId: sv.molecularProfileId,
        mutationType: 'Fusion',
        ncbiBuild: sv.ncbiBuild,
        patientId: sv.patientId,
        proteinChange: buildProteinChangeFromStructuralVariant(sv),
        sampleId: sv.sampleId,
        startPosition: sv.site1Position || sv.site2Position,
        studyId: sv.studyId,
        uniquePatientKey: sv.uniquePatientKey,
        uniqueSampleKey: sv.uniqueSampleKey,
        variantType: sv.variantClass,
        mutationStatus: sv.svStatus,
        gene: {
            entrezGeneId,
            hugoGeneSymbol,
        },
    } as Mutation;
}
