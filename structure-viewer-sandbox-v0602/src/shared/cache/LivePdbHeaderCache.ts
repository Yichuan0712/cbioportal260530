import { action, makeObservable, observable } from 'mobx';
import { PdbHeader } from 'genome-nexus-ts-api-client';
import { CacheData } from 'shared/lib/LazyMobXCache';
import { fetchPdbHeaders } from '../../api/genomeNexusApi';

type HeaderEntry = CacheData<PdbHeader> | null | undefined;

/**
 * Fetches PDB headers from Genome Nexus on first access (async, MobX-observable).
 */
export default class LivePdbHeaderCache {
    @observable.ref private headers: { [pdbId: string]: HeaderEntry } = {};

    constructor() {
        makeObservable(this);
    }

    public get(pdbId: string): CacheData<PdbHeader> | null {
        const key = pdbId.toLowerCase();
        const existing = this.headers[key];

        if (existing === undefined) {
            this.loadHeader(key);
            return null;
        }

        return existing;
    }

    @action
    private setHeader(key: string, value: HeaderEntry) {
        this.headers = { ...this.headers, [key]: value };
    }

    private loadHeader(pdbId: string) {
        this.setHeader(pdbId, null);

        fetchPdbHeaders([pdbId])
            .then(headers => {
                const header =
                    headers.find(h => h.pdbId.toLowerCase() === pdbId) ||
                    headers[0];
                if (header) {
                    this.setHeader(pdbId, {
                        status: 'complete',
                        data: header,
                    });
                } else {
                    this.setHeader(pdbId, {
                        status: 'complete',
                        data: null,
                    });
                }
            })
            .catch(() => {
                this.setHeader(pdbId, {
                    status: 'error',
                    data: null,
                });
            });
    }
}
