import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        react({
            // MobX / cBioPortal code uses legacy TypeScript decorators (@observer, @observable, …)
            babel: {
                plugins: [
                    ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
                    ['@babel/plugin-transform-class-properties', { loose: true }],
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            'shared/components/structureViewer': path.resolve(
                __dirname,
                'portable-to-cbioportal/structureViewer'
            ),
            shared: path.resolve(__dirname, 'src/shared'),
            config: path.resolve(__dirname, 'src/config'),
            'cbioportal-frontend-commons': path.resolve(
                __dirname,
                'src/commons/index.ts'
            ),
            'genome-nexus-ts-api-client': path.resolve(
                __dirname,
                'src/types/genome-nexus-api.ts'
            ),
            'cbioportal-ts-api-client': path.resolve(
                __dirname,
                'src/types/cbioportal-api.ts'
            ),
            'react-mutation-mapper': path.resolve(
                __dirname,
                'src/lib/proteinImpact.ts'
            ),
        },
    },
    optimizeDeps: {
        include: ['3dmol', 'jquery'],
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                // Match cbioportal-frontend/src/globalStyles/variables.scss (structureViewer.module.scss)
                additionalData: `$mediumGrey: #ddd; $borderColor: $mediumGrey; $cornerBorderRadius: 5px;`,
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/g2s-api': {
                target: 'https://g2s.genomenexus.org',
                changeOrigin: true,
                secure: true,
                rewrite: path => path.replace(/^\/g2s-api/, ''),
            },
            '/genomenexus-api': {
                target: 'https://v1.genomenexus.org',
                changeOrigin: true,
                secure: true,
                rewrite: path => path.replace(/^\/genomenexus-api/, ''),
            },
            '/cbioportal-api': {
                target: 'https://www.cbioportal.org',
                changeOrigin: true,
                secure: true,
                rewrite: path => path.replace(/^\/cbioportal-api/, ''),
            },
            '/alphafold-files': {
                target: 'https://alphafold.ebi.ac.uk',
                changeOrigin: true,
                secure: true,
                rewrite: path => path.replace(/^\/alphafold-files/, '/files'),
            },
            '/alphafold-api': {
                target: 'https://alphafold.ebi.ac.uk',
                changeOrigin: true,
                secure: true,
                rewrite: path => path.replace(/^\/alphafold-api/, ''),
            },
        },
    },
});
