/**
 * Verify SOX9 driver/VUS counts match official cBioPortal meta column.
 * Run: node scripts/verify-official-counts.mjs
 */
const ONCOKB_ONCOGENIC = ['likely oncogenic', 'oncogenic', 'resistance'];
const STUDY = 'msk_impact_50k_2026';
const CASE_SET = 'msk_impact_50k_2026_cnaseq';
const ENTREZ = 6662;
const HUGO = 'SOX9';

const OFFICIAL = {
    rate: 2.3,
    driver: 864,
    vus: 517,
    missenseDriver: 6,
    truncatingDriver: 794,
    inframeDriver: 16,
    spliceDriver: 21,
    fusionDriver: 27,
    missenseVus: 473,
    truncatingVus: 19,
    inframeVus: 25,
};

function proteinImpactType(mutationType = '') {
    const t = mutationType.toLowerCase();
    if (t.includes('missense')) return 'missense';
    if (
        t.includes('nonsense') ||
        t.includes('nonstop') ||
        t.includes('frameshift') ||
        t.includes('truncating')
    ) {
        return 'truncating';
    }
    if (t.includes('inframe') || t.includes('in_frame')) return 'inframe';
    if (t.includes('splice')) return 'splice';
    if (t.includes('fusion')) return 'fusion';
    return 'other';
}

async function post(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${url} ${r.status}: ${await r.text()}`);
    return r.json();
}

async function fetchMutations() {
    return post(
        `https://www.cbioportal.org/api/molecular-profiles/${STUDY}_mutations/mutations/fetch?projection=DETAILED`,
        { entrezGeneIds: [ENTREZ], sampleListId: CASE_SET }
    );
}

async function fetchStructuralVariants() {
    return post(
        'https://www.cbioportal.org/api/structural-variant/fetch?projection=DETAILED',
        {
            entrezGeneIds: [ENTREZ],
            molecularProfileIds: [`${STUDY}_structural_variants`],
        }
    );
}

async function fetchCohortSamples() {
    return post(
        'https://www.cbioportal.org/api/samples/fetch?projection=SUMMARY',
        { sampleListIds: [CASE_SET] }
    );
}

async function fetchClinical(sampleIds) {
    const map = {};
    for (let i = 0; i < sampleIds.length; i += 200) {
        const batch = sampleIds.slice(i, i + 200);
        const rows = await post(
            'https://www.cbioportal.org/api/clinical-data/fetch?clinicalDataType=SAMPLE&projection=SUMMARY',
            {
                attributeIds: ['CANCER_TYPE', 'CANCER_TYPE_DETAILED'],
                identifiers: batch.map(sampleId => ({
                    entityId: sampleId,
                    studyId: STUDY,
                })),
            }
        );
        for (const row of rows) {
            if (!map[row.sampleId]) map[row.sampleId] = {};
            map[row.sampleId][row.clinicalAttributeId] = row.value;
        }
    }
    return map;
}

function tumorType(clinicalBySample, sampleId) {
    const c = clinicalBySample[sampleId] || {};
    return c.CANCER_TYPE_DETAILED || c.CANCER_TYPE || null;
}

function queryId(m, tt) {
    let id = tt ? `${m.entrezGeneId}_${tt}` : `${m.entrezGeneId}`;
    if (m.proteinChange) id += `_${m.proteinChange}`;
    if (m.mutationType) id += `_${m.mutationType}`;
    return id.trim().replace(/\s/g, '_');
}

function svQueryId(sv, tt) {
    const genes = [];
    if (sv.site1EntrezGeneId) genes.push(sv.site1EntrezGeneId);
    if (sv.site2EntrezGeneId && sv.site2EntrezGeneId !== sv.site1EntrezGeneId) {
        genes.push(sv.site2EntrezGeneId);
    }
    const svType = genes.length >= 2 ? 'FUSION' : 'UNKNOWN';
    let id = `${sv.site1EntrezGeneId ?? ''}_${sv.site2EntrezGeneId ?? ''}_${svType}`;
    if (tt) id += `_${tt}`;
    return id.trim().replace(/\s/g, '_');
}

