// 注意： 箭頭函數會自動將 this 變數綁定到其定義時所在的物件，因此以下很多地方不能用箭頭函數。
// 參考： https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Functions/Arrow_functions

var extend = Object.assign;
var assert = function(cond) { if (!cond) throw Error(); return cond }
var eq=function(a,b) { return assert(a===b) }

var Law = {
// ref:https://en.wikipedia.org/wiki/Group_(mathematics)
// 封閉性：For all a, b in G, a • b, is also in G
close:function(set,op,a,b) { return set.contain(op(a,b)) },
// 結合性：For all a, b and c in G, (a • b) • c = a • (b • c).
associativity:function(op,a,b,c) { return eq(op(op(a,b),c), op(a,op(b,c))) },
// 單位元素：Identity element
identity:function(op,e,a) { return eq(op(e,a),a) },
// 反元素：Inverse element
inverse:function(op,a,ia,e) { return eq(op(a,ia),e) },

// ref : https://en.wikipedia.org/wiki/Group_homomorphism
// 同態：h(a • b) = h(a) • h(b) 
homomorphism:function(h, op, a, b) { return eq(h(op(a,b)), op(h(a), h(b)))},
// ref : https://en.wikipedia.org/wiki/Isomorphism
// 同構：h(a • b) = h(a) • h(b)
isomorphism:function(h1, h2, op, a, b) { 
  return homorphism(h1,op,a,b)&&homorphism(h2,op,h1(a),h1(b))
}
// ref : https://en.wikipedia.org/wiki/Equality_(mathematics)
// 等價 : eq(a, b) => eq(f(a), f(b)) ... ?
}

// ========== Group =================
var Group={ 
  invOp:function(x,y) { 
    return this.op(x,this.inv(y)); 
  },
  power:function(x,n) {
    var p=this.e;
    for (var i=0;i<n;i++) {
      p=this.op(p,x);
    }
    return p;
  },
  // 結合性：For all a, b and c in G, (a • b) • c = a • (b • c).
	associativity:function(a,b,c) {
	  var o = this.op.bind(this);
	  Law.associativity(o,a,b,c) 
	},
	identity:function(a) {
	  var o = this.op.bind(this);
		Law.identity(o, this.e, a);
	},
	inverse:function(a) {
	  var o = this.op.bind(this);
		Law.inverse(o, a, this.invOp(a), this.e);
	},
}

// ========== Field =================
var Field={
  sub:function(x,y) { return this.addGroup.invOp(x,y) },
  div:function(x,y) { return this.mulGroup.invOp(x,y) }, // 這個用箭頭函數會錯， Why ?
  power:function(x,n) { return this.mulGroup.power(x,n) },
  init:function(addGroup, mulGroup) {
    this.addGroup = addGroup;
    this.mulGroup = mulGroup;
    this.zero = addGroup.e;
    this.add  = function(x,y) { return this.addGroup.op(x,y) }
    this.neg  = function(x) { return this.addGroup.inv(x) }
    this.one  = mulGroup.e;
    this.mul  = function(x,y) { return this.mulGroup.op(x,y) }
    this.inv  = function(x) { return this.mulGroup.inv(x) }
		this.power= function(x,n) { return this.mulGroup.power(x,n) }
  }
}

// ========== Float Field =================
var FloatAddGroup={
  e:0,
  op:function(x,y) { return x+y },
  inv:function(x) { return -x},
}

extend(FloatAddGroup, Group);

var FloatMulGroup={
  e:1,
  op:function(x,y) { return x*y },
  inv:function(x) { return 1/x},
}

extend(FloatMulGroup, Group);

var FloatField=extend({}, Field);

FloatField.init(FloatAddGroup, FloatMulGroup);

// ========== Finite Field =================
var FiniteAddGroup={
  e:0,
  op:function(x,y) { return (x+y)%this.n },
  inv:function(x) { return (this.n-x) }
}

extend(FiniteAddGroup, Group);

var FiniteMulGroup={
  e:1,
  op:function(x,y) { return (x*y)%this.n }, 
  inv:function(x) { return this.invMap[x] },
  setOrder:function(n) {
    this.n = n;
    let invMap = new Map();
    for (var x=1; x<n; x++) {
      var y = this.op(x,x);
      invMap.set(x,y);
    }
    this.invMap = invMap;
  }
}

extend(FiniteMulGroup, Group);

