/*jshint esnext:true, laxcomma:true, laxbreak:true*/
"use strict";

const EXP_LIKE_PERCENT = /(^|[^%])%(?!%)/g  // replace unescaped % chars
	, EXP_LIKE_UNDERSCORE = /(^|[^\\\\])(_+)/g  // replace unescaped _ char (must double antislash else will break in babel generated version)
	, EXP_LIKE_UNDERSCORE_REPLACE = (m, p, _) => p + (new Array(_.length + 1)).join('.')
	, COMPARATORS = {
		'>': function (a, b) { return a > b;}
		, '>=': function (a, b) { return a >= b;}
		, '<': function (a, b) { return a < b;}
		, '<=': function (a, b) { return a <= b;}
		, '=': function (a, b) { return a === b;}
		, '!=': function (a, b) { return a !== b;}
		, REGEX: function (a, b) {
			if (typeof b === 'string') {
				let flag, exp;
				b.replace(/^\/([\s\S]*)\/([igm])?/, (m, e, f) => { exp = e; flag = f;});
				exp || (exp = b);
				b = flag ? new RegExp(exp, flag): new RegExp(exp);
			}
			return !!a.match(b);
		}
		, LIKE: function (a, b) {
			var exp = new RegExp('^' + b.replace(EXP_LIKE_PERCENT, '$1.*').replace(EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE) + '$');
			return !!((a || a===0) && a.toString().match(exp));
		}
		, UNLIKE: function (a, b) {
			return !COMPARATORS.LIKE(a, b);
		}
		, IN: function (a, b) {
			return !!~b.indexOf(a);
		}
		, NOTIN: function (a, b) {
			return !~b.indexOf(a);
		}
	}
	, OPERATORS_MAP = {
		$gt:'>'
		, $gte:'>='
		, $lt:'<'
		, $lte:'<='
		, $or:'OR'
		, '||':'OR'
		, '$nor':'NOR'
		, $and:'AND'
		, '&&':'AND'
		, $e:'='
		, $eq:'='
		, '<>':'!='
		, $ne:'!='
		, '!e':'!='
		, $in :'IN'
		, '!in':'NOTIN'
		, $nin:'NOTIN'
		, 'NOT IN': 'NOTIN'
		, $regex:'REGEX'
		, $like:'LIKE'
		, $nlike:'UNLIKE'
		, '!like':'UNLIKE'
		, 'NOT LIKE': 'UNLIKE'
	}
;


/**
 * Handles AND OR and NOR operators
 * @internal
 * @return {boolean}
 */
function logicalFilter(item, query, operator, property) {

	let res = [];

	if (!Array.isArray(query)) { // first run
		Object.keys(query).forEach((operator) => res.push(new Mongofilter(query[operator], operator, property).filterItem(item)));
	} else { // real and or nor
		query.forEach((clause, operator) => res.push(new Mongofilter(clause, operator, property).filterItem(item)));
	}

	if (operator === "OR") {
		res = !!(~res.indexOf(true));
	} else if(operator ==='NOR') {
		res = !(~res.indexOf(true));
	} else {
		res = !(~res.indexOf(false));
	}

	return res;
}

/**
 * Handles implicit filters ({prop: value} and so on)
 * @return {boolean}
 */
function implicitFilter(item, query, property) {
	let res = true;
	if ((typeof query).match(/string|number|boolean/)) {
		res = COMPARATORS['='](item[property], query);
	} else if( query instanceof Array ) {
		res = COMPARATORS.IN(item[property], query);
	} else {
		res = new Mongofilter(query, 'AND', property).filterItem(item);
	}
	return res;
}

/**
 * Perform item filtering
 * @param  {*} item     item to filter
 * @param  {*} query    the query descriptor
 * @param  {string} operator current processing operator
 * @param  {string} property the property name to test
 * @return {boolean} whether the item was filtered or not
 */
function filterItem(item, query, operator, property) {

	if (operator in COMPARATORS) {
		return COMPARATORS[operator](item[property], query);
	}

	if (operator === 'AND' || operator === 'NOR' || operator === 'OR') {
		return logicalFilter(item, query, operator, property);
	}

	// in this case the operator is the property we wana test value against
	return implicitFilter(item, query, operator);
}


//-- define a Mongofilter Object --//
function Mongofilter(clause, operator = 'AND', propertyName = null) {
	// console.log('propertyName', propertyName)
	OPERATORS_MAP[operator] && (operator = OPERATORS_MAP[operator]);

	this.filterItem = function filterItemMethod(item) {
		if( typeof item === 'string'){
			try{
				item = JSON.parse(item);
			} catch(e) {
				return false;
			}
		}
		return filterItem(item, clause, operator, propertyName);
	};
}

Mongofilter.prototype.filterCollection = function filterCollectionMethod(collection) {
	if (! collection) {
		return [];
	}
	return collection.filter(this.filterItem);
};

//-- expose the module to the rest of the world --//
export default function mongofilter (clause) {
	(typeof clause === 'string' ) && (clause = JSON.parse(clause));
	if(! clause ){
		throw ('Invalid clause');
	}
	let filter = new Mongofilter(clause);
	let res = (item) => filter.filterItem(item);
	res.filter = filter.filterCollection;
	res.filterItem = filter.filterItem;
	return res;
}

// allow comparators extensibility
mongofilter.comparators = COMPARATORS;
