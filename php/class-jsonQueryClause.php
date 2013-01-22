<?php

class jsonQueryClauseException extends Exception{}
/**
* @class jsonQueryClause
* @since 2012-09-21
* @author Jonathan Gotti <jgotti at modedemploi dot fr> for agence-modedemploi.com
* @license http://opensource.org/licenses/lgpl-license.php GNU Lesser General Public License
*/

class jsonQueryClause{
	protected $subject;
	protected $struct;
	protected $context;
	protected $dbInstance = null;
	static protected $operatorsMap = array(
		'$gt'=>'>'
		,'$gte'=>'>='
		,'$lt'=>'<'
		,'$lte'=>'<='
		,'$or'=>'OR'
		,'||'=>'OR'
		,'$and'=>'AND'
		,'&&'=>'AND'
		,'$e'=>'='
		,'<>'=>'!='
		,'$ne'=>'!='
		,'!e'=>'!='
		,'$in' => 'IN'
		,'!in'=>'NOT IN'
		,'$nin'=>'NOT IN'
		,'$regex'=>'REGEX'
		,'$like'=>'LIKE'
		,'$nlike'=>'NOT LIKE'
		,'!like'=>'NOT LIKE'
	);

	/**
	* @see jsonQueryClause::getInstance() instead
	* @internal
	*/
	protected function __construct($clause,$subject=null,$context=null,db $dbInstance=null){
		/*if( empty($clause) && $clause !== null ){
			throw new jsonQueryClauseException("Empty clause");
		}*/
		$this->struct = $clause;
		$this->subject=isset(self::$operatorsMap[$subject])?self::$operatorsMap[$subject]:$subject;
		$this->context=$context;
		$this->dbInstance = $dbInstance;
	}

	/**
	* return a new jsonQueryClause
	* @param object $clause json representation of the clause or php array/object representing the clause
	* @param db $dbInstance optional dbInstance for field and values escaping using proper database methods when trransforming to string
	* @return object  Description
	*/
	public static function getInstance($clause,db $dbInstance=null){
		if( is_string($clause) ){
			$clause = json_decode($clause);
			if( empty( $clause ) ){
				throw new jsonQueryClauseException('Invalid json string');
			}
		}
		if( empty( $clause ) ){
			throw new jsonQueryClauseException('Invalid clause');
		}
		return new self($clause,'AND',null,$dbInstance);
	}

	/**
	* shorthand for (string) jsonQueryClause::getInstance($clause).
	* @param object $clause json string representing the clause (may also be a php array)
	* @param db $dbInstance optional dbInstance for field and values escaping using proper database methods when trransforming to string
	* @return string
	*/
	public static function parse($clause,db $dbInstance=null){
		if( is_string($clause) ){
			$clause = json_decode($clause);
			if( empty( $clause ) ){
				throw new jsonQueryClauseException('Invalid json string');
			}
		}
		if( empty( $clause ) ){
			throw new jsonQueryClauseException('Invalid clause');
		}
		return (string) new self($clause,'AND',null,$dbInstance);
	}



	/**
	* filter a collection of items against the jsonQueryClause instance
	* @param array $collection collection of item to filter
	* @return array collection of filtered items are returned
	*/
	function filter( $collection){
		return array_filter($collection,array($this,'filterItem'));
	}

