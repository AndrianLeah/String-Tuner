import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// Vue and TypeScript rules; formatting is left to Prettier (npm run format).
export default defineConfigWithVueTs(
	{
		name: 'app/files-to-lint',
		files: ['**/*.{ts,mts,tsx,vue}'],
	},

	globalIgnores(['**/dist/**', 'android/**', 'mockup/**', 'social-previews/**']),

	pluginVue.configs['flat/recommended'],
	vueTsConfigs.recommended,
	skipFormatting,
)
