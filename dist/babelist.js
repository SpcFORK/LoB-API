/* oak build --web */
// module system
const __Oak_Modules = {};
let __Oak_Import_Aliases;
function __oak_modularize(name, fn) {
	__Oak_Modules[name] = fn;
}
function __oak_module_import(name) {
	if (typeof __Oak_Modules[name] === 'object') return __Oak_Modules[name];
	const module = __Oak_Modules[name] || __Oak_Modules[__Oak_Import_Aliases[name]];
	if (module) {
		__Oak_Modules[name] = {}; // break circular imports
		return __Oak_Modules[name] = module();
	} else {
		throw new Error(`Could not import Oak module "${name}" at runtime`);
	}
}

// language primitives
let __oak_empty_assgn_tgt;
function __oak_eq(a, b) {
	if (a === __Oak_Empty || b === __Oak_Empty) return true;

	// match either null or undefined to compare correctly against undefined ?s
	// appearing in places like optional arguments
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;

	// match all other types that can be compared cheaply (without function
	// calls for type coercion or recursive descent)
	if (typeof a === 'boolean' || typeof a === 'number' ||
		typeof a === 'symbol' || typeof a === 'function') {
		return a === b;
	}

	// string equality check
	a = __as_oak_string(a);
	b = __as_oak_string(b);
	if (typeof a !== typeof b) return false;
	if (__is_oak_string(a) && __is_oak_string(b)) {
		return a.valueOf() === b.valueOf();
	}

	// deep equality check for composite values
	if (len(a) !== len(b)) return false;
	for (const key of keys(a)) {
		if (!__oak_eq(a[key], b[key])) return false;
	}
	return true;
}
function __oak_acc(tgt, prop) {
	return (__is_oak_string(tgt) ? __as_oak_string(tgt.valueOf()[prop]) : tgt[prop]) ?? null;
}
function __oak_obj_key(x) {
	return typeof x === 'symbol' ? Symbol.keyFor(x) : x;
}
function __oak_push(a, b) {
	a = __as_oak_string(a);
	a.push(b);
	return a;
}
function __oak_and(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a && b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) & get(b, i));
		}
		return res;
	}
	return a & b;
}
function __oak_or(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a || b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) | get(b, i));
		}
		return res;
	}
	return a | b;
}
function __oak_xor(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a && !b) || (!a && b);
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) ^ get(b, i));
		}
		return res;
	}
	return a ^ b;
}
const __Oak_Empty = Symbol('__Oak_Empty');

// mutable string type
function __is_oak_string(x) {
	if (x == null) return false;
	return x.__mark_oak_string;
}
function __as_oak_string(x) {
	if (typeof x === 'string') return __Oak_String(x);
	return x;
}
const __Oak_String = s => {
	return {
		__mark_oak_string: true,
		assign(i, slice) {
			if (i === s.length) return s += slice;
			return s = s.substr(0, i) + slice + s.substr(i + slice.length);
		},
		push(slice) {
			s += slice;
		},
		toString() {
			return s;
		},
		valueOf() {
			return s;
		},
		get length() {
			return s.length;
		},
	}
}

// tail recursion trampoline helpers
function __oak_resolve_trampoline(fn, ...args) {
	let rv = fn(...args);
	while (rv && rv.__is_oak_trampoline) {
		rv = rv.fn(...rv.args);
	}
	return rv;
}
function __oak_trampoline(fn, ...args) {
	return {
		__is_oak_trampoline: true,
		fn: fn,
		args: args,
	}
}

// env (builtin) functions

// reflection and types
const __Is_Oak_Node = typeof process === 'object';
const __Oak_Int_RE = /^[+-]?\d+$/;
function int(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') {
		// JS rounds towards higher magnitude, Oak rounds towards higher value
		const rounded = Math.floor(x);
		const diff = x - rounded;
		if (x < 0 && diff === 0.5) return rounded + 1;
		return rounded;
	}
	if (__is_oak_string(x) && __Oak_Int_RE.test(x.valueOf())) {
		const i = Number(x.valueOf());
		if (isNaN(i)) return null;
		return i;
	}
	return null;
}
function float(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') return x;
	if (__is_oak_string(x)) {
		const f = parseFloat(x.valueOf());
		if (isNaN(f)) return null;
		return f;
	}
	return null;
}
function atom(x) {
	x = __as_oak_string(x);
	if (typeof x === 'symbol' && x !== __Oak_Empty) return x;
	if (__is_oak_string(x)) return Symbol.for(x.valueOf());
	return Symbol.for(string(x));
}
function string(x) {
	x = __as_oak_string(x);
	function display(x) {
		x = __as_oak_string(x);
		if (__is_oak_string(x)) {
			return '\'' + x.valueOf().replace('\\', '\\\\').replace('\'', '\\\'') + '\'';
		} else if (typeof x === 'symbol') {
			if (x === __Oak_Empty) return '_';
			return ':' + Symbol.keyFor(x);
		}
		return string(x);
	}
	if (x == null) {
		return '?';
	} else if (typeof x === 'number') {
		return x.toString();
	} else if (__is_oak_string(x)) {
		return x;
	} else if (typeof x === 'boolean') {
		return x.toString();
	} else if (typeof x === 'function') {
		return x.toString();
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return '_';
		return Symbol.keyFor(x);
	} else if (Array.isArray(x)) {
		return '[' + x.map(display).join(', ') + ']';
	} else if (typeof x === 'object') {
		const entries = [];
		for (const key of keys(x).sort()) {
			entries.push(`${key}: ${display(x[key])}`);
		}
		return '{' + entries.join(', ') + '}';
	}
	throw new Error('string() called on unknown type ' + x.toString());
}
function codepoint(c) {
	c = __as_oak_string(c);
	return c.valueOf().charCodeAt(0);
}
function char(n) {
	return String.fromCharCode(n);
}
function type(x) {
	x = __as_oak_string(x);
	if (x == null) {
		return Symbol.for('null');
	} else if (typeof x === 'number') {
		// Many discrete APIs check for :int, so we consider all integer
		// numbers :int and fall back to :float. This is not an airtight
		// solution, but works well enough and the alternative (tagged number
		// values/types) have poor perf tradeoffs.
		if (Number.isInteger(x)) return Symbol.for('int');
		return Symbol.for('float');
	} else if (__is_oak_string(x)) {
		return Symbol.for('string');
	} else if (typeof x === 'boolean') {
		return Symbol.for('bool');
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return Symbol.for('empty');
		return Symbol.for('atom');
	} else if (typeof x === 'function') {
		return Symbol.for('function');
	} else if (Array.isArray(x)) {
		return Symbol.for('list');
	} else if (typeof x === 'object') {
		return Symbol.for('object');
	}
	throw new Error('type() called on unknown type ' + x.toString());
}
function len(x) {
	if (typeof x === 'string' || __is_oak_string(x) || Array.isArray(x)) {
		return x.length;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).length;
	}
	throw new Error('len() takes a string or composite value, but got ' + string(x));
}
function keys(x) {
	if (Array.isArray(x)) {
		const k = [];
		for (let i = 0; i < x.length; i ++) k.push(i);
		return k;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).map(__as_oak_string);
	}
	throw new Error('keys() takes a composite value, but got ' + string(x).valueOf());
}

