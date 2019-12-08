import 'reflect-metadata';
import { injectable, StandardKernel, autoFactory, Factory } from '../../src';

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
