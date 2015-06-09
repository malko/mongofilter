#!/usr/bin/env nodejs

var mocha = require('mocha');
var expect = require('chai').expect;
var mongofilter = require('../dist/commonjs/mongofilter.js');

var testValues = [
	{"id":1,"name":"toto","age":17}  //0
	,{"id":2,"name":"tito","age":18} //1
	,{"id":3,"name":"tata","age":16} //2
	,{"id":4,"name":"titi","age":20} //3
	,{"id":5,"name":"tati","age":32} //4
	,{"id":6,"name":"tato","age":52} //5
	,{"id":7,"name":"tita","age":12} //6
	,{"id":7,"name":"ti+ta","age":12}//7
];

function getTestAssertValues(){
	for(var i=0,l=arguments.length,res=[];i<l;i++){
		res.push(testValues[arguments[i]]);
	}
	return res;
}

function getFilteredValues(filter){
	return mongofilter(filter).filter(testValues);
}

describe("basic equality filters", function() {
	it('should handle implicit comparison {prop:val}', function () {
		expect(getFilteredValues({age:12})).to.eql(getTestAssertValues(6,7));
	});
	it('should handle "=" comparison {prop:{"=":val}}', function () {
		expect(getFilteredValues({age:{"=":12}})).to.eql(getTestAssertValues(6,7));
	});
	it('should handle "$e" comparison {prop:{"$e":val}}', function () {
		expect(getFilteredValues({age:{"$e":12}})).to.eql(getTestAssertValues(6,7));
	});
	it('should handle "!=" comparison {prop:{"!=":val}}', function () {
		expect(getFilteredValues({age:{"!=":12}})).to.eql(getTestAssertValues(0,1,2,3,4,5));
	});
	it('should handle "$ne" comparison {prop:{"$ne":val}}', function () {
		expect(getFilteredValues({age:{"$ne":12}})).to.eql(getTestAssertValues(0,1,2,3,4,5));
	});
	it('should handle "!e" comparison {prop:{"!e":val}}', function () {
		expect(getFilteredValues({age:{"!e":12}})).to.eql(getTestAssertValues(0,1,2,3,4,5));
	});
	it('should handle "<>" comparison {prop:{"<>":val}}', function () {
		expect(getFilteredValues({age:{"<>":12}})).to.eql(getTestAssertValues(0,1,2,3,4,5));
	});
});

describe("basic IN filters", function() {
	it('should handle implicit array comparison {prop:[val,val,...]}', function () {
		expect(getFilteredValues({age:[12,17]})).to.eql(getTestAssertValues(0,6,7));
	});
	it('should handle IN comparison {prop:{IN:[val,val,...]}}', function () {
		expect(getFilteredValues({age:{'IN':[12,17]}})).to.eql(getTestAssertValues(0,6,7));
	});
	it('should handle $in comparison  {prop:{"$in":[val,val,...]}}', function () {
		expect(getFilteredValues({age:{'$in':[12,17]}})).to.eql(getTestAssertValues(0,6,7));
	});
	it('should handle NOT IN comparison {prop:{"NOT IN":[val,val,...]}}', function () {
		expect(getFilteredValues({age:{"NOT IN":[12,17]}})).to.eql(getTestAssertValues(1,2,3,4,5));
	});
	it('should handle !in comparison {prop:{"!in":[val,val,...]}}', function () {
		expect(getFilteredValues({age:{"!in":[12,17]}})).to.eql(getTestAssertValues(1,2,3,4,5));
	});
	it('should handle $nin comparison  {prop:{"$nin":[val,val,...]}}', function () {
		expect(getFilteredValues({age:{"$nin":[12,17]}})).to.eql(getTestAssertValues(1,2,3,4,5));
	});
});



describe("basic > filters", function () {
	it('should handle ">" comparison {prop:{">":val}}', function () {
		expect(getFilteredValues({age:{">":17}})).to.eql(getTestAssertValues(1,3,4,5));
	});
	it('should handle "$gt" comparison {prop:{"$gt":val}}', function () {
		expect(getFilteredValues({age:{"$gt":17}})).to.eql(getTestAssertValues(1,3,4,5));
	});
});

describe("basic >= filters", function () {
	it('should handle ">=" comparison {prop:{">=":val}}', function () {
		expect(getFilteredValues({age:{">=":17}})).to.eql(getTestAssertValues(0,1,3,4,5));
	});
	it('should handle "$gte" comparison {prop:{"$gte":val}}', function () {
		expect(getFilteredValues({age:{"$gte":17}})).to.eql(getTestAssertValues(0,1,3,4,5));
	});
});

describe("basic < filters", function () {
	it('should handle "<" comparison {prop:{"<":val}}', function () {
		expect(getFilteredValues({age:{"<":17}})).to.eql(getTestAssertValues(2,6,7));
	});
	it('should handle "$lt" comparison {prop:{"$lt":val}}', function () {
		expect(getFilteredValues({age:{"$lt":17}})).to.eql(getTestAssertValues(2,6,7));
	});
});

