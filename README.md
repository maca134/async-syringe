# AsyncSyringe

[![npm version](https://badge.fury.io/js/%40maca134%2Fasync-syringe.svg)](https://badge.fury.io/js/%40maca134%2Fasync-syringe)
[![dependencies Status](https://david-dm.org/maca134/async-syringe/status.svg)](https://david-dm.org/maca134/async-syringe)
[![devDependencies Status](https://david-dm.org/maca134/async-syringe/dev-status.svg)](https://david-dm.org/maca134/async-syringe?type=dev)
[![downloads](https://img.shields.io/npm/dm/@maca134/async-syringe)](https://www.npmjs.com/package/@maca134/async-syringe)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/maca134)

Based on [tsyringe](https://github.com/microsoft/tsyringe) but with support for async factories/init and does not use any global variables. I found this to be a problem when trying to inject from multiple modules.

Install use `npm install --save @maca134/async-syringe`

### Example
```typescript
import 'reflect-metadata';
import { StandardKernel, Kernel, inject, injectable, singleton, injectAll } from '.';

@injectable()
export class SomeClass1 {
	constructor() {
		console.log('SomeClass1 constructor');
	}
}

@injectable()
export class SomeClass2 {
	constructor(
		public someClass1: SomeClass1, 
		@injectAll('SomeNumber') public someNumbers: number[]
	) {
		console.log('SomeClass2 constructor');
	}
}

@singleton<SomeClass3>({ initialize: instance => instance.init() })
export class SomeClass3 {
	constructor(
		public someClass1: SomeClass1, 
		public someClass2: SomeClass2, 
		@inject('SomeNumber') public someNumber: number
	) {
		console.log('SomeClass3 constructor');
	}

	async init() {
		console.log('init start');
		await new Promise(r => setTimeout(() => r(), 5000));
		console.log('init end');
	}
}

(async () => {
	const kernel: Kernel = new StandardKernel();

	kernel.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(1), 1000)));
	kernel.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(2), 1000)));
	kernel.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(3), 1000)));
	kernel.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(4), 1000)));

	console.log(await kernel.resolve(SomeClass3));
})();
```