/*jshint forin:false, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, indent:2, maxerr:50, laxcomma:true, expr:true , white:false*/
(function(exports){
	"use strict";
	var exportName = (typeof exportNames !== 'undefined') && exportNames.jsonFilter || 'jsonFilter'
		,operatorsMap = {
			$gt:'>'
			,$gte:'>='
			,$lt:'<'
			,$lte:'<='
			,$or:'OR'
			,'||':'OR'
			,'$nor':'NOR'
			,$and:'AND'
			,'&&':'AND'
			,$e:'='
			,'<>':'!='
			,$ne:'!='
			,'!e':'!='
			,$in :'IN'
			,'!in':'NOT IN'
			,$nin:'NOT IN'
			,$regex:'REGEX'
			,$like:'LIKE'
			,$nlike:'NOT LIKE'
			,'!like':'NOT LIKE'
		}
	;
	function JsonFilter(clause,subject,context){
		var struct = clause, self=this;
		operatorsMap[subject] && (subject = operatorsMap[subject]);
		/**
		* filter a collection of items against the jsonFilter instance
		* @param array $collection collection of item to filter
		* @return array collection of filtered items are returned
		*/
		self.filter = function( collection ){
			var res = [];
			for( var i in collection){
				if( ! collection.hasOwnProperty(i)){
					continue;
				}
				if( self.filterItem(collection[i]) ){
					res.push(collection[i]);
				}
			}
			return res;
		};

		self.filterItem=function(obj){
			if( typeof obj === 'string'){
				obj = JSON.parse(obj);
			}
			var res = true,val;
			switch(subject){
				case '=':
				case '>':
				case '>=':
				case '<':
				case '<=':
				case '!=':
				case 'IN':
				case 'NOT IN':
					val = obj[context];
					if( subject === 'IN' || subject === 'NOT IN' ){
						res = !!(~struct.indexOf(val));
						if( subject==='NOT IN' ){
							res = ! res;
						}
						break;
					}
					if( subject === '=' ){
						subject = '===';
					}else if(subject === '!=' ){
						subject = '!==';
					}
					/*jshint evil:true*/
					res = new Function('val','struct','return (val '+subject+' struct)?true:false;')(val,struct);
					break;
				case 'LIKE':
				case 'NOT LIKE':
				case 'REGEX':
					if( subject === 'LIKE' || subject === 'NOT LIKE' ){
						struct = new RegExp('^' +
							struct
							.replace(/(^|[^%])%(?!%)/g,function(m,a){ return a+'.*';})
							.replace(/(?=[^\\]|^)_/g,function(){ return'.';}) +
							'$'
						);
					}else if( typeof struct === 'string') {
						var flag,exp;
						struct.replace(/^\/([\s\S]*)\/([igm])?/,function(m,e,f){exp=e;flag=f;});
						if(! exp ){
							exp = struct;
						}
						struct = flag ? new RegExp(exp,flag):new RegExp(exp);
					}
					val = obj[context];
					res = val.toString().match(struct)?true:false;
					if( subject === 'NOT LIKE'){
						res = !res;
					}
					break;
				case 'NOR':
				case 'OR':
				case 'AND':
					var tmp,tmpSubject; res = [];
					for(var k in struct){
						tmpSubject = k.toString().match(/^\d+$/)?null:k;
						if( context && k.match(/^(OR|AND|NOR)$/) ){
							tmpSubject = context;
						}
						tmp = new JsonFilter(struct[k],tmpSubject,context||subject);
						res.push(tmp.filterItem(obj));
					}
					if( subject === "OR" ){
						res = !!(~res.indexOf(true));
					}else if(subject ==='NOR') {
						res = !(~res.indexOf(true));
					}else{
						res = !(~res.indexOf(false));
					}
					break;
				default:
					if( (typeof struct ==='string') || (typeof struct === 'number') ){
						res = (obj[subject] === struct ?  true : false);
					}else if( struct instanceof Array ){
						res = (struct.indexOf(obj[subject]) !== -1);
					}else{
						var tmpFilter = new JsonFilter(struct,'AND',subject,context);
						res = tmpFilter.filterItem(obj);
					}
					break;
			}
			return res;
		};
	}

	function jsonFilter(clause){
		(typeof clause === 'string' ) && (clause = JSON.parse(clause));
		if(! clause ){
			throw ('Invalid clause');
		}
		return new JsonFilter(clause,'AND',null);
	}

	if( typeof exports !== 'undefined' ){
		exports[exportName] = jsonFilter;
	}
	if( typeof window !== 'undefined'){
		window[exportName] = jsonFilter;
	}

})(typeof exports === 'object' && exports || this );