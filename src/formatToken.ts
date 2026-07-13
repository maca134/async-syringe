import type { InjectionToken } from './Kernel';

export function formatToken(token: InjectionToken<any>) {
	return typeof token === 'function' ? token.name : String(token);
}
