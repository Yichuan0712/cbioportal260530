declare module '*.module.scss' {
    const classes: { [key: string]: string };
    export default classes;
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
