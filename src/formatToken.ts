import type { InjectionToken } from './Kernel';

export function formatToken(token: InjectionToken<any>) {
	const name = String(token).match(/^[^\s]+(:?[^\s]+)?/);
	return name ? name[0] : String(token);
}
