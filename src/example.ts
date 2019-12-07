import 'reflect-metadata';
import { Container, inject, injectable, singleton, injectAll } from '.';

@injectable()
export class SomeClass1 {
	constructor() {
		console.log('SomeClass1 constructor');
	}
}

@injectable()
export class SomeClass2 {
	constructor(public someClass1: SomeClass1, @injectAll('SomeNumber') public someNumbers: number[]) {
		console.log('SomeClass2 constructor');
	}
}

@singleton<SomeClass3>({ initialize: instance => instance.init() })
export class SomeClass3 {
	constructor(public someClass1: SomeClass1, public someClass2: SomeClass2, @inject('SomeNumber') public someNumber: number) {
		console.log('SomeClass3 constructor');
	}

	async init() {
		console.log('init start');
		await new Promise(r => setTimeout(() => r(), 5000));
		console.log('init end');
	}
}

(async () => {
	const container = new Container();

	container.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(1), 1000)));
	container.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(2), 1000)));
	container.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(3), 1000)));
	container.registerFactory('SomeNumber', _ => new Promise<number>(r => setTimeout(() => r(4), 1000)));

	console.log(await container.resolveAll(SomeClass3));
})();