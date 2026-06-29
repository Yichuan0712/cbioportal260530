import { Mutation } from 'cbioportal-ts-api-client';
import { IHotspotIndex, VariantAnnotation } from 'genome-nexus-ts-api-client';
import { isLinearClusterHotspot } from './cancerHotspotUtils';
import {
    extractGenomicLocation,
    genomicLocationString,
} from './genomicLocationUtils';
import {
    getMutationOncoKbIndicatorId,
    getOncoKbOncogenicFromIndicator,
    getStructuralVariantOncoKbIndicatorId,
    ONCOKB_ONCOGENIC_LOWERCASE,
    OncoKbIndicatorMap,
} from '../api/oncokbApi';
import { SampleClinicalMap } from '../api/clinicalDataApi';
import { StructuralVariant } from '../api/structuralVariantApi';

export const PUTATIVE_DRIVER = 'Putative_Driver';

export { ONCOKB_ONCOGENIC_LOWERCASE } from '../api/oncokbApi';

export interface PutativeDriverInfo {
    oncoKb: string;
    hotspots: boolean;
    customDriverBinary: boolean;
    customDriverTier?: string;
}

export interface SandboxDriverAnnotationSettings {
    oncoKb?: boolean;
    hotspots?: boolean;
    customBinary?: boolean;
    customTiers?: boolean;
}

const DEFAULT_DRIVER_SETTINGS: Required<SandboxDriverAnnotationSettings> = {
    oncoKb: true,
    hotspots: true,
    customBinary: true,
    customTiers: false,
};

export function getVariantAnnotationForMutation(
    mutation: Partial<Mutation>,
    indexedVariantAnnotations?: {
        [genomicLocation: string]: VariantAnnotation;
    }
): VariantAnnotation | undefined {
    if (!indexedVariantAnnotations) {
        return undefined;
    }

    const genomicLocation = extractGenomicLocation(mutation);

    if (!genomicLocation) {
        return undefined;
    }

    return indexedVariantAnnotations[genomicLocationString(genomicLocation)];
}

export function getOncoKbOncogenicFromAnnotation(
    annotation?: VariantAnnotation
): string {
    const oncogenic = annotation?.oncokb?.annotation?.oncogenic;

    if (!oncogenic) {
        return '';
    }

    if (
        ONCOKB_ONCOGENIC_LOWERCASE.indexOf(oncogenic.toLowerCase()) > -1
    ) {
        return oncogenic;
    }

    return '';
}

export function evaluatePutativeDriverInfo(
    mutation: Partial<Mutation>,
    annotation: VariantAnnotation | undefined,
    hotspotIndex: IHotspotIndex,
    settings: SandboxDriverAnnotationSettings = DEFAULT_DRIVER_SETTINGS,
    oncokbIndicatorMap?: OncoKbIndicatorMap,
    clinicalBySample?: SampleClinicalMap,
    structuralVariant?: StructuralVariant
): PutativeDriverInfo {
    const resolved = { ...DEFAULT_DRIVER_SETTINGS, ...settings };
    let oncoKb = '';

    if (resolved.oncoKb && oncokbIndicatorMap && clinicalBySample) {
        const indicatorId = structuralVariant
            ? getStructuralVariantOncoKbIndicatorId(
                  structuralVariant,
                  clinicalBySample
              )
            : getMutationOncoKbIndicatorId(
                  mutation as Mutation,
                  clinicalBySample
              );
        oncoKb = getOncoKbOncogenicFromIndicator(
            oncokbIndicatorMap[indicatorId]
        );
    } else if (resolved.oncoKb) {
        oncoKb = getOncoKbOncogenicFromAnnotation(annotation);
    }

    const hotspots =
        resolved.hotspots &&
        isLinearClusterHotspot(mutation as Mutation, hotspotIndex);
    const customDriverBinary = !!(
        resolved.customBinary && mutation.driverFilter === PUTATIVE_DRIVER
    );
    const customDriverTier =
        resolved.customTiers && mutation.driverTiersFilter
            ? mutation.driverTiersFilter
            : undefined;

    return {
        oncoKb,
        hotspots,
        customDriverBinary,
        customDriverTier,
    };
}

export function annotateMutationPutativeDriver(
    mutation: Mutation,
    putativeDriverInfo: PutativeDriverInfo
): Mutation {
    const putativeDriver = !!(
        putativeDriverInfo.oncoKb ||
        putativeDriverInfo.hotspots ||
        putativeDriverInfo.customDriverBinary ||
        putativeDriverInfo.customDriverTier
    );

    return {
        ...mutation,
        putativeDriver,
    } as Mutation;
}

export interface AnnotateMutationsOptions {
    indexedVariantAnnotations?: {
        [genomicLocation: string]: VariantAnnotation;
    };
    hotspotIndex?: IHotspotIndex;
    settings?: SandboxDriverAnnotationSettings;
    oncokbIndicatorMap?: OncoKbIndicatorMap;
    clinicalBySample?: SampleClinicalMap;
}

export function annotateMutationsWithPutativeDriver(
    mutations: Mutation[],
    indexedVariantAnnotations: {
        [genomicLocation: string]: VariantAnnotation;
    } = {},
    hotspotIndex: IHotspotIndex = {},
    settingsOrOptions?: SandboxDriverAnnotationSettings | AnnotateMutationsOptions
): Mutation[] {
    const options: AnnotateMutationsOptions =
        settingsOrOptions && 'oncokbIndicatorMap' in settingsOrOptions
            ? settingsOrOptions
            : {
                  settings: settingsOrOptions as SandboxDriverAnnotationSettings,
              };

    const annotations =
        options.indexedVariantAnnotations ?? indexedVariantAnnotations;
    const hotspots = options.hotspotIndex ?? hotspotIndex;

    return mutations.map(mutation => {
        const annotation = getVariantAnnotationForMutation(
            mutation,
            annotations
        );
        const info = evaluatePutativeDriverInfo(
            mutation,
            annotation,
            hotspots,
            options.settings,
            options.oncokbIndicatorMap,
            options.clinicalBySample
        );

        return annotateMutationPutativeDriver(mutation, info);
    });
}

export function annotateStructuralVariantsWithPutativeDriver(
    structuralVariants: StructuralVariant[],
    mutations: Mutation[],
    options: AnnotateMutationsOptions
): Mutation[] {
    return mutations.map((mutation, index) => {
        const sv = structuralVariants[index];
        const annotation = getVariantAnnotationForMutation(
            mutation,
            options.indexedVariantAnnotations
        );
        const info = evaluatePutativeDriverInfo(
            mutation,
            annotation,
            options.hotspotIndex || {},
            options.settings,
            options.oncokbIndicatorMap,
            options.clinicalBySample,
            sv
        );
        return annotateMutationPutativeDriver(mutation, info);
    });
}

export function isPutativeDriverMutation(
    mutation: Partial<Mutation>
): boolean {
    return mutation.putativeDriver === true;
}
