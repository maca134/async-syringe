import 'reflect-metadata';
import { injectable, StandardKernel } from '../../src';

(async () => {
	// to use initialize properly the decorator needs to be typed.
	// the initialize function can be a promise
	@injectable<Bar>({ initialize: (instance) => instance.init() })
	class Bar {
		init(): Promise<any> {
			return new Promise((resolve) => setTimeout(() => resolve(), 1000));
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
