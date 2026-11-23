// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { PRESET_TUNINGS, type TuningPreset } from '../data/tunings'
import { i18n } from '../i18n'
import { ACCEPT_CENTS } from '../tuner/engine'
import CentsMeter from './CentsMeter.vue'
import StringChips from './StringChips.vue'
import TuningSelector from './TuningSelector.vue'

const preset = (id: string) => PRESET_TUNINGS.find((t) => t.id === id) as TuningPreset

describe('StringChips', () => {
	const chips = (tuning: TuningPreset, props = {}) =>
		mount(StringChips, {
			props: {
				tuning,
				isListening: true,
				tunedStrings: new Set<number>(),
				lockedStringIndex: 0,
				...props,
			},
		}).findAll('.string-chip')

	it('shows the thinnest string first, numbered 1 as on a guitar', () => {
		const shown = chips(preset('std6')).map(
			(c) =>
				c.find('.chip-num').text() + c.find('.chip-note').text() + c.find('.chip-octave').text(),
		)
		expect(shown).toEqual(['1E4', '2B3', '3G3', '4D3', '5A2', '6E2'])
	})

	it('numbers a re-entrant ukulele from A (1) to the high G (4)', () => {
		const shown = chips(preset('uke_std')).map(
			(c) => c.find('.chip-num').text() + c.find('.chip-note').text(),
		)
		expect(shown).toEqual(['1A', '2E', '3C', '4G'])
	})

	it('marks the locked and the tuned strings, and selects by position in the tuning', async () => {
		const wrapper = mount(StringChips, {
			props: {
				tuning: preset('std6'),
				isListening: true,
				tunedStrings: new Set([0]),
				lockedStringIndex: 1,
			},
		})
		const all = wrapper.findAll('.string-chip')
		expect(all[5].classes()).toContain('tuned') // low E, index 0
		expect(all[4].classes()).toContain('locked') // A, index 1
		await all[0].trigger('click') // high E
		expect(wrapper.emitted('select')).toEqual([[5]])
	})
})

describe('CentsMeter', () => {
	it("draws the green band over the engine's in-tune window (1¢ = 1% of the ±50¢ track)", () => {
		const band = mount(CentsMeter, { props: { needlePercent: 50, status: 'idle' } }).find(
			'.meter-range',
		)
		const style = band.attributes('style') ?? ''
		expect(style).toContain(`left: ${50 - ACCEPT_CENTS}%`)
		expect(style).toContain(`width: ${2 * ACCEPT_CENTS}%`)
	})
})

describe('TuningSelector', () => {
	beforeEach(() => {
		i18n.global.locale.value = 'en'
	})

	it('says how many strings in the chosen language', async () => {
		i18n.global.locale.value = 'it'
		const wrapper = mount(TuningSelector, { global: { plugins: [i18n] } })
		await nextTick()
		expect(wrapper.find('.card-strings').text()).toBe('6 corde')
	})
})

describe('language of the page', () => {
	it('follows the language chosen in the settings', async () => {
		i18n.global.locale.value = 'zh'
		await nextTick()
		expect(document.documentElement.lang).toBe('zh')
		i18n.global.locale.value = 'it'
		await nextTick()
		expect(document.documentElement.lang).toBe('it')
	})
})
