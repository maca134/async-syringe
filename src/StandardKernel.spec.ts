import 'reflect-metadata';
import { StandardKernel } from './StandardKernel';
import { injectable } from './decorators/injectable';
import { injectAll } from './decorators/injectAll';
import { singleton } from './decorators/singleton';
import { Lifecycle, KernelModule, Kernel } from './Kernel';

let kernel: StandardKernel;
beforeEach(() => {
	kernel = new StandardKernel();
});

test('resolve class with no decorators', async () => {
	class Foo {}
	const foo = await kernel.resolve(Foo);
	expect(foo).toBeInstanceOf(Foo);
});

test('resolve classes with some having decorators', async () => {
	class Foo {}
	class Bar {}

	@injectable()
	class FooBar {
		constructor(public foo: Foo, public bar: Bar) {}
	}

	const fooBar = await kernel.resolve(FooBar);
	expect(fooBar).toBeInstanceOf(FooBar);
	expect(fooBar).toHaveProperty('foo');
	expect(fooBar).toHaveProperty('bar');
	expect(fooBar.foo).toBeInstanceOf(Foo);
	expect(fooBar.bar).toBeInstanceOf(Bar);
});

test('resolve classes with singleton', async () => {
	@singleton()
	class Foo {}

	@injectable()
	class Bar {
		constructor(public foo: Foo) {}
	}

	@injectable()
	class FooBar {
		constructor(public foo: Foo, public bar: Bar) {}
	}

	const fooBar = await kernel.resolve(FooBar);
	expect(fooBar).toBeInstanceOf(FooBar);
	expect(fooBar).toHaveProperty('foo');
	expect(fooBar).toHaveProperty('bar');
	expect(fooBar.bar).toHaveProperty('foo');
	expect(fooBar.foo).toBeInstanceOf(Foo);
	expect(fooBar.bar).toBeInstanceOf(Bar);
	expect(fooBar.bar.foo).toBeInstanceOf(Foo);
	expect(fooBar.foo === fooBar.bar.foo).toBeTruthy();
});

test('resolve factory', async () => {
	const mockedFactory = jest.fn().mockReturnValue('hello world');
	kernel.registerFactory('factory', mockedFactory);
	const [resolveA, resolveB] = await Promise.all([
		kernel.resolve('factory'),
		kernel.resolve('factory')
	]);
	expect(resolveA).toStrictEqual('hello world');
	expect(resolveB).toStrictEqual('hello world');
	expect(mockedFactory.mock.calls).toHaveLength(2);
});

test('resolve singleton factory', async () => {
	const mockedFactory = jest.fn().mockReturnValue('hello world');
	kernel.registerFactory('factory', mockedFactory, {
		lifecycle: Lifecycle.Singleton
	});
	const [resolveA, resolveB] = await Promise.all([
		kernel.resolve('factory'),
		kernel.resolve('factory')
	]);
	expect(resolveA).toStrictEqual('hello world');
	expect(resolveB).toStrictEqual('hello world');
	expect(mockedFactory.mock.calls).toHaveLength(1);
});

test('resolve value', async () => {
	kernel.registerValue('value', 'hello world');
	expect(await kernel.resolve('value')).toStrictEqual('hello world');
});

test('resolve token', async () => {
	kernel.registerValue('foo', 'hello world');
	kernel.registerToken('bar', 'foo');
	kernel.registerToken('foobar', 'bar');
	expect(await kernel.resolve('foobar')).toStrictEqual('hello world');
});

test('bad token', () => {
	expect(() => kernel.registerClass('badtoken')).toThrowError();
	expect(() => kernel.registerClass('badtoken', {})).toThrowError();
});

test('unregister token', () => {
	kernel.registerValue('foo', 'bar');
	kernel.unregister('foo');
	expect(() => kernel.resolve('foo')).toThrowError();
});

test('register class by token', async () => {
	class Foo {}
	kernel.registerClass('Foo', Foo);
	const foo = await kernel.resolve(Foo);
	expect(foo).toBeInstanceOf(Foo);
});

