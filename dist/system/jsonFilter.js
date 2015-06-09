/*https://github.com/malko/jsonFilter brought to you under MIT licence by Jonathan Gotti version: 0.0.1*/
System.register([], function (_export) {
	//jscs:disable
	/*jshint esnext:true, laxcomma:true, laxbreak:true*/
	'use strict';

	var EXP_LIKE_PERCENT, EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE, COMPARATORS, OPERATORS_MAP;

	_export('default', jsonFilter);

	/**
  * Handles AND OR and NOR operators
  * @internal
  * @return {boolean}
  */
	function logicalFilter(item, query, operator, property) {

		var res = [];

		if (!Array.isArray(query)) {
			// first run
			Object.keys(query).forEach(function (operator) {
				return res.push(new JsonFilter(query[operator], operator, property).filterItem(item));
			});
		} else {
			// real and or nor
			query.forEach(function (clause, operator) {
				return res.push(new JsonFilter(clause, operator, property).filterItem(item));
			});
		}

		if (operator === 'OR') {
			res = !! ~res.indexOf(true);
		} else if (operator === 'NOR') {
			res = ! ~res.indexOf(true);
		} else {
			res = ! ~res.indexOf(false);
		}

		return res;
	}

	/**
  * Handles implicit filters ({prop: value} and so on)
  * @return {boolean}
  */
	function implicitFilter(item, query, property) {
		var res = true;
		if ((typeof query).match(/string|number|boolean/)) {
			res = COMPARATORS['='](item[property], query);
		} else if (query instanceof Array) {
			res = COMPARATORS.IN(item[property], query);
		} else {
			res = new JsonFilter(query, 'AND', property).filterItem(item);
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

	//-- define a JsonFilter Object --//
	function JsonFilter(clause) {
		var operator = arguments[1] === undefined ? 'AND' : arguments[1];
		var propertyName = arguments[2] === undefined ? null : arguments[2];

		// console.log('propertyName', propertyName)
		OPERATORS_MAP[operator] && (operator = OPERATORS_MAP[operator]);

		this.filterItem = function filterItemMethod(item) {
			if (typeof item === 'string') {
				try {
					item = JSON.parse(item);
				} catch (e) {
					return false;
				}
			}
			return filterItem(item, clause, operator, propertyName);
		};
	}

	//-- expose the module to the rest of the world --//

	function jsonFilter(clause) {
		typeof clause === 'string' && (clause = JSON.parse(clause));
		if (!clause) {
			throw 'Invalid clause';
		}
		var filter = new JsonFilter(clause);
		var res = function res(item) {
			return filter.filterItem(item);
		};
		res.filter = filter.filterCollection;
		res.filterItem = filter.filterItem;
		return res;
	}

	return {
		setters: [],
		execute: function () {
			EXP_LIKE_PERCENT = /(^|[^%])%(?!%)/g // replace unescaped % chars
			;
			EXP_LIKE_UNDERSCORE = /(^|[^\\])(_+)/g // replace unescaped _ char (must double antislash else will break in babel generated version)
			;

			EXP_LIKE_UNDERSCORE_REPLACE = function EXP_LIKE_UNDERSCORE_REPLACE(m, p, _) {
				return p + new Array(_.length + 1).join('.');
			};

			COMPARATORS = {
				'>': function _(a, b) {
					return a > b;
				},
				'>=': function _(a, b) {
					return a >= b;
				},
				'<': function _(a, b) {
					return a < b;
				},
				'<=': function _(a, b) {
					return a <= b;
				},
				'=': function _(a, b) {
					return a === b;
				},
				'!=': function _(a, b) {
					return a !== b;
				},
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
				},
				LIKE: function LIKE(a, b) {
					var exp = new RegExp('^' + b.replace(EXP_LIKE_PERCENT, '$1.*').replace(EXP_LIKE_UNDERSCORE, EXP_LIKE_UNDERSCORE_REPLACE) + '$');
					return !!((a || a === 0) && a.toString().match(exp));
				},
				UNLIKE: function UNLIKE(a, b) {
					return !COMPARATORS.LIKE(a, b);
				},
				IN: function IN(a, b) {
					return !! ~b.indexOf(a);
				},
				NOTIN: function NOTIN(a, b) {
					return ! ~b.indexOf(a);
				}
			};
			OPERATORS_MAP = {
				$gt: '>',
				$gte: '>=',
				$lt: '<',
				$lte: '<=',
				$or: 'OR',
				'||': 'OR',
				'$nor': 'NOR',
				$and: 'AND',
				'&&': 'AND',
				$e: '=',
				$eq: '=',
				'<>': '!=',
				$ne: '!=',
				'!e': '!=',
				$in: 'IN',
				'!in': 'NOTIN',
				$nin: 'NOTIN',
				'NOT IN': 'NOTIN',
				$regex: 'REGEX',
				$like: 'LIKE',
				$nlike: 'UNLIKE',
				'!like': 'UNLIKE',
				'NOT LIKE': 'UNLIKE'
			};
			JsonFilter.prototype.filterCollection = function filterCollectionMethod(collection) {
				if (!collection) {
					return [];
				}
				return collection.filter(this.filterItem);
			};

			// allow comparators extensibility
			jsonFilter.comparators = COMPARATORS;
		}
	};
});
