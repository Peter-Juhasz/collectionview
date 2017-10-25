import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/startWith";
/**
 * Represents a view for sorting, filtering, and navigating a data collection.
 */
export class CollectionView {
    constructor(data) {
        this._data = [];
        // filtering
        this.suppressFiltering = false;
        this.filters = new CollectionViewFilterCollection();
        // sorting
        this.suppressSorting = false;
        this.sorting = new CollectionViewSortingDescriptorCollection();
        // paging
        this.suppressPaging = false;
        this._pageSize = 10;
        this._pageIndex = 0;
        this._handlers = [];
        this.changed = new Event(this._handlers);
        this.filters.changed.addEventListener(() => this.applyFilters());
        this.sorting.changed.addEventListener(() => this.applySorting());
        if (data instanceof Observable) {
            data.subscribe(d => this.setData(d));
        }
        else {
            this.setData(data);
        }
    }
    /** Gets the original data as read-only. */
    get data() {
        return this._data.values();
    }
    setData(data) {
        this._data = data;
        this.applyFilters();
    }
    /**
     * Gets the actual view.
     */
    get view() {
        return this.pagedView;
    }
    get filteredView() {
        return this._filteredView.values();
    }
    get filter() {
        if (this.filters.count !== 1)
            return;
        return this.filters.getAll().next().value.predicate;
    }
    set filter(predicate) {
        this.suppressFiltering = true;
        this.filters.clear();
        if (typeof predicate !== "undefined")
            this.filters.add(new CollectionViewFilter("Default", predicate));
        this.suppressFiltering = false;
        this.applyFilters();
    }
    applyFilters() {
        if (this.suppressFiltering)
            return;
        this._filteredView = this._data;
        for (const filter of this.filters.getAll())
            this._filteredView = this._filteredView.filter(filter.predicate);
        this.applySorting();
        this.applyPaging();
    }
    get sortedView() {
        return this._sortedView.values();
    }
    get sortExpression() {
        if (this.sorting.count !== 1)
            return;
        return this.sorting.getAll().next().value.selector;
    }
    get sortDirection() {
        if (this.sorting.count !== 1)
            return;
        return this.sorting.getAll().next().value.direction;
    }
    sort(expression, direction = SortDirection.Ascending) {
        this.suppressSorting = true;
        this.sorting.clear();
        this.sorting.add(expression, direction);
        this.suppressSorting = false;
        this.applySorting();
    }
    toggleSortOrder() {
        this.suppressSorting = true;
        for (const descriptor of this.sorting.getAll())
            descriptor.toggle();
        this.suppressSorting = false;
        this.applySorting();
    }
    toggleSortOrderBy(expression) {
        if (typeof expression === "string") {
            const descriptor = this.sorting.find(expression);
            if (typeof descriptor === "undefined")
                throw new Error("Could not find sort descriptor.");
            descriptor.toggle();
        }
        else {
            const descriptor = this.sorting.find(expression);
            if (typeof descriptor === "undefined")
                throw new Error("Could not find sort descriptor.");
            descriptor.toggle();
        }
    }
    applySorting() {
        if (this.suppressSorting)
            return;
        for (const descriptor of this.sorting.getAll())
            this._sortedView = this._sortedView.sort(descriptor.comparer);
        this.applyPaging();
    }
    get pagedView() {
        return this._pagedView.values();
    }
    get pageSize() {
        return this._pageSize;
    }
    set pageSize(value) {
        if (value < 1)
            throw new Error("'pageSize' must be greater than or equal one.");
        this._pageSize = value;
        this.applyPaging();
    }
    get pageIndex() {
        return this._pageIndex;
    }
    set pageIndex(value) {
        if (value < 0)
            throw new Error("'pageIndex' must be greater than or equal zero.");
        this._pageIndex = value;
        this.applyPaging();
    }
    page(pageIndex, pageSize = this.pageSize) {
        this.pageSize = pageSize;
        this.pageIndex = pageIndex;
    }
    goToPage(pageIndex) {
        this.pageIndex = pageIndex;
    }
    applyPaging() {
        if (this.suppressPaging)
            return;
        this._pagedView = this._sortedView.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
        this.raiseChanged();
    }
    get canNavigateToPreviousPage() {
        return this.pageIndex > 0;
    }
    get canNavigateToNextPage() {
        return (this.pageIndex + 1) * this.pageSize < this._pagedView.length;
    }
    goToPreviousPage() {
        if (!this.canNavigateToPreviousPage)
            throw new Error("Can't navigate to previous page.");
        this.page(this.pageIndex - 1);
    }
    goToNextPage() {
        if (!this.canNavigateToNextPage)
            throw new Error("Can't navigate to next page.");
        this.page(this.pageIndex + 1);
    }
    raiseChanged() {
        if (this._handlers.length === 0)
            return;
        const eventArgs = new CollectionViewChangedEventArgs(this, this.view);
        this._handlers.forEach(h => h(eventArgs));
    }
    /**
     * Returns the CollectionView as an Observable. Anytime the actual view changes, it gets pushed to the Observable.
     */
    asObservable() {
        // create and initialize observable lazy
        if (typeof this._observable === "undefined") {
            this._observable = Observable.create((observer) => {
                this._observer = observer;
                this.changed.addEventListener(() => this.pushToObserver(observer));
            })
                .startWith(this.view);
        }
        return this._observable;
    }
    pushToObserver(observer) {
        observer.next(this.view);
    }
}
export class CollectionViewChangedEventArgs {
    constructor(collectionView, newView) {
        this.collectionView = collectionView;
        this.newView = newView;
    }
}
export class CollectionViewFilter {
    constructor(name, predicate) {
        this.name = name;
        this._handlers = [];
        this.changed = new Event(this._handlers);
        this._predicate = predicate;
    }
    get predicate() {
        return this._predicate;
    }
    set predicate(value) {
        this._predicate = value;
        this.raiseChanged();
    }
    raiseChanged() {
        this._handlers.forEach(h => h());
    }
}
export class CollectionViewFilterCollection {
    constructor() {
        this.filters = [];
        this.raiseChangedHandler = () => this.raiseChanged();
        this._handlers = [];
        this.changed = new Event(this._handlers);
    }
    get count() {
        return this.filters.length;
    }
    find(name) {
        return this.filters.find(f => f.name === name);
    }
    add(p1, p2) {
        let filter = null;
        if (p1 instanceof CollectionViewFilter)
            filter = p1;
        else if (typeof p1 === "string")
            filter = new CollectionViewFilter(p1, p2);
        else {
            const name = this.filters.length.toString();
            filter = new CollectionViewFilter(name, p1);
        }
        if (typeof this.find(filter.name) !== "undefined")
            throw new Error(`Filter with name '${filter.name}' already exists.`);
        filter.changed.addEventListener(this.raiseChangedHandler);
        this.filters.push(filter);
        this.raiseChanged();
    }
    remove(p) {
        const filter = (p instanceof CollectionViewFilter) ? p : this.find(p);
        if (typeof filter === "undefined")
            throw new Error(`Filter does not exists.`);
        const index = this.filters.indexOf(filter);
        this.filters.splice(index, 1);
        filter.changed.removeEventListener(this.raiseChangedHandler);
        this.raiseChanged();
    }
    clear() {
        for (let descriptor of this.filters)
            descriptor.changed.removeEventListener(this.raiseChangedHandler);
        this.filters.length = 0;
        this.raiseChanged();
    }
    getAll() {
        return this.filters.values();
    }
    raiseChanged() {
        this._handlers.forEach(h => h());
    }
}
export class CollectionViewSortingDescriptor {
    constructor(p1, direction = SortDirection.Ascending, comparer) {
        this._handlers = [];
        this.changed = new Event(this._handlers);
        if (typeof p1 === "string")
            this.selector = p1;
        else if (typeof p1 === "function") {
            if (p1.length === 1)
                this.selector = p1;
            else if (p1.length === 2)
                this.comparer = p1;
        }
        this._direction = direction;
        this.propertyComparer = comparer || null;
    }
    get direction() {
        return this._direction;
    }
    set direction(value) {
        this._direction = value;
        this.raiseChanged();
    }
    toggle() {
        this.direction = opposite(this.direction);
        function opposite(direction) {
            return direction === SortDirection.Ascending ? SortDirection.Descending : SortDirection.Ascending;
        }
    }
    raiseChanged() {
        this._handlers.forEach(h => h());
    }
}
export class CollectionViewSortingDescriptorCollection {
    constructor() {
        this.descriptors = [];
        this.raiseChangedHandler = () => this.raiseChanged();
        this._handlers = [];
        this.changed = new Event(this._handlers);
    }
    get count() {
        return this.descriptors.length;
    }
    find(p1) {
        if (typeof p1 === "string")
            return this.descriptors.find(d => d.selector === p1);
        else {
            if (p1.length === 1)
                return this.descriptors.find(d => d.selector === p1);
            else
                return this.descriptors.find(d => d.comparer === p1);
        }
    }
    add(p1, direction, comparer) {
        let descriptor = null;
        if (p1 instanceof CollectionViewSortingDescriptor)
            descriptor = p1;
        else if (typeof p1 === "string")
            descriptor = new CollectionViewSortingDescriptor(p1, direction, comparer);
        else if (typeof p1 === "function") {
            if (p1.length === 1)
                descriptor = new CollectionViewSortingDescriptor(p1, direction, comparer);
            else if (p1.length === 2)
                descriptor = new CollectionViewSortingDescriptor(p1);
        }
        descriptor.changed.addEventListener(this.raiseChangedHandler);
        this.descriptors.push(descriptor);
        this.raiseChanged();
    }
    remove(p) {
        const descriptor = (p instanceof CollectionViewSortingDescriptor) ? p : this.find(p);
        if (typeof descriptor === "undefined")
            throw new Error(`Filter does not exists.`);
        const index = this.descriptors.indexOf(descriptor);
        this.descriptors.splice(index, 1);
        descriptor.changed.removeEventListener(this.raiseChangedHandler);
        this.raiseChanged();
    }
    clear() {
        for (let descriptor of this.descriptors)
            descriptor.changed.removeEventListener(this.raiseChangedHandler);
        this.descriptors.length = 0;
        this.raiseChanged();
    }
    getAll() {
        return this.descriptors.values();
    }
    raiseChanged() {
        this._handlers.forEach(h => h());
    }
}
export var SortDirection;
(function (SortDirection) {
    SortDirection[SortDirection["Ascending"] = 0] = "Ascending";
    SortDirection[SortDirection["Descending"] = 1] = "Descending";
})(SortDirection || (SortDirection = {}));
export class Event {
    constructor(handlers) {
        this.handlers = handlers;
    }
    addEventListener(handler) {
        this.handlers.push(handler);
    }
    removeEventListener(handler) {
        const index = this.handlers.indexOf(handler);
        if (index === -1)
            throw new Error(`Handler could not be found.`);
        this.handlers.splice(index, 1);
    }
}
