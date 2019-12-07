import { INJECTION_TOKEN_METADATA_KEY, InjectionToken, ParamInjectionToken } from '../Kernel';

export function injectAll<T = any>(token: InjectionToken<T>) {
	return (target: any, _: string | symbol, parameterIndex: number) => {
		const tokens: Map<number, ParamInjectionToken<T>> = Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || new Map<number, ParamInjectionToken<T>>();
		tokens.set(parameterIndex, { token, multi: true });
		Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, tokens, target);
	};
}