	/**
	* transform the jsonQueryClause to a SQL clause
	* @return string
	*/
	function __toString(){
		$clauseStr = "";
		try{
			switch($this->subject){
				case '=':
				case '>':
				case '>=':
				case '<':
				case '<=':
				case '!=':
				case 'LIKE':
				case 'NOT LIKE':
				case 'IN':
				case 'NOT IN':
					$val = $this->_getVal($this->struct);
					if( $val ==='NULL' ){
						if( $this->subject==='='){
							$this->subject='IS';
						}elseif( $this->subject==='!='){
							$this->subject='IS NOT';
						}
					}
					$clauseStr = ($this->context?"$this->context ":'')."$this->subject $val";
					break;
				case 'REGEX':
					$clauseStr = ($this->context?"$this->context ":'')."REGEXP ".$this->_getVal($this->struct);
					break;
				case '$nor':
					$clauseStr = "NOT ".(string) new self($this->struct,'OR',$this->subject?:$this->context,$this->dbInstance);
					break;
				case 'OR':
				case 'AND':
					$res = array();
					foreach( $this->struct as $k=>$v ){
						$subject = is_numeric($k)?null:$k;
						if( $this->context && ($k==='OR' || $k==='AND') ){
							$subject = $this->context;
						}
						$context = $this->context?$this->context:$this->subject;
						$res[] = (string) new self($v,$subject,$context,$this->dbInstance);
					}
					$clauseStr = implode(" $this->subject ",$res);
					if( count($res)>1 && $this->context ){
						$clauseStr = "( $clauseStr )";
					}
					break;
				default:
					if( is_scalar($this->struct) ){
						$clauseStr = $this->subject." = ".$this->_getVal($this->struct,1);
					}else if( null === $this->struct ){
						$clauseStr = $this->subject." IS NULL";
					}else if( is_array($this->struct) ){
						$clauseStr = (string) new self($this->struct,'IN',$this->subject,$this->dbInstance);
					}else{
						$clauseStr = (string) new self($this->struct,'AND',$this->subject?:$this->context,$this->dbInstance);
					}
					break;
			}
		}catch(Exception $e){
			return '';
		}
		return $clauseStr;
	}
/**
	* filter a single item against the jsonQueryClause instance
	* @param object $obj single object or array to filter against the jsonQueryClause instance
	* @return bool
	*/
	function filterItem($obj){
		if( is_string($obj) ){
			$obj = json_decode($obj);
		}
		$res = true;
		switch($this->subject){
			case '=':
			case '>':
			case '>=':
			case '<':
			case '<=':
			case '!=':
			case 'IN':
			case 'NOT IN':
				$val = self::_extractObjProp($obj,$this->context);
				if( $this->subject === 'IN' || $this->subject === 'NOT IN' ){
					$res = in_array($val,$this->struct);
					if( $this->subject==='NOT IN' ){
						$res = ! $res;
					}
					break;
				}
				if( $this->subject === '=' ){
					$this->subject = '===';
				}else if($this->subject === '!=' ){
					$this->subject = '!==';
				}
				eval("\$res = (\$val $this->subject \$this->struct )?true:false;");
				break;
			case 'LIKE':
			case 'NOT LIKE':
			case 'REGEX':
				if( $this->subject === 'LIKE' || $this->subject === 'NOT LIKE' ){
					$this->struct = '^'.preg_replace(
						array('/(?<![\\\\%])%/','/(?<![\\\\])_/')
						,array('.*','.')
						,$this->struct
					).'$';
				}
				$val = self::_extractObjProp($obj,$this->context);
				$res = (bool) preg_match("/$this->struct/",$val);
				if( $this->subject === 'NOT LIKE'){
					$res = !$res;
				}
				break;
			case '$nor':
			case 'OR':
			case 'AND':
				$res = array();
				foreach( $this->struct as $k=>$v ){
					$subject = is_numeric($k)?null:$k;
					if( $this->context && ($k==='OR' || $k==='AND' || $k==='$nor') ){
						$subject = $this->context;
					}
					$context = $this->context?$this->context:$this->subject;
					//~ echo "context $context $subject\n";
					$tmp = new self($v,$subject,$context);
					$res[] = $tmp->filterItem($obj);
				}
				if( $this->subject === "OR" ){
					$res = in_array(true,$res,true);
				}else if($this->subject ==='$nor') {
					$res = in_array(true,$res,true)?false:true;
				}else{
					$res = !in_array(false,$res,true);
				}
				break;
			default:
				if( is_scalar($this->struct) ){
					$res = self::_extractObjProp($obj,$this->subject) === $this->struct ?  true : false;
				}else if( is_array($this->struct) ){
					$res = in_array(self::_extractObjProp($obj,$this->subject),$this->struct,true);
				}else{
					$tmp = new self($this->struct,'AND',$this->subject?:$this->context);
					$res = $tmp->filterItem($obj);
				}
				break;
		}
		//~ echo "$this->subject, $res\n";
		return $res;
	}

