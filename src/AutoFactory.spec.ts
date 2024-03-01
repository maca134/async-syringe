import 'reflect-metadata';
import { mocked } from 'jest-mock';
import { AutoFactory } from './AutoFactory';
import type { Kernel } from './Kernel';
import { StandardKernel } from './StandardKernel';

jest.mock('./StandardKernel');

test('autofactory', async () => {
	class Foo {
		constructor(
			public foo: string,
			public bar: string
		) {}
	}
	const foo = new Foo('foo', 'bar');
	const kernel = mocked(new StandardKernel());
	kernel.resolve.mockImplementation(() => Promise.resolve(foo) as any);

	const fooFactory = new AutoFactory<typeof Foo>(kernel as Kernel, 'token');

	expect(await fooFactory.create('foo', 'bar')).toStrictEqual(foo);
	expect(kernel.resolve.mock.calls).toHaveLength(1);
	expect(kernel.resolve.mock.calls[0][0] === 'token').toBeTruthy();
	expect(
		kernel.resolve.mock.calls[0][1] && kernel.resolve.mock.calls[0][1][0].index === 0
	).toBeTruthy();
	expect(
		kernel.resolve.mock.calls[0][1] && kernel.resolve.mock.calls[0][1][0].value === 'foo'
	).toBeTruthy();
	expect(
		kernel.resolve.mock.calls[0][1] && kernel.resolve.mock.calls[0][1][1].index === 1
	).toBeTruthy();
	expect(
		kernel.resolve.mock.calls[0][1] && kernel.resolve.mock.calls[0][1][1].value === 'bar'
	).toBeTruthy();
});
