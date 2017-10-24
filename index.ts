import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import "rxjs/add/operator/startWith";

export type Comparable = string | number | boolean | Date;
export type Comparer<T> = (a: T, b: T) => number;
export type Predicate<T> = (obj: T) => boolean;

export type DescriptorChangedEventHandler = () => void;
export type EventHandler<TEventArgs> = (args: TEventArgs) => void;

/**
 * Represents a view for sorting, filtering, and navigating a data collection.
 */
export class CollectionView<T> {
    public constructor(data: T[])
    public constructor(data: Observable<T[]>)
    public constructor(
        data: T[] | Observable<T[]>
    ) {
        this.filters.changed.addEventListener(() => this.applyFilters());
        this.sorting.changed.addEventListener(() => this.applySorting());

        if (data instanceof Observable) {
            data.subscribe(d => this.setData(d));
        } else {
            this.setData(data);
        }
    }

    private _data: T[] = [];
    /** Gets the original data as read-only. */
    public get data(): IterableIterator<T> {
        return this._data.values();
    }

    public setData(data: T[]): void {
        this._data = data;
        this.applyFilters();
    }

    /**
     * Gets the actual view.
     */
    public get view(): IterableIterator<T> {
        return this.pagedView;
    }

    // filtering
    private suppressFiltering = false;

    private _filteredView: T[];
    public get filteredView(): IterableIterator<T> {
        return this._filteredView.values();
    }

    public readonly filters = new CollectionViewFilterCollection<T>();

    public get filter(): Predicate<T> | undefined {
        if (this.filters.count !== 1)
            return;

        return this.filters.getAll().next().value.predicate;
    }
    public set filter(predicate: Predicate<T> | undefined) {
        this.suppressFiltering = true;

        this.filters.clear();

        if (typeof predicate !== "undefined")
            this.filters.add(new CollectionViewFilter<T>("Default", predicate));

        this.suppressFiltering = false;
        this.applyFilters();
    }

    public applyFilters(): void {
        if (this.suppressFiltering)
            return;

        this._filteredView = this._data;

        for (const filter of this.filters.getAll())
            this._filteredView = this._filteredView.filter(filter.predicate);

        this.applySorting();
        this.applyPaging();
    }

    // sorting
    private suppressSorting = false;
    private _sortedView: T[];
    public get sortedView(): IterableIterator<T> {
        return this._sortedView.values();
    }

    public readonly sorting = new CollectionViewSortingDescriptorCollection<T>();

    public get sortExpression(): ((model: T) => Comparable) | (keyof T) | undefined {
        if (this.sorting.count !== 1)
            return;

        return this.sorting.getAll().next().value.selector;
    }

    public get sortDirection(): SortDirection | undefined {
        if (this.sorting.count !== 1)
            return;

        return this.sorting.getAll().next().value.direction;
    }


    public sort<TProperty extends keyof T>(propertyName: TProperty, direction?: SortDirection): void
    public sort<TSelector>(selector: (m: T) => TSelector, direction?: SortDirection): void
    public sort(comparer: Comparer<T>, direction?: SortDirection): void
    public sort(
        expression: keyof T | ((m: T) => Comparable) | Comparer<T>,
        direction: SortDirection = SortDirection.Ascending
    ): void {
        this.suppressSorting = true;

        this.sorting.clear();
        this.sorting.add(expression as any, direction);

        this.suppressSorting = false;
        this.applySorting();
    }

    public toggleSortOrder(): void {
        this.suppressSorting = true;

        for (const descriptor of this.sorting.getAll())
            descriptor.toggle();

        this.suppressSorting = false;
        this.applySorting();
    }

    public toggleSortOrderBy(expression: keyof T): void
    public toggleSortOrderBy(expression: (item: T) => Comparable): void
    public toggleSortOrderBy(expression: ((item: T) => Comparable) | keyof T): void {
        if (typeof expression === "string") {
            const descriptor = this.sorting.find(expression);

            if (typeof descriptor === "undefined")
                throw new Error("Could not find sort descriptor.");

            descriptor.toggle();
        } else {
            const descriptor = this.sorting.find(expression as (item: T) => Comparable);

            if (typeof descriptor === "undefined")
                throw new Error("Could not find sort descriptor.");

            descriptor.toggle();
        }
    }