async function annotateOncoKbMutations(queries) {
    const map = {};
    for (let i = 0; i < queries.length; i += 100) {
        const batch = queries.slice(i, i + 100);
        const results = await post(
            'https://public.api.oncokb.org/api/v1/annotate/mutations/byProteinChange',
            batch
        );
        for (const item of results) {
            map[item.query.id] = item;
        }
    }
    return map;
}

async function annotateOncoKbSv(queries) {
    const map = {};
    for (let i = 0; i < queries.length; i += 100) {
        const batch = queries.slice(i, i + 100);
        const results = await post(
            'https://public.api.oncokb.org/api/v1/annotate/structuralVariants',
            batch
        );
        for (const item of results) {
            map[item.query.id] = item;
        }
    }
    return map;
}

function isDriverOncoKb(indicator) {
    const o = indicator?.oncogenic?.toLowerCase?.() || '';
    return ONCOKB_ONCOGENIC.includes(o);
}

function genomicKey(m) {
    const chr = (m.chr || '17').replace(/^chr/i, '');
    return `${chr},${m.startPosition},${m.endPosition},${m.referenceAllele},${m.variantAllele}`;
}

async function fetchHotspotIndex(mutations) {
    const somatic = mutations.filter(
        m => (m.mutationStatus || '').toLowerCase() !== 'germline'
    );
    const keys = [...new Set(somatic.map(genomicKey))];
    const index = {};
    for (let i = 0; i < keys.length; i += 200) {
        const batchKeys = keys.slice(i, i + 200);
        const batch = batchKeys.map(k => {
            const [chr, start, end, ref, alt] = k.split(',');
            return {
                chromosome: chr,
                start: +start,
                end: +end,
                referenceAllele: ref,
                variantAllele: alt,
            };
        });
        const anns = await post(
            'https://v1.genomenexus.org/cancer_hotspots/genomic',
            batch
        );
        anns.forEach((a, idx) => {
            index[batchKeys[idx]] = a;
        });
    }
    return index;
}

function isHotspot(m, gnIndex) {
    const a = gnIndex[genomicKey(m)];
    const hotspots = a?.hotspots || [];
    return hotspots.some(h => {
        const type = (h.type || '').toLowerCase();
        if ((m.mutationType || '').toLowerCase().includes('splice')) {
            return type.includes('splice');
        }
        return type.includes('single') || type.includes('indel');
    });
}

function svToMutation(sv) {
    const genes = [sv.site1HugoSymbol, sv.site2HugoSymbol].filter(Boolean);
    const proteinChange =
        genes.length === 2 && genes[0] !== genes[1]
            ? `${genes[0]}-${genes[1]} Fusion`
            : genes.length === 1
              ? `${genes[0]} intragenic`
              : 'Fusion';
    return {
        entrezGeneId: ENTREZ,
        sampleId: sv.sampleId,
        uniqueSampleKey: sv.uniqueSampleKey,
        mutationType: 'Fusion',
        proteinChange,
        mutationStatus: sv.svStatus,
        gene: { hugoGeneSymbol: HUGO, entrezGeneId: ENTREZ },
    };
}

