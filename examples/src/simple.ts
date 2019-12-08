import 'reflect-metadata';
import { injectable, StandardKernel, inject, singleton } from '../../src';

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
