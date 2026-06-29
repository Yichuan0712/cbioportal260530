import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import { StructuralVariant } from './structuralVariantApi';
import { tumorTypeForSample, SampleClinicalMap } from './clinicalDataApi';

export const ONCOKB_ONCOGENIC_LOWERCASE = [
    'likely oncogenic',
    'oncogenic',
    'resistance',
];

const ONCOKB_API_BASE =
    import.meta.env.VITE_ONCOKB_URL ||
    (import.meta.env.DEV ? '/oncokb-api' : 'https://public.api.oncokb.org/api/v1');

export type OncoKbIndicator = {
    oncogenic?: string;
    query?: { id?: string };
};

export type OncoKbIndicatorMap = Record<string, OncoKbIndicator>;

export function generateQueryVariantId(
    entrezGeneId: number,
    tumorType: string | null,
    alteration?: string,
    mutationType?: string
): string {
    let id = tumorType ? `${entrezGeneId}_${tumorType}` : `${entrezGeneId}`;
    if (alteration) {
        id = `${id}_${alteration}`;
    }
    if (mutationType) {
        id = `${id}_${mutationType}`;
    }
    return id.trim().replace(/\s/g, '_');
}

function deriveStructuralVariantType(sv: StructuralVariant): string {
    const validTypes = [
        'DELETION',
        'TRANSLOCATION',
        'DUPLICATION',
        'INSERTION',
        'INVERSION',
        'FUSION',
    ];
    const genes: number[] = [];
    if (sv.site1EntrezGeneId) genes.push(sv.site1EntrezGeneId);
    if (sv.site2EntrezGeneId && sv.site2EntrezGeneId !== sv.site1EntrezGeneId) {
        genes.push(sv.site2EntrezGeneId);
    }

    if (genes.length < 2) {
        const variantClass = (sv.variantClass || '').toUpperCase();
        if (validTypes.includes(variantClass)) {
            return variantClass;
        }
        return 'UNKNOWN';
    }
    return 'FUSION';
}

export function generateQueryStructuralVariantId(
    site1EntrezGeneId: number | undefined,
    site2EntrezGeneId: number | undefined,
    tumorType: string | null,
    structuralVariantType: string
): string {
    let id = `${site1EntrezGeneId ?? ''}_${site2EntrezGeneId ?? ''}_${structuralVariantType}`;
    if (tumorType) {
        id = `${id}_${tumorType}`;
    }
    return id.trim().replace(/\s/g, '_');
}

function proteinChangeQuery(
    mutation: Mutation,
    tumorType: string | null
) {
    return {
        id: generateQueryVariantId(
            mutation.entrezGeneId,
            tumorType,
            mutation.proteinChange,
            mutation.mutationType
        ),
        alteration: mutation.proteinChange,
        consequence: mutation.mutationType,
        gene: { entrezGeneId: mutation.entrezGeneId },
        proteinStart: mutation.proteinPosStart,
        proteinEnd: mutation.proteinPosEnd,
        tumorType,
    };
}

function structuralVariantQuery(
    sv: StructuralVariant,
    tumorType: string | null
) {
    const genes: number[] = [];
    if (sv.site1EntrezGeneId) genes.push(sv.site1EntrezGeneId);
    if (sv.site2EntrezGeneId) genes.push(sv.site2EntrezGeneId);
    const svType = deriveStructuralVariantType(sv);

    return {
        id: generateQueryStructuralVariantId(
            sv.site1EntrezGeneId,
            sv.site2EntrezGeneId,
            tumorType,
            svType
        ),
        geneA: { entrezGeneId: genes[0] },
        geneB: { entrezGeneId: genes[1] || genes[0] },
        structuralVariantType: svType,
        functionalFusion: genes.length > 1,
        tumorType,
    };
}

async function postOncoKb<T>(path: string, body: unknown): Promise<T> {
    const url = `${ONCOKB_API_BASE}${path}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`OncoKB request failed (${response.status}): ${text}`);
    }

    return response.json();
}

async function annotateInBatches<T extends { id: string }>(
    path: string,
    queries: T[]
): Promise<OncoKbIndicatorMap> {
    const map: OncoKbIndicatorMap = {};

    for (let i = 0; i < queries.length; i += 100) {
        const batch = queries.slice(i, i + 100);
        const results = await postOncoKb<OncoKbIndicator[]>(path, batch);
        for (const indicator of results) {
            if (indicator?.query?.id) {
                map[indicator.query.id] = indicator;
            }
        }
    }

    return map;
}

export async function buildOncoKbIndicatorMap(
    mutations: Mutation[],
    structuralVariants: StructuralVariant[],
    clinicalBySample: SampleClinicalMap
): Promise<OncoKbIndicatorMap> {
    const mutationQueries = _.uniqBy(
        mutations
            .filter(m => m.mutationType?.toLowerCase() !== 'fusion')
            .map(m =>
                proteinChangeQuery(
                    m,
                    tumorTypeForSample(clinicalBySample, m.sampleId)
                )
            ),
        'id'
    );

    const svQueries = _.uniqBy(
        structuralVariants.map(sv =>
            structuralVariantQuery(
                sv,
                tumorTypeForSample(clinicalBySample, sv.sampleId)
            )
        ),
        'id'
    );

    const [mutationMap, svMap] = await Promise.all([
        mutationQueries.length > 0
            ? annotateInBatches(
                  '/annotate/mutations/byProteinChange',
                  mutationQueries
              )
            : Promise.resolve({}),
        svQueries.length > 0
            ? annotateInBatches(
                  '/annotate/structuralVariants',
                  svQueries
              )
            : Promise.resolve({}),
    ]);

    return { ...mutationMap, ...svMap };
}

export function getOncoKbOncogenicFromIndicator(
    indicator?: OncoKbIndicator
): string {
    const oncogenic = indicator?.oncogenic;
    if (
        oncogenic &&
        ONCOKB_ONCOGENIC_LOWERCASE.indexOf(oncogenic.toLowerCase()) > -1
    ) {
        return oncogenic;
    }
    return '';
}

export function getMutationOncoKbIndicatorId(
    mutation: Mutation,
    clinicalBySample: SampleClinicalMap
): string {
    return generateQueryVariantId(
        mutation.entrezGeneId,
        tumorTypeForSample(clinicalBySample, mutation.sampleId),
        mutation.proteinChange,
        mutation.mutationType
    );
}

export function getStructuralVariantOncoKbIndicatorId(
    sv: StructuralVariant,
    clinicalBySample: SampleClinicalMap
): string {
    return generateQueryStructuralVariantId(
        sv.site1EntrezGeneId,
        sv.site2EntrezGeneId,
        tumorTypeForSample(clinicalBySample, sv.sampleId),
        deriveStructuralVariantType(sv)
    );
}
