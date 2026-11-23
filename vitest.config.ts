import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		resolve: {
			alias: {
				// The package says "type": "module" but its "main" is CommonJS, which Node refuses;
				// Vite's browser build reads its "module" entry, so tests use that one too.
				'@lineiconshq/free-icons': fileURLToPath(
					new URL('./node_modules/@lineiconshq/free-icons/dist/index.esm.js', import.meta.url),
				),
			},
		},
		test: {
			// Let Vite load the icon packages (and the copy vue-lineicons carries) so the alias applies
			server: { deps: { inline: [/@lineiconshq\//] } },
		},
	}),
)
