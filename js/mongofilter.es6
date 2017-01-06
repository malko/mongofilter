/*jshint esnext:true, laxcomma:true, laxbreak:true, bitwise:false*/
/*global JSON*/
'use strict';

const EXP_LIKE_PERCENT = /(^|[^%])%(?!%)/g  // replace unescaped % chars
	, EXP_LIKE_UNDERSCORE = /(^|[^\\\\])(_+)/g  // replace unescaped _ char (must double antislash or will break in babel generated version)
	, EXP_LIKE_UNDERSCORE_REPLACE = (m, p, _) => p + (new Array(_.length + 1)).join('.')
	, REGEXP_LIKE = (pattern) => new RegExp('^' + pattern.replace(EXP_LIKE_PERCENT, '$1.*').replace(EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE) + '$') //jshint ignore:line
	, EXP_REGEXP = /^\/([\s\S]*)\/([igm]*)$/
	, EXP_PRIMITIVE = /^(string|number|boolean)$/
	, REGEXP_PARSE = (pattern) => {
		if (typeof pattern === 'string') {
			let flag;
			pattern.replace(EXP_REGEXP, (m, e, f) => { pattern = e; flag = f;});
			pattern = flag ? new RegExp(pattern, flag) : new RegExp(pattern);
		}
		return pattern;
	}
	, IS_PRIMITIVE = (value) => value == null || EXP_PRIMITIVE.test(typeof value) //jshint ignore:line
	, IS_TESTABLE = (value) => value != null //jshint ignore:line
	, COMPARATORS = {
		$gt: (a, b) => a > b
		, $gte: (a, b) => a >= b
		, $lt: (a, b) => a < b
		, $lte: (a, b) => a <= b
		, $eq: (a, b) => a === b
		, $ne: (a, b) => a !== b
		, $regex: (a, b) => IS_TESTABLE(a) && REGEXP_PARSE(b).test(a)
		, $like: (a, b) => IS_TESTABLE(a) && REGEXP_LIKE(b).test(a)
		, $nlike: (a, b) => !COMPARATORS.$like(a, b)
		, $in: (a, b) => !!~b.indexOf(a)
		, $nin: (a, b) => !COMPARATORS.$in(a, b)
	}
	, LOGICS = {
		$or: 'some'
		, $nor: 'every'
		, $and: 'every'
		, $not: 'some'
	}
	, ALIASES = {
		$e:'$eq'
		, $neq:'$ne'
	}
;

/**
 * Handles AND, OR and NOR operators
 * @internal
 * @return {boolean}
 */
function logicalOperation(item, query, operator, property) {
	let result;
	if (Array.isArray(query)) {
		result = query[LOGICS[operator]]((query, operator) => getPredicate(query, operator, property)(item));
	} else {
		result = Object.keys(query)[LOGICS[operator]]((operator) => getPredicate(query[operator], operator, property)(item));
	}
	return operator === '$nor' || operator === '$not' ? !result : result;
}

/**
 * Handles implicit compare ({prop: value} eg. prop === value, etc.)
 * @param  {Object}  item      collection's item to filter
 * @param  {*}       query     mongo query descriptor
 * @param  {String}  property  property name to test against query
 * @return {boolean}           does item property match query
 */
function implicitCompare(item, query, property) {
	let res = true;
	if (IS_PRIMITIVE(query)) {
		res = COMPARATORS.$eq(item[property], query);
	} else 	if (Array.isArray(query)) {
		res = COMPARATORS.$in(item[property], query);
	} else {
		res = getPredicate(query, '$and', property)(item);
	}
	return res;
}

/**
 * Perform item filtering
 * @param  {*}       query     mongo query descriptor
 * @param  {String}  operator  logic operator between query root clauses
 * @param  {String}  property  property name to test against query
 * @return {Function}          filter predicate function
 */
function getPredicate(query, operator, property) { //jshint ignore:line
	operator = ALIASES[operator] || operator || '$and';

	return (item) => {
		if (typeof item === 'string') {
			try {
				item = JSON.parse(item);
			} catch (e) {
				return false;
			}
		}
		if (operator in LOGICS) {
			return logicalOperation(item, query, operator, property);
		}
		if (operator in COMPARATORS) {
			return COMPARATORS[operator](item[property], query);
		}
		return implicitCompare(item, query, operator);
	};
}

//-- expose the module to the rest of the world --//
export function mongofilter (query) {
	if (typeof query === 'string') {
		query = JSON.parse(query);
	}
	if (!query || IS_PRIMITIVE(query)) {
		throw new TypeError('Invalid query');
	}
	let predicate = getPredicate(query);
	predicate.filter = (collection) => collection && collection.filter ? collection.filter(predicate) : [];
	predicate.filterItem = predicate;
	predicate.or = (subquery) => mongofilter({$or:[query, subquery]});
	predicate.and = (subquery) => mongofilter({$and:[query, subquery]});

	return predicate;
}

// allow comparators and aliases extensibility
export { ALIASES as aliases, COMPARATORS as comparators };
