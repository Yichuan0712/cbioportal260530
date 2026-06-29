/**
 * Compare sandbox vs official driver/VUS counting for SOX9 (msk_impact_50k_2026).
 * Run: node scripts/compare-driver-counts.mjs
 */
const ONCOKB_ONCOGENIC = ['likely oncogenic', 'oncogenic', 'resistance'];
const ONCOKB_URL =
    'https://public.api.oncokb.org/api/v1/annotate/mutations/byProteinChange';

async function fetchMutations() {
    const r = await fetch(
        'https://www.cbioportal.org/api/molecular-profiles/msk_impact_50k_2026_mutations/mutations/fetch?projection=DETAILED',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entrezGeneIds: [6662],
                sampleListId: 'msk_impact_50k_2026_cnaseq',
            }),
        }
    );
    return r.json();
}

async function fetchSampleTumorTypes(sampleIds) {
    const studyId = 'msk_impact_50k_2026';
    const map = {};

    for (let i = 0; i < sampleIds.length; i += 200) {
        const batch = sampleIds.slice(i, i + 200);
        const r = await fetch(
            'https://www.cbioportal.org/api/clinical-data/fetch?clinicalDataType=SAMPLE&projection=SUMMARY',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributeIds: ['CANCER_TYPE', 'CANCER_TYPE_DETAILED'],
                    identifiers: batch.map(sampleId => ({
                        entityId: sampleId,
                        studyId,
                    })),
                }),
            }
        );
        if (!r.ok) {
            throw new Error(`clinical ${r.status}: ${await r.text()}`);
        }
        const rows = await r.json();
        for (const row of rows) {
            if (!map[row.sampleId]) map[row.sampleId] = {};
            map[row.sampleId][row.clinicalAttributeId] = row.value;
        }
    }

    return map;
}

function tumorTypeForSample(clinicalBySample, mutation) {
    const c = clinicalBySample[mutation.sampleId] || {};
    return c.CANCER_TYPE_DETAILED || c.CANCER_TYPE || null;
}

function queryId(m, tumorType) {
    const tt = tumorType ? tumorType.trim().replace(/\s/g, '_') : '';
    let id = tumorType ? `${m.entrezGeneId}_${tt}` : `${m.entrezGeneId}`;
    if (m.proteinChange) id += `_${m.proteinChange}`;
    if (m.mutationType) id += `_${m.mutationType}`;
    return id.trim().replace(/\s/g, '_');
}

function proteinChangeQuery(m, tumorType) {
    return {
        id: queryId(m, tumorType),
        alteration: m.proteinChange,
        consequence: m.mutationType,
        gene: { entrezGeneId: m.entrezGeneId },
        proteinStart: m.proteinPosStart,
        proteinEnd: m.proteinPosEnd,
        tumorType,
    };
}

async function annotateOncoKb(queries) {
    const r = await fetch(ONCOKB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queries),
    });
    if (!r.ok) {
        throw new Error(`OncoKB ${r.status}: ${await r.text()}`);
    }
    const results = await r.json();
    const map = {};
    for (const item of results) {
        map[item.query.id] = item;
    }
    return map;
}

function isDriverOncoKb(indicator) {
    const o = indicator?.oncogenic?.toLowerCase?.() || '';
    return ONCOKB_ONCOGENIC.some(t => o === t);
}

function isGermline(m) {
    return (m.mutationStatus || '').toLowerCase() === 'germline';
}

