/*https://github.com/malko/mongofilter brought to you under MIT licence by Jonathan Gotti version: 1.0.3*/
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define('mongofilter', ['exports', 'module'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod);
		global.mongofilter = mod.exports;
	}
})(this, function (exports, module) {
	/*jshint esnext:true, laxcomma:true, laxbreak:true*/
	'use strict';

	module.exports = mongofilter;
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
	    EXP_PRIMITIVE = /^(string|number|boolean)$/,
	    IS_PRIMITIVE = function IS_PRIMITIVE(value) {
		return value == null || EXP_PRIMITIVE.test(typeof value);
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
		$neq: function $neq(a, b) {
			return a !== b;
		},
<<<<<<< HEAD
		REGEX: function REGEX(a, b) {
			if (a === undefined) {
				return false;
			}
			if (typeof b === 'string') {
				(function () {
					var flag = undefined,
					    exp = undefined;
					b.replace(/^\/([\s\S]*)\/([igm])?/, function (m, e, f) {
						exp = e;flag = f;
					});
					exp || (exp = b);
					b = flag ? new RegExp(exp, flag) : new RegExp(exp);
				})();
			}
			return !!a.match(b);
||||||| merged common ancestors
		REGEX: function REGEX(a, b) {
			if (typeof b === 'string') {
				(function () {
					var flag = undefined,
					    exp = undefined;
					b.replace(/^\/([\s\S]*)\/([igm])?/, function (m, e, f) {
						exp = e;flag = f;
					});
					exp || (exp = b);
					b = flag ? new RegExp(exp, flag) : new RegExp(exp);
				})();
			}
			return !!a.match(b);
=======
		$regex: function $regex(a, b) {
			return REGEXP_PARSE(b).test(a);
>>>>>>> only keep mongo notation for comparators & logical operators + various improvements
		},
		$like: function $like(a, b) {
			return REGEXP_LIKE(b).test(a);
		},
		$nlike: function $nlike(a, b) {
			return !REGEXP_LIKE(b).test(a);
		},
		$in: function $in(a, b) {
			return !! ~b.indexOf(a);
		},
		$nin: function $nin(a, b) {
			return ! ~b.indexOf(a);
		}
	},
	    LOGICS = {
		$or: 'some',
		$nor: 'some',
		$and: 'every'
	},
	    ALIAS = {
		$e: '$eq',
		$ne: '$neq'
	};

	/**
  * Handles AND, OR and NOR operators
  * @internal
  * @return {boolean}
  */
	function logicalOperation(item, query, operator, property) {
		var result = Array.isArray(query) ? query[LOGICS[operator]](function (query, operator) {
			return getPredicate(query, operator, property)(item);
		}) : Object.keys(query)[LOGICS[operator]](function (operator) {
			return getPredicate(query[operator], operator, property)(item);
		});
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
	function getPredicate(query, _x, property) {
		var operator = arguments[1] === undefined ? '$and' : arguments[1];

		return function (item) {
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
		return predicate;
	}

	mongofilter.alias = ALIAS;
	mongofilter.comparators = COMPARATORS;
});