test('register class by token with options', async () => {
	class Foo {}
	kernel.registerClass('Foo', Foo, { lifecycle: Lifecycle.Singleton });
	const [foo1, foo2] = await Promise.all([
		kernel.resolve('Foo'),
		kernel.resolve('Foo')
	]);
	expect(foo1).toBeInstanceOf(Foo);
	expect(foo2).toBeInstanceOf(Foo);
	expect(foo1 === foo2).toBeTruthy();
});

test('register class with primitive types', async () => {
	@injectable()
	class Foo1 {
		constructor(public foo: number) {}
	}

	@injectable()
	class Foo2 {
		constructor(public foo: string) {}
	}

	@injectable()
	class Foo3 {
		constructor(public foo: number[]) {}
	}

	@injectable()
	class Foo4 {
		constructor(public foo: {}) {}
	}

	@injectable()
	class Foo5 {
		constructor(public foo: () => void) {}
	}

	expect(() => kernel.registerClass(Foo1)).toThrowError();
	expect(() => kernel.registerClass(Foo2)).toThrowError();
	expect(() => kernel.registerClass(Foo3)).toThrowError();
	expect(() => kernel.registerClass(Foo4)).toThrowError();
	expect(() => kernel.registerClass(Foo5)).toThrowError();
});

test('resolveAll', async () => {
	class Foo {}

	kernel.registerClass('Foo', Foo);
	kernel.registerClass('Foo', Foo);
	kernel.registerClass('Foo', Foo);
	kernel.registerClass('Foo', Foo);

	const allFoo = await kernel.resolveAll<Foo>('Foo');
	expect(Array.isArray(allFoo)).toBeTruthy();
	expect(allFoo).toHaveLength(4);
	expect(allFoo.every(foo => foo instanceof Foo)).toBeTruthy();
});

test('injectAll', async () => {
	@injectable()
	class Foo {
		constructor(@injectAll('Bar') public bar: string[]) {}
	}
	kernel.registerValue('Bar', 'bar');
	kernel.registerValue('Bar', 'bar');
	kernel.registerValue('Bar', 'bar');
	kernel.registerValue('Bar', 'bar');

	const foo = await kernel.resolve(Foo);
	expect(foo).toBeInstanceOf(Foo);
	expect(Array.isArray(foo.bar)).toBeTruthy();
	expect(foo.bar).toHaveLength(4);
	expect(foo.bar.every(b => typeof b === 'string')).toBeTruthy();
});

test('dependencyTree', () => {
	@injectable()
	class Foo {}

	@injectable()
	class Bar {
		constructor(public foo: Foo) {}
	}

	@injectable()
	class FooBar {
		constructor(public foo: Foo, public bar: Bar) {}
	}

	const tree = kernel.dependencyTree(FooBar);

	expect(tree.lifecycle).toStrictEqual(Lifecycle[Lifecycle.Transient]);
	expect(tree.children).toHaveLength(2);
	expect(
		tree.children.find(child => child.name === 'Bar')
	).not.toBeUndefined();
	expect(
		tree.children.find(child => child.name === 'Foo')
	).not.toBeUndefined();
});

test('scoped instance', async () => {
	@injectable({ lifecycle: Lifecycle.Scoped })
	class ScopedFoo {}

	@injectable()
	class Foo {
		constructor(public scopedFoo: ScopedFoo) {}
	}

	@injectable()
	class Bar {
		constructor(public scopedFoo: ScopedFoo, public foo: Foo) {}
	}

	const bar1 = await kernel.resolve(Bar);
	const bar2 = await kernel.resolve(Bar);

	expect(bar1).toBeInstanceOf(Bar);
	expect(bar2).toBeInstanceOf(Bar);

	expect(bar1.scopedFoo === bar1.foo.scopedFoo).toBeTruthy();
	expect(bar2.scopedFoo === bar2.foo.scopedFoo).toBeTruthy();
	expect(bar1.scopedFoo !== bar2.scopedFoo).toBeTruthy();
});

test('load module', async () => {
	class Foo {}
	class FooModule implements KernelModule {
		load(kernel: Kernel): void {
			kernel.registerClass(Foo);
		}
	}
	kernel.load(new FooModule());
	const foo = await kernel.resolve(Foo);
	expect(foo).toBeInstanceOf(Foo);
});

test('get kernel', async () => {
	expect(kernel === (await kernel.resolve(StandardKernel))).toBeTruthy();
});
