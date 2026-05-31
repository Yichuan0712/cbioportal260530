import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['portable-to-cbioportal/**/*.spec.ts'],
    },
});
