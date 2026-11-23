import { describe, expect, it } from 'vitest'
import en from './en.json'
import it_ from './it.json'
import zh from './zh.json'

type Messages = { [key: string]: string | Messages }

function flatten(messages: Messages, prefix = ''): Record<string, string> {
	const out: Record<string, string> = {}
	for (const [key, value] of Object.entries(messages)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (typeof value === 'string') out[path] = value
		else Object.assign(out, flatten(value, path))
	}
	return out
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()

const english = flatten(en)

describe.each([
	['it', flatten(it_)],
	['zh', flatten(zh)],
])('%s translation', (_lang, messages) => {
	it('has exactly the English keys', () => {
		expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort())
	})

	it('has no empty text', () => {
		for (const [key, text] of Object.entries(messages)) expect(text.trim(), key).not.toBe('')
	})

	it('keeps the same {placeholders} as English', () => {
		for (const [key, text] of Object.entries(english)) {
			expect(placeholders(messages[key] ?? ''), key).toEqual(placeholders(text))
		}
	})
})
