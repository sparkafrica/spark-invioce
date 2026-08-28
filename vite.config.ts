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
			rollupConfig: { external: [/^@sentry\//] },
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
