import type { UserConfig } from 'vite';

export default {
    server: {
        proxy: {
            "/ws": {
                target: "http://localhost:3000",
                changeOrigin: true,
                ws: true,
            },
        }
    },
    build: {
        outDir: "../public",
        emptyOutDir: true,
    },
} satisfies UserConfig;