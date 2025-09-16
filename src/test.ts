import 'reflect-metadata';
import { store } from './Reflection';
import { StandardKernel } from './StandardKernel';
import { inject } from './decorators/inject';
import { injectable } from './decorators/injectable';
import { singleton } from './decorators/singleton';

@injectable()
class Foo1 { }

// indicates only 1 instances of this class will be created
@singleton()
class Foo2 { }

// injectable decorator is only needed when there are constructor parameters
@injectable()
class Bar {
	// properties can also be injected
	@inject()
	foo2!: Foo2;

	constructor(public foo1: Foo1) { }
}

(async () => {
	const kernel = new StandardKernel();

	console.log(store.get(Bar).metadata);
	console.log(await kernel.resolve(Bar));
	console.log('Test file executed');
})();
