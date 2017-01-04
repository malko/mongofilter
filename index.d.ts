declare module 'mongofilter' {
	export interface Predicate<X> {
		(item: any): boolean;
		filter<T extends X>(collection: T[]): T[];
		filterItem(item: X): boolean;
		or(query: Query): Predicate<X>;
		and(query: Query): Predicate<X>;
	}

	export type Query = any;

	export function mongofilter<X>(query: Query): Predicate<X>;

	const comparators: {};
	const aliases: {};
	export { comparators, aliases };

}