async function main() {
    const [rawMutations, structuralVariants, cohortSamples] = await Promise.all([
        fetchMutations(),
        fetchStructuralVariants(),
        fetchCohortSamples(),
    ]);

    const cohortKeys = new Set(cohortSamples.map(s => s.uniqueSampleKey));
    const pointMutations = rawMutations.filter(m =>
        cohortKeys.has(m.uniqueSampleKey)
    );
    const svs = structuralVariants.filter(sv =>
        cohortKeys.has(sv.uniqueSampleKey)
    );

    const sampleIds = [
        ...new Set([
            ...pointMutations.map(m => m.sampleId),
            ...svs.map(sv => sv.sampleId),
        ]),
    ];
    const clinicalBySample = await fetchClinical(sampleIds);

    const mutationQueries = new Map();
    for (const m of pointMutations) {
        if ((m.mutationType || '').toLowerCase() === 'fusion') continue;
        const tt = tumorType(clinicalBySample, m.sampleId);
        const q = {
            id: queryId(m, tt),
            alteration: m.proteinChange,
            consequence: m.mutationType,
            gene: { entrezGeneId: m.entrezGeneId },
            proteinStart: m.proteinPosStart,
            proteinEnd: m.proteinPosEnd,
            tumorType: tt,
        };
        mutationQueries.set(q.id, q);
    }

    const svQueries = new Map();
    for (const sv of svs) {
        const tt = tumorType(clinicalBySample, sv.sampleId);
        const genes = [];
        if (sv.site1EntrezGeneId) genes.push(sv.site1EntrezGeneId);
        if (sv.site2EntrezGeneId) genes.push(sv.site2EntrezGeneId);
        const q = {
            id: svQueryId(sv, tt),
            geneA: { entrezGeneId: genes[0] },
            geneB: { entrezGeneId: genes[1] || genes[0] },
            structuralVariantType: genes.length >= 2 ? 'FUSION' : 'UNKNOWN',
            functionalFusion: genes.length > 1,
            tumorType: tt,
        };
        svQueries.set(q.id, q);
    }

    const [mutationMap, svMap, gnIndex] = await Promise.all([
        annotateOncoKbMutations([...mutationQueries.values()]),
        annotateOncoKbSv([...svQueries.values()]),
        fetchHotspotIndex(pointMutations),
    ]);

    const isDriverPoint = m => {
        const tt = tumorType(clinicalBySample, m.sampleId);
        const oncoKb = isDriverOncoKb(mutationMap[queryId(m, tt)]);
        const hotspot = isHotspot(m, gnIndex);
        const custom = m.driverFilter === 'Putative_Driver';
        return oncoKb || hotspot || custom;
    };

    const isDriverSv = sv => {
        const tt = tumorType(clinicalBySample, sv.sampleId);
        return isDriverOncoKb(svMap[svQueryId(sv, tt)]);
    };

    const svMutations = svs.map(svToMutation);
    const allMutations = [...pointMutations, ...svMutations];

    const counts = {
        driver: 0,
        vus: 0,
        missenseDriver: 0,
        truncatingDriver: 0,
        inframeDriver: 0,
        spliceDriver: 0,
        fusionDriver: 0,
        missenseVus: 0,
        truncatingVus: 0,
        inframeVus: 0,
        spliceVus: 0,
        fusionVus: 0,
    };

    pointMutations.forEach(m => {
        const driver = isDriverPoint(m);
        const pit = proteinImpactType(m.mutationType);
        if (driver) {
            counts.driver++;
            counts[`${pit}Driver`] = (counts[`${pit}Driver`] || 0) + 1;
        } else {
            counts.vus++;
            counts[`${pit}Vus`] = (counts[`${pit}Vus`] || 0) + 1;
        }
    });

    svs.forEach(sv => {
        const driver = isDriverSv(sv);
        if (driver) {
            counts.driver++;
            counts.fusionDriver++;
        } else {
            counts.vus++;
            counts.fusionVus++;
        }
    });

    const somaticSamples = new Set(
        allMutations
            .filter(m => (m.mutationStatus || '').toLowerCase() !== 'germline')
            .map(m => `${STUDY}_${m.sampleId}`)
    );
    const rate = (somaticSamples.size * 100) / cohortSamples.length;

    console.log('Data sizes:', {
        pointMutations: pointMutations.length,
        structuralVariants: svs.length,
        total: allMutations.length,
        cohortSamples: cohortSamples.length,
    });
    console.log('Computed:', {
        rate: +rate.toFixed(1),
        ...counts,
    });
    console.log('Official:', OFFICIAL);

    const ok =
        counts.driver === OFFICIAL.driver &&
        counts.vus === OFFICIAL.vus &&
        Math.abs(rate - OFFICIAL.rate) < 0.05;
    console.log(ok ? 'MATCH' : 'MISMATCH');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
