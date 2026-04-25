/**
 * IStorage — abstracts key/value persistence so composables depend on this
 * interface rather than on `localStorage` directly (Dependency Inversion).
 */
export interface IStorage {
	get(key: string): string | null
	set(key: string, value: string): void
	remove(key: string): void
}

export const browserStorage: IStorage = {
	get: (key) => localStorage.getItem(key),
	set: (key, value) => localStorage.setItem(key, value),
	remove: (key) => localStorage.removeItem(key),
}
