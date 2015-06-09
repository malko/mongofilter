/*jshint esnext:true, laxcomma:true, laxbreak:true*/
"use strict";

const EXP_LIKE_PERCENT = /(^|[^%])%(?!%)/g  // replace unescaped % chars
	, EXP_LIKE_UNDERSCORE = /(^|[^\\\\])(_+)/g  // replace unescaped _ char (must double antislash else will break in babel generated version)
	, EXP_LIKE_UNDERSCORE_REPLACE = (m, p, _) => p + (new Array(_.length + 1)).join('.')
	, REGEXP_LIKE = (pattern) => new RegExp('^' + pattern.replace(EXP_LIKE_PERCENT, '$1.*').replace(EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE) + '$')
	, EXP_REGEXP = /^\/([\s\S]*)\/([igm]*)$/
	, REGEXP_PARSE = (pattern) => {
		if (typeof pattern === 'string') {
			let flag;
			pattern.replace(EXP_REGEXP, (m, e, f) => { pattern = e; flag = f;});
			pattern = flag ? new RegExp(pattern, flag) : new RegExp(pattern);
		}
		return pattern;
	}
	, EXP_PRIMITIVE = /^(string|number|boolean)$/
	, IS_PRIMITIVE = (value) => value == null || EXP_PRIMITIVE.test(typeof value)
	, COMPARATORS = {
		$gt: (a, b) => a > b
		, $gte: (a, b) => a >= b
		, $lt: (a, b) => a < b
		, $lte: (a, b) => a <= b
		, $eq: (a, b) => a === b
		, $neq: (a, b) => a !== b
		, $regex: (a, b) => REGEXP_PARSE(b).test(a)
		, $like: (a, b) => REGEXP_LIKE(b).test(a)
		, $nlike: (a, b) => !REGEXP_LIKE(b).test(a)
		, $in: (a, b) => !!~b.indexOf(a)
		, $nin: (a, b) => !~b.indexOf(a)
	}
	, LOGICS = {
		$or: 'some',
		$nor: 'some',
		$and: 'every'
	}
	, ALIAS = {
		$e:'$eq'
		, $ne:'$neq'
	}
;

/**
 * Handles AND, OR and NOR operators
 * @internal
 * @return {boolean}
 */
function logicalOperation(item, query, operator, property) {
	let result = Array.isArray(query) ?
		query[LOGICS[operator]]((query, operator) => getPredicate(query, operator, property)(item)) :
		Object.keys(query)[LOGICS[operator]]((operator) => getPredicate(query[operator], operator, property)(item))
	;
	return operator === '$nor' ? !result : result;
}

/**
 * Handles implicit compare ({prop: value} eg. prop === value, etc.)
 * @param  {Object}  item      collection's item to filter
 * @param  {*}       query     mongo query descriptor
 * @param  {String}  property  property name to test against query
 * @return {boolean}           does item property match query
 */
function implicitCompare(item, query, property) {
	if (IS_PRIMITIVE(query)) {
		return COMPARATORS.$eq(item[property], query);
	}
	if (Array.isArray(query)) {
		return COMPARATORS.$in(item[property], query);
	}
	return getPredicate(query, '$and', property)(item);
}

/**
 * Perform item filtering
 * @param  {*}       query     mongo query descriptor
 * @param  {String}  operator  logic operator between query root clauses
 * @param  {String}  property  property name to test against query
 * @return {Function}          filter predicate function
 */
function getPredicate(query, operator = '$and', property) {
	return (item) => {
		if (typeof item === 'string') {
			try {
				item = JSON.parse(item);
			} catch (e) {
				return false;
			}
		}
		operator = ALIAS[operator] || operator;
		if (operator in LOGICS) {
			return logicalOperation(item, query, operator, property);
		}
		if (operator in COMPARATORS) {
			return COMPARATORS[operator](item[property], query);
		}
		return implicitCompare(item, query, operator);
	};
}

export default function mongofilter (query) {
	if (typeof query === 'string') {
		query = JSON.parse(query);
	}
	if (!query || IS_PRIMITIVE(query)) {
		throw new TypeError('Invalid query');
	}
	let predicate = getPredicate(query);
	predicate.filter = (collection) => collection && collection.filter ? collection.filter(predicate) : [];
	return predicate;
}

mongofilter.alias = ALIAS;
mongofilter.comparators = COMPARATORS;
