# mongofilter

Filtering elements in collection based on json filters with a mongoQuery like syntax
[![Build Status](https://travis-ci.org/malko/mongofilter.svg?branch=master)](https://secure.travis-ci.org/malko/mongofilter)

## Basic usage:
```javascript
var filter = mongofilter({name:{$like: '%test%'}, age:12});
// filtering a complete collection
filter.filter(collection);
// or alternatively
collection.filter(filter);

// check a single item match against given filter
filter.filterItem(item); // return true or false

// also you can call 'and' or 'or' on the predicate directly:
filter.and({prop:val}).filter(collection);
filter.or({prop:val}).filter(collection);
```

## Comparison operators

### Greater than: _$gt_
### Greater Equal than: _$gte_
### Less than: _$lt_
### Less Equal than: _$lte_
### Strict equality: _$eq_
### Strict inequality: _$ne_


## Text matching operators

### Like: _$like_
### Not like: _$nlike_
### RegExp: _$regex_


## Subset operator

### In: _$in_
### Not in: _$nin_


## Logical operators

### And: _$and_
### Or: _$or_
### Nor: _$nor_
### Not: _$not_
