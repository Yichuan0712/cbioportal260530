export interface Mutation {
    proteinPosStart: number;
    proteinPosEnd: number;
    mutationType?: string;
    gene?: {
        hugoGeneSymbol: string;
    };
}
