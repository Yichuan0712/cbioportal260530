export interface Gene {
    entrezGeneId: number;
    hugoGeneSymbol: string;
    type?: string;
}

export interface MolecularProfile {
    molecularProfileId: string;
    studyId: string;
    molecularAlterationType?: string;
    name?: string;
}

export interface Sample {
    sampleId: string;
    studyId: string;
    patientId?: string;
}

export interface Mutation {
    alleleSpecificCopyNumber?: unknown;
    aminoAcidChange?: string;
    center?: string;
    chr?: string;
    driverFilter?: string;
    driverFilterAnnotation?: string;
    driverTiersFilter?: string;
    driverTiersFilterAnnotation?: string;
    endPosition?: number;
    entrezGeneId?: number;
    gene?: Gene;
    keyword?: string;
    molecularProfileId?: string;
    mutationStatus?: string;
    mutationType?: string;
    ncbiBuild?: string;
    patientId?: string;
    proteinChange?: string;
    proteinPosStart?: number;
    proteinPosEnd?: number;
    putativeDriver?: boolean;
    referenceAllele?: string;
    refseqMrnaId?: string;
    sampleId?: string;
    startPosition?: number;
    studyId?: string;
    uniquePatientKey?: string;
    uniqueSampleKey?: string;
    validationStatus?: string;
    variantAllele?: string;
    variantType?: string;
}
