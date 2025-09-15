import 'reflect-metadata';
import { AutoFactory } from './AutoFactory';
import type { Kernel } from './Kernel';
import { StandardKernel } from './StandardKernel';
import { injectable } from './decorators/injectable';

let kernel: StandardKernel;
beforeEach(() => {
	kernel = new StandardKernel();
});

test('autofactory create', async () => {
	@injectable()
	class Foo {
		constructor(
			public foo: string,
			public bar: string
		) {}
	}

	const fooFactory = new AutoFactory<typeof Foo>(kernel as Kernel, Foo);
	const foo = await fooFactory.create('foo', 'bar');
	expect(foo).toBeInstanceOf(Foo);
	expect(foo.foo).toBe('foo');
	expect(foo.bar).toBe('bar');
});

test('autofactory createWithArgs', async () => {
	@injectable()
	class Baz {}

	@injectable()
	class Foo {
		constructor(
			public foo: string,
			public baz: Baz,
			public bar: number
		) {}
	}
	const kernel = new StandardKernel();

	const fooFactory = new AutoFactory<typeof Foo>(kernel, Foo);

	const foo = await fooFactory.createWithArgs({ 0: 'foo', 2: 123 });
	expect(foo).toBeInstanceOf(Foo);
	expect(foo.foo).toBe('foo');
	expect(foo.bar).toBe(123);
	expect(foo.baz).toBeInstanceOf(Baz);
});