    public applySorting(): void {
        if (this.suppressSorting)
            return;

        for (const descriptor of this.sorting.getAll())
            this._sortedView = this._sortedView.sort(descriptor.comparer);

        this.applyPaging();
    }

    // paging
    private suppressPaging = false;

    private _pagedView: T[];
    public get pagedView(): IterableIterator<T> {
        return this._pagedView.values();
    }

    private _pageSize: number = 10;
    public get pageSize(): number {
        return this._pageSize;
    }
    public set pageSize(value: number) {
        if (value < 1)
            throw new Error("'pageSize' must be greater than or equal one.");

        this._pageSize = value;
        this.applyPaging();
    }


    private _pageIndex: number = 0;
    public get pageIndex(): number {
        return this._pageIndex;
    }
    public set pageIndex(value: number) {
        if (value < 0)
            throw new Error("'pageIndex' must be greater than or equal zero.");

        this._pageIndex = value;
        this.applyPaging();
    }

    public page(pageIndex: number, pageSize: number = this.pageSize): void {
        this.pageSize = pageSize;
        this.pageIndex = pageIndex;
    }

    public goToPage(pageIndex: number) {
        this.pageIndex = pageIndex;
    }

    public applyPaging(): void {
        if (this.suppressPaging)
            return;

        this._pagedView = this._sortedView.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);

        this.raiseChanged();
    }

    public get canNavigateToPreviousPage(): boolean {
        return this.pageIndex > 0;
    }

    public get canNavigateToNextPage(): boolean {
        return (this.pageIndex + 1) * this.pageSize < this._pagedView.length;
    }

    public goToPreviousPage(): void {
        if (!this.canNavigateToPreviousPage)
            throw new Error("Can't navigate to previous page.");
        
        this.page(this.pageIndex - 1);
    }

    public goToNextPage(): void {
        if (!this.canNavigateToNextPage)
            throw new Error("Can't navigate to next page.");

        this.page(this.pageIndex + 1);
    }


    private _handlers: EventHandler<CollectionViewChangedEventArgs<T>>[] = [];
    public readonly changed = new Event<EventHandler<CollectionViewChangedEventArgs<T>>>(this._handlers);
    private raiseChanged(): void {
        if (this._handlers.length === 0)
            return;

        const eventArgs = new CollectionViewChangedEventArgs(this, this.view);
        this._handlers.forEach(h => h(eventArgs));
    }

    private _observable: Observable<IterableIterator<T>> | undefined;
    private _observer: Observer<IterableIterator<T>> | undefined;

    /**
     * Returns the CollectionView as an Observable. Anytime the actual view changes, it gets pushed to the Observable.
     */
    public asObservable(): Observable<IterableIterator<T>> {
        // create and initialize observable lazy
        if (typeof this._observable === "undefined") {
            this._observable = (Observable.create((observer: Observer<IterableIterator<T>>) => {
                this._observer = observer;
                this.changed.addEventListener(() => this.pushToObserver(observer));
            }) as Observable<IterableIterator<T>>)
                .startWith(this.view);
        }

        return this._observable;
    }

    private pushToObserver(observer: Observer<IterableIterator<T>>): void {
        observer.next(this.view);
    }
}

export class CollectionViewChangedEventArgs<T> {
    public constructor(
        public readonly collectionView: CollectionView<T>,
        public readonly newView: IterableIterator<T>,
    ) { }
}

export class CollectionViewFilter<T> {
    public constructor(
        public readonly name: string,
        predicate: Predicate<T>
    ) {
        this._predicate = predicate;
    }

    private _predicate: Predicate<T>;

    public get predicate(): Predicate<T> {
        return this._predicate;
    }
    public set predicate(value: Predicate<T>) {
        this._predicate = value;
        this.raiseChanged();
    }


    private _handlers: DescriptorChangedEventHandler[] = [];
    public readonly changed = new Event<DescriptorChangedEventHandler>(this._handlers);
    private raiseChanged(): void {
        this._handlers.forEach(h => h());
    }
}

