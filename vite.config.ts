import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
// import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	optimizeDeps: { exclude: ['@react-pdf/renderer'] },
	ssr: { noExternal: [] },
	plugins: [
		devtools(),
		nitro({
			// preset: 'bun',
			rollupConfig: { external: [/^@sentry\//, '@react-pdf/renderer'] },
			routeRules: {
				// Cache dynamic-but-slow-changing routes
				'/activity/**': { swr: 300 }, // 5 min
				'/clients/**': { swr: 300 }, // 5 min
				'/dashboard/**': { swr: 300 }, // 5 min
				'/invoices/**': { swr: 300 }, // 5 min
				'/memos/**': { swr: 300 }, // 5 min
				'/settings/**': { swr: 300 }, // 5 min
				'/team/**': { swr: 300 }, // 5 min
				'/products/**': { swr: 300 }, // 5 min
				'/api/**': { swr: 60 }, // 1 min for API routes if needed
			},
		}),
		tailwindcss(),
		// tanstackRouter({
		// 	target: 'react',
		// 	autoCodeSplitting: true,
		// }),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
