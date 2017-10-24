# CollectionView

Creates a view over a collection of items.

## Install

```
npm install ?
```

## Documentation

### Creating a view

#### Create from an Array&lt;T&gt;

```ts
function initialize(items: Products[])
    let collectionView = new CollectionView<Product>(items);
}
```

#### Create from an Observable

```ts
export class ProductsIndexController {
    public constructor(dataSource: Observable<Product>) {
        this.collectionView = new CollectionView<Product>(dataSource);
    }
}
```

### Filtering

#### Using a single filter

```ts
collectionView.filter = p => p.price > 100;
```

#### Using multiple filters

You can add multiple filters:

```ts
collectionView.filters.add(p => p.visible);
collectionView.filters.add(p => p.price > 100);
collectionView.filters.add(p => p.name.contains(searchText));
```

You can also identify them by name:

```ts
collectionView.filters.add("visible", p => p.visible);
collectionView.filters.add("price", p => p.price > 100);
```

so you can easily remove the filter you want:

```ts
collectionView.filters.remove("visible");
```

*Note: if you are using more than one filter, the property `filter` is going to return `undefined` or if you set its value, it is going to replace all the filters.*

### Ordering

#### By a single property

You can set the sort expression to a property name:

```ts
collectionView.sortExpression = "name";
```

or a function:

```ts
collectionView.sortExpression = u => u.name;
```

To set the direction:

```ts
collectionView.sortDirection = SortDirection.Descending;
```

or toggle sort order:

```ts
collectionView.toggleSortOrder();
```


#### By multiple properties

You can add as many sorting descriptors as you want:

```ts
collectionView.sorting.add("country");
collectionView.sorting.add(u => u.city);
collectionView.sorting.add(u => u.points, SortDirection.Descending);
```

You may also add complex logic to compare two items:

```ts
collectionView.sorting.add((u1, u2) => ...);
```

Toggle sort order:

```ts
collectionView.toggleSortOrderBy("country");
```

### Paging

You can set the page size and page index:

```ts
collectionView.pageSize = 10;
collectionView.pageIndex = 3;
```

*Note: page indexes are 0-based.*

You can also use the following methods to navigate between pages:

```ts
collectionView.page(3, 10);
collectionView.goToPage(3);
collectionView.goToNextPage();
collectionView.goToPreviousPage();
```

or check for available pages by `collectionView.canNavigateToPreviousPage` and `collectionView.canNavigateToNextPage`:

## Usage

### Angular

Create a `CollectionView` in your controller and make it public so the view can access it:

```ts
import { CollectionView } from "?";

export class ProductsIndexController {
    public constructor(
        data: Observable<Product>
    ) {
        this.collectionView = new CollectionView<Product>(data);
        this.collectionView.filter = p => p.available;
        this.collectionView.sortExpression = "name";
        this.collectionView.pageSize = 10;
    }

    public collectionView: CollectionView<Product>;
}
```

View:

```html
<ul>
    <li *ngFor="let product of collectionView.view">
        {{ product.name }}
    </li>
</ul>
```

Toggle sort order:

```html
<thead>
    <tr>
        <td (click)="collectionView.toggleSortOrderBy('name')">
            Name
            <span *ngIf="collectionView.sortExpression === 'name'">ASC</span>
        </td>
    </tr>
</thead>
```

Paging:

```html
<span *ngIf="collectionView.canNavigateToPreviousPage"
      (click)="collectionView.goToPreviousPage()">
    Previous
</span>
```

### Vanilla

Create and setup a collection view:

```ts
let collectionView = new CollectionView<Product>(data);
collectionView.filter = p => p.available;
collectionView.sortExpression = "name";
collectionView.pageSize = 10;
```

Subscribe for changes to re-render the view:

```ts
collectionView.asObservable().subscribe(data => {
    for (const item of data) {
        // render
    }
});
```

You can use the event-based pattern as well:

```ts
collectionView.changed.addEventListener(args => {
    for (const item of args.newView) {
        // render
    }
});
```

Make some changes on the view:

```ts
collectionView.goToNextPage();
```

## Develop

Install all dependencies:

```
npm install
```

Build:

```
npm run build
```