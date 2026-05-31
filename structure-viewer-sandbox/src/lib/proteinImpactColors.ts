export interface IProteinImpactTypeColors {
    missenseColor: string;
    missenseVusColor: string;
    inframeColor: string;
    inframeVusColor: string;
    truncatingColor: string;
    truncatingVusColor: string;
    spliceColor: string;
    spliceVusColor: string;
    fusionColor: string;
    fusionVusColor: string;
    otherColor: string;
    otherVusColor: string;
}

/** Same palette as cBioPortal AlterationColors / v0530 sandbox. */
export const DEFAULT_PROTEIN_IMPACT_TYPE_COLORS: IProteinImpactTypeColors = {
    missenseColor: '#008000',
    missenseVusColor: '#53D400',
    inframeColor: '#993404',
    inframeVusColor: '#a68028',
    truncatingColor: '#000000',
    truncatingVusColor: '#708090',
    spliceColor: '#e5802b',
    spliceVusColor: '#f0b87b',
    fusionColor: '#8B00C9',
    fusionVusColor: '#ce92e8',
    otherColor: '#cf58bc',
    otherVusColor: '#f96ae3',
};
