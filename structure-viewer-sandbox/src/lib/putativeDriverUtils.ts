import { Mutation } from 'cbioportal-ts-api-client';
import { IHotspotIndex, VariantAnnotation } from 'genome-nexus-ts-api-client';
import { isLinearClusterHotspot } from './cancerHotspotUtils';
import {
    extractGenomicLocation,
    genomicLocationString,
} from './genomicLocationUtils';

export const PUTATIVE_DRIVER = 'Putative_Driver';

export const ONCOKB_ONCOGENIC_LOWERCASE = [
    'likely oncogenic',
    'oncogenic',
    'resistance',
];

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
    /** When true, MSK-style driverTiersFilter counts as putative driver (official default tiers on). */
    customTiers?: boolean;
}

const DEFAULT_DRIVER_SETTINGS: Required<SandboxDriverAnnotationSettings> = {
    // Results View uses OncoKB indicator map (tumor-type keyed); GN oncokb field is not equivalent.
    oncoKb: false,
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
    settings: SandboxDriverAnnotationSettings = DEFAULT_DRIVER_SETTINGS
): PutativeDriverInfo {
    const resolved = { ...DEFAULT_DRIVER_SETTINGS, ...settings };
    const oncoKb = resolved.oncoKb
        ? getOncoKbOncogenicFromAnnotation(annotation)
        : '';
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

export function annotateMutationsWithPutativeDriver(
    mutations: Mutation[],
    indexedVariantAnnotations: {
        [genomicLocation: string]: VariantAnnotation;
    },
    hotspotIndex: IHotspotIndex = {},
    settings?: SandboxDriverAnnotationSettings
): Mutation[] {
    return mutations.map(mutation => {
        const annotation = getVariantAnnotationForMutation(
            mutation,
            indexedVariantAnnotations
        );
        const info = evaluatePutativeDriverInfo(
            mutation,
            annotation,
            hotspotIndex,
            settings
        );

        return annotateMutationPutativeDriver(mutation, info);
    });
}

export function isPutativeDriverMutation(
    mutation: Partial<Mutation>
): boolean {
    return mutation.putativeDriver === true;
}
