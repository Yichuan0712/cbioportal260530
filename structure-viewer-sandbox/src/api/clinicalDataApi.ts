import { CBIOPORTAL_API_BASE, CBIOPORTAL_STUDY_IDS } from './sandboxApiConfig';

export type SampleClinicalMap = {
    [sampleId: string]: {
        CANCER_TYPE?: string;
        CANCER_TYPE_DETAILED?: string;
    };
};

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `Clinical data request failed (${response.status}): ${text || response.statusText}`
        );
    }
    return response.json();
}

export function tumorTypeForSample(
    clinicalBySample: SampleClinicalMap,
    sampleId: string
): string | null {
    const clinical = clinicalBySample[sampleId];
    return clinical?.CANCER_TYPE_DETAILED || clinical?.CANCER_TYPE || null;
}

/** Matches Results View uniqueSampleKeyToTumorType (clinical → OncoKB). */
export async function fetchSampleClinicalMap(
    sampleIds: string[],
    studyIds: string[] = CBIOPORTAL_STUDY_IDS
): Promise<SampleClinicalMap> {
    if (sampleIds.length === 0 || studyIds.length === 0) {
        return {};
    }

    const studyId = studyIds[0];
    const map: SampleClinicalMap = {};
    const batchSize = 200;

    for (let i = 0; i < sampleIds.length; i += batchSize) {
        const batch = sampleIds.slice(i, i + batchSize);
        const url = `${CBIOPORTAL_API_BASE}/api/clinical-data/fetch?clinicalDataType=SAMPLE&projection=SUMMARY`;

        const rows = await parseJson<
            Array<{
                sampleId: string;
                clinicalAttributeId: string;
                value: string;
            }>
        >(
            await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attributeIds: ['CANCER_TYPE', 'CANCER_TYPE_DETAILED'],
                    identifiers: batch.map(entityId => ({
                        entityId,
                        studyId,
                    })),
                }),
            })
        );

        for (const row of rows) {
            if (!map[row.sampleId]) {
                map[row.sampleId] = {};
            }
            map[row.sampleId][
                row.clinicalAttributeId as keyof SampleClinicalMap[string]
            ] = row.value;
        }
    }

    return map;
}
