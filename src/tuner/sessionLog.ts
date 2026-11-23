/**
 * Session log: lines collected while tuning and printed to the console as one pasteable block
 * when the session stops, for diagnosing detection problems. Development builds only: in
 * production nothing is collected or printed.
 */
export interface SessionLog {
	add(line: string): void
	clear(): void
	print(): void
}

export function createSessionLog(enabled: boolean = import.meta.env.DEV): SessionLog {
	let lines: string[] = []
	return {
		add(line) {
			if (enabled) lines.push(line)
		},
		clear() {
			lines = []
		},
		print() {
			if (!enabled) return
			console.log(
				'\n===== TUNER SESSION LOG (paste to Copilot) =====\n' +
					lines.join('\n') +
					'\n================================================\n',
			)
		},
	}
}
