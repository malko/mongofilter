/*https://github.com/malko/mongofilter brought to you under MIT licence by J.Gotti & A.Gibrat version: 1.0.4*/
/*jshint esnext:true, laxcomma:true, laxbreak:true*/
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = mongofilter;
var EXP_LIKE_PERCENT = /(^|[^%])%(?!%)/g // replace unescaped % chars
,
    EXP_LIKE_UNDERSCORE = /(^|[^\\])(_+)/g // replace unescaped _ char (must double antislash else will break in babel generated version)
,
    EXP_LIKE_UNDERSCORE_REPLACE = function EXP_LIKE_UNDERSCORE_REPLACE(m, p, _) {
	return p + new Array(_.length + 1).join('.');
},
    REGEXP_LIKE = function REGEXP_LIKE(pattern) {
	return new RegExp('^' + pattern.replace(EXP_LIKE_PERCENT, '$1.*').replace(EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE) + '$');
},
    EXP_REGEXP = /^\/([\s\S]*)\/([igm]*)$/,
    EXP_PRIMITIVE = /^(string|number|boolean)$/,
    REGEXP_PARSE = function REGEXP_PARSE(pattern) {
	if (typeof pattern === 'string') {
		(function () {
			var flag = undefined;
			pattern.replace(EXP_REGEXP, function (m, e, f) {
				pattern = e;flag = f;
			});
			pattern = flag ? new RegExp(pattern, flag) : new RegExp(pattern);
		})();
	}
	return pattern;
},
    IS_PRIMITIVE = function IS_PRIMITIVE(value) {
	return value == null || EXP_PRIMITIVE.test(typeof value) //jshint ignore:line
	;
},
    IS_TESTABLE = function IS_TESTABLE(value) {
	return value != null //jshint ignore:line
	;
},
    COMPARATORS = {
	$gt: function $gt(a, b) {
		return a > b;
	},
	$gte: function $gte(a, b) {
		return a >= b;
	},
	$lt: function $lt(a, b) {
		return a < b;
	},
	$lte: function $lte(a, b) {
		return a <= b;
	},
	$eq: function $eq(a, b) {
		return a === b;
	},
	$ne: function $ne(a, b) {
		return a !== b;
	},
	$regex: function $regex(a, b) {
		return IS_TESTABLE(a) && REGEXP_PARSE(b).test(a);
	},
	$like: function $like(a, b) {
		return IS_TESTABLE(a) && REGEXP_LIKE(b).test(a);
	},
	$nlike: function $nlike(a, b) {
		return !COMPARATORS.$like(a, b);
	},
	$in: function $in(a, b) {
		return !! ~b.indexOf(a);
	},
	$nin: function $nin(a, b) {
		return !COMPARATORS.$in(a, b);
	}
},
    LOGICS = {
	$or: 'some',
	$nor: 'some',
	$and: 'every'
},
    ALIASES = {
	$e: '$eq',
	$neq: '$ne'
};

/**
 * Handles AND, OR and NOR operators
 * @internal
 * @return {boolean}
 */
function logicalOperation(item, query, operator, property) {
	var result = undefined;
	if (Array.isArray(query)) {
		result = query[LOGICS[operator]](function (query, operator) {
			return getPredicate(query, operator, property)(item);
		});
	} else {
		result = Object.keys(query)[LOGICS[operator]](function (operator) {
			return getPredicate(query[operator], operator, property)(item);
		});
	}
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
	var res = true;
	if (IS_PRIMITIVE(query)) {
		res = COMPARATORS.$eq(item[property], query);
	} else if (Array.isArray(query)) {
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
function getPredicate(query, operator, property) {
	//jshint ignore:line
	operator = ALIASES[operator] || operator || '$and';

	return function (item) {
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

function mongofilter(query) {
	if (typeof query === 'string') {
		query = JSON.parse(query);
	}
	if (!query || IS_PRIMITIVE(query)) {
		throw new TypeError('Invalid query');
	}
	var predicate = getPredicate(query);
	predicate.filter = function (collection) {
		return collection && collection.filter ? collection.filter(predicate) : [];
	};
	predicate.filterItem = predicate;
	return predicate;
}

// allow comparators and aliases extensibility
mongofilter.aliases = ALIASES;
mongofilter.comparators = COMPARATORS;
module.exports = exports['default'];
