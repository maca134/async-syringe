# AsyncSyringe
[![build status](https://img.shields.io/travis/maca134/async-syringe)](https://travis-ci.org/maca134/async-syringe)
[![npm version](https://badge.fury.io/js/%40maca134%2Fasync-syringe.svg)](https://badge.fury.io/js/%40maca134%2Fasync-syringe)
[![dependencies Status](https://david-dm.org/maca134/async-syringe/status.svg)](https://david-dm.org/maca134/async-syringe)
[![downloads](https://img.shields.io/npm/dm/@maca134/async-syringe)](https://www.npmjs.com/package/@maca134/async-syringe)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/maca134)

Based on [tsyringe](https://github.com/microsoft/tsyringe) but with support for async factories/init and does not use any global variables. I found this to be a problem when trying to inject from multiple modules.

Install use `npm install --save @maca134/async-syringe`

### Examples

Working examples can be found in the src folder. Here is the code:

# Simple
```typescript
import 'reflect-metadata';
import { injectable, StandardKernel } from '../..';
import { inject } from '../../decorators/inject';
import { singleton } from '../../decorators/singleton';

(async () => {
	class Foo1 {}

	// indicates only 1 instances of this class will be created
	@singleton()
	class Foo2 {}

	// injectable decorator is only needed when there are constructor parameters
	@injectable()
	class Bar {
		constructor(
			public foo1: Foo1,
			public foo2: Foo2,
			@inject('value') public foobarFromValue: string,
			@inject('factory') public foobarFromFactoryValue: string,
			@inject('token') public foobarFromTokenFactoryValue: string
		) {}
	}

	const container = new StandardKernel();

	container.registerValue('value', 'foobarValue');
	container.registerFactory('factory', kernel => kernel.resolve('value'));
	container.registerToken('token', 'factory');

	// A token can be resolved without being registered if it is a class constructor
	console.log(await container.resolve(Bar));
	/*
	Bar {
		foo1: Foo1 {},
		foo2: Foo2 {},
		foobarFromValue: 'foobarValue',
		foobarFromFactoryValue: 'foobarValue',
		foobarFromTokenFactoryValue: 'foobarValue'
	}
	*/
})();
```

## Class Initializing
```typescript
import 'reflect-metadata';
import { injectable, StandardKernel } from '../..';

(async () => {
	// to use initialize properly the decorator needs to be typed.
	// the initialize function can be a promise
	@injectable<Bar>({ initialize: instance => instance.init() })
	class Bar {
		init(): Promise<any> {
			return new Promise(resolve => setTimeout(() => resolve(), 4000));
		}
	}

	@injectable()
	class Foo {
		constructor(public bar: Bar) {}
	}

	const container = new StandardKernel();
	console.log(await container.resolve(Foo));
	/*
	...4s...
	Foo { bar: Bar {} }
	*/
})();

```

## Factories
```typescript
import 'reflect-metadata';
import { injectable, StandardKernel } from '../..';
import { autoFactory } from '../../decorators/autoFactory';
import { Factory } from '../../Factory';

(async () => {
	@injectable()
	class Foo {
		constructor(public bar: string, public foobar: number) {}
	}

	@injectable()
	class Bar {
		constructor(@autoFactory(Foo) public fooFactory: Factory<typeof Foo>) {}
	}

	const container = new StandardKernel();
	const bar = await container.resolve(Bar);
	console.log(await bar.fooFactory.create('bar', 1337));
	/*
	Foo { bar: 'bar', foobar: 1337 }
	*/
})();

```