import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Global test setup
        globals: true,

        // Include test files
        include: ['tests/**/*.test.ts'],

        // Exclude directories
        exclude: ['node_modules', '.next', 'dist', 'coverage'],

        // Setup files to run before tests
        setupFiles: ['./tests/setup/mocks.ts'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                '.next/**',
                'tests/**',
                '*.config.ts',
                '*.config.js',
                'app/**', // Exclude route handlers for now
            ],
            include: [
                'src/lib/services/**',
                'src/lib/repositories/**',
                'src/lib/helpers/**',
                'src/lib/utils/**',
            ],
        },

        // Timeout for tests
        testTimeout: 10000,
    },

    // Path aliases to match tsconfig
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@/src': path.resolve(__dirname, './src'),
            '@/lib': path.resolve(__dirname, './lib'),
        },
    },
})
