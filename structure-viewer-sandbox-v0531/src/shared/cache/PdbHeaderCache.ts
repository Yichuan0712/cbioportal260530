import { CacheData } from 'shared/lib/LazyMobXCache';
import { PdbHeader } from 'genome-nexus-ts-api-client';

export default class PdbHeaderCache {
    private headers: { [pdbId: string]: PdbHeader };

    constructor(headers: { [pdbId: string]: PdbHeader }) {
        this.headers = headers;
    }

    public get(pdbId: string): CacheData<PdbHeader> | null {
        const key = pdbId.toLowerCase();
        const data = this.headers[key];

        if (!data) {
            return { status: 'complete', data: null };
        }

        return { status: 'complete', data };
    }
}
