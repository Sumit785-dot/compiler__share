import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [react()],
    base: command === 'build' ? '/static/' : '/', // Allow Django to serve assets in prod, root for dev
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8001',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://127.0.0.1:8001',
                ws: true,
                changeOrigin: true,
                secure: false,
            },
        },
        allowedHosts: ['carlo-unverificative-unconfoundedly.ngrok-free.dev'],
    },
}))
