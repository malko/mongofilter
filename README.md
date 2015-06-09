# mongofilter

Filtering elements in collection based on json filters with a mongoQuery like syntax

## Basic usage:
```javascript
var filter = mongofilter({name:{$like: '%test%'}, age:12});
// filtering a complete collection
filter.filter(collection);

// check a single item match against given filter
filter.filterItem(item); // return true or false
```

## Comparison operators

### Greater than: _$gt, >_
### Greater Equal than: _$gte, >=_
### Less than: _$lt, <_
### Less Equal than: _$lte, <=_
### Strict equality: _$e, $eq, =_
### Strict inequality: _$ne, !$e, <>, !=_


## Text matching operators

### Like: _$like, LIKE_
### Not like: _$nlike, !$like, NOT LIKE, UNLIKE_
### RegExp: _$regex, REGEX_


## Subset operator

### In: _$in, IN_
### Not in: _$nin, !$in, NOT IN, NOTIN_


## Logical operators

### And: _$and, &&, AND_
### Or: _$or, ||, OR_
### Nor: _$nor, NOR_
