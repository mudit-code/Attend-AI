import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatic background update, no intrusive banner
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'AttendAI - Smart Attendance System',
        short_name: 'AttendAI',
        description: 'Offline-first college attendance & campus management system',
        theme_color: '#0F172A',
        background_color: '#F4F5F8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Student Portal',
            short_name: 'Student',
            description: 'Open Student Attendance & Timetable',
            url: '/student',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Teacher Roll Call',
            short_name: 'Teacher',
            description: 'Open Teacher Scanner & Roll Call Desk',
            url: '/teacher',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Admin Dashboard',
            short_name: 'Admin',
            description: 'Open College Admin Intelligence',
            url: '/admin',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^\/api\/v1\/health$/,
            handler: 'NetworkOnly', // Always check real connectivity
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
