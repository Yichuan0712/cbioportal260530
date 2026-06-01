import { DownloadControlOption } from 'cbioportal-frontend-commons';

export function getServerConfig() {
    return {
        skin_hide_download_controls: DownloadControlOption.SHOW_ALL,
    };
}