var FiniteField=extend({}, Field);

FiniteField.create=function(n) {
  var F = extend({}, FiniteField);
  var addGroup = extend({n:n}, FiniteAddGroup);
  var mulGroup = extend({n:n}, FiniteMulGroup);
  F.init(addGroup, mulGroup);
  mulGroup.setOrder(n);
  return F;
}

// =========== Field Object ==============
class FieldObj {
  constructor(field) { 
    this.field = field;
  }
  
  add(y) { return this.field.add(this,y) }
  mul(y) { return this.field.mul(this,y) }
  neg() { return this.field.neg(this) }
  inv() { return this.field.inv(this) }
  div(y) { return this.field.div(this,y) }
  sub(y) { return this.field.sub(this,y) }
	power(n) { return this.field.power(this,n) }
}

// =========== Complex Field ==============
var ComplexField=extend({}, Field);

class Complex extends FieldObj {
  constructor(a,b) {
    super(ComplexField);
    this.a = a; this.b = b; 
  }
  conj() { return new Complex(this.a, -1*this.b); }
  
  toString() { 
    var op = (this.b<0)?'':'+';
    return this.a+op+this.b+'i'; 
  }
  
  parse(s) {
    var m = s.match(/^([^\+]*)(\+(.*))?$/);
    var a = parseFloat(m[1]);
    var b = typeof m[3]==='undefined'?1:parseFloat(m[3]);
    return new Complex(a, b)
  }
  
  ln() {
    var a=this.a, b=this.b, r=a*a+b*b;
    var w = 1/2*Math.log(r);
    var x = Math.acos(a/Math.sqrt(r));
    return new Complex(w, x);
  }
  
  exp() {
    var a=this.a, b=this.b;
    var r=Math.exp(a);
    return new Complex(r*Math.cos(b), r*Math.sin(b));
  }
}

var ComplexAddGroup={
  e:new Complex(0,0),
  op:function(x,y) { return new Complex(x.a+y.a, x.b+y.b) },
  inv:function(x) { return new Complex(-x.a, -x.b) }
}

extend(ComplexAddGroup, Group);

var ComplexMulGroup={
  e:new Complex(1,0),
  op:function(x,y) {
    return new Complex(x.a*y.a-x.b*y.b, x.a*y.b+x.b*y.a);
  },
  inv:function(x) {
    var a=x.a,b=x.b, r=(a*a+b*b);
    return new Complex(a/r, -b/r);
  } 
}

extend(ComplexMulGroup, Group);

ComplexField.init(ComplexAddGroup, ComplexMulGroup);

// =========== Ratio Field ==============
var gcd = function(a, b) {
  if (!b) return a;
  return gcd(b, a % b);
}

var lcm = function(a, b) {
  return (a * b) / gcd(a, b);   
}

var RatioField=extend({}, Field);

class Ratio extends FieldObj {
  constructor(a,b) {
    super(RatioField);
    this.a = a; this.b = b; 
  }

  reduce() {
    var a = this.a, b=this.b;
    var c = gcd(a, b);
    return new Ratio(a/c, b/c);
  }
  
  toString() { return this.a+'/'+this.b; }

  parse(s) {
    var m = s.match(/^(\d+)(\/(\d+))?$/);
    var a = parseInt(m[1]);
    var b = typeof m[3]==='undefined'?1:parseInt(m[3]);
    return new Ratio(a, b)
  } 
}

var RatioAddGroup={
  e:new Ratio(0,1),
  op:function(x,y) { return new Ratio(x.a*y.b+x.b*y.a, x.b*y.b) },
  inv:function(x) { return new Ratio(-x.a, x.b); },
}
  
extend(RatioAddGroup, Group);

var RatioMulGroup={
  e:new Ratio(1,1),
  op:function(x,y) { return new Ratio(x.a*y.a, x.b*y.b) },
  inv:function(x) { return new Ratio(x.b, x.a) },
}

extend(RatioMulGroup, Group);

RatioField.init(RatioAddGroup, RatioMulGroup);

// export 
module.exports = {
  Group:Group,
  Field:Field,
  FloatField:FloatField,
  FiniteField:FiniteField,
  ComplexField:ComplexField,
  Complex:Complex,
  RatioField:RatioField,
  Ratio:Ratio,
  gcd:gcd,
	lcm:lcm,
	Law:Law
};