export class CollectionViewFilterCollection<T> {
    private filters: CollectionViewFilter<T>[] = [];
    private raiseChangedHandler: DescriptorChangedEventHandler = () => this.raiseChanged();

    public get count(): number {
        return this.filters.length;
    }

    public find(name: string): CollectionViewFilter<T> | undefined {
        return this.filters.find(f => f.name === name);
    }

    public add(filter: CollectionViewFilter<T>): void;
    public add(predicate: Predicate<T>): void;
    public add(name: string, predicate: Predicate<T>): void;
    public add(p1: CollectionViewFilter<T> | Predicate<T> | string, p2?: Predicate<T>): void {
        let filter: CollectionViewFilter<T> | null = null;

        if (p1 instanceof CollectionViewFilter)
            filter = p1;
        else if (typeof p1 === "string")
            filter = new CollectionViewFilter<T>(p1, p2!);
        else
        {
            const name = this.filters.length.toString();
            filter = new CollectionViewFilter<T>(name, p1);
        }
        
        if (typeof this.find(filter!.name) !== "undefined")
            throw new Error(`Filter with name '${filter!.name}' already exists.`);

        filter.changed.addEventListener(this.raiseChangedHandler);
        this.filters.push(filter!);
        this.raiseChanged();
    }

    public remove(name: string): void;
    public remove(filter: CollectionViewFilter<T>): void;
    public remove(p: string | CollectionViewFilter<T>): void {
        const filter = (p instanceof CollectionViewFilter) ? p : this.find(p);

        if (typeof filter === "undefined")
            throw new Error(`Filter does not exists.`);

        const index = this.filters.indexOf(filter);
        this.filters.splice(index, 1);
        filter.changed.removeEventListener(this.raiseChangedHandler);
        this.raiseChanged();
    }

    public clear(): void {
        for (let descriptor of this.filters)
            descriptor.changed.removeEventListener(this.raiseChangedHandler);

        this.filters.length = 0;
        this.raiseChanged();
    }
    
    public getAll(): IterableIterator<CollectionViewFilter<T>> {
        return this.filters.values();
    }

    
    private _handlers: DescriptorChangedEventHandler[] = [];
    public readonly changed = new Event<DescriptorChangedEventHandler>(this._handlers);
    private raiseChanged(): void {
        this._handlers.forEach(h => h());
    }
}

export class CollectionViewSortingDescriptor<T> {
    public constructor(propertyName: keyof T, direction?: SortDirection, comparer?: Comparer<any>)
    public constructor(selector: (m: T) => Comparable, direction?: SortDirection, comparer?: Comparer<Comparable>)
    public constructor(selector: (m: T) => any, direction?: SortDirection, comparer?: Comparer<any>)
    public constructor(comparer: Comparer<T>, direction?: SortDirection)
    public constructor(
        p1: ((m: T) => Comparable) | keyof T | Comparer<T>,
        direction: SortDirection = SortDirection.Ascending,
        comparer?: Comparer<any>,
    ) {
        if (typeof p1 === "string")
            this.selector = p1;
        else if (typeof p1 === "function") {
            if (p1.length === 1)
                this.selector = p1 as (m: T) => any;
            else if (p1.length === 2)
                this.comparer = p1 as Comparer<T>;
        }

        this._direction = direction;
        this.propertyComparer = comparer || null;
    }

    public readonly selector: ((m: T) => Comparable) | keyof T;
    public readonly propertyComparer: Comparer<any> | null;

    private _direction: SortDirection;

    public get direction(): SortDirection {
        return this._direction;
    }
    public set direction(value: SortDirection) {
        this._direction = value;
        this.raiseChanged();
    }

    public readonly comparer: Comparer<T>;
    

    public toggle(): void {
        this.direction = opposite(this.direction);
        
        function opposite(direction: SortDirection): SortDirection {
            return direction === SortDirection.Ascending ? SortDirection.Descending : SortDirection.Ascending;
        }
    }
    
    private _handlers: DescriptorChangedEventHandler[] = [];
    public readonly changed = new Event<DescriptorChangedEventHandler>(this._handlers);
    private raiseChanged(): void {
        this._handlers.forEach(h => h());
    }
}


