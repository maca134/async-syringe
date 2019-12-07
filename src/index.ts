if (typeof Reflect === 'undefined' || !Reflect.getMetadata) {
	throw `tsyringe requires a reflect polyfill. Please add 'import "reflect-metadata"' to the top of your entry point.`;
}

export * from './Container';
export * from './Registry';
export * from './decorators/inject';
export * from './decorators/injectable';
export * from './decorators/injectAll';
export * from './decorators/singleton';