describe("basic <= filters", function () {
	it('should handle "<=" comparison {prop:{"<=":val}}', function () {
		expect(getFilteredValues({age:{"<=":17}})).to.eql(getTestAssertValues(0,2,6,7));
	});
	it('should handle "$lte" comparison {prop:{"$lte":val}}', function () {
		expect(getFilteredValues({age:{"$lte":17}})).to.eql(getTestAssertValues(0,2,6,7));
	});
});
describe("basic LIKE filters", function () {
	it('should handle "$like" comparison with starting "%" {prop:{"$like":"%val"}}', function () {
		expect(getFilteredValues({name:{"$like":'%to'}})).to.eql(getTestAssertValues(0,1,5));
	});
	it('should handle "LIKE" comparison with "%" in arbitrary place to match a single char{prop:{"LIKE":"v%l"}}', function () {
		expect(getFilteredValues({name:{"LIKE":'t%ta'}})).to.eql(getTestAssertValues(2,6,7));
	});
	it('should handle "$like" comparison with leading and ending "%" {prop:{"$like":"%a%"}}', function () {
		expect(getFilteredValues({name:{"$like":'%at%'}})).to.eql(getTestAssertValues(2,4,5));
	});
	it('should handle "$like" comparison with multiple "_" {prop:{"$like":"__val"}}', function () {
		expect(getFilteredValues({name:{"$like":'__to'}})).to.eql(getTestAssertValues(0,1,5));
	});
	it('should handle "$like" comparison starting and ending "_" {prop:{"$like":"_val__"}}', function () {
		expect(getFilteredValues({name:{"$like":'_i__'}})).to.eql(getTestAssertValues(1,3,6));
	});
	it('should handle "!$like" comparison {prop:{"!like":"%val"}}', function () {
		expect(getFilteredValues({name:{"!like":'%to'}})).to.eql(getTestAssertValues(2,3,4,6,7));
	});
	it('should handle "NOT LIKE" comparison {prop:{"NOT LIKE":"v%al"}}', function () {
		expect(getFilteredValues({name:{"NOT LIKE":'t%ta'}})).to.eql(getTestAssertValues(0,1,3,4,5));
	});
	it('should handle "$nlike" comparison {prop:{"$nlike":"%val%"}}', function () {
		expect(getFilteredValues({name:{"$nlike":'%at%'}})).to.eql(getTestAssertValues(0,1,3,6,7));
	});
	it('should handle "$nlike" comparison {prop:{"$nlike":"__val"}}', function () {
		expect(getFilteredValues({name:{"$nlike":'__to'}})).to.eql(getTestAssertValues(2,3,4,6,7));
	});
	it('should handle "$nlike" comparison {prop:{"$nlike":"_val__"}}', function () {
		expect(getFilteredValues({name:{"$nlike":'_i__'}})).to.eql(getTestAssertValues(0,2,4,5,7));
	});
});
describe("basic REGEX filters", function () {
	it('should handle RegExp object comparison {prop:{"REGEX":/val$/}}', function () {
		expect(getFilteredValues({name:{"REGEX":/to$/}})).to.eql(getTestAssertValues(0,1,5));
	});
	it('should handle string representing a regexp comparison {prop:{"REGEX":"val$"}}', function () {
		expect(getFilteredValues({name:{"REGEX":"to$"}})).to.eql(getTestAssertValues(0,1,5));
	});
	it('should handle string representing a regexp comparison {prop:{"REGEX":"/val$/"}}', function () {
		expect(getFilteredValues({name:{"REGEX":"/to$/"}})).to.eql(getTestAssertValues(0,1,5));
	});
	it('should handle string representing a regexp comparison {prop:{"REGEX":/^val$/}}', function () {
		expect(getFilteredValues({name:{"REGEX":/^(t.)\1$/}})).to.eql(getTestAssertValues(0,2,3));
	});
});
describe("basic AND/OR/NOR testing", function () {
	it('should use "$and" comparison as default {prop:{"$regex":"val$"},prop:val}', function () {
		expect(getFilteredValues({name:{$regex:"to$"},age:52})).to.eql(getTestAssertValues(5));
	});
	it('should handle "$or" comparison {$or:[{prop:val},{prop:val},...]}', function () {
		expect(getFilteredValues({$or:[{age:12},{age:52}]})).to.eql(getTestAssertValues(5,6,7));
	});
	it('should handle "OR" comparison {prop:{$regex:val},prop:{OR:[val,val]}}', function () {
		expect(getFilteredValues({OR:{age:[52,18]}})).to.eql(getTestAssertValues(1,5));
	});
	it('should handle "NOR" comparison {prop:{$regex:val},prop:{NOR:[val,val]}}', function () {
		expect(getFilteredValues({NOR:[{age:[52,18]},{name:'titi'}]})).to.eql(getTestAssertValues(0,2,4,6,7));
	});
});