export class CollectionViewSortingDescriptorCollection<T> {
    private descriptors: CollectionViewSortingDescriptor<T>[] = [];
    private raiseChangedHandler: DescriptorChangedEventHandler = () => this.raiseChanged();

    public get count(): number {
        return this.descriptors.length;
    }

    public find(propertyName: keyof T): CollectionViewSortingDescriptor<T> | undefined
    public find(selector: (item: T) => any): CollectionViewSortingDescriptor<T> | undefined
    public find(comparer: Comparer<T>): CollectionViewSortingDescriptor<T> | undefined
    public find(p1: (keyof T) | ((item: T) => any) | Comparer<T>): CollectionViewSortingDescriptor<T> | undefined {
        if (typeof p1 === "string")
            return this.descriptors.find(d => d.selector === p1);
        else
        {
            if (p1.length === 1)
                return this.descriptors.find(d => d.selector === p1);
            else
                return this.descriptors.find(d => d.comparer === p1);
        }
    }

    public add<TProperty extends keyof T>(propertyName: TProperty, direction?: SortDirection, comparer?: Comparer<T[TProperty]>): void
    public add<TSelector>(selector: (m: T) => TSelector, direction?: SortDirection, comparer?: Comparer<TSelector>): void
    public add(comparer: Comparer<T>): void
    public add(descriptor: CollectionViewSortingDescriptor<T>): void
    public add<TSelector>(
        p1: keyof T | ((m: T) => TSelector) | Comparer<T> | CollectionViewSortingDescriptor<T>,
        direction?: SortDirection.Ascending,
        comparer?: Comparer<any>
    ): void {
        let descriptor: CollectionViewSortingDescriptor<T> | null = null;

        if (p1 instanceof CollectionViewSortingDescriptor)
            descriptor = p1;
        else if (typeof p1 === "string")
            descriptor = new CollectionViewSortingDescriptor<T>(p1, direction, comparer);
        else if (typeof p1 === "function")
        {
            if (p1.length === 1)
                descriptor = new CollectionViewSortingDescriptor<T>(p1 as (m: T) => TSelector, direction, comparer);
            else if (p1.length === 2)
                descriptor = new CollectionViewSortingDescriptor<T>(p1 as Comparer<T>);
        }
        
        descriptor!.changed.addEventListener(this.raiseChangedHandler);
        this.descriptors.push(descriptor!);
        this.raiseChanged();
    }

    public remove(propertyName: keyof T): void;
    public remove(descriptor: CollectionViewSortingDescriptor<T>): void;
    public remove(p: keyof T | CollectionViewSortingDescriptor<T>): void {
        const descriptor = (p instanceof CollectionViewSortingDescriptor) ? p : this.find(p);

        if (typeof descriptor === "undefined")
            throw new Error(`Filter does not exists.`);

        const index = this.descriptors.indexOf(descriptor);
        this.descriptors.splice(index, 1);
        descriptor.changed.removeEventListener(this.raiseChangedHandler);
        this.raiseChanged();
    }

    public clear(): void {
        for (let descriptor of this.descriptors)
            descriptor.changed.removeEventListener(this.raiseChangedHandler);

        this.descriptors.length = 0;
        this.raiseChanged();
    }
    
    public getAll(): IterableIterator<CollectionViewSortingDescriptor<T>> {
        return this.descriptors.values();
    }

    
    private _handlers: DescriptorChangedEventHandler[] = [];
    public readonly changed = new Event<DescriptorChangedEventHandler>(this._handlers);
    private raiseChanged(): void {
        this._handlers.forEach(h => h());
    }
}

export enum SortDirection {
    Ascending,
    Descending,
}

export class Event<TDelegate extends Function> {
    public constructor(
        private handlers: TDelegate[]
    ) { }

    public addEventListener(handler: TDelegate): void {
        this.handlers.push(handler);
    }

    public removeEventListener(handler: TDelegate): void {
        const index = this.handlers.indexOf(handler);
        if (index === -1)
            throw new Error(`Handler could not be found.`);

        this.handlers.splice(index, 1);
    }
}
