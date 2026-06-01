/// <reference types="vite/client" />

declare module '*.module.scss' {
    const classes: { [key: string]: string };
    export default classes;
}

interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly MODE: string;
    readonly VITE_G2S_URL?: string;
    readonly VITE_GENOMENEXUS_URL?: string;
    readonly VITE_HUGO_GENE?: string;
    readonly VITE_ISOFORM_OVERRIDE_SOURCE?: string;
    readonly VITE_PREFERRED_PDB?: string;
    readonly VITE_USE_MOCK_DATA?: string;
    readonly VITE_USE_MOCK_MUTATIONS?: string;
    readonly VITE_CBIOPORTAL_URL?: string;
    readonly VITE_CBIOPORTAL_STUDY_IDS?: string;
    readonly VITE_CBIOPORTAL_MUTATION_PROFILES?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '3dmol' {
    const $3Dmol: any;
    export = $3Dmol;
}

declare module 'react-file-download' {
    export default function fileDownload(data: string, filename: string): void;
}

declare module 'better-react-spinkit' {
    export const ThreeBounce: React.ComponentType<any>;
}

declare module 'react-text-truncate' {
    export default class TextTruncate extends React.Component<any> {}
}
