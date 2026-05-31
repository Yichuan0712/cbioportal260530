import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'portable-to-cbioportal/**/*.spec.ts',
            'src/**/*.spec.ts',
        ],
    },
    resolve: {
        alias: {
            shared: path.resolve(__dirname, 'src/shared'),
        },
    },
});
