if (typeof Reflect === 'undefined' || !Reflect.getMetadata) {
	throw `tsyringe requires a reflect polyfill. Please add 'import "reflect-metadata"' to the top of your entry point.`;
}
export const INJECTION_TOKEN_METADATA_KEY = 'ioc-tokens';
export const REG_OPTS_METADATA_KEY = 'ioc-opts';

export * from './StandardKernel';
export * from './Registry';
export * from './Kernel';
export * from './decorators/inject';
export * from './decorators/injectable';
export * from './decorators/injectAll';
export * from './decorators/singleton';