async function main() {
    const mutations = await fetchMutations();
    console.log('raw mutations:', mutations.length);

    const sampleIds = [...new Set(mutations.map(m => m.sampleId))];
    const clinicalBySample = await fetchSampleTumorTypes(sampleIds);
    console.log('samples with clinical:', Object.keys(clinicalBySample).length);

    const somatic = mutations.filter(m => !isGermline(m));
    console.log('somatic (exclude germline):', somatic.length);

    const uniqueQueries = new Map();
    for (const m of somatic) {
        const tt = tumorTypeForSample(clinicalBySample, m);
        const q = proteinChangeQuery(m, tt);
        uniqueQueries.set(q.id, q);
    }
    console.log('unique OncoKB queries:', uniqueQueries.size);

    const indicatorMap = {};
    const allQueries = [...uniqueQueries.values()];
    for (let i = 0; i < allQueries.length; i += 100) {
        const batch = allQueries.slice(i, i + 100);
        Object.assign(indicatorMap, await annotateOncoKb(batch));
        process.stdout.write('.');
    }
    console.log('');

    const isDriverMutation = m => {
        const tt = tumorTypeForSample(clinicalBySample, m);
        const id = queryId(m, tt);
        return isDriverOncoKb(indicatorMap[id]);
    };

    let driverPerMutation = 0;
    let vusPerMutation = 0;
    for (const m of somatic) {
        if (isDriverMutation(m)) driverPerMutation++;
        else vusPerMutation++;
    }

    console.log('official-style per-mutation (OncoKB + somatic):', {
        driver: driverPerMutation,
        vus: vusPerMutation,
        total: somatic.length,
    });

    // Hotspot-only (Genome Nexus) — closer to public-site driver totals when OncoKB uses null tumor type
    const genomicKey = m => {
        const chr = (m.chr || '17').replace(/^chr/i, '');
        return `${chr},${m.startPosition},${m.endPosition},${m.referenceAllele},${m.variantAllele}`;
    };
    const uniqueLocs = [...new Set(somatic.map(genomicKey))];
    const gnIndex = {};
    for (let i = 0; i < uniqueLocs.length; i += 200) {
        const batchKeys = uniqueLocs.slice(i, i + 200);
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
        const anns = await (
            await fetch(
                'https://v1.genomenexus.org/cancer_hotspots/genomic',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batch),
                }
            )
        ).json();
        anns.forEach((a, idx) => {
            gnIndex[batchKeys[idx]] = a;
        });
    }
    let hotspotDrivers = 0;
    for (const m of somatic) {
        const a = gnIndex[genomicKey(m)];
        const hotspots = a?.hotspots || [];
        const isHotspot = hotspots.some(h => {
            const type = (h.type || '').toLowerCase();
            if ((m.mutationType || '').toLowerCase().includes('splice')) {
                return type.includes('splice');
            }
            return type.includes('single') || type.includes('indel');
        });
        if (isHotspot) hotspotDrivers++;
    }
    console.log('GN linear-cluster hotspots per-mutation:', { hotspotDrivers });

    const nullTtQueries = new Map();
    for (const m of somatic) {
        const q = proteinChangeQuery(m, null);
        nullTtQueries.set(q.id, q);
    }
    const nullMap = {};
    const nullQueries = [...nullTtQueries.values()];
    for (let i = 0; i < nullQueries.length; i += 100) {
        Object.assign(nullMap, await annotateOncoKb(nullQueries.slice(i, i + 100)));
    }
    let nullTtDrivers = 0;
    for (const m of somatic) {
        if (isDriverOncoKb(nullMap[queryId(m, null)])) nullTtDrivers++;
    }
    console.log('OncoKB null tumorType per-mutation:', {
        driver: nullTtDrivers,
        vus: somatic.length - nullTtDrivers,
        uniqueQueries: nullQueries.length,
    });

    let combinedDrivers = 0;
    for (const m of somatic) {
        const a = gnIndex[genomicKey(m)];
        const hotspots = a?.hotspots || [];
        const isHotspot = hotspots.some(h => {
            const type = (h.type || '').toLowerCase();
            if ((m.mutationType || '').toLowerCase().includes('splice')) {
                return type.includes('splice');
            }
            return type.includes('single') || type.includes('indel');
        });
        const oncoKb = isDriverOncoKb(nullMap[queryId(m, null)]);
        if (isHotspot || oncoKb) combinedDrivers++;
    }
    console.log('Hotspot OR OncoKB(null TT) per-mutation:', {
        driver: combinedDrivers,
        vus: somatic.length - combinedDrivers,
    });
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
