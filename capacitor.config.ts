import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'com.accordatore.app',
	appName: 'String Tuner',
	webDir: 'dist',
	plugins: {
		SplashScreen: {
			launchShowDuration: 1200,
			launchAutoHide: true,
			backgroundColor: '#050508',
			androidSplashResourceName: 'splash',
			showSpinner: false,
		},
	},
}

export default config