// OS interfaces
function args() {
	if (__Is_Oak_Node) return process.argv.map(__as_oak_string);
	return [window.location.href];
}
function env() {
	if (__Is_Oak_Node) {
		const e = Object.assign({}, process.env);
		for (const key in e) {
			e[key] = __as_oak_string(e[key]);
		}
		return e;
	}
	return {};
}
function time() {
	return Date.now() / 1000;
}
function nanotime() {
	return int(Date.now() * 1000000);
}
function rand() {
	return Math.random();
}
let randomBytes;
function srand(length) {
	if (__Is_Oak_Node) {
		// lazily import dependency
		if (!randomBytes) randomBytes = require('crypto').randomBytes;
		return randomBytes(length).toString('latin1');
	}

	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return __as_oak_string(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}
function wait(duration, cb) {
	setTimeout(cb, duration * 1000);
	return null;
}
function exit(code) {
	if (__Is_Oak_Node) process.exit(code);
	return null;
}
function exec() {
	throw new Error('exec() not implemented');
}

// I/O
function input() {
	throw new Error('input() not implemented');
}
function print(s) {
	s = __as_oak_string(s);
	if (__Is_Oak_Node) {
		process.stdout.write(string(s).toString());
	} else {
		console.log(string(s).toString());
	}
	return s.length;
}
function ls() {
	throw new Error('ls() not implemented');
}
function rm() {
	throw new Error('rm() not implemented');
}
function mkdir() {
	throw new Error('mkdir() not implemented');
}
function stat() {
	throw new Error('stat() not implemented');
}
function open() {
	throw new Error('open() not implemented');
}
function close() {
	throw new Error('close() not implemented');
}
function read() {
	throw new Error('read() not implemented');
}
function write() {
	throw new Error('write() not implemented');
}
function listen() {
	throw new Error('listen() not implemented');
}
function req() {
	throw new Error('req() not implemented');
}

// math
function sin(n) {
	return Math.sin(n);
}
function cos(n) {
	return Math.cos(n);
}
function tan(n) {
	return Math.tan(n);
}
function asin(n) {
	return Math.asin(n);
}
function acos(n) {
	return Math.acos(n);
}
function atan(n) {
	return Math.atan(n);
}
function pow(b, n) {
	return Math.pow(b, n);
}
function log(b, n) {
	return Math.log(n) / Math.log(b);
}

// runtime
function ___runtime_lib() {
	throw new Error('___runtime_lib() not implemented');
}
function ___runtime_lib__oak_qm() {
	throw new Error('___runtime_lib?() not implemented');
}
function ___runtime_gc() {
	throw new Error('___runtime_gc() not implemented');
}
function ___runtime_mem() {
	throw new Error('___runtime_mem() not implemented');
}
function ___runtime_proc() {
	throw new Error('___runtime_proc() not implemented');
}

// JavaScript interop
function call(target, fn, ...args) {
	return target[Symbol.keyFor(fn)](...args);
}
function __oak_js_new(Constructor, ...args) {
	return new Constructor(...args);
}
function __oak_js_try(fn) {
	try {
		return {
			type: Symbol.for('ok'),
			ok: fn(),
		}
	} catch (e) {
		return {
			type: Symbol.for('error'),
			error: e,
		}
	}
}
(__oak_modularize(__Oak_String('cst.oak'),function _(){return ((Bookmark,Download,IPRNG,TITLES_LRU,TITLES_LRU_MAX,Titler,_redirLocation,binIndex,bookmarkQuery,calculateRevpRightShift,calculateRevpXorShift,cgi__oak_exclam,domain__oak_exclam,endpoints,fmt,formHeader,generateRandomSequence,getBook,getTitle,getTitles,handleBookmark,handleHasBookmark,handleTitler,http,invertRightShift,invertXorShift,leftShift,lru,query,reqBookmark,reqDownload,reqHasBookmark,reqTitler,rightShift,safeResp,std,str,volumeFormat,xorShift)=>((std=__oak_module_import(__Oak_String('std'))),(str=__oak_module_import(__Oak_String('str'))),(fmt=__oak_module_import(__Oak_String('fmt'))),(http=__oak_module_import(__Oak_String('http'))),({lru}=__oak_module_import(__Oak_String('lru.oak'))),(endpoints=({_domain__oak_exclam:domain__oak_exclam=function domain__oak_exclam(v=null){return __oak_push(__Oak_String('https://libraryofbabel.info/'),v)},_cgi__oak_exclam:cgi__oak_exclam=function cgi__oak_exclam(xu=null){return __oak_push(domain__oak_exclam(xu),__Oak_String('.cgi'))},book:cgi__oak_exclam(__Oak_String('book')),titler:cgi__oak_exclam(__Oak_String('titler')),browse:cgi__oak_exclam(__Oak_String('browse')),download:cgi__oak_exclam(__Oak_String('download')),anglishize:cgi__oak_exclam(__Oak_String('anglishize')),bookmarker:cgi__oak_exclam(__Oak_String('bookmarker'))})),query=function query(seed=null,wall=null,ch=null,vol=null,page=null){return ((rest)=>((rest=__Oak_String('{{0}}-w{{1}}-s{{2}}-v{{3}}')),((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(__oak_push(rest,__Oak_String(':')),string(page)):null)(!__oak_eq(page,null)),(fmt.format)(rest,string(seed),string(wall),string(ch),(str.padStart)(string(vol),2,__Oak_String('0')))))()},bookmarkQuery=function bookmarkQuery(name=null,index=null){return ((fmt.format)(__Oak_String('{{0}}:{{1}}'),name,string(index)))},formHeader=function formHeader(){return (({[__Oak_String('content-type')]:__Oak_String('application/x-www-form-urlencoded')}))},safeResp=function safeResp(r=null){return ((std.__oak_js_default)(r,({})).resp??null)},volumeFormat=function volumeFormat(v=null){return (str.padStart)(string(v),2,__Oak_String('0'))},Titler=function Titler(seed=null,wall=null,ch=null){return (http.queryEncode)(({hex:seed,wall,shelf:ch}))},reqTitler=function reqTitler(b=null){return safeResp(req(({url:(endpoints.titler??null),method:__Oak_String('POST'),headers:formHeader(),body:b})))},handleTitler=function handleTitler(b=null){return (str.split)((reqTitler(b).body??null),__Oak_String(';'))},Download=function Download(seed=null,wall=null,ch=null,vol=null,title=null){return (http.queryEncode)(({hex:seed,wall,shelf:ch,volume:volumeFormat(vol),page:null,title}))},reqDownload=function reqDownload(b=null){return safeResp(req(({url:(endpoints.download??null),method:__Oak_String('POST'),headers:formHeader(),body:b})))},Bookmark=function Bookmark(seed=null,wall=null,ch=null,vol=null,page=null,title=null){return (http.queryEncode)(({hex:seed,wall,shelf:ch,volume:volumeFormat(vol),page,title}))},reqBookmark=function reqBookmark(b=null){return safeResp(req(({url:(endpoints.bookmark??null),method:__Oak_String('POST'),headers:formHeader(),body:b})))},reqHasBookmark=function reqHasBookmark(b=null){return safeResp(req(({url:(endpoints.bookmark??null),method:__Oak_String('GET'),headers:formHeader(),body:b})))},_redirLocation=function _redirLocation(r=null){return ((r.headers??null).Location??null)},handleBookmark=function handleBookmark(b=null){return _redirLocation(reqBookmark(b))},handleHasBookmark=function handleHasBookmark(b=null){return _redirLocation(reqHasBookmark(b))},(TITLES_LRU_MAX=32),(TITLES_LRU=lru(TITLES_LRU_MAX)),getTitles=function getTitles(seed=null,wall=null,ch=null){let name;let val;return ((__oak_cond)=>__oak_eq(__oak_cond,(name=query(seed,wall,ch,null)))?val:__oak_eq(__oak_cond,(val=(TITLES_LRU.get)(name)))?val:__oak_eq(__oak_cond,!__oak_eq(val,null))?val:((val)=>((val=handleTitler(Titler(seed,wall,ch))),(TITLES_LRU.set)(name,val),val))())(true)},getTitle=function getTitle(seed=null,wall=null,ch=null,vol=null){return __oak_acc(getTitles(seed,wall,ch),__oak_obj_key((vol)))},getBook=function getBook(seed=null,wall=null,ch=null,vol=null){return reqDownload(Download(seed,wall,ch,vol,getTitle(seed,wall,ch,vol)))},binIndex=function binIndex(i=null){return pow(2,shift)},leftShift=function leftShift(value=null,shift=null){return (value*binIndex(shift))},rightShift=function rightShift(value=null,shift=null){return int((value/binIndex(shift)))},xorShift=function xorShift(input=null,mask=null,shift=null){return __oak_xor(input,(leftShift(((input%mask)),shift)))},calculateRevpXorShift=function calculateRevpXorShift(p=null,mask=null,shift=null){return __oak_xor(p,(leftShift(((p%mask)),shift)))},calculateRevpRightShift=function calculateRevpRightShift(p=null,shift=null){return __oak_xor(p,(rightShift(p,shift)))},invertXorShift=function invertXorShift(pointer=null,mask=null,shift=null){return ((revp)=>((revp=calculateRevpXorShift(pointer,mask,shift)),(revp=calculateRevpXorShift(revp,mask,shift)),__oak_xor(pointer,(leftShift(((revp%mask)),shift)))))()},invertRightShift=function invertRightShift(pointer=null,shift=null){return ((revp)=>((revp=calculateRevpRightShift(pointer,shift)),(revp=calculateRevpRightShift(revp,shift)),__oak_xor(pointer,(rightShift(revp,shift)))))()},IPRNG=function IPRNG(seed=null){return ((a,c,invertInt,last,m,maskone,masktwo,nextInt)=>((m=pow(2,32)),(a=(m-1)),(c=987654321),(last=seed),(maskone=(std.fromHex)(__Oak_String('9D2C5680'))),(masktwo=(std.fromHex)(__Oak_String('EFC60000'))),nextInt=function nextInt(){return ((pointer)=>((pointer=((__as_oak_string((a*last)+c))%m)),(pointer=__oak_xor(pointer,(rightShift(pointer,1098239)))),(pointer=xorShift(pointer,maskone,698879)),(pointer=xorShift(pointer,masktwo,1497599)),(pointer=__oak_xor(pointer,(rightShift(pointer,1797118)))),(last=pointer),pointer))()},invertInt=function invertInt(next=null){return ((pointer)=>((pointer=next),(pointer=invertRightShift(pointer,1797118)),(pointer=invertXorShift(pointer,masktwo,1497599)),(pointer=invertXorShift(pointer,maskone,698879)),(pointer=invertRightShift(pointer,1098239)),(pointer=((ainverse((pointer-c)))%m)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(pointer=__as_oak_string(pointer+m)):null)((pointer<0)),pointer))()},({integer:nextInt,invert:invertInt})))()},generateRandomSequence=function generateRandomSequence(seed=null,count=null,prng=null){return ((call,i,recurse,sequence)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?(prng=IPRNG(seed)):null)(__oak_eq(prng,null)),(sequence=[]),(i=0),call=function call(){return (sequence.push)((prng.integer)())},recurse=function recurse(){return ((__oak_trampolined_recurse)=>((__oak_trampolined_recurse=function _(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(call(),(i=__as_oak_string(i+1)),__oak_trampoline(__oak_trampolined_recurse)):null)((i<count))}),__oak_resolve_trampoline(__oak_trampolined_recurse)))()},recurse(),sequence))()},({Bookmark,Download,IPRNG,TITLES_LRU,TITLES_LRU_MAX,Titler,_redirLocation,binIndex,bookmarkQuery,calculateRevpRightShift,calculateRevpXorShift,cgi__oak_exclam,domain__oak_exclam,endpoints,fmt,formHeader,generateRandomSequence,getBook,getTitle,getTitles,handleBookmark,handleHasBookmark,handleTitler,http,invertRightShift,invertXorShift,leftShift,lru,query,reqBookmark,reqDownload,reqHasBookmark,reqTitler,rightShift,safeResp,std,str,volumeFormat,xorShift})))()}),__oak_modularize(__Oak_String('linkedList.oak'),function _(){return ((doublyLinkedList,doublyLinkedNode,insertBefore,insertBeginning,remove)=>(doublyLinkedNode=function doublyLinkedNode(next=null,prev=null,data=null){return (({next,prev,data}))},doublyLinkedList=function doublyLinkedList(firstNode=null,lastNode=null){return (({firstNode,lastNode}))},insertBefore=function insertBefore(list=null,node=null,newNode=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(next,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.next):(__oak_assgn_tgt.next)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newNode),node),((__oak_cond)=>__oak_eq(__oak_cond,null)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newNode),null),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(firstNode,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.firstNode):(__oak_assgn_tgt.firstNode)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(list),newNode)):(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newNode),(node.prev??null)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(next,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.next):(__oak_assgn_tgt.next)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((node.prev??null)),newNode)))((node.prev??null)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(node),newNode))},insertBeginning=function insertBeginning(list=null,newNode=null){return (((__oak_cond)=>__oak_eq(__oak_cond,null)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(firstNode,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.firstNode):(__oak_assgn_tgt.firstNode)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(list),newNode),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(lastNode,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.lastNode):(__oak_assgn_tgt.lastNode)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(list),newNode),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newNode),null),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(next,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.next):(__oak_assgn_tgt.next)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newNode),null)):insertBefore(list,(list.firstNode??null),newNode))((list.firstNode??null)))},remove=function remove(list=null,node=null){return (((__oak_cond)=>__oak_eq(__oak_cond,null)?((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(firstNode,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.firstNode):(__oak_assgn_tgt.firstNode)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(list),(node.next??null)):((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(next,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.next):(__oak_assgn_tgt.next)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((node.prev??null)),(node.next??null)))((node.prev??null)),((__oak_cond)=>__oak_eq(__oak_cond,null)?((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(lastNode,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.lastNode):(__oak_assgn_tgt.lastNode)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(list),(node.prev??null)):((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((node.next??null)),(node.prev??null)))((node.next??null)))},({doublyLinkedList,doublyLinkedNode,insertBefore,insertBeginning,remove})))()}),__oak_modularize(__Oak_String('lru.oak'),function _(){return ((doublyLinkedList,doublyLinkedNode,insertBeginning,lru,remove)=>(({doublyLinkedNode,doublyLinkedList,insertBeginning,remove}=__oak_module_import(__Oak_String('linkedList.oak'))),lru=function lru(max=null){return ((access,cache,count,list,pop)=>((count=0),(cache=({})),(list=doublyLinkedList(null,null)),pop=function pop(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((((list.lastNode??null).data??null)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((((list.lastNode??null).data??null)))]):(__oak_assgn_tgt[__oak_obj_key((((list.lastNode??null).data??null)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(cache),__Oak_Empty),remove(list,(list.lastNode??null)),(count=(count-1)))},access=function access(key=null){return (remove(list,(__oak_acc(cache,__oak_obj_key((key))).node??null)),insertBeginning(list,(__oak_acc(cache,__oak_obj_key((key))).node??null)))},({set:function _(key=null,value=null){return (((__oak_cond)=>__oak_eq(__oak_cond,true)?pop():null)((__as_oak_string(count+1)>max)),(count=__as_oak_string(count+1)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(cache),({value,node:doublyLinkedNode(null,null,key)})),insertBeginning(list,(__oak_acc(cache,__oak_obj_key((key))).node??null)))},get:function _(key=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?null:(access(key),(__oak_acc(cache,__oak_obj_key((key))).value??null)))(__oak_acc(cache,__oak_obj_key((key))))},count:function _(){return (count)},_debug:function _(){return (({firstNode:(list.firstNode??null),lastNode:(list.lastNode??null)}))}})))()},({doublyLinkedList,doublyLinkedNode,insertBeginning,lru,remove})))()}),__oak_modularize(__Oak_String('main.oak'),function _(){return ((cst,std)=>((std=__oak_module_import(__Oak_String('std'))),(cst=__oak_module_import(__Oak_String('cst.oak'))),({cst,std})))()}),__oak_modularize(__Oak_String('fmt'),function _(){return ((__oak_js_default,format,printf,println)=>(({println,__oak_js_default}=__oak_module_import(__Oak_String('std'))),format=function format(raw=null,...values){return ((buf,key,sub,value,which)=>((which=0),(key=__Oak_String('')),(buf=__Oak_String('')),(value=__oak_js_default(__oak_acc(values,0),({}))),sub=function sub(idx=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((c)=>((c=__oak_acc(raw,__oak_obj_key((idx)))),((__oak_cond)=>__oak_eq(__oak_cond,0)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('{'))?(which=1):__oak_push(buf,c))(c):__oak_eq(__oak_cond,1)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('{'))?(which=2):(__oak_push(__oak_push(buf,__Oak_String('{')),c),(which=0)))(c):__oak_eq(__oak_cond,2)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('}'))?((index)=>((index=int(key)),__oak_push(buf,string(((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(key,__Oak_String('')))?__Oak_String(''):__oak_eq(__oak_cond,__oak_eq(index,null))?__oak_acc(value,__oak_obj_key((key))):__oak_acc(values,__oak_obj_key((index))))(true))),(key=__Oak_String('')),(which=3)))():__oak_eq(__oak_cond,__Oak_String(' '))?null:__oak_eq(__oak_cond,__Oak_String('\t'))?null:(key=__as_oak_string(key+c)))(c):__oak_eq(__oak_cond,3)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('}'))?(which=0):null)(c):null)(which),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(idx+1))))():buf)((idx<len(raw)))}),__oak_resolve_trampoline(__oak_trampolined_sub,idx)))()},sub(0)))()},printf=function printf(raw=null,...values){return println(format(raw,...values))},({__oak_js_default,format,printf,println})))()}),__oak_modularize(__Oak_String('fs'),function _(){return ((ReadBufSize,appendFile,listFiles,listFilesAsync,listFilesSync,readFile,readFileAsync,readFileSync,statFile,statFileAsync,statFileSync,writeFile,writeFileAsyncWithFlag,writeFileSyncWithFlag)=>((ReadBufSize=4096),readFileSync=function readFileSync(path=null){return ((evt)=>((evt=open(path,Symbol.for('readonly'))),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?null:((fd,sub)=>((fd=(evt.fd??null)),sub=function sub(file=null,offset=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(file=null,offset=null){return ((evt)=>((evt=read(fd,offset,ReadBufSize)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?(close(fd),null):((__oak_cond)=>__oak_eq(__oak_cond,ReadBufSize)?__oak_trampoline(__oak_trampolined_sub,__oak_push(file,(evt.data??null)),__as_oak_string(offset+ReadBufSize)):(close(fd),__oak_push(file,(evt.data??null))))(len((evt.data??null))))((evt.type??null))))()}),__oak_resolve_trampoline(__oak_trampolined_sub,file,offset)))()},sub(__Oak_String(''),0)))())((evt.type??null))))()},readFileAsync=function readFileAsync(path=null,withFile=null){return open(path,Symbol.for('readonly'),function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?withFile(null):((fd,sub)=>((fd=(evt.fd??null)),sub=function sub(file=null,offset=null){return read(fd,offset,ReadBufSize,function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?close(fd,function _(){return (withFile(null))}):((__oak_cond)=>__oak_eq(__oak_cond,ReadBufSize)?sub(__oak_push(file,(evt.data??null)),__as_oak_string(offset+ReadBufSize)):close(fd,function _(){return (withFile(__oak_push(file,(evt.data??null))))}))(len((evt.data??null))))((evt.type??null))})},sub(__Oak_String(''),0)))())((evt.type??null))})},readFile=function readFile(path=null,withFile=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?readFileSync(path):readFileAsync(path,withFile))(withFile)},writeFileSyncWithFlag=function writeFileSyncWithFlag(path=null,file=null,flag=null){return ((evt)=>((evt=open(path,flag)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?null:((fd)=>((fd=(evt.fd??null)),((evt)=>((evt=write(fd,0,file)),close(fd),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?null:true)((evt.type??null))))()))())((evt.type??null))))()},writeFileAsyncWithFlag=function writeFileAsyncWithFlag(path=null,file=null,flag=null,withEnd=null){return open(path,flag,function _(evt=null){let fd;return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?withEnd(null):write((fd=(evt.fd??null)),0,file,function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?close(fd,function _(){return (withEnd(null))}):close(fd,function _(){return (withEnd(true))}))((evt.type??null))}))((evt.type??null))})},writeFile=function writeFile(path=null,file=null,withEnd=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?writeFileSyncWithFlag(path,file,Symbol.for('truncate')):writeFileAsyncWithFlag(path,file,Symbol.for('truncate'),withEnd))(withEnd)},appendFile=function appendFile(path=null,file=null,withEnd=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?writeFileSyncWithFlag(path,file,Symbol.for('append')):writeFileAsyncWithFlag(path,file,Symbol.for('append'),withEnd))(withEnd)},statFileSync=function statFileSync(path=null){return ((evt)=>((evt=stat(path)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?null:(evt.data??null))((evt.type??null))))()},statFileAsync=function statFileAsync(path=null,withStat=null){return stat(path,function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?withStat(null):withStat((evt.data??null)))((evt.type??null))})},statFile=function statFile(path=null,withStat=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?statFileSync(path):statFileAsync(path,withStat))(withStat)},listFilesSync=function listFilesSync(path=null){return ((evt)=>((evt=ls(path)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?null:(evt.data??null))((evt.type??null))))()},listFilesAsync=function listFilesAsync(path=null,withFiles=null){return ls(path,function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?withFiles(null):withFiles((evt.data??null)))((evt.type??null))})},listFiles=function listFiles(path=null,withFiles=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?listFilesSync(path):listFilesAsync(path,withFiles))(withFiles)},({ReadBufSize,appendFile,listFiles,listFilesAsync,listFilesSync,readFile,readFileAsync,readFileSync,statFile,statFileAsync,statFileSync,writeFile,writeFileAsyncWithFlag,writeFileSyncWithFlag})))()}),__oak_modularize(__Oak_String('http'),function _(){return ((MethodNotAllowed,MimeTypes,NotFound,Router,Server,_encodeChar,_hdr,_hex__oak_qm,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,each,entries,exclude,filter,fromEntries,fromHex,handleStatic,join,json,lower,lower__oak_qm,map,mimeForPath,percentDecode,percentEncode,percentEncodeURI,printf,println,queryDecode,queryEncode,readFile,reduce,slice,sort,split,toHex,upper,upper__oak_qm,word__oak_qm)=>(({println,__oak_js_default,toHex,fromHex,slice,map,each,filter,exclude,reduce,entries,fromEntries}=__oak_module_import(__Oak_String('std'))),({checkRange,cut,join,contains__oak_qm,digit__oak_qm,upper__oak_qm,lower__oak_qm,word__oak_qm,upper,lower,split}=__oak_module_import(__Oak_String('str'))),({readFile}=__oak_module_import(__Oak_String('fs'))),({printf}=__oak_module_import(__Oak_String('fmt'))),(sort=__oak_module_import(__Oak_String('sort'))),(json=__oak_module_import(__Oak_String('json'))),queryEncode=function queryEncode(params=null){return ((prepare)=>(prepare=function prepare(val=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('list'))?(json.serialize)(val):__oak_eq(__oak_cond,Symbol.for('object'))?(json.serialize)(val):string(val))(type(val))},join(map((sort.sort)(map(exclude(entries(params),function _(entry=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,__oak_eq(type(__oak_acc(entry,1)),Symbol.for('function'))))(__oak_eq(__oak_acc(entry,1),null))}),function _(entry=null){return [__oak_acc(entry,0),prepare(__oak_acc(entry,1))]}),0),function _(entry=null){return __as_oak_string(__as_oak_string(percentEncode(__oak_acc(entry,0))+__Oak_String('='))+percentEncode(__oak_acc(entry,1)))}),__Oak_String('&'))))()},queryDecode=function queryDecode(params=null){return (fromEntries(map(filter(split(params,__Oak_String('&')),function _(s=null){return !__oak_eq(s,__Oak_String(''))}),function _(kv=null){return map(cut(kv,__Oak_String('=')),percentDecode)})))},_encodeChar=function _encodeChar(uri__oak_qm=null){return function _(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,word__oak_qm(c))?c:__oak_eq(__oak_cond,contains__oak_qm(__Oak_String('-_.!~*\'()'),c))?c:__oak_eq(__oak_cond,(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,contains__oak_qm(__Oak_String(';,/?:@&=+$#'),c)))(uri__oak_qm))?c:__as_oak_string(__Oak_String('%')+upper(toHex(codepoint(c)))))(true)}},percentEncode=function percentEncode(s=null){return map(s,_encodeChar(false))},percentEncodeURI=function percentEncodeURI(s=null){return map(s,_encodeChar(true))},_hex__oak_qm=function _hex__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('f'))))((c>=__Oak_String('a'))))))((__oak_left=>__oak_left===true?true:__oak_or(__oak_left,((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('F'))))((c>=__Oak_String('A'))))))(digit__oak_qm(c)))},percentDecode=function percentDecode(s=null){return ((buf,stage)=>((stage=Symbol.for('default')),(buf=null),reduce(s,__Oak_String(''),function _(decoded=null,curr=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('default'))?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('+'))?__oak_push(decoded,__Oak_String(' ')):__oak_eq(__oak_cond,__Oak_String('%'))?((stage=Symbol.for('sawPercent')),decoded):__oak_push(decoded,curr))(curr):__oak_eq(__oak_cond,Symbol.for('sawPercent'))?((__oak_cond)=>__oak_eq(__oak_cond,false)?((stage=Symbol.for('default')),__oak_push(__oak_push(decoded,__Oak_String('%')),curr)):((stage=Symbol.for('sawFirstHex')),(buf=curr),decoded))(_hex__oak_qm(curr)):((last)=>((last=buf),(stage=Symbol.for('default')),(buf=null),((__oak_cond)=>__oak_eq(__oak_cond,false)?__oak_push(__oak_push(__oak_push(decoded,__Oak_String('%')),last),curr):__oak_push(decoded,char(fromHex(lower(__oak_push(last,curr))))))(_hex__oak_qm(curr))))())(stage)})))()},Router=function Router(){return ((add,__oak_js_catch,match,matchPath,self,splitPath)=>((self=[]),add=function add(pattern=null,handler=null){return __oak_push(self,[pattern,handler])},__oak_js_catch=function __oak_js_catch(handler=null){return add(__Oak_String(''),handler)},splitPath=function splitPath(url=null){return filter(split(url,__Oak_String('/')),function _(s=null){return !__oak_eq(s,__Oak_String(''))})},matchPath=function matchPath(pattern=null,path=null){return ((actual,desired,findMatchingParams,params,query)=>((params=({})),([path=null,query=null]=cut(path,__Oak_String('?'))),((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?null:each(map(split(query,__Oak_String('&')),function _(pair=null){return cut(pair,__Oak_String('='))}),function _(pair=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((__oak_acc(pair,0)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((__oak_acc(pair,0)))]):(__oak_assgn_tgt[__oak_obj_key((__oak_acc(pair,0)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(params),percentDecode(__oak_acc(pair,1)))}))(query),(desired=splitPath(pattern)),(actual=splitPath(path)),findMatchingParams=function findMatchingParams(i=null){return ((__oak_trampolined_findMatchingParams)=>((__oak_trampolined_findMatchingParams=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(desired))?((__oak_cond)=>__oak_eq(__oak_cond,len(actual))?params:null)(i):((actualPart,desiredPart)=>((desiredPart=__oak_js_default(__oak_acc(desired,__oak_obj_key((i))),__Oak_String(''))),(actualPart=__oak_js_default(__oak_acc(actual,__oak_obj_key((i))),__Oak_String(''))),((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(':'))?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((slice(desiredPart,1)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((slice(desiredPart,1)))]):(__oak_assgn_tgt[__oak_obj_key((slice(desiredPart,1)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(params),percentDecode(actualPart)),__oak_trampoline(__oak_trampolined_findMatchingParams,__as_oak_string(i+1))):__oak_eq(__oak_cond,__Oak_String('*'))?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((slice(desiredPart,1)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((slice(desiredPart,1)))]):(__oak_assgn_tgt[__oak_obj_key((slice(desiredPart,1)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(params),join(map(slice(actual,i),percentDecode),__Oak_String('/')))):((__oak_cond)=>__oak_eq(__oak_cond,actualPart)?__oak_trampoline(__oak_trampolined_findMatchingParams,__as_oak_string(i+1)):null)(desiredPart))(__oak_acc(desiredPart,0))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_findMatchingParams,i)))()},((__oak_cond)=>__oak_eq(__oak_cond,[__Oak_Empty,__Oak_String('')])?params:__oak_eq(__oak_cond,[true,__Oak_Empty])?findMatchingParams(0):null)([(len(desired)<=len(actual)),pattern])))()},match=function match(path=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(self))?function _(req=null){return (req.end)(({status:200,headers:({}),body:__Oak_String('dropped route. you should never see this in production')}))}:((handler,pattern,result)=>(([pattern=null,handler=null]=__oak_acc(self,__oak_obj_key((i)))),((__oak_cond)=>__oak_eq(__oak_cond,null)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):handler(result))((result=matchPath(pattern,path)))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},({add,__oak_js_catch,match})))()},(MimeTypes=({blob:__Oak_String('application/octet-stream'),html:__Oak_String('text/html; charset=utf-8'),txt:__Oak_String('text/plain; charset=utf-8'),md:__Oak_String('text/plain; charset=utf-8'),css:__Oak_String('text/css; charset=utf-8'),js:__Oak_String('application/javascript; charset=utf-8'),json:__Oak_String('application/json; charset=utf-8'),ink:__Oak_String('text/plain; charset=utf-8'),oak:__Oak_String('text/plain; charset=utf-8'),jpg:__Oak_String('image/jpeg'),jpeg:__Oak_String('image/jpeg'),png:__Oak_String('image/png'),gif:__Oak_String('image/gif'),svg:__Oak_String('image/svg+xml'),webp:__Oak_String('image/webp'),pdf:__Oak_String('application/pdf'),zip:__Oak_String('application/zip')})),mimeForPath=function mimeForPath(path=null){return ((ending,parts)=>((parts=split(path,__Oak_String('.'))),(ending=__oak_acc(parts,__oak_obj_key(((len(parts)-1))))),__oak_js_default(__oak_acc(MimeTypes,__oak_obj_key((ending))),(MimeTypes.blob??null))))()},(NotFound=({status:404,body:__Oak_String('file not found')})),(MethodNotAllowed=({status:405,body:__Oak_String('method not allowed')})),_hdr=function _hdr(attrs=null){return ((base)=>((base=({[__Oak_String('X-Served-By')]:__Oak_String('oak/libhttp'),[__Oak_String('Content-Type')]:__Oak_String('text/plain')})),each(keys(attrs),function _(k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(base),__oak_acc(attrs,__oak_obj_key((k))))}),base))()},Server=function Server(){return ((router,start)=>((router=Router()),start=function start(port=null){return ((router.__oak_js_catch)(function _(params=null){return function _(req=null,end=null){return end(({status:404,body:__Oak_String('service not found')}))}}),listen(__as_oak_string(__Oak_String('0.0.0.0:')+string(port)),function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?println(__Oak_String('server start error:'),(evt.error??null)):((method,url)=>(({method,url}=(evt.req??null)),printf(__Oak_String('{{ 0 }}: {{ 1 }}'),method,url),(router.match)(url)((evt.req??null),function _(resp=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(headers,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.headers):(__oak_assgn_tgt.headers)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(resp),_hdr(__oak_js_default((resp.headers??null),({})))),(evt.end)(resp))})))())((evt.type??null))}))},({route:(router.add??null),start})))()},handleStatic=function handleStatic(path=null){return function _(req=null,end=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('GET'))?readFile(__as_oak_string(__Oak_String('./')+path),function _(file=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?end(NotFound):end(({status:200,headers:({[__Oak_String('Content-Type')]:mimeForPath(path)}),body:file})))(file)}):end(MethodNotAllowed))((req.method??null))}},({MethodNotAllowed,MimeTypes,NotFound,Router,Server,_encodeChar,_hdr,_hex__oak_qm,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,each,entries,exclude,filter,fromEntries,fromHex,handleStatic,join,json,lower,lower__oak_qm,map,mimeForPath,percentDecode,percentEncode,percentEncodeURI,printf,println,queryDecode,queryEncode,readFile,reduce,slice,sort,split,toHex,upper,upper__oak_qm,word__oak_qm})))()}),__oak_modularize(__Oak_String('json'),function _(){return ((Reader,_parseReader,__oak_js_default,esc,escape,join,map,parse,parseFalse,parseList,parseNull,parseNumber,parseObject,parseString,parseTrue,serialize,slice,space__oak_qm)=>(({__oak_js_default,slice,map}=__oak_module_import(__Oak_String('std'))),({space__oak_qm,join}=__oak_module_import(__Oak_String('str'))),esc=function esc(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('\t'))?__Oak_String('\\t'):__oak_eq(__oak_cond,__Oak_String('\n'))?__Oak_String('\\n'):__oak_eq(__oak_cond,__Oak_String('\r'))?__Oak_String('\\r'):__oak_eq(__oak_cond,__Oak_String('\f'))?__Oak_String('\\f'):__oak_eq(__oak_cond,__Oak_String('"'))?__Oak_String('\\"'):__oak_eq(__oak_cond,__Oak_String('\\'))?__Oak_String('\\\\'):c)(c)},escape=function escape(s=null){return ((max,sub)=>((max=len(s)),sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__oak_push(acc,esc(__oak_acc(s,__oak_obj_key((i)))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,__Oak_String(''))))()},serialize=function serialize(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('null'))?__Oak_String('null'):__oak_eq(__oak_cond,Symbol.for('empty'))?__Oak_String('null'):__oak_eq(__oak_cond,Symbol.for('function'))?__Oak_String('null'):__oak_eq(__oak_cond,Symbol.for('string'))?__oak_push(__oak_push(__Oak_String('"'),escape(c)),__Oak_String('"')):__oak_eq(__oak_cond,Symbol.for('atom'))?__oak_push(__oak_push(__Oak_String('"'),string(c)),__Oak_String('"')):__oak_eq(__oak_cond,Symbol.for('int'))?string(c):__oak_eq(__oak_cond,Symbol.for('float'))?string(c):__oak_eq(__oak_cond,Symbol.for('bool'))?string(c):__oak_eq(__oak_cond,Symbol.for('list'))?__oak_push(__oak_push(__Oak_String('['),join(map(c,serialize),__Oak_String(','))),__Oak_String(']')):__oak_eq(__oak_cond,Symbol.for('object'))?__oak_push(__oak_push(__Oak_String('{'),join(map(keys(c),function _(k=null){return __oak_push(__oak_push(__oak_push(__Oak_String('"'),escape(k)),__Oak_String('":')),serialize(__oak_acc(c,__oak_obj_key((k)))))}),__Oak_String(','))),__Oak_String('}')):null)(type(c))},Reader=function Reader(s=null){return ((err__oak_qm,forward,index,next,nextWord,peek)=>((index=0),(err__oak_qm=false),next=function next(){return ((index=__as_oak_string(index+1)),__oak_js_default(__oak_acc(s,__oak_obj_key(((index-1)))),__Oak_String('')))},peek=function peek(){return __oak_js_default(__oak_acc(s,__oak_obj_key((index))),__Oak_String(''))},nextWord=function nextWord(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((index=len(s)),null):((word)=>((word=slice(s,index,__as_oak_string(index+n))),(index=__as_oak_string(index+n)),word))())((__as_oak_string(index+n)>len(s)))},forward=function forward(){return ((sub)=>(sub=function sub(){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((index=__as_oak_string(index+1)),__oak_trampoline(__oak_trampolined_sub)):null)(space__oak_qm(peek()))}),__oak_resolve_trampoline(__oak_trampolined_sub)))()},sub()))()},({next,peek,forward,nextWord,done__oak_qm:function _(){return (index>=len(s))},err__oak_exclam:function _(){return ((err__oak_qm=true),Symbol.for('error'))},err__oak_qm:function _(){return err__oak_qm}})))()},parseNull=function parseNull(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('null'))?null:(r.err__oak_exclam)())((r.nextWord)(4))},parseString=function parseString(r=null){return ((next,sub)=>((next=(r.next??null)),next(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){let c;return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?(r.err__oak_exclam)():__oak_eq(__oak_cond,__Oak_String('\\'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('t'))?__Oak_String('\t'):__oak_eq(__oak_cond,__Oak_String('n'))?__Oak_String('\n'):__oak_eq(__oak_cond,__Oak_String('r'))?__Oak_String('\r'):__oak_eq(__oak_cond,__Oak_String('f'))?__Oak_String('\f'):__oak_eq(__oak_cond,__Oak_String('"'))?__Oak_String('"'):c)((c=next())))):__oak_eq(__oak_cond,__Oak_String('"'))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,c)))((c=next()))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub(__Oak_String(''))))()},parseNumber=function parseNumber(r=null){return ((decimal__oak_qm,negate__oak_qm,next,parsed,peek,result,sub)=>((peek=(r.peek??null)),(next=(r.next??null)),(decimal__oak_qm=false),(negate__oak_qm=((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('-'))?(next(),true):false)(peek())),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('.'))?((__oak_cond)=>__oak_eq(__oak_cond,true)?(r.err__oak_exclam)():((decimal__oak_qm=true),__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next()))))(decimal__oak_qm):__oak_eq(__oak_cond,__Oak_String('0'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('1'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('2'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('3'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('4'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('5'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('6'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('7'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('8'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String('9'))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):acc)(peek())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},(result=sub(__Oak_String(''))),((__oak_cond)=>__oak_eq(__oak_cond,null)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,true)?-parsed:parsed)(negate__oak_qm))((parsed=((__oak_cond)=>__oak_eq(__oak_cond,true)?float(result):int(result))(decimal__oak_qm)))))()},parseTrue=function parseTrue(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('true'))?true:(r.err__oak_exclam)())((r.nextWord)(4))},parseFalse=function parseFalse(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('false'))?false:(r.err__oak_exclam)())((r.nextWord)(5))},parseList=function parseList(r=null){return ((err__oak_qm,forward,next,peek,sub)=>((err__oak_qm=(r.err__oak_qm??null)),(peek=(r.peek??null)),(next=(r.next??null)),(forward=(r.forward??null)),next(),forward(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?(r.err__oak_exclam)():__oak_eq(__oak_cond,__Oak_String(']'))?(next(),acc):(__oak_push(acc,_parseReader(r)),forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(','))),forward(),__oak_trampoline(__oak_trampolined_sub,acc)))(peek()))(err__oak_qm())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub([])))()},parseObject=function parseObject(r=null){return ((err__oak_qm,forward,next,peek,sub)=>((err__oak_qm=(r.err__oak_qm??null)),(peek=(r.peek??null)),(next=(r.next??null)),(forward=(r.forward??null)),next(),forward(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?(r.err__oak_exclam)():__oak_eq(__oak_cond,__Oak_String('}'))?(next(),acc):((key)=>((key=parseString(r)),((__oak_cond)=>__oak_eq(__oak_cond,true)?((val)=>(forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(':'))),(val=_parseReader(r)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(','))),forward(),__oak_trampoline(__oak_trampolined_sub,((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),val))):null)(!err__oak_qm())))():null)(!err__oak_qm())))())(peek()))(err__oak_qm())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub(({}))))()},_parseReader=function _parseReader(r=null){return ((result)=>((r.forward)(),(result=((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('n'))?parseNull(r):__oak_eq(__oak_cond,__Oak_String('"'))?parseString(r):__oak_eq(__oak_cond,__Oak_String('t'))?parseTrue(r):__oak_eq(__oak_cond,__Oak_String('f'))?parseFalse(r):__oak_eq(__oak_cond,__Oak_String('['))?parseList(r):__oak_eq(__oak_cond,__Oak_String('{'))?parseObject(r):parseNumber(r))((r.peek)())),((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):result)((r.err__oak_qm)())))()},parse=function parse(s=null){return _parseReader(Reader(s))},({Reader,_parseReader,__oak_js_default,esc,escape,join,map,parse,parseFalse,parseList,parseNull,parseNumber,parseObject,parseString,parseTrue,serialize,slice,space__oak_qm})))()}),__oak_modularize(__Oak_String('sort'),function _(){return ((clone,__oak_js_default,id,map,sort,sort__oak_exclam)=>(({__oak_js_default,identity:id=null,map,clone}=__oak_module_import(__Oak_String('std'))),sort__oak_exclam=function sort__oak_exclam(xs=null,pred=null){return ((partition,quicksort,vpred)=>((pred=__oak_js_default(pred,id)),(vpred=map(xs,pred)),partition=function partition(xs=null,lo=null,hi=null){return ((lsub,pivot,rsub,sub)=>((pivot=__oak_acc(vpred,__oak_obj_key((lo)))),lsub=function lsub(i=null){return ((__oak_trampolined_lsub)=>((__oak_trampolined_lsub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_lsub,__as_oak_string(i+1)):i)((__oak_acc(vpred,__oak_obj_key((i)))<pivot))}),__oak_resolve_trampoline(__oak_trampolined_lsub,i)))()},rsub=function rsub(j=null){return ((__oak_trampolined_rsub)=>((__oak_trampolined_rsub=function _(j=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_rsub,(j-1)):j)((__oak_acc(vpred,__oak_obj_key((j)))>pivot))}),__oak_resolve_trampoline(__oak_trampolined_rsub,j)))()},sub=function sub(i=null,j=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,j=null){return ((i=lsub(i)),(j=rsub(j)),((__oak_cond)=>__oak_eq(__oak_cond,false)?j:((tmp,tmpPred)=>((tmp=__oak_acc(xs,__oak_obj_key((i)))),(tmpPred=__oak_acc(vpred,__oak_obj_key((i)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),__oak_acc(xs,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),tmp),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),__oak_acc(vpred,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),tmpPred),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),(j-1))))())((i<j)))}),__oak_resolve_trampoline(__oak_trampolined_sub,i,j)))()},sub(lo,hi)))()},quicksort=function quicksort(xs=null,lo=null,hi=null){return ((__oak_trampolined_quicksort)=>((__oak_trampolined_quicksort=function _(xs=null,lo=null,hi=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?xs:__oak_eq(__oak_cond,1)?xs:((__oak_cond)=>__oak_eq(__oak_cond,false)?xs:((p)=>((p=partition(xs,lo,hi)),quicksort(xs,lo,p),__oak_trampoline(__oak_trampolined_quicksort,xs,__as_oak_string(p+1),hi)))())((lo<hi)))(len(xs))}),__oak_resolve_trampoline(__oak_trampolined_quicksort,xs,lo,hi)))()},quicksort(xs,0,(len(xs)-1))))()},sort=function sort(xs=null,pred=null){return sort__oak_exclam(clone(xs),pred)},({clone,__oak_js_default,id,map,sort,sort__oak_exclam})))()}),__oak_modularize(__Oak_String('std'),function _(){return ((_asPredicate,_baseIterator,_hToN,_nToH,aloop,append,clamp,clone,compact,constantly,contains__oak_qm,debounce,__oak_js_default,each,entries,every,exclude,filter,find,first,flatten,fromEntries,fromHex,identity,indexOf,is,join,last,loop,map,merge,once,parallel,partition,println,range,reduce,reverse,rfind,rindexOf,separate,serial,slice,some,stdin,take,takeLast,toHex,uniq,values,zip)=>(identity=function identity(x=null){return x},is=function is(x=null){return function _(y=null){return __oak_eq(x,y)}},constantly=function constantly(x=null){return function _(){return x}},_baseIterator=function _baseIterator(v=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__Oak_String(''):__oak_eq(__oak_cond,Symbol.for('list'))?[]:__oak_eq(__oak_cond,Symbol.for('object'))?({}):null)(type(v))},_asPredicate=function _asPredicate(pred=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('atom'))?((prop)=>((prop=string(pred)),function _(x=null){return __oak_acc(x,__oak_obj_key((prop)))}))():__oak_eq(__oak_cond,Symbol.for('string'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:__oak_eq(__oak_cond,Symbol.for('int'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:pred)(type(pred))},__oak_js_default=function __oak_js_default(x=null,base=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?base:x)(x)},(_nToH=__Oak_String('0123456789abcdef')),toHex=function toHex(n=null){return ((sub)=>(sub=function sub(p=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(p=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__as_oak_string(__oak_acc(_nToH,__oak_obj_key((p)))+acc):__oak_trampoline(__oak_trampolined_sub,int((p/16)),__as_oak_string(__oak_acc(_nToH,__oak_obj_key(((p%16))))+acc)))((p<16))}),__oak_resolve_trampoline(__oak_trampolined_sub,p,acc)))()},sub(int(n),__Oak_String(''))))()},(_hToN=({0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15})),fromHex=function fromHex(s=null){return ((sub)=>(sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){let next;return ((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(i,len(s)))?acc:__oak_eq(__oak_cond,!__oak_eq(null,(next=__oak_acc(_hToN,__oak_obj_key((__oak_acc(s,__oak_obj_key((i)))))))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__as_oak_string((acc*16)+next)):null)(true)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,0)))()},clamp=function clamp(min=null,max=null,n=null,m=null){return ((n=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:n)((n<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:m)((m<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?max:m)((m>max))),(n=((__oak_cond)=>__oak_eq(__oak_cond,true)?m:n)((n>m))),[n,m])},slice=function slice(xs=null,min=null,max=null){return ((sub)=>((min=__oak_js_default(min,0)),(max=__oak_js_default(max,len(xs))),([min=null,max=null]=clamp(0,len(xs),min,max)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),min)))()},clone=function clone(x=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__as_oak_string(__Oak_String('')+x):__oak_eq(__oak_cond,Symbol.for('list'))?slice(x):__oak_eq(__oak_cond,Symbol.for('object'))?reduce(keys(x),({}),function _(acc=null,key=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),__oak_acc(x,__oak_obj_key((key))))}):x)(type(x))},range=function range(start=null,end=null,step=null){return ((step=__oak_js_default(step,1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?([start=null,end=null]=[0,start]):null)(__oak_eq(end,null)),((__oak_cond)=>__oak_eq(__oak_cond,0)?[]:((list,sub)=>((list=[]),((__oak_cond)=>__oak_eq(__oak_cond,true)?sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n<end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()}:sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n>end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()})((step>0)),sub(start)))())(step))},reverse=function reverse(xs=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),(i-1)))((i<0))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),(len(xs)-1))))()},map=function map(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,f(__oak_acc(xs,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},each=function each(xs=null,f=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?null:(f(__oak_acc(xs,__oak_obj_key((i))),i),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},filter=function filter(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},exclude=function exclude(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(!f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},separate=function separate(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(is=null,isnt=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(is=null,isnt=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?[is,isnt]:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(is,x):__oak_push(isnt,x))(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,is,isnt,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,is,isnt,i)))()},sub(_baseIterator(xs),_baseIterator(xs),0)))()},reduce=function reduce(xs=null,seed=null,f=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,f(acc,__oak_acc(xs,__oak_obj_key((i))),i),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(seed,0)))()},flatten=function flatten(xs=null){return reduce(xs,[],append)},compact=function compact(xs=null){return filter(xs,function _(x=null){return !__oak_eq(x,null)})},some=function some(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,false,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,pred(x,i)))(acc)}))},every=function every(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,true,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,pred(x,i)))(acc)}))},append=function append(xs=null,ys=null){return reduce(ys,xs,function _(zs=null,y=null){return __oak_push(zs,y)})},join=function join(xs=null,ys=null){return append(clone(xs),ys)},zip=function zip(xs=null,ys=null,zipper=null){return ((max,sub)=>((zipper=__oak_js_default(zipper,function _(x=null,y=null){return [x,y]})),(max=((__oak_cond)=>__oak_eq(__oak_cond,true)?len(xs):len(ys))((len(xs)<len(ys)))),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,zipper(__oak_acc(xs,__oak_obj_key((i))),__oak_acc(ys,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub([],0)))()},partition=function partition(xs=null,by=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('int'))?reduce(xs,[],function _(acc=null,x=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(acc,[x]):(__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x),acc))((i%by))}):__oak_eq(__oak_cond,Symbol.for('function'))?((last)=>((last=function _(){return null}),reduce(xs,[],function _(acc=null,x=null){return ((__oak_js_this)=>(((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x):__oak_push(acc,[x]))((__oak_js_this=by(x))),(last=__oak_js_this),acc))()})))():null)(type(by))},uniq=function uniq(xs=null,pred=null){return ((last,sub,ys)=>((pred=__oak_js_default(pred,identity)),(ys=_baseIterator(xs)),(last=function _(){return null}),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){let p;let x;return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?ys:((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):(__oak_push(ys,x),(last=p),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))((p=pred((x=__oak_acc(xs,__oak_obj_key((i))))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},first=function first(xs=null){return __oak_acc(xs,0)},last=function last(xs=null){return __oak_acc(xs,__oak_obj_key(((len(xs)-1))))},take=function take(xs=null,n=null){return slice(xs,0,n)},takeLast=function takeLast(xs=null,n=null){return slice(xs,(len(xs)-n))},find=function find(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},rfind=function rfind(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,(i-1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub((len(xs)-1))))()},indexOf=function indexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},rindexOf=function rindexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,(i-1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub((len(xs)-1))))()},contains__oak_qm=function contains__oak_qm(xs=null,x=null){return (indexOf(xs,x)>-1)},values=function values(obj=null){return map(keys(obj),function _(key=null){return __oak_acc(obj,__oak_obj_key((key)))})},entries=function entries(obj=null){return map(keys(obj),function _(key=null){return [key,__oak_acc(obj,__oak_obj_key((key)))]})},fromEntries=function fromEntries(entries=null){return reduce(entries,({}),function _(o=null,entry=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((__oak_acc(entry,0)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((__oak_acc(entry,0)))]):(__oak_assgn_tgt[__oak_obj_key((__oak_acc(entry,0)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(o),__oak_acc(entry,1))})},merge=function merge(...os){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:reduce(os,__oak_acc(os,0),function _(acc=null,o=null){return (reduce(keys(o),acc,function _(root=null,k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(root),__oak_acc(o,__oak_obj_key((k))))}))}))(len(os))},once=function once(f=null){return ((called__oak_qm)=>((called__oak_qm=false),function _(...args){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((called__oak_qm=true),f(...args)):null)(!called__oak_qm)}))()},loop=function loop(max=null,f=null){return ((breaker,broken,ret,sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([max=null,f=null]=[-1,max]):null)(__oak_eq(type(max),Symbol.for('function'))),(max=__oak_js_default(max,-1)),(ret=null),(broken=false),breaker=function breaker(x=null){return ((ret=x),(broken=true))},sub=function sub(count=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,broken)?ret:(f(count,breaker),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(count+1))))(true):null)(!__oak_eq(count,max))}),__oak_resolve_trampoline(__oak_trampolined_sub,count)))()},sub(0)))()},aloop=function aloop(max=null,f=null,done=null){return ((sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([max=null,f=null,done=null]=[-1,max,f]):null)(__oak_eq(type(max),Symbol.for('function'))),(max=__oak_js_default(max,-1)),(done=__oak_js_default(done,function _(){return null})),sub=function sub(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?done():f(count,function _(){return sub(__as_oak_string(count+1))},done))(count)},sub(0)))()},serial=function serial(xs=null,f=null,done=null){return ((sub)=>((done=__oak_js_default(done,function _(){return null})),sub=function sub(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?done():f(__oak_acc(xs,__oak_obj_key((i))),i,function _(){return sub(__as_oak_string(i+1))},done))(i)},sub(0)))()},parallel=function parallel(xs=null,f=null,done=null){return ((broken__oak_qm,count)=>((done=__oak_js_default(done,function _(){return null})),(count=0),(broken__oak_qm=false),each(xs,function _(x=null,i=null){return (f(x,i,function _(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((count=__as_oak_string(count+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?done():null)(__oak_eq(count,len(xs)))):null)(!broken__oak_qm)},function _(){return ((broken__oak_qm=true),done())}))})))()},debounce=function debounce(duration=null,firstCall=null,f=null){return ((dargs,debounced,target,waiting__oak_qm)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([firstCall=null,f=null]=[Symbol.for('trailing'),firstCall]):null)(__oak_eq(f,null)),(dargs=null),(waiting__oak_qm=false),(target=(time()-duration)),debounced=function debounced(...args){return ((tcall)=>((tcall=time()),(dargs=args),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?((target=__as_oak_string(tcall+duration)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('leading'))?f(...dargs):__oak_eq(__oak_cond,Symbol.for('trailing'))?((waiting__oak_qm=true),wait((target-time()),function _(){return ((waiting__oak_qm=false),f(...dargs))})):null)(firstCall)):((timeout)=>((waiting__oak_qm=true),(timeout=(target-tcall)),(target=__as_oak_string(target+duration)),wait(timeout,function _(){return ((waiting__oak_qm=false),f(...dargs))})))())((target<=tcall)):null)(!waiting__oak_qm)))()}))()},stdin=function stdin(){return ((file)=>((file=__Oak_String('')),loop(function _(__oak_empty_ident0=null,__oak_js_break=null){return ((evt)=>((evt=input()),__oak_push(file,(evt.data??null)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?__oak_js_break(file):__oak_push(file,__Oak_String('\n')))((evt.type??null))))()})))()},println=function println(...xs){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?print(__Oak_String('\n')):((out)=>((out=reduce(slice(xs,1),string(__oak_acc(xs,0)),function _(acc=null,x=null){return (__as_oak_string(__as_oak_string(acc+__Oak_String(' '))+string(x)))})),print(__as_oak_string(out+__Oak_String('\n')))))())(len(xs))},({_asPredicate,_baseIterator,_hToN,_nToH,aloop,append,clamp,clone,compact,constantly,contains__oak_qm,debounce,__oak_js_default,each,entries,every,exclude,filter,find,first,flatten,fromEntries,fromHex,identity,indexOf,is,join,last,loop,map,merge,once,parallel,partition,println,range,reduce,reverse,rfind,rindexOf,separate,serial,slice,some,stdin,take,takeLast,toHex,uniq,values,zip})))()}),__oak_modularize(__Oak_String('str'),function _(){return ((_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm)=>(({__oak_js_default,slice,take,takeLast,reduce}=__oak_module_import(__Oak_String('std'))),checkRange=function checkRange(lo=null,hi=null){let checker;return checker=function checker(c=null){return ((p)=>((p=codepoint(c)),(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(p<=hi)))((lo<=p))))()}},upper__oak_qm=function upper__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('Z'))))((c>=__Oak_String('A')))},lower__oak_qm=function lower__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('z'))))((c>=__Oak_String('a')))},digit__oak_qm=function digit__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('9'))))((c>=__Oak_String('0')))},space__oak_qm=function space__oak_qm(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(' '))?true:__oak_eq(__oak_cond,__Oak_String('\t'))?true:__oak_eq(__oak_cond,__Oak_String('\n'))?true:__oak_eq(__oak_cond,__Oak_String('\r'))?true:__oak_eq(__oak_cond,__Oak_String('\f'))?true:false)(c)},letter__oak_qm=function letter__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,lower__oak_qm(c)))(upper__oak_qm(c))},word__oak_qm=function word__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,digit__oak_qm(c)))(letter__oak_qm(c))},join=function join(strings=null,joiner=null){return ((joiner=__oak_js_default(joiner,__Oak_String(''))),((__oak_cond)=>__oak_eq(__oak_cond,0)?__Oak_String(''):reduce(slice(strings,1),__oak_acc(strings,0),function _(a=null,b=null){return __as_oak_string(__as_oak_string(a+joiner)+b)}))(len(strings)))},startsWith__oak_qm=function startsWith__oak_qm(s=null,prefix=null){return __oak_eq(take(s,len(prefix)),prefix)},endsWith__oak_qm=function endsWith__oak_qm(s=null,suffix=null){return __oak_eq(takeLast(s,len(suffix)),suffix)},_matchesAt__oak_qm=function _matchesAt__oak_qm(s=null,substr=null,idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?true:__oak_eq(__oak_cond,1)?__oak_eq(__oak_acc(s,__oak_obj_key((idx))),substr):((max,sub)=>((max=len(substr)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?true:((__oak_cond)=>__oak_eq(__oak_cond,__oak_acc(substr,__oak_obj_key((i))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):false)(__oak_acc(s,__oak_obj_key((__as_oak_string(idx+i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))())(len(substr))},indexOf=function indexOf(s=null,substr=null){return ((max,sub)=>((max=(len(s)-len(substr))),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?i:((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):-1)((i<max)))(_matchesAt__oak_qm(s,substr,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(s=null,substr=null){return (indexOf(s,substr)>=0)},cut=function cut(s=null,sep=null){let idx;return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?[s,__Oak_String('')]:[slice(s,0,idx),slice(s,__as_oak_string(idx+len(sep)))])((idx=indexOf(s,sep)))},lower=function lower(s=null){return reduce(s,__Oak_String(''),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char(__as_oak_string(codepoint(c)+32))):__oak_push(acc,c))(upper__oak_qm(c))})},upper=function upper(s=null){return reduce(s,__Oak_String(''),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char((codepoint(c)-32))):__oak_push(acc,c))(lower__oak_qm(c))})},_replaceNonEmpty=function _replaceNonEmpty(s=null,old=null,__oak_js_new=null){return ((lnew,lold,sub)=>((lold=len(old)),(lnew=len(__oak_js_new)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(__as_oak_string(slice(acc,0,i)+__oak_js_new)+slice(acc,__as_oak_string(i+lold))),__as_oak_string(i+lnew)):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1)):acc)((i<len(acc))))(_matchesAt__oak_qm(acc,old,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(s,0)))()},replace=function replace(s=null,old=null,__oak_js_new=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:_replaceNonEmpty(s,old,__oak_js_new))(old)},_splitNonEmpty=function _splitNonEmpty(s=null,sep=null){return ((coll,lsep,sub)=>((coll=[]),(lsep=len(sep)),sub=function sub(acc=null,i=null,last=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null,last=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(coll,slice(acc,last,i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+lsep),__as_oak_string(i+lsep))):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1),last):__oak_push(coll,slice(acc,last)))((i<len(acc))))(_matchesAt__oak_qm(acc,sep,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i,last)))()},sub(s,0,0)))()},split=function split(s=null,sep=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):__oak_eq(__oak_cond,__Oak_String(''))?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):_splitNonEmpty(s,sep))(sep)},_extend=function _extend(pad=null,n=null){return ((part,sub,times)=>((times=int((n/len(pad)))),(part=(n%len(pad))),sub=function sub(base=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(base=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(base,slice(pad,0,part)):__oak_trampoline(__oak_trampolined_sub,__oak_push(base,pad),(i-1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,base,i)))()},sub(__Oak_String(''),times)))()},padStart=function padStart(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__oak_push(_extend(pad,(n-len(s))),s))((len(s)>=n))},padEnd=function padEnd(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(s+_extend(pad,(n-len(s)))))((len(s)>=n))},_trimStartSpace=function _trimStartSpace(s=null){return ((firstNonSpace,subStart)=>(subStart=function subStart(i=null){return ((__oak_trampolined_subStart)=>((__oak_trampolined_subStart=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subStart,__as_oak_string(i+1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subStart,i)))()},(firstNonSpace=subStart(0)),slice(s,firstNonSpace)))()},_trimStartNonEmpty=function _trimStartNonEmpty(s=null,prefix=null){return ((idx,lpref,max,sub)=>((max=len(s)),(lpref=len(prefix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+lpref)):i)(_matchesAt__oak_qm(s,prefix,i)):i)((i<max))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(0)),slice(s,idx)))()},trimStart=function trimStart(s=null,prefix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:__oak_eq(__oak_cond,null)?_trimStartSpace(s):_trimStartNonEmpty(s,prefix))(prefix)},_trimEndSpace=function _trimEndSpace(s=null){return ((lastNonSpace,subEnd)=>(subEnd=function subEnd(i=null){return ((__oak_trampolined_subEnd)=>((__oak_trampolined_subEnd=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subEnd,(i-1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subEnd,i)))()},(lastNonSpace=subEnd((len(s)-1))),slice(s,0,__as_oak_string(lastNonSpace+1))))()},_trimEndNonEmpty=function _trimEndNonEmpty(s=null,suffix=null){return ((idx,lsuf,sub)=>((lsuf=len(suffix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,(i-lsuf)):i)(_matchesAt__oak_qm(s,suffix,(i-lsuf))):i)((i>-1))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(len(s))),slice(s,0,idx)))()},trimEnd=function trimEnd(s=null,suffix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:__oak_eq(__oak_cond,null)?_trimEndSpace(s):_trimEndNonEmpty(s,suffix))(suffix)},trim=function trim(s=null,part=null){return trimEnd(trimStart(s,part),part)},({_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm})))()}),(__Oak_Import_Aliases=({})),__oak_module_import(__Oak_String('main.oak')))