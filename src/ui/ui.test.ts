// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import UiListRow from './UiListRow.vue'
import UiSearchField from './UiSearchField.vue'
import UiSegmentedControl from './UiSegmentedControl.vue'
import UiSheet from './UiSheet.vue'
import UiStatusPill from './UiStatusPill.vue'
import UiSurface from './UiSurface.vue'
import { ICONS } from './icons'

describe('UiIcon', () => {
	it('is hidden from screen readers unless it has a label', () => {
		expect(mount(UiIcon, { props: { name: 'gear' } }).attributes('aria-hidden')).toBe('true')
		const named = mount(UiIcon, { props: { name: 'gear', label: 'Settings' } })
		expect(named.attributes('role')).toBe('img')
		expect(named.attributes('aria-label')).toBe('Settings')
	})

	it('draws every icon of the set on the 24 px grid', () => {
		for (const name of Object.keys(ICONS) as (keyof typeof ICONS)[]) {
			const svg = mount(UiIcon, { props: { name } })
			expect(svg.attributes('viewBox')).toBe('0 0 24 24')
			expect(svg.findAll('path').length).toBe(ICONS[name].paths.length)
		}
	})
})

describe('UiSurface', () => {
	it('maps each material to its class', () => {
		const cls = (material: 'glass' | 'sheet' | 'thin') =>
			mount(UiSurface, { props: { material } }).classes()
		expect(cls('glass')).toContain('ui-glass')
		expect(cls('sheet')).toEqual(expect.arrayContaining(['ui-glass', 'ui-glass--sheet']))
		expect(cls('thin')).toContain('ui-material')
		expect(cls('thin')).not.toContain('ui-glass')
	})
})

describe('UiButton', () => {
	it('is busy, not clickable, and shows a spinner while loading', async () => {
		const button = mount(UiButton, { props: { loading: true }, slots: { default: 'Starting…' } })
		expect(button.attributes('aria-busy')).toBe('true')
		expect(button.attributes('disabled')).toBeDefined()
		expect(button.find('.ui-button__spinner').exists()).toBe(true)
		await button.setProps({ loading: false })
		expect(button.attributes('aria-busy')).toBeUndefined()
		expect(button.find('.ui-button__spinner').exists()).toBe(false)
	})

	it('has a prominent and a neutral variant', () => {
		expect(mount(UiButton, { props: { variant: 'primary' } }).classes()).toContain(
			'ui-button--primary',
		)
		expect(mount(UiButton).classes()).toContain('ui-button--glass')
	})
})

describe('UiSegmentedControl', () => {
	const options = [
		{ value: 'a', label: 'Alpha' },
		{ value: 'b', label: 'Beta' },
		{ value: 'c', label: 'Gamma' },
	]
	// Mounted with a working v-model: each choice is written back into the props
	function control(modelValue: string) {
		const wrapper = mount(UiSegmentedControl, {
			props: {
				options,
				label: 'Letters',
				modelValue,
				'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }),
			},
			attachTo: document.body,
		})
		return wrapper
	}

	it('is a radio group with the chosen option checked and focusable', () => {
		const wrapper = control('b')
		expect(wrapper.attributes('role')).toBe('radiogroup')
		const radios = wrapper.findAll('[role=radio]')
		expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
		expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
		wrapper.unmount()
	})

	it('chooses by click and by arrow keys, wrapping around', async () => {
		const wrapper = control('a')
		await wrapper.findAll('[role=radio]')[2].trigger('click')
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c'])
		await nextTick()
		await wrapper.findAll('[role=radio]')[2].trigger('keydown', { key: 'ArrowRight' })
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])
		await nextTick()
		await wrapper.findAll('[role=radio]')[0].trigger('keydown', { key: 'ArrowLeft' })
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c'])
		wrapper.unmount()
	})
})

describe('UiSearchField', () => {
	it('clears with its button, which only shows when there is text', async () => {
		const field = mount(UiSearchField, {
			props: { label: 'Search', clearLabel: 'Clear', modelValue: '' },
		})
		expect(field.find('button').exists()).toBe(false)
		await field.setProps({ modelValue: 'drop' })
		await field.find('button[aria-label=Clear]').trigger('click')
		expect(field.emitted('update:modelValue')?.at(-1)).toEqual([''])
	})
})

describe('UiListRow', () => {
	it('marks the selected row and keeps its action outside the row button', async () => {
		const row = mount(UiListRow, {
			props: { title: 'Standard', selected: true },
			slots: { default: 'E4 B3', action: '<button class="delete">x</button>' },
		})
		const main = row.find('.ui-list-row__main')
		expect(main.attributes('aria-current')).toBe('true')
		expect(main.find('.ui-list-row__check').exists()).toBe(true)
		expect(main.find('.delete').exists()).toBe(false)
		await main.trigger('click')
		expect(row.emitted('select')).toHaveLength(1)
	})
})

describe('UiStatusPill', () => {
	it('keeps its place but hides from everyone when hidden', () => {
		const pill = mount(UiStatusPill, { props: { hidden: true }, slots: { default: 'Tune up' } })
		expect(pill.classes()).toContain('is-hidden')
		expect(pill.attributes('aria-hidden')).toBe('true')
	})
})

describe('UiSheet', () => {
	const sheet = () =>
		mount(UiSheet, {
			props: { title: 'Tunings', closeLabel: 'Close' },
			slots: { default: '<button class="inside">One</button>' },
			attachTo: document.body,
		})

	it('is a modal dialog named by its title', () => {
		const wrapper = sheet()
		const dialog = wrapper.find('[role=dialog]')
		expect(dialog.attributes('aria-modal')).toBe('true')
		const titleId = dialog.attributes('aria-labelledby')
		expect(wrapper.find(`#${titleId}`).text()).toBe('Tunings')
		wrapper.unmount()
	})

	it('closes with its button, with Escape and with a tap on the scrim, not inside', async () => {
		const wrapper = sheet()
		await wrapper.find('button[aria-label=Close]').trigger('click')
		await wrapper.find('[role=dialog]').trigger('keydown', { key: 'Escape' })
		await wrapper.trigger('click') // the scrim itself
		await wrapper.find('[role=dialog]').trigger('click') // inside: ignored
		expect(wrapper.emitted('close')).toHaveLength(3)
		wrapper.unmount()
	})
})
