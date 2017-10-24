import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/startWith";
export declare type Comparable = string | number | boolean | Date;
export declare type Comparer<T> = (a: T, b: T) => number;
export declare type Predicate<T> = (obj: T) => boolean;
export declare type DescriptorChangedEventHandler = () => void;
/**
 * Represents a view for sorting, filtering, and navigating a data collection.
 */
export declare class CollectionView<T> {
    constructor(data: T[]);
    constructor(data: Observable<T[]>);
    private _data;
    /** Gets the original data. */
    readonly data: IterableIterator<T>;
    private setData(data);
    /**
     * Gets the actual view.
     */
    readonly view: IterableIterator<T>;
    private suppressFiltering;
    private _filteredView;
    readonly filteredView: IterableIterator<T>;
    readonly filters: CollectionViewFilterCollection<T>;
    filter(predicate: Predicate<T>): void;
    applyFilters(): void;
    private suppressSorting;
    private _sortedView;
    readonly sortedView: IterableIterator<T>;
    readonly sorting: CollectionViewSortingDescriptorCollection<T>;
    readonly sortExpression: ((model: T) => Comparable) | (keyof T) | undefined;
    readonly sortDirection: SortDirection | undefined;
    sort<TProperty extends keyof T>(propertyName: TProperty, direction?: SortDirection): void;
    sort<TSelector>(selector: (m: T) => TSelector, direction?: SortDirection): void;
    sort(comparer: Comparer<T>, direction?: SortDirection): void;
    toggleSortOrderBy(): void;
    toggleSortOrderBy(expression: keyof T): void;
    toggleSortOrderBy(expression: (item: T) => Comparable): void;
    applySorting(): void;
    private suppressPaging;
    private _pagedView;
    readonly pagedView: IterableIterator<T>;
    private _pageSize;
    pageSize: number;
    private _pageIndex;
    pageIndex: number;
    page(pageIndex: number, pageSize?: number): void;
    goToPage(pageIndex: number): void;
    applyPaging(): void;
    readonly canNavigateToPreviousPage: boolean;
    readonly canNavigateToNextPage: boolean;
    goToPreviousPage(): void;
    goToNextPage(): void;
    private _observable;
    private _observer;
    asObservable(): Observable<IterableIterator<T>>;
}
export declare class CollectionViewFilter<T> {
    readonly name: string;
    constructor(name: string, predicate: Predicate<T>);
    private _predicate;
    predicate: Predicate<T>;
    private _handlers;
    readonly changed: Event<DescriptorChangedEventHandler>;
    private raiseChanged();
}
export declare class CollectionViewFilterCollection<T> {
    private filters;
    private raiseChangedHandler;
    readonly count: number;
    find(name: string): CollectionViewFilter<T> | undefined;
    add(filter: CollectionViewFilter<T>): void;
    add(predicate: Predicate<T>): void;
    add(name: string, predicate: Predicate<T>): void;
    remove(name: string): void;
    remove(filter: CollectionViewFilter<T>): void;
    clear(): void;
    getAll(): IterableIterator<CollectionViewFilter<T>>;
    private _handlers;
    readonly changed: Event<DescriptorChangedEventHandler>;
    private raiseChanged();
}
export declare class CollectionViewSortingDescriptor<T> {
    constructor(propertyName: keyof T, direction?: SortDirection, comparer?: Comparer<any>);
    constructor(selector: (m: T) => Comparable, direction?: SortDirection, comparer?: Comparer<Comparable>);
    constructor(selector: (m: T) => any, direction?: SortDirection, comparer?: Comparer<any>);
    constructor(comparer: Comparer<T>, direction?: SortDirection);
    readonly selector: ((m: T) => Comparable) | keyof T;
    readonly propertyComparer: Comparer<any> | null;
    private _direction;
    direction: SortDirection;
    readonly comparer: Comparer<T>;
    toggle(): void;
    private _handlers;
    readonly changed: Event<DescriptorChangedEventHandler>;
    private raiseChanged();
}
export declare class CollectionViewSortingDescriptorCollection<T> {
    private descriptors;
    private raiseChangedHandler;
    readonly count: number;
    find(propertyName: keyof T): CollectionViewSortingDescriptor<T> | undefined;
    find(selector: (item: T) => any): CollectionViewSortingDescriptor<T> | undefined;
    find(comparer: Comparer<T>): CollectionViewSortingDescriptor<T> | undefined;
    add<TProperty extends keyof T>(propertyName: TProperty, direction?: SortDirection, comparer?: Comparer<T[TProperty]>): void;
    add<TSelector>(selector: (m: T) => TSelector, direction?: SortDirection, comparer?: Comparer<TSelector>): void;
    add(comparer: Comparer<T>): void;
    add(descriptor: CollectionViewSortingDescriptor<T>): void;
    remove(propertyName: keyof T): void;
    remove(descriptor: CollectionViewSortingDescriptor<T>): void;
    clear(): void;
    getAll(): IterableIterator<CollectionViewSortingDescriptor<T>>;
    private _handlers;
    readonly changed: Event<DescriptorChangedEventHandler>;
    private raiseChanged();
}
export declare enum SortDirection {
    Ascending = 0,
    Descending = 1,
}
export declare class Event<TDelegate extends () => void> {
    private handlers;
    constructor(handlers: TDelegate[]);
    addEventListener(handler: TDelegate): void;
    removeEventListener(handler: TDelegate): void;
}