	####### INTERNALS #######
	/**
	 * @internal
	 */
	protected function _getVal($v){
		if( is_array($v) ){
			return '( '.implode(', ',array_map(array($this,'_getVal'),$v)) .' )';
		}
		if( $this->dbInstance && is_string($v) ){
			return "'".$this->dbInstance->escape_string($v,'single')."'";
		}
		return var_export($v,1);
	}

	/**
	 * @internal
	 */
	static protected function _extractObjProp($obj,$prop){
		if( is_object($obj) ){
			return isset($obj->{$prop})?$obj->{$prop}:null;
		}
		return isset($obj[$prop])?$obj[$prop]:null;
	}

}


/* Sample usages

error_reporting(E_ALL | E_STRICT);
ini_set('error.display','on');
$values = '
[
{"id":1,"name":"toto","age":17}
,{"id":2,"name":"tito","age":18}
,{"id":3,"name":"tata","age":16}
,{"id":4,"name":"titi","age":20}
,{"id":5,"name":"tati","age":32}
,{"id":6,"name":"tato","age":52}
,{"id":7,"name":"tita","age":12}
,{"id":7,"name":"ti+ta","age":12}
]
';

$values = json_decode($values);
#- $query  = '{"OR":[{"age":{">":12,"<":22}},{"age":{">":32}}],"name":{"$like":"ta%"}}';
$query  = '{"name":{"$regex":"^ti\\+"}}';
$query  = '{"age":[35,null]}';
$query = '{"name": "Modedemploi"}';
$filter = jsonQueryClause::getInstance($query);
echo "$filter\n";exit;
require 'class-db.php';
require '../smvc/Collection.php';
$db = db::getInstance('mysqldb://hec_push;mdedev2;root;mde');
$db->beverbose=3;
$rows = $db->select_rows(
	'serviceRegistrations'
	,'token,properties'
	,array('WHERE application=? ORDER BY registrationId ',15)
);
$db->freeResults();
#- $rows = smvcCollection::init($rows)->_filter('properties',array($filter,'filterItem'));
$rows = smvcCollection::init($rows)->_getIndexedBy('token',true,true)->_map('json_decode');
$tokens = smvcCollection::init($tokens)->_getIndexedBy('token',true,true)->_map('json_decode');
print_r($filter->filter((array) $rows));exit;
#- $db = db::getInstance('mysqlidb://test;mdedev;root;');
echo "-------------------------------$query => $filter\n";
print_r($filter->filter($values));

/*
error_reporting(E_ALL | E_STRICT);
ini_set('error.display','on');

$clauses = array(
	'{ "x" : 3, "y" : "foo" }'
	,
	'{"gender": {"$ne": "f"}, "weight": {"$gte": 701}}'
	,
	'{"$or" : [{"age":19},{"age" : 22},{"age":23}]}'
	,
	'{"age":{"$or" : [{"=":19},{"=":22},{"=":23}]}}'
	,
	'{"$nor" : [{"age" : 19},{"age" : 22},{"age":23}] }'
	,
	'{"gender": "f", "$or": [{"loves": "apple"}, {"loves": "orange"}, {"weight": {"$lt": 500}}]}'
	,
	'{"name": "Nimue", "loves":["grape", "carrot"], "weight": 540,"gender": "f", "test":{"!=":null}}'
);


foreach($clauses as $c){
	echo $c,"=>\n",jsonQueryClause::parse($c)."\n-------------\n";
}
//*/
