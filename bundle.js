var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                const remove = [];
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j++];
                    if (!attributes[attribute.name]) {
                        remove.push(attribute.name);
                    }
                }
                for (let k = 0; k < remove.length; k++) {
                    node.removeAttribute(remove[k]);
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function query_selector_all(selector, parent = document.body) {
        return Array.from(parent.querySelectorAll(selector));
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src/Navigation.svelte generated by Svelte v3.37.0 */

    function create_if_block$6(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			children(div).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(div, "class", "nav-button-line svelte-gtup2w");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let button;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let div2_class_value;
    	let mounted;
    	let dispose;
    	let if_block = !/*show*/ ctx[0] && create_if_block$6();

    	return {
    		c() {
    			button = element("button");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			div1 = element("div");
    			this.h();
    		},
    		l(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			div2 = claim_element(button_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			div0 = claim_element(div2_nodes, "DIV", { class: true });
    			children(div0).forEach(detach);
    			t0 = claim_space(div2_nodes);
    			if (if_block) if_block.l(div2_nodes);
    			t1 = claim_space(div2_nodes);
    			div1 = claim_element(div2_nodes, "DIV", { class: true });
    			children(div1).forEach(detach);
    			div2_nodes.forEach(detach);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(div0, "class", "nav-button-line svelte-gtup2w");
    			attr(div1, "class", "nav-button-line svelte-gtup2w");
    			attr(div2, "class", div2_class_value = "" + (null_to_empty(/*show*/ ctx[0] ? "close" : "") + " svelte-gtup2w"));
    			attr(button, "class", "nav-button svelte-gtup2w");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, div2);
    			append(div2, div0);
    			append(div2, t0);
    			if (if_block) if_block.m(div2, null);
    			append(div2, t1);
    			append(div2, div1);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*toggle*/ ctx[1])) /*toggle*/ ctx[1].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (!/*show*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block$6();
    					if_block.c();
    					if_block.m(div2, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*show*/ 1 && div2_class_value !== (div2_class_value = "" + (null_to_empty(/*show*/ ctx[0] ? "close" : "") + " svelte-gtup2w"))) {
    				attr(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { show } = $$props;
    	let { toggle } = $$props;

    	$$self.$$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("toggle" in $$props) $$invalidate(1, toggle = $$props.toggle);
    	};

    	return [show, toggle];
    }

    class Navigation extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { show: 0, toggle: 1 });
    	}
    }

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return (typeof payload === 'object') && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Factory for creating new instances
    axios$1.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var default_1 = axios$1;
    axios_1.default = default_1;

    var axios = axios_1;

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    const debounce = (func, wait, immediate) => {
      let timeout;

      return () => {
        let context = undefined,
          args = arguments;

        let later = () => {
          timeout = null;

          if (!immediate) func.apply(context, args);
        };

        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
      };
    };

    const apiCall = async (url, params) => {
      try {
        const { data } = await axios({ method: "GET", url, params });

        return data;
      } catch (error) {
        throw new Error(error);
      }
    };

    const createID = Math.random().toString(36).substring(7);

    const LESSONS = "lessons";
    const ARROW_SRC =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABnUlEQVRoge3ZzUqVQRzH8U/iRbQweiCigjBcJEVBh6QwDILASNy2aNUtdAVeRVfRsstoEUgUKIEW5kvvLR6VGXmac44554wwX5jFMH+e+X2fd2aoVLJwJtNxp/Am6F/INE92GvwJWnYmRjHJKKgipVFFSqOKlEYVKY0qUhpVpDSqSGlUkdKoIqVRRUqjipTGMCKTWMG5TFmm8TLTsQ+ZwCvtYtuq/iuHjeEW6Gbwab925bghB2FeHOw9LibqG4OL3MBmUPsDV/8vbprn+BVMuJaYsDGYyG18Ceq+4fHJxE3zTCyzjmsddY3+InewJZZ4dLJx0yxpL/9BgA3MHqlppEXmsROMb+N+nrhpnuB7EOQzbgbjjX+LLGA3GPuKubxx0zzE3pFAd/fHGt0ii+ITsIXeSNL24YH47G7jnm6Rp+JbclP7xiqGnvih3cMLscgyfgb9DVwfQ9a+9MQyv8UiYT/12i6CW+JvQlf7gEvjCjgMs9rbpkti1SnbFA3/mw7aO5wfZ6jjcgUftRJvtdvVp5bLeI2z4w5SqVQq5fEXMTOSwvhqgGAAAAAASUVORK5CYII=";

    async function updateLesson(lesson) {
      try {
        const stringifiedLessons = localStorage.getItem(LESSONS);
        const lessons = JSON.parse(stringifiedLessons);

        const newLessons = lessons.filter(item => item.id != lesson.id);
        await localStorage.setItem(
          LESSONS,
          JSON.stringify([...newLessons, lesson])
        );
      } catch (error) {
        console.error(error);
      }
    }

    /* src/Lessons.svelte generated by Svelte v3.37.0 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].id;
    	child_ctx[11] = list[i].title;
    	child_ctx[12] = list[i].totalTime;
    	child_ctx[13] = list[i].artist;
    	child_ctx[14] = list[i].finished;
    	return child_ctx;
    }

    // (148:2) {:else}
    function create_else_block_1$3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let button;
    	let t2;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("No lessons yet");
    			t1 = space();
    			button = element("button");
    			t2 = text("Create a new One");
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			t0 = claim_text(div_nodes, "No lessons yet");
    			div_nodes.forEach(detach);
    			t1 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", {});
    			var button_nodes = children(button);
    			t2 = claim_text(button_nodes, "Create a new One");
    			button_nodes.forEach(detach);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			insert(target, t1, anchor);
    			insert(target, button, anchor);
    			append(button, t2);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_2*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t1);
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (111:2) {#if lessons && lessons.length > 0}
    function create_if_block_1$4(ctx) {
    	let ul;
    	let t0;
    	let button;
    	let t1;
    	let mounted;
    	let dispose;
    	let each_value = /*lessons*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			t1 = text("Export Data");
    		},
    		l(nodes) {
    			ul = claim_element(nodes, "UL", {});
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach);
    			t0 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", {});
    			var button_nodes = children(button);
    			t1 = claim_text(button_nodes, "Export Data");
    			button_nodes.forEach(detach);
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert(target, t0, anchor);
    			insert(target, button, anchor);
    			append(button, t1);

    			if (!mounted) {
    				dispose = listen(button, "click", /*exportData*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*deleteLesson, lessons, computePracticeTime, navigate*/ 35) {
    				each_value = /*lessons*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (127:12) {:else}
    function create_else_block$3(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			this.h();
    		},
    		l(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "title", "Start practicing");
    			attr(i, "class", "fa fa-hourglass-start");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (122:31) 
    function create_if_block_4$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			this.h();
    		},
    		l(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "title", "Keep goin. The way to mastery is long.");
    			attr(i, "class", "fa fa-hourglass-end");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (119:12) {#if totalTime}
    function create_if_block_3$3(ctx) {
    	let i;
    	let t0;
    	let t1_value = computePracticeTime(/*totalTime*/ ctx[12]) + "";
    	let t1;

    	return {
    		c() {
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			this.h();
    		},
    		l(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach);
    			t0 = claim_space(nodes);
    			t1 = claim_text(nodes, t1_value);
    			this.h();
    		},
    		h() {
    			attr(i, "title", "Keep practicing");
    			attr(i, "class", "fa fa-hourglass-half");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lessons*/ 2 && t1_value !== (t1_value = computePracticeTime(/*totalTime*/ ctx[12]) + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (131:10) {#if finished}
    function create_if_block_2$3(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			this.h();
    		},
    		l(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "title", "Congrats, you finished this lesson");
    			attr(i, "class", "fa fa-trophy svelte-lc5wwu");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (113:6) {#each lessons as { id, title, totalTime, artist, finished }}
    function create_each_block$4(ctx) {
    	let li;
    	let button0;
    	let t0_value = /*title*/ ctx[11] + "";
    	let t0;
    	let t1;
    	let t2_value = /*artist*/ ctx[13] + "";
    	let t2;
    	let t3;
    	let div;
    	let t4;
    	let t5;
    	let button1;
    	let i;
    	let t6;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*id*/ ctx[10]);
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*totalTime*/ ctx[12]) return create_if_block_3$3;
    		if (/*finished*/ ctx[14]) return create_if_block_4$1;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*finished*/ ctx[14] && create_if_block_2$3();

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*id*/ ctx[10]);
    	}

    	return {
    		c() {
    			li = element("li");
    			button0 = element("button");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			t3 = space();
    			div = element("div");
    			if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			button1 = element("button");
    			i = element("i");
    			t6 = space();
    			this.h();
    		},
    		l(nodes) {
    			li = claim_element(nodes, "LI", { class: true });
    			var li_nodes = children(li);
    			button0 = claim_element(li_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			t0 = claim_text(button0_nodes, t0_value);
    			t1 = claim_text(button0_nodes, " - ");
    			t2 = claim_text(button0_nodes, t2_value);
    			button0_nodes.forEach(detach);
    			t3 = claim_space(li_nodes);
    			div = claim_element(li_nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if_block0.l(div_nodes);
    			div_nodes.forEach(detach);
    			t4 = claim_space(li_nodes);
    			if (if_block1) if_block1.l(li_nodes);
    			t5 = claim_space(li_nodes);
    			button1 = claim_element(li_nodes, "BUTTON", { title: true, class: true });
    			var button1_nodes = children(button1);
    			i = claim_element(button1_nodes, "I", { class: true });
    			children(i).forEach(detach);
    			button1_nodes.forEach(detach);
    			t6 = claim_space(li_nodes);
    			li_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(button0, "class", "fancy-link svelte-lc5wwu");
    			attr(div, "class", "time");
    			attr(i, "class", "fa fa-trash-alt");
    			attr(button1, "title", "Delete Lesson");
    			attr(button1, "class", "naked-button svelte-lc5wwu");
    			attr(li, "class", "lesson svelte-lc5wwu");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, button0);
    			append(button0, t0);
    			append(button0, t1);
    			append(button0, t2);
    			append(li, t3);
    			append(li, div);
    			if_block0.m(div, null);
    			append(li, t4);
    			if (if_block1) if_block1.m(li, null);
    			append(li, t5);
    			append(li, button1);
    			append(button1, i);
    			append(li, t6);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", click_handler),
    					listen(button1, "click", click_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*lessons*/ 2 && t0_value !== (t0_value = /*title*/ ctx[11] + "")) set_data(t0, t0_value);
    			if (dirty & /*lessons*/ 2 && t2_value !== (t2_value = /*artist*/ ctx[13] + "")) set_data(t2, t2_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, null);
    				}
    			}

    			if (/*finished*/ ctx[14]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2$3();
    					if_block1.c();
    					if_block1.m(li, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (160:2) {#if error}
    function create_if_block$5(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*error*/ ctx[2]);
    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, /*error*/ ctx[2]);
    			div_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(div, "class", "error");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data(t, /*error*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let section;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let label;
    	let t3;
    	let input;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*lessons*/ ctx[1] && /*lessons*/ ctx[1].length > 0) return create_if_block_1$4;
    		return create_else_block_1$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*error*/ ctx[2] && create_if_block$5(ctx);

    	return {
    		c() {
    			section = element("section");
    			h1 = element("h1");
    			t0 = text("Click a Lesson to start practicing");
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			label = element("label");
    			t3 = text("Import lessons: ");
    			input = element("input");
    			t4 = space();
    			if (if_block1) if_block1.c();
    			this.h();
    		},
    		l(nodes) {
    			section = claim_element(nodes, "SECTION", {});
    			var section_nodes = children(section);
    			h1 = claim_element(section_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Click a Lesson to start practicing");
    			h1_nodes.forEach(detach);
    			t1 = claim_space(section_nodes);
    			if_block0.l(section_nodes);
    			t2 = claim_space(section_nodes);
    			label = claim_element(section_nodes, "LABEL", {});
    			var label_nodes = children(label);
    			t3 = claim_text(label_nodes, "Import lessons: ");
    			input = claim_element(label_nodes, "INPUT", { accept: true, type: true });
    			label_nodes.forEach(detach);
    			t4 = claim_space(section_nodes);
    			if (if_block1) if_block1.l(section_nodes);
    			section_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(h1, "class", "svelte-lc5wwu");
    			attr(input, "accept", ".json");
    			attr(input, "type", "file");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, h1);
    			append(h1, t0);
    			append(section, t1);
    			if_block0.m(section, null);
    			append(section, t2);
    			append(section, label);
    			append(label, t3);
    			append(label, input);
    			append(section, t4);
    			if (if_block1) if_block1.m(section, null);

    			if (!mounted) {
    				dispose = listen(input, "change", prevent_default(/*importData*/ ctx[4]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(section, t2);
    				}
    			}

    			if (/*error*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$5(ctx);
    					if_block1.c();
    					if_block1.m(section, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function computePracticeTime(totalTime) {
    	const time = {
    		d: Math.floor(totalTime / (60 * 60 * 24)),
    		h: Math.floor(totalTime % (60 * 60 * 24) / 3600),
    		m: Math.floor(totalTime % 3600 / 60),
    		s: Math.floor(totalTime % 60)
    	};

    	return Object.keys(time).reduce(
    		(acc, cV) => {
    			return acc.concat(time[cV] ? `${time[cV]}${cV} ` : "");
    		},
    		""
    	);
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { navigate } = $$props;
    	let lessons;
    	let error = null;

    	async function exportData() {
    		try {
    			const stringifiedLessons = localStorage.getItem(LESSONS);
    			const blob = new Blob([stringifiedLessons], { type: "text/json" });
    			const link = document.createElement("a");
    			link.download = "lessons.json";
    			link.href = window.URL.createObjectURL(blob);
    			link.dataset.downloadurl = `text/json:${link.download}${link.href}`;

    			const evt = new MouseEvent("click",
    			{
    					view: window,
    					bubbles: true,
    					cancelable: true
    				});

    			link.dispatchEvent(evt);
    			link.remove();
    		} catch(err) {
    			$$invalidate(2, error = err.message);
    		}
    	}

    	async function importData(e) {
    		try {
    			$$invalidate(2, error = null);
    			const files = e.target.files;

    			if (files.length == 0) {
    				return;
    			}

    			const file = files[0];

    			if (file.type != "application/json") {
    				throw new Error("Only JSON files allowed!");
    			}

    			let reader = new FileReader();

    			reader.onload = e => {
    				const importedLessons = e.target.result;
    				localStorage.setItem(LESSONS, importedLessons);
    				renderLessons(importedLessons);
    			};

    			reader.onerror = e => {
    				throw new Error(e.target.error.name);
    			};

    			reader.readAsText(file);
    		} catch(err) {
    			$$invalidate(2, error = err.message);
    		}
    	}

    	onMount(() => {
    		const stringifiedLessons = localStorage.getItem(LESSONS);

    		if (stringifiedLessons) {
    			renderLessons(stringifiedLessons);
    		}
    	});

    	function renderLessons(stringifiedLessons) {
    		$$invalidate(1, lessons = JSON.parse(stringifiedLessons));

    		lessons.sort((a, b) => {
    			const titleA = a.title.toUpperCase(); // ignore upper and lowercase
    			const titleB = b.title.toUpperCase(); // ignore upper and lowercase

    			if (titleA < titleB) {
    				return -1;
    			} else if (titleA > titleB) {
    				return 1;
    			}

    			// names must be equal
    			return 0;
    		});
    	}

    	function deleteLesson(id) {
    		const newLessons = lessons.filter(lesson => lesson.id != id);
    		$$invalidate(1, lessons = newLessons);
    		localStorage.setItem(LESSONS, JSON.stringify(newLessons));
    	}

    	const click_handler = id => navigate("lesson", id);
    	const click_handler_1 = id => deleteLesson(id);
    	const click_handler_2 = () => navigate("new");

    	$$self.$$set = $$props => {
    		if ("navigate" in $$props) $$invalidate(0, navigate = $$props.navigate);
    	};

    	return [
    		navigate,
    		lessons,
    		error,
    		exportData,
    		importData,
    		deleteLesson,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Lessons extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { navigate: 0 });
    	}
    }

    /* src/VideoSnippet.svelte generated by Svelte v3.37.0 */

    function create_if_block$4(ctx) {
    	let img;
    	let img_alt_value;
    	let img_src_value;
    	let img_height_value;
    	let t0;
    	let h1;
    	let t1_value = /*snippet*/ ctx[0].title + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*snippet*/ ctx[0].description + "";
    	let t3;

    	return {
    		c() {
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			this.h();
    		},
    		l(nodes) {
    			img = claim_element(nodes, "IMG", {
    				alt: true,
    				src: true,
    				width: true,
    				height: true,
    				class: true
    			});

    			t0 = claim_space(nodes);
    			h1 = claim_element(nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, t1_value);
    			h1_nodes.forEach(detach);
    			t2 = claim_space(nodes);
    			p = claim_element(nodes, "P", { class: true });
    			var p_nodes = children(p);
    			t3 = claim_text(p_nodes, t3_value);
    			p_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(img, "alt", img_alt_value = /*snippet*/ ctx[0].title);
    			if (img.src !== (img_src_value = /*snippet*/ ctx[0].thumbnails.default.url)) attr(img, "src", img_src_value);
    			attr(img, "width", 250);
    			attr(img, "height", img_height_value = /*snippet*/ ctx[0].thumbnails.default.height);
    			attr(img, "class", "svelte-14cidi1");
    			attr(h1, "class", "svelte-14cidi1");
    			attr(p, "class", "svelte-14cidi1");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			insert(target, t0, anchor);
    			insert(target, h1, anchor);
    			append(h1, t1);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			append(p, t3);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*snippet*/ 1 && img_alt_value !== (img_alt_value = /*snippet*/ ctx[0].title)) {
    				attr(img, "alt", img_alt_value);
    			}

    			if (dirty & /*snippet*/ 1 && img.src !== (img_src_value = /*snippet*/ ctx[0].thumbnails.default.url)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*snippet*/ 1 && img_height_value !== (img_height_value = /*snippet*/ ctx[0].thumbnails.default.height)) {
    				attr(img, "height", img_height_value);
    			}

    			if (dirty & /*snippet*/ 1 && t1_value !== (t1_value = /*snippet*/ ctx[0].title + "")) set_data(t1, t1_value);
    			if (dirty & /*snippet*/ 1 && t3_value !== (t3_value = /*snippet*/ ctx[0].description + "")) set_data(t3, t3_value);
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    			if (detaching) detach(t0);
    			if (detaching) detach(h1);
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let section;
    	let if_block = /*snippet*/ ctx[0] && create_if_block$4(ctx);

    	return {
    		c() {
    			section = element("section");
    			if (if_block) if_block.c();
    			this.h();
    		},
    		l(nodes) {
    			section = claim_element(nodes, "SECTION", { class: true });
    			var section_nodes = children(section);
    			if (if_block) if_block.l(section_nodes);
    			section_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(section, "class", "svelte-14cidi1");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*snippet*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(section, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { snippet } = $$props;
    	console.log(snippet);

    	$$self.$$set = $$props => {
    		if ("snippet" in $$props) $$invalidate(0, snippet = $$props.snippet);
    	};

    	return [snippet];
    }

    class VideoSnippet extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { snippet: 0 });
    	}
    }

    /* src/NewLesson.svelte generated by Svelte v3.37.0 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i].value;
    	child_ctx[19] = list[i].label;
    	child_ctx[8] = list[i].func;
    	child_ctx[20] = list[i].error;
    	child_ctx[21] = list;
    	child_ctx[22] = i;
    	return child_ctx;
    }

    // (152:8) {#if error}
    function create_if_block_1$3(ctx) {
    	let div;
    	let t_value = /*error*/ ctx[20] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, t_value);
    			div_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(div, "class", "error svelte-1p9a2qi");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*inputs*/ 4 && t_value !== (t_value = /*error*/ ctx[20] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (148:4) {#each inputs as { value, label, func, error }}
    function create_each_block_1$1(ctx) {
    	let div;
    	let input;
    	let t0;
    	let label;
    	let t1_value = /*label*/ ctx[19] + "";
    	let t1;
    	let label_class_value;
    	let t2;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[5].call(input, /*each_value_1*/ ctx[21], /*each_index*/ ctx[22]);
    	}

    	let if_block = /*error*/ ctx[20] && create_if_block_1$3(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			if (if_block) if_block.c();
    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			input = claim_element(div_nodes, "INPUT", { class: true });
    			t0 = claim_space(div_nodes);
    			label = claim_element(div_nodes, "LABEL", { class: true });
    			var label_nodes = children(label);
    			t1 = claim_text(label_nodes, t1_value);
    			label_nodes.forEach(detach);
    			t2 = claim_space(div_nodes);
    			if (if_block) if_block.l(div_nodes);
    			div_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(input, "class", "svelte-1p9a2qi");
    			attr(label, "class", label_class_value = "" + (null_to_empty(/*value*/ ctx[18] ? "flying-label" : "") + " svelte-1p9a2qi"));
    			attr(div, "class", "input-container svelte-1p9a2qi");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[18]);
    			append(div, t0);
    			append(div, label);
    			append(label, t1);
    			append(div, t2);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", function () {
    						if (is_function(/*func*/ ctx[8])) /*func*/ ctx[8].apply(this, arguments);
    					}),
    					listen(input, "input", input_input_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*inputs*/ 4 && input.value !== /*value*/ ctx[18]) {
    				set_input_value(input, /*value*/ ctx[18]);
    			}

    			if (dirty & /*inputs*/ 4 && t1_value !== (t1_value = /*label*/ ctx[19] + "")) set_data(t1, t1_value);

    			if (dirty & /*inputs*/ 4 && label_class_value !== (label_class_value = "" + (null_to_empty(/*value*/ ctx[18] ? "flying-label" : "") + " svelte-1p9a2qi"))) {
    				attr(label, "class", label_class_value);
    			}

    			if (/*error*/ ctx[20]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (159:6) {#if videos}
    function create_if_block$3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*videos*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l(nodes) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(nodes);
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*values, videos*/ 3) {
    				each_value = /*videos*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (160:8) {#each videos as video}
    function create_each_block$3(ctx) {
    	let li;
    	let videosnippet;
    	let t;
    	let li_title_value;
    	let current;
    	let mounted;
    	let dispose;

    	videosnippet = new VideoSnippet({
    			props: { snippet: /*video*/ ctx[15].snippet }
    		});

    	function func(...args) {
    		return /*func*/ ctx[8](/*video*/ ctx[15], ...args);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*video*/ ctx[15]);
    	}

    	function func_1(...args) {
    		return /*func_1*/ ctx[7](/*video*/ ctx[15], ...args);
    	}

    	return {
    		c() {
    			li = element("li");
    			create_component(videosnippet.$$.fragment);
    			t = space();
    			this.h();
    		},
    		l(nodes) {
    			li = claim_element(nodes, "LI", { title: true, class: true, role: true });
    			var li_nodes = children(li);
    			claim_component(videosnippet.$$.fragment, li_nodes);
    			t = claim_space(li_nodes);
    			li_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(li, "title", li_title_value = `Click to ${/*values*/ ctx[0].videos.length > 0 && /*values*/ ctx[0].videos.find(func)
			? "un"
			: ""}select`);

    			attr(li, "class", "empty-button svelte-1p9a2qi");
    			attr(li, "role", "button");
    			toggle_class(li, "selected", /*values*/ ctx[0].videos.length > 0 && /*values*/ ctx[0].videos.find(func_1));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			mount_component(videosnippet, li, null);
    			append(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen(li, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const videosnippet_changes = {};
    			if (dirty & /*videos*/ 2) videosnippet_changes.snippet = /*video*/ ctx[15].snippet;
    			videosnippet.$set(videosnippet_changes);

    			if (!current || dirty & /*values, videos*/ 3 && li_title_value !== (li_title_value = `Click to ${/*values*/ ctx[0].videos.length > 0 && /*values*/ ctx[0].videos.find(func)
			? "un"
			: ""}select`)) {
    				attr(li, "title", li_title_value);
    			}

    			if (dirty & /*values, videos*/ 3) {
    				toggle_class(li, "selected", /*values*/ ctx[0].videos.length > 0 && /*values*/ ctx[0].videos.find(func_1));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(videosnippet.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(videosnippet.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_component(videosnippet);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let section;
    	let h1;
    	let t0;
    	let t1;
    	let form;
    	let t2;
    	let ul;
    	let ul_class_value;
    	let t3;
    	let button;
    	let t4;
    	let button_disabled_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*inputs*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let if_block = /*videos*/ ctx[1] && create_if_block$3(ctx);

    	return {
    		c() {
    			section = element("section");
    			h1 = element("h1");
    			t0 = text("Create a new Lesson");
    			t1 = space();
    			form = element("form");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			ul = element("ul");
    			if (if_block) if_block.c();
    			t3 = space();
    			button = element("button");
    			t4 = text("Save Lesson");
    			this.h();
    		},
    		l(nodes) {
    			section = claim_element(nodes, "SECTION", { id: true, class: true });
    			var section_nodes = children(section);
    			h1 = claim_element(section_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Create a new Lesson");
    			h1_nodes.forEach(detach);
    			t1 = claim_space(section_nodes);
    			form = claim_element(section_nodes, "FORM", { class: true });
    			var form_nodes = children(form);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(form_nodes);
    			}

    			t2 = claim_space(form_nodes);
    			ul = claim_element(form_nodes, "UL", { class: true });
    			var ul_nodes = children(ul);
    			if (if_block) if_block.l(ul_nodes);
    			ul_nodes.forEach(detach);
    			t3 = claim_space(form_nodes);
    			button = claim_element(form_nodes, "BUTTON", { disabled: true, type: true });
    			var button_nodes = children(button);
    			t4 = claim_text(button_nodes, "Save Lesson");
    			button_nodes.forEach(detach);
    			form_nodes.forEach(detach);
    			section_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(ul, "class", ul_class_value = "" + (null_to_empty(`search-result ${/*videos*/ ctx[1] ? "search-result-show" : ""}`) + " svelte-1p9a2qi"));
    			button.disabled = button_disabled_value = !/*values*/ ctx[0].title || /*values*/ ctx[0].title == "";
    			attr(button, "type", "submit");
    			attr(form, "class", "svelte-1p9a2qi");
    			attr(section, "id", "container");
    			attr(section, "class", "svelte-1p9a2qi");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, h1);
    			append(h1, t0);
    			append(section, t1);
    			append(section, form);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(form, null);
    			}

    			append(form, t2);
    			append(form, ul);
    			if (if_block) if_block.m(ul, null);
    			append(form, t3);
    			append(form, button);
    			append(button, t4);
    			current = true;

    			if (!mounted) {
    				dispose = listen(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*inputs*/ 4) {
    				each_value_1 = /*inputs*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(form, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (/*videos*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*videos*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*videos*/ 2 && ul_class_value !== (ul_class_value = "" + (null_to_empty(`search-result ${/*videos*/ ctx[1] ? "search-result-show" : ""}`) + " svelte-1p9a2qi"))) {
    				attr(ul, "class", ul_class_value);
    			}

    			if (!current || dirty & /*values*/ 1 && button_disabled_value !== (button_disabled_value = !/*values*/ ctx[0].title || /*values*/ ctx[0].title == "")) {
    				button.disabled = button_disabled_value;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { navigate } = $$props;

    	let values = {
    		artist: "",
    		title: null,
    		videos: [],
    		tab: null,
    		coordinates: [{ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }]
    	};

    	let videoSearch;
    	let videos;
    	let tabs;
    	let videoError;

    	const inputs = [
    		{
    			label: "Song",
    			get value() {
    				return values.title;
    			},
    			set value(val) {
    				$$invalidate(0, values.title = val, values);
    			}
    		},
    		{
    			label: "Artist",
    			get value() {
    				return values.artist;
    			},
    			set value(val) {
    				$$invalidate(0, values.artist = val, values);
    			}
    		},
    		{
    			label: "Search Youtube",
    			get value() {
    				return videoSearch;
    			},
    			set value(val) {
    				videoSearch = val;
    			},
    			func: debounce(searchYoutube, 300),
    			get error() {
    				return videoError;
    			},
    			set error(err) {
    				videoError = err;
    			}
    		},
    		{
    			label: "Enter Guitartab url",
    			get value() {
    				return values.tab;
    			},
    			set value(val) {
    				$$invalidate(0, values.tab = val, values);
    			}
    		}
    	]; // func: debounce(searchSongsterr, 300),
    	// error: tabError,

    	async function searchYoutube() {
    		if (videoSearch && videoSearch.length > 3) {
    			try {
    				const res = await apiCall("https://www.googleapis.com/youtube/v3/search", {
    					q: videoSearch,
    					type: "video",
    					key: "AIzaSyAViHdvitELO2-jct4oVozhk8Wq3hCkjRk",
    					part: "snippet",
    					maxResults: 7,
    					topicId: "/m/04rlf"
    				});

    				tabs = null;
    				$$invalidate(1, videos = res.items);
    				videoError = null;
    			} catch(error) {
    				videoError = "Oops, couldn't get data from youtube. Sorry :-(";
    			}
    		}
    	}

    	// async function searchSongsterr() {
    	//   if (tabSearch && tabSearch.length > 3) {
    	//     values.tab = null;
    	//     videos = null;
    	//     try {
    	//       const res = await apiCall("http://www.songsterr.com/a/ra/songs.json", {
    	//         pattern: tabSearch,
    	//       });
    	//       console.log("FIRE: searchSongsterr -> res", res);
    	//       tabs = res > 7 ? res.slice(0, 7) : res;
    	//       tabError = null;
    	//     } catch (error) {
    	//       tabError = "Oops, couldn't get data from songsterr. Sorry :-(";
    	//     }
    	//   }
    	// }
    	const handleSubmit = async () => {
    		try {
    			$$invalidate(0, values.id = `${values.title}-${createID}`, values);
    			let lessons;
    			const stringifiedLessons = await localStorage.getItem(LESSONS);

    			if (stringifiedLessons) {
    				lessons = JSON.parse(stringifiedLessons);
    				lessons.push(values);
    			} else {
    				lessons = [values];
    			}

    			await localStorage.setItem(LESSONS, JSON.stringify(lessons));
    			navigate("lesson", values.id);
    		} catch(err) {
    			console.error(err);
    		}
    	};

    	function input_input_handler(each_value_1, each_index) {
    		each_value_1[each_index].value = this.value;
    		$$invalidate(2, inputs);
    	}

    	const func = (video, videoID) => videoID == video.id.videoId;

    	const click_handler = video => {
    		if (values.videos.length > 0) {
    			const alreadyIn = values.videos.find(vid => vid == video.id.videoId);

    			if (alreadyIn) {
    				$$invalidate(0, values.videos = values.videos.filter(vid => vid != alreadyIn), values);
    			} else {
    				$$invalidate(0, values.videos = [...values.videos, video.id.videoId], values);
    			}
    		} else {
    			$$invalidate(0, values.videos = [video.id.videoId], values);
    		}
    	};

    	const func_1 = (video, videoID) => videoID == video.id.videoId;

    	$$self.$$set = $$props => {
    		if ("navigate" in $$props) $$invalidate(4, navigate = $$props.navigate);
    	};

    	return [
    		values,
    		videos,
    		inputs,
    		handleSubmit,
    		navigate,
    		input_input_handler,
    		click_handler,
    		func_1,
    		func
    	];
    }

    class NewLesson extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { navigate: 4 });
    	}
    }

    /* src/Stopwatch.svelte generated by Svelte v3.37.0 */

    const { document: document_1 } = globals;

    function create_fragment$5(ctx) {
    	let title_value;
    	let t0;
    	let section;
    	let form;
    	let div0;
    	let button0;
    	let i0;
    	let t1;
    	let button1;
    	let i1;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let span0;
    	let t5;
    	let t6;
    	let div2;
    	let t7;
    	let t8;
    	let span1;
    	let t9;
    	let t10;
    	let div3;
    	let t11;
    	let mounted;
    	let dispose;
    	document_1.title = title_value = /*title*/ ctx[3];

    	return {
    		c() {
    			t0 = space();
    			section = element("section");
    			form = element("form");
    			div0 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t1 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t2 = space();
    			div1 = element("div");
    			t3 = text(/*normalizedHours*/ ctx[0]);
    			t4 = space();
    			span0 = element("span");
    			t5 = text(":");
    			t6 = space();
    			div2 = element("div");
    			t7 = text(/*normalizedMinutes*/ ctx[1]);
    			t8 = space();
    			span1 = element("span");
    			t9 = text(":");
    			t10 = space();
    			div3 = element("div");
    			t11 = text(/*normalizedSeconds*/ ctx[2]);
    			this.h();
    		},
    		l(nodes) {
    			const head_nodes = query_selector_all("[data-svelte=\"svelte-1258swp\"]", document_1.head);
    			head_nodes.forEach(detach);
    			t0 = claim_space(nodes);
    			section = claim_element(nodes, "SECTION", {});
    			var section_nodes = children(section);
    			form = claim_element(section_nodes, "FORM", { class: true });
    			var form_nodes = children(form);
    			div0 = claim_element(form_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			button0 = claim_element(div0_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			i0 = claim_element(button0_nodes, "I", { class: true });
    			children(i0).forEach(detach);
    			button0_nodes.forEach(detach);
    			t1 = claim_space(div0_nodes);
    			button1 = claim_element(div0_nodes, "BUTTON", { type: true, class: true });
    			var button1_nodes = children(button1);
    			i1 = claim_element(button1_nodes, "I", { class: true });
    			children(i1).forEach(detach);
    			button1_nodes.forEach(detach);
    			div0_nodes.forEach(detach);
    			t2 = claim_space(form_nodes);
    			div1 = claim_element(form_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t3 = claim_text(div1_nodes, /*normalizedHours*/ ctx[0]);
    			div1_nodes.forEach(detach);
    			t4 = claim_space(form_nodes);
    			span0 = claim_element(form_nodes, "SPAN", { class: true });
    			var span0_nodes = children(span0);
    			t5 = claim_text(span0_nodes, ":");
    			span0_nodes.forEach(detach);
    			t6 = claim_space(form_nodes);
    			div2 = claim_element(form_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			t7 = claim_text(div2_nodes, /*normalizedMinutes*/ ctx[1]);
    			div2_nodes.forEach(detach);
    			t8 = claim_space(form_nodes);
    			span1 = claim_element(form_nodes, "SPAN", { class: true });
    			var span1_nodes = children(span1);
    			t9 = claim_text(span1_nodes, ":");
    			span1_nodes.forEach(detach);
    			t10 = claim_space(form_nodes);
    			div3 = claim_element(form_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			t11 = claim_text(div3_nodes, /*normalizedSeconds*/ ctx[2]);
    			div3_nodes.forEach(detach);
    			form_nodes.forEach(detach);
    			section_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i0, "class", "fa fa-play-circle");
    			attr(button0, "class", "svelte-1buxm1u");
    			attr(i1, "class", "fa fa-stop-circle");
    			attr(button1, "type", "button");
    			attr(button1, "class", "svelte-1buxm1u");
    			attr(div0, "class", "controls svelte-1buxm1u");
    			attr(div1, "class", "time svelte-1buxm1u");
    			attr(span0, "class", "svelte-1buxm1u");
    			attr(div2, "class", "time svelte-1buxm1u");
    			attr(span1, "class", "svelte-1buxm1u");
    			attr(div3, "class", "time svelte-1buxm1u");
    			attr(form, "class", "svelte-1buxm1u");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, section, anchor);
    			append(section, form);
    			append(form, div0);
    			append(div0, button0);
    			append(button0, i0);
    			append(div0, t1);
    			append(div0, button1);
    			append(button1, i1);
    			append(form, t2);
    			append(form, div1);
    			append(div1, t3);
    			append(form, t4);
    			append(form, span0);
    			append(span0, t5);
    			append(form, t6);
    			append(form, div2);
    			append(div2, t7);
    			append(form, t8);
    			append(form, span1);
    			append(span1, t9);
    			append(form, t10);
    			append(form, div3);
    			append(div3, t11);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*run*/ ctx[4]),
    					listen(button1, "click", /*stop*/ ctx[5]),
    					listen(form, "submit", prevent_default(/*run*/ ctx[4]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 8 && title_value !== (title_value = /*title*/ ctx[3])) {
    				document_1.title = title_value;
    			}

    			if (dirty & /*normalizedHours*/ 1) set_data(t3, /*normalizedHours*/ ctx[0]);
    			if (dirty & /*normalizedMinutes*/ 2) set_data(t7, /*normalizedMinutes*/ ctx[1]);
    			if (dirty & /*normalizedSeconds*/ 4) set_data(t11, /*normalizedSeconds*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(section);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let normalizedHours;
    	let normalizedMinutes;
    	let normalizedSeconds;
    	let title;
    	let { updateTime = null } = $$props;
    	let total = 0;
    	let minutes = 0;
    	let seconds = 0;
    	let hours = 0;
    	let running = false;
    	let time;
    	let updated = false;
    	const audio = new Audio("Herbert-03.wav");

    	function run() {
    		if (running) {
    			return;
    		}

    		running = true;
    		updated = false;
    		timer();
    	}

    	function timer() {
    		time = setInterval(
    			() => {
    				total++;

    				if (seconds == 59) {
    					$$invalidate(8, seconds = 0);

    					if (minutes == 9) {
    						audio.play();
    						$$invalidate(7, minutes++, minutes);
    					} else if (minutes == 59) {
    						$$invalidate(7, minutes = 0);

    						if (hours == 23) {
    							$$invalidate(9, hours = 0);
    						}

    						$$invalidate(9, hours++, hours);
    					} else {
    						$$invalidate(7, minutes++, minutes);
    					}
    				} else {
    					$$invalidate(8, seconds++, seconds);
    				}
    			},
    			1000
    		);
    	}

    	function stop() {
    		clearInterval(time);

    		if (updateTime && !updated) {
    			updateTime(total);
    			total = 0;
    			updated = true;
    		}

    		running = false;
    	}

    	onDestroy(() => {
    		clearInterval(time);

    		if (updateTime && !updated) {
    			updateTime(total);
    		}

    		// Setting the title via the variable does not work
    		document.title = "Raguprato";
    	});

    	$$self.$$set = $$props => {
    		if ("updateTime" in $$props) $$invalidate(6, updateTime = $$props.updateTime);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*hours*/ 512) {
    			$$invalidate(0, normalizedHours = hours > 9 ? hours : `0${hours}`);
    		}

    		if ($$self.$$.dirty & /*minutes*/ 128) {
    			$$invalidate(1, normalizedMinutes = minutes > 9 ? minutes : `0${minutes}`);
    		}

    		if ($$self.$$.dirty & /*seconds*/ 256) {
    			$$invalidate(2, normalizedSeconds = seconds > 9 ? seconds : `0${seconds}`);
    		}

    		if ($$self.$$.dirty & /*normalizedHours, normalizedMinutes, normalizedSeconds*/ 7) {
    			$$invalidate(3, title = `${normalizedHours}:${normalizedMinutes}:${normalizedSeconds}`);
    		}
    	};

    	return [
    		normalizedHours,
    		normalizedMinutes,
    		normalizedSeconds,
    		title,
    		run,
    		stop,
    		updateTime,
    		minutes,
    		seconds,
    		hours
    	];
    }

    class Stopwatch extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { updateTime: 6 });
    	}
    }

    /* src/LessonHeader.svelte generated by Svelte v3.37.0 */

    function create_else_block_3(ctx) {
    	let button;
    	let t_value = /*lesson*/ ctx[0].title + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			this.h();
    		},
    		l(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t = claim_text(button_nodes, t_value);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(button, "class", "naked-button svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t_value !== (t_value = /*lesson*/ ctx[0].title + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (46:4) {#if edit == 1}
    function create_if_block_3$2(ctx) {
    	let form;
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			form = element("form");
    			input = element("input");
    			this.h();
    		},
    		l(nodes) {
    			form = claim_element(nodes, "FORM", { name: true });
    			var form_nodes = children(form);
    			input = claim_element(form_nodes, "INPUT", {});
    			form_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(form, "name", "title");
    		},
    		m(target, anchor) {
    			insert(target, form, anchor);
    			append(form, input);
    			set_input_value(input, /*title*/ ctx[3]);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[8]),
    					listen(form, "submit", prevent_default(/*update*/ ctx[7]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 8 && input.value !== /*title*/ ctx[3]) {
    				set_input_value(input, /*title*/ ctx[3]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (60:4) {:else}
    function create_else_block_2(ctx) {
    	let button;
    	let t_value = /*lesson*/ ctx[0].artist + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			this.h();
    		},
    		l(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t = claim_text(button_nodes, t_value);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(button, "class", "naked-button svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_1*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t_value !== (t_value = /*lesson*/ ctx[0].artist + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (56:4) {#if edit == 2}
    function create_if_block_2$2(ctx) {
    	let form;
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			form = element("form");
    			input = element("input");
    			this.h();
    		},
    		l(nodes) {
    			form = claim_element(nodes, "FORM", { name: true });
    			var form_nodes = children(form);
    			input = claim_element(form_nodes, "INPUT", {});
    			form_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(form, "name", "artist");
    		},
    		m(target, anchor) {
    			insert(target, form, anchor);
    			append(form, input);
    			set_input_value(input, /*artist*/ ctx[4]);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler_1*/ ctx[10]),
    					listen(form, "submit", prevent_default(/*update*/ ctx[7]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*artist*/ 16 && input.value !== /*artist*/ ctx[4]) {
    				set_input_value(input, /*artist*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (80:4) {:else}
    function create_else_block_1$2(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = /*lesson*/ ctx[0].capo + "";
    	let t1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Capo:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Capo:");
    			label_nodes.forEach(detach);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(label, "for", "capo");
    			attr(label, "class", "svelte-16hhovy");
    			attr(button, "class", "naked-button svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, label);
    			append(label, t0);
    			append(button, t1);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_2*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = /*lesson*/ ctx[0].capo + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (70:4) {#if edit == 3}
    function create_if_block_1$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			t0 = text("Capo:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Capo:");
    			label_nodes.forEach(detach);
    			t1 = claim_space(nodes);

    			input = claim_element(nodes, "INPUT", {
    				id: true,
    				type: true,
    				placeholder: true,
    				min: true,
    				max: true,
    				class: true
    			});

    			this.h();
    		},
    		h() {
    			attr(label, "for", "capo");
    			attr(label, "class", "svelte-16hhovy");
    			attr(input, "id", "capo");
    			attr(input, "type", "number");
    			attr(input, "placeholder", "X");
    			attr(input, "min", "0");
    			attr(input, "max", "12");
    			attr(input, "class", "svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t0);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*capo*/ ctx[1]);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler_2*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*capo*/ 2 && to_number(input.value) !== /*capo*/ ctx[1]) {
    				set_input_value(input, /*capo*/ ctx[1]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (96:4) {:else}
    function create_else_block$2(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = /*lesson*/ ctx[0].tuning + "";
    	let t1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Tuning:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Tuning:");
    			label_nodes.forEach(detach);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(label, "for", "tuning");
    			attr(label, "class", "svelte-16hhovy");
    			attr(button, "class", "naked-button svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, label);
    			append(label, t0);
    			append(button, t1);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_3*/ ctx[15]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = /*lesson*/ ctx[0].tuning + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (88:4) {#if edit == 4}
    function create_if_block$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			t0 = text("Tuning:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Tuning:");
    			label_nodes.forEach(detach);
    			t1 = claim_space(nodes);
    			input = claim_element(nodes, "INPUT", { id: true, class: true, placeholder: true });
    			this.h();
    		},
    		h() {
    			attr(label, "for", "tuning");
    			attr(label, "class", "svelte-16hhovy");
    			attr(input, "id", "tuning");
    			attr(input, "class", "text-input svelte-16hhovy");
    			attr(input, "placeholder", "Standard");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t0);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*tuning*/ ctx[2]);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler_3*/ ctx[14]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*tuning*/ 4 && input.value !== /*tuning*/ ctx[2]) {
    				set_input_value(input, /*tuning*/ ctx[2]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let header;
    	let h1;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let t3;
    	let stopwatch;
    	let t4;
    	let form0;
    	let t5;
    	let form1;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*edit*/ ctx[5] == 1) return create_if_block_3$2;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*edit*/ ctx[5] == 2) return create_if_block_2$2;
    		return create_else_block_2;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	stopwatch = new Stopwatch({
    			props: { updateTime: /*updateTime*/ ctx[6] }
    		});

    	function select_block_type_2(ctx, dirty) {
    		if (/*edit*/ ctx[5] == 3) return create_if_block_1$2;
    		return create_else_block_1$2;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (/*edit*/ ctx[5] == 4) return create_if_block$2;
    		return create_else_block$2;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block3 = current_block_type_3(ctx);

    	return {
    		c() {
    			header = element("header");
    			h1 = element("h1");
    			if_block0.c();
    			t0 = space();
    			span = element("span");
    			t1 = text("-");
    			t2 = space();
    			if_block1.c();
    			t3 = space();
    			create_component(stopwatch.$$.fragment);
    			t4 = space();
    			form0 = element("form");
    			if_block2.c();
    			t5 = space();
    			form1 = element("form");
    			if_block3.c();
    			this.h();
    		},
    		l(nodes) {
    			header = claim_element(nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			h1 = claim_element(header_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			if_block0.l(h1_nodes);
    			t0 = claim_space(h1_nodes);
    			span = claim_element(h1_nodes, "SPAN", {});
    			var span_nodes = children(span);
    			t1 = claim_text(span_nodes, "-");
    			span_nodes.forEach(detach);
    			t2 = claim_space(h1_nodes);
    			if_block1.l(h1_nodes);
    			h1_nodes.forEach(detach);
    			t3 = claim_space(header_nodes);
    			claim_component(stopwatch.$$.fragment, header_nodes);
    			t4 = claim_space(header_nodes);
    			form0 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form0_nodes = children(form0);
    			if_block2.l(form0_nodes);
    			form0_nodes.forEach(detach);
    			t5 = claim_space(header_nodes);
    			form1 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form1_nodes = children(form1);
    			if_block3.l(form1_nodes);
    			form1_nodes.forEach(detach);
    			header_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(h1, "class", "svelte-16hhovy");
    			attr(form0, "name", "capo");
    			attr(form0, "class", "header-form svelte-16hhovy");
    			attr(form1, "name", "tuning");
    			attr(form1, "class", "header-form svelte-16hhovy");
    			attr(header, "class", "svelte-16hhovy");
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);
    			append(header, h1);
    			if_block0.m(h1, null);
    			append(h1, t0);
    			append(h1, span);
    			append(span, t1);
    			append(h1, t2);
    			if_block1.m(h1, null);
    			append(header, t3);
    			mount_component(stopwatch, header, null);
    			append(header, t4);
    			append(header, form0);
    			if_block2.m(form0, null);
    			append(header, t5);
    			append(header, form1);
    			if_block3.m(form1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(form0, "submit", prevent_default(/*update*/ ctx[7])),
    					listen(form1, "submit", prevent_default(/*update*/ ctx[7]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(h1, t0);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(h1, null);
    				}
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(form0, null);
    				}
    			}

    			if (current_block_type_3 === (current_block_type_3 = select_block_type_3(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type_3(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(form1, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(stopwatch.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(stopwatch.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			if_block0.d();
    			if_block1.d();
    			destroy_component(stopwatch);
    			if_block2.d();
    			if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { lesson } = $$props;
    	let capo;
    	let tuning;
    	let title;
    	let artist;
    	let edit;

    	async function updateTime(seconds) {
    		if (!lesson.totalTime) {
    			$$invalidate(0, lesson.totalTime = 0, lesson);
    		}

    		$$invalidate(0, lesson.totalTime += seconds, lesson);
    		await updateLesson(lesson);
    	}

    	async function update({ target: { name } }) {
    		$$invalidate(
    			0,
    			lesson[name] = name == "title"
    			? title
    			: name == "artist"
    				? artist
    				: name == "capo" ? capo : tuning,
    			lesson
    		);

    		await updateLesson(lesson);
    		$$invalidate(5, edit = null);
    	}

    	onMount(() => {
    		$$invalidate(1, capo = lesson.capo || "X");
    		$$invalidate(2, tuning = lesson.tuning || "Standard");
    		$$invalidate(3, title = lesson.title);
    		$$invalidate(4, artist = lesson.artist);
    	});

    	function input_input_handler() {
    		title = this.value;
    		$$invalidate(3, title);
    	}

    	const click_handler = () => $$invalidate(5, edit = 1);

    	function input_input_handler_1() {
    		artist = this.value;
    		$$invalidate(4, artist);
    	}

    	const click_handler_1 = () => $$invalidate(5, edit = 2);

    	function input_input_handler_2() {
    		capo = to_number(this.value);
    		$$invalidate(1, capo);
    	}

    	const click_handler_2 = () => $$invalidate(5, edit = 3);

    	function input_input_handler_3() {
    		tuning = this.value;
    		$$invalidate(2, tuning);
    	}

    	const click_handler_3 = () => $$invalidate(5, edit = 4);

    	$$self.$$set = $$props => {
    		if ("lesson" in $$props) $$invalidate(0, lesson = $$props.lesson);
    	};

    	return [
    		lesson,
    		capo,
    		tuning,
    		title,
    		artist,
    		edit,
    		updateTime,
    		update,
    		input_input_handler,
    		click_handler,
    		input_input_handler_1,
    		click_handler_1,
    		input_input_handler_2,
    		click_handler_2,
    		input_input_handler_3,
    		click_handler_3
    	];
    }

    class LessonHeader extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { lesson: 0 });
    	}
    }

    /* src/Visualizer.svelte generated by Svelte v3.37.0 */

    function create_fragment$3(ctx) {
    	let canvas_1;

    	return {
    		c() {
    			canvas_1 = element("canvas");
    			this.h();
    		},
    		l(nodes) {
    			canvas_1 = claim_element(nodes, "CANVAS", { height: true, class: true });
    			children(canvas_1).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(canvas_1, "height", height * /*pixelRatio*/ ctx[1]);
    			attr(canvas_1, "class", "svelte-6nk1vo");
    		},
    		m(target, anchor) {
    			insert(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[2](canvas_1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(canvas_1);
    			/*canvas_1_binding*/ ctx[2](null);
    		}
    	};
    }

    let height = 650;

    function getGuitar() {
    	return navigator.mediaDevices.getUserMedia({
    		audio: {
    			echoCancellation: false,
    			autoGainControl: false,
    			noiseSuppression: false,
    			latency: 0
    		}
    	});
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const context = new AudioContext();
    	const analyserNode = new AnalyserNode(context, { fftSize: 256 });
    	let canvas;
    	let canvasContext;

    	let pixelRatio = typeof window === "undefined"
    	? 2
    	: window.devicePixelRatio;

    	async function setupContext() {
    		const guitar = await getGuitar();
    		const source = context.createMediaStreamSource(guitar);
    		source.connect(analyserNode).connect(context.destination);
    	}

    	function drawVisualizer() {
    		if (!canvas || !context) {
    			return;
    		}

    		requestAnimationFrame(drawVisualizer);
    		const bufferLength = analyserNode.frequencyBinCount;
    		const dataArray = new Uint8Array(bufferLength);
    		analyserNode.getByteFrequencyData(dataArray);
    		const { width, height: canvasHeight } = canvas;
    		const barWidth = width / bufferLength;
    		canvasContext.clearRect(0, 0, width, canvasHeight);

    		dataArray.forEach((item, i) => {
    			const y = item / 255 * canvasHeight * 0.75;
    			const x = barWidth * i * 2;
    			canvasContext.fillStyle = `hsl(${y / canvasHeight * 400}, 100%, 50%)`;
    			canvasContext.fillRect(x, canvasHeight - y, barWidth, y);
    		});
    	}

    	onMount(() => {
    		canvasContext = canvas.getContext("2d");
    		setupContext();
    		drawVisualizer();
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	return [canvas, pixelRatio, canvas_1_binding];
    }

    class Visualizer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src/Lesson.svelte generated by Svelte v3.37.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	child_ctx[35] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	child_ctx[35] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    // (327:2) {:else}
    function create_else_block_1$1(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text("Sorry, could not load lesson");
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, "Sorry, could not load lesson");
    			div_nodes.forEach(detach);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (191:2) {#if lesson}
    function create_if_block$1(ctx) {
    	let lessonheader;
    	let t0;
    	let div0;
    	let form0;
    	let input0;
    	let t1;
    	let form1;
    	let input1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let h20;
    	let t6;
    	let t7;
    	let form2;
    	let input2;
    	let t8;
    	let t9;
    	let h21;
    	let t10;
    	let t11;
    	let div1;
    	let t12;
    	let t13;
    	let div2;
    	let t14;
    	let t15;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t16;
    	let img1;
    	let img1_src_value;
    	let t17;
    	let label;
    	let t18;
    	let t19;
    	let textarea;
    	let t20;
    	let button;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	lessonheader = new LessonHeader({ props: { lesson: /*lesson*/ ctx[2] } });
    	let if_block0 = /*lesson*/ ctx[2].videos?.length > 0 && create_if_block_6(ctx);
    	let if_block1 = /*lesson*/ ctx[2].tab && create_if_block_5(ctx);
    	let if_block2 = /*addVideos*/ ctx[1] && create_if_block_4(ctx);
    	let if_block3 = /*lesson*/ ctx[2].chords?.length > 0 && create_if_block_3$1(ctx);
    	let each_value_1 = [...Array(6)];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block4 = /*lesson*/ ctx[2]?.strumming && create_if_block_2$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*lesson*/ ctx[2].finished) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block5 = current_block_type(ctx);

    	return {
    		c() {
    			create_component(lessonheader.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			form0 = element("form");
    			input0 = element("input");
    			t1 = space();
    			form1 = element("form");
    			input1 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			h20 = element("h2");
    			t6 = text("Chords");
    			t7 = space();
    			form2 = element("form");
    			input2 = element("input");
    			t8 = space();
    			if (if_block3) if_block3.c();
    			t9 = space();
    			h21 = element("h2");
    			t10 = text("Strumming Pattern");
    			t11 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			if (if_block4) if_block4.c();
    			t13 = space();
    			div2 = element("div");
    			t14 = text("Drag and Drop the Arrows to create a Strumming Pattern");
    			t15 = space();
    			div3 = element("div");
    			img0 = element("img");
    			t16 = space();
    			img1 = element("img");
    			t17 = space();
    			label = element("label");
    			t18 = text("Notes about the Song");
    			t19 = space();
    			textarea = element("textarea");
    			t20 = space();
    			button = element("button");
    			if_block5.c();
    			this.h();
    		},
    		l(nodes) {
    			claim_component(lessonheader.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			div0 = claim_element(nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			form0 = claim_element(div0_nodes, "FORM", { class: true });
    			var form0_nodes = children(form0);
    			input0 = claim_element(form0_nodes, "INPUT", { placeholder: true });
    			form0_nodes.forEach(detach);
    			t1 = claim_space(div0_nodes);
    			form1 = claim_element(div0_nodes, "FORM", { class: true });
    			var form1_nodes = children(form1);
    			input1 = claim_element(form1_nodes, "INPUT", { placeholder: true });
    			form1_nodes.forEach(detach);
    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			t3 = claim_space(div0_nodes);
    			if (if_block1) if_block1.l(div0_nodes);
    			div0_nodes.forEach(detach);
    			t4 = claim_space(nodes);
    			if (if_block2) if_block2.l(nodes);
    			t5 = claim_space(nodes);
    			h20 = claim_element(nodes, "H2", { class: true });
    			var h20_nodes = children(h20);
    			t6 = claim_text(h20_nodes, "Chords");
    			h20_nodes.forEach(detach);
    			t7 = claim_space(nodes);
    			form2 = claim_element(nodes, "FORM", { class: true });
    			var form2_nodes = children(form2);
    			input2 = claim_element(form2_nodes, "INPUT", { placeholder: true });
    			form2_nodes.forEach(detach);
    			t8 = claim_space(nodes);
    			if (if_block3) if_block3.l(nodes);
    			t9 = claim_space(nodes);
    			h21 = claim_element(nodes, "H2", { class: true });
    			var h21_nodes = children(h21);
    			t10 = claim_text(h21_nodes, "Strumming Pattern");
    			h21_nodes.forEach(detach);
    			t11 = claim_space(nodes);
    			div1 = claim_element(nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div1_nodes);
    			}

    			t12 = claim_space(div1_nodes);
    			if (if_block4) if_block4.l(div1_nodes);
    			div1_nodes.forEach(detach);
    			t13 = claim_space(nodes);
    			div2 = claim_element(nodes, "DIV", {});
    			var div2_nodes = children(div2);
    			t14 = claim_text(div2_nodes, "Drag and Drop the Arrows to create a Strumming Pattern");
    			div2_nodes.forEach(detach);
    			t15 = claim_space(nodes);
    			div3 = claim_element(nodes, "DIV", {});
    			var div3_nodes = children(div3);
    			img0 = claim_element(div3_nodes, "IMG", { alt: true, class: true, src: true });
    			t16 = claim_space(div3_nodes);
    			img1 = claim_element(div3_nodes, "IMG", { class: true, alt: true, src: true });
    			div3_nodes.forEach(detach);
    			t17 = claim_space(nodes);
    			label = claim_element(nodes, "LABEL", { for: true });
    			var label_nodes = children(label);
    			t18 = claim_text(label_nodes, "Notes about the Song");
    			label_nodes.forEach(detach);
    			t19 = claim_space(nodes);
    			textarea = claim_element(nodes, "TEXTAREA", { id: true, rows: true, placeholder: true });
    			children(textarea).forEach(detach);
    			t20 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			if_block5.l(button_nodes);
    			button_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(input0, "placeholder", "Search for another Video");
    			attr(form0, "class", "svelte-14qmrxj");
    			attr(input1, "placeholder", "Update Guitar Tab");
    			attr(form1, "class", "svelte-14qmrxj");
    			attr(div0, "class", "media-wrapper svelte-14qmrxj");
    			attr(h20, "class", "svelte-14qmrxj");
    			attr(input2, "placeholder", "Am");
    			attr(form2, "class", "svelte-14qmrxj");
    			attr(h21, "class", "svelte-14qmrxj");
    			attr(div1, "class", "strumming svelte-14qmrxj");
    			attr(img0, "alt", "Arrow down");
    			attr(img0, "class", "arrow-down");
    			if (img0.src !== (img0_src_value = ARROW_SRC)) attr(img0, "src", img0_src_value);
    			attr(img1, "class", "arrow-up svelte-14qmrxj");
    			attr(img1, "alt", "Arrow down");
    			if (img1.src !== (img1_src_value = ARROW_SRC)) attr(img1, "src", img1_src_value);
    			attr(label, "for", "notes");
    			attr(textarea, "id", "notes");
    			attr(textarea, "rows", 5);
    			attr(textarea, "placeholder", "Your notes for the song");
    			attr(button, "class", button_class_value = "" + (null_to_empty(/*lesson*/ ctx[2].finished ? "re-open" : "") + " svelte-14qmrxj"));
    		},
    		m(target, anchor) {
    			mount_component(lessonheader, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);
    			append(div0, form0);
    			append(form0, input0);
    			set_input_value(input0, /*videoSearch*/ ctx[0]);
    			append(div0, t1);
    			append(div0, form1);
    			append(form1, input1);
    			set_input_value(input1, /*tab*/ ctx[6]);
    			append(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t3);
    			if (if_block1) if_block1.m(div0, null);
    			insert(target, t4, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t5, anchor);
    			insert(target, h20, anchor);
    			append(h20, t6);
    			insert(target, t7, anchor);
    			insert(target, form2, anchor);
    			append(form2, input2);
    			set_input_value(input2, /*selectedChord*/ ctx[4]);
    			insert(target, t8, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, t9, anchor);
    			insert(target, h21, anchor);
    			append(h21, t10);
    			insert(target, t11, anchor);
    			insert(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append(div1, t12);
    			if (if_block4) if_block4.m(div1, null);
    			insert(target, t13, anchor);
    			insert(target, div2, anchor);
    			append(div2, t14);
    			insert(target, t15, anchor);
    			insert(target, div3, anchor);
    			append(div3, img0);
    			append(div3, t16);
    			append(div3, img1);
    			insert(target, t17, anchor);
    			insert(target, label, anchor);
    			append(label, t18);
    			insert(target, t19, anchor);
    			insert(target, textarea, anchor);
    			set_input_value(textarea, /*notes*/ ctx[5]);
    			insert(target, t20, anchor);
    			insert(target, button, anchor);
    			if_block5.m(button, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*searchYoutube*/ ctx[13]),
    					listen(input0, "input", /*input0_input_handler*/ ctx[20]),
    					listen(form0, "submit", prevent_default(submit_handler)),
    					listen(input1, "input", /*input1_input_handler*/ ctx[21]),
    					listen(form1, "submit", prevent_default(/*updateTab*/ ctx[14])),
    					listen(input2, "input", /*input2_input_handler*/ ctx[25]),
    					listen(form2, "submit", prevent_default(/*addChord*/ ctx[7])),
    					listen(div1, "dragover", prevent_default(/*dragover_handler_1*/ ctx[19])),
    					listen(div1, "drop", prevent_default(/*handleDrop*/ ctx[10])),
    					listen(img0, "dragstart", dragstart_handler_1),
    					listen(img1, "dragstart", dragstart_handler_2),
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[28]),
    					listen(textarea, "change", /*change_handler*/ ctx[29]),
    					listen(button, "click", /*finish*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const lessonheader_changes = {};
    			if (dirty[0] & /*lesson*/ 4) lessonheader_changes.lesson = /*lesson*/ ctx[2];
    			lessonheader.$set(lessonheader_changes);

    			if (dirty[0] & /*videoSearch*/ 1 && input0.value !== /*videoSearch*/ ctx[0]) {
    				set_input_value(input0, /*videoSearch*/ ctx[0]);
    			}

    			if (dirty[0] & /*tab*/ 64 && input1.value !== /*tab*/ ctx[6]) {
    				set_input_value(input1, /*tab*/ ctx[6]);
    			}

    			if (/*lesson*/ ctx[2].videos?.length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div0, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*lesson*/ ctx[2].tab) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*addVideos*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*addVideos*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t5.parentNode, t5);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*selectedChord*/ 16 && input2.value !== /*selectedChord*/ ctx[4]) {
    				set_input_value(input2, /*selectedChord*/ ctx[4]);
    			}

    			if (/*lesson*/ ctx[2].chords?.length > 0) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_3$1(ctx);
    					if_block3.c();
    					if_block3.m(t9.parentNode, t9);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*lesson*/ ctx[2]?.strumming) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2$1(ctx);
    					if_block4.c();
    					if_block4.m(div1, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty[0] & /*notes*/ 32) {
    				set_input_value(textarea, /*notes*/ ctx[5]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block5.d(1);
    				if_block5 = current_block_type(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(button, null);
    				}
    			}

    			if (!current || dirty[0] & /*lesson*/ 4 && button_class_value !== (button_class_value = "" + (null_to_empty(/*lesson*/ ctx[2].finished ? "re-open" : "") + " svelte-14qmrxj"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(lessonheader.$$.fragment, local);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(lessonheader.$$.fragment, local);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(lessonheader, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t4);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t5);
    			if (detaching) detach(h20);
    			if (detaching) detach(t7);
    			if (detaching) detach(form2);
    			if (detaching) detach(t8);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(t9);
    			if (detaching) detach(h21);
    			if (detaching) detach(t11);
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			if (if_block4) if_block4.d();
    			if (detaching) detach(t13);
    			if (detaching) detach(div2);
    			if (detaching) detach(t15);
    			if (detaching) detach(div3);
    			if (detaching) detach(t17);
    			if (detaching) detach(label);
    			if (detaching) detach(t19);
    			if (detaching) detach(textarea);
    			if (detaching) detach(t20);
    			if (detaching) detach(button);
    			if_block5.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (207:6) {#if lesson.videos?.length > 0}
    function create_if_block_6(ctx) {
    	let div;
    	let button0;
    	let i0;
    	let t0;
    	let iframe;
    	let iframe_title_value;
    	let iframe_src_value;
    	let t1;
    	let button1;
    	let i1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = space();
    			iframe = element("iframe");
    			t1 = space();
    			button1 = element("button");
    			i1 = element("i");
    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			button0 = claim_element(div_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			i0 = claim_element(button0_nodes, "I", { class: true });
    			children(i0).forEach(detach);
    			button0_nodes.forEach(detach);
    			t0 = claim_space(div_nodes);

    			iframe = claim_element(div_nodes, "IFRAME", {
    				title: true,
    				allowfullscreen: true,
    				class: true,
    				src: true
    			});

    			children(iframe).forEach(detach);
    			t1 = claim_space(div_nodes);
    			button1 = claim_element(div_nodes, "BUTTON", { class: true });
    			var button1_nodes = children(button1);
    			i1 = claim_element(button1_nodes, "I", { class: true });
    			children(i1).forEach(detach);
    			button1_nodes.forEach(detach);
    			div_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i0, "class", "fa fa-caret-left");
    			attr(button0, "class", "naked-button svelte-14qmrxj");
    			attr(iframe, "title", iframe_title_value = `Lesson video of ${/*tab*/ ctx[6].title}`);
    			iframe.allowFullscreen = true;
    			attr(iframe, "class", "video svelte-14qmrxj");
    			if (iframe.src !== (iframe_src_value = `https://www.youtube.com/embed/${/*lesson*/ ctx[2].videos[/*showVideo*/ ctx[3]]}`)) attr(iframe, "src", iframe_src_value);
    			attr(i1, "class", "fa fa-caret-right");
    			attr(button1, "class", "naked-button svelte-14qmrxj");
    			attr(div, "class", "iframe-wrapper svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button0);
    			append(button0, i0);
    			append(div, t0);
    			append(div, iframe);
    			append(div, t1);
    			append(div, button1);
    			append(button1, i1);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[22]),
    					listen(button1, "click", /*click_handler_1*/ ctx[23])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tab*/ 64 && iframe_title_value !== (iframe_title_value = `Lesson video of ${/*tab*/ ctx[6].title}`)) {
    				attr(iframe, "title", iframe_title_value);
    			}

    			if (dirty[0] & /*lesson, showVideo*/ 12 && iframe.src !== (iframe_src_value = `https://www.youtube.com/embed/${/*lesson*/ ctx[2].videos[/*showVideo*/ ctx[3]]}`)) {
    				attr(iframe, "src", iframe_src_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (224:6) {#if lesson.tab}
    function create_if_block_5(ctx) {
    	let iframe;
    	let iframe_src_value;

    	return {
    		c() {
    			iframe = element("iframe");
    			this.h();
    		},
    		l(nodes) {
    			iframe = claim_element(nodes, "IFRAME", {
    				allow: true,
    				referrerpolicy: true,
    				loading: true,
    				height: true,
    				width: true,
    				title: true,
    				src: true
    			});

    			children(iframe).forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(iframe, "allow", "fullscreen");
    			attr(iframe, "referrerpolicy", "no-referrer");
    			attr(iframe, "loading", "lazy");
    			attr(iframe, "height", "100%");
    			attr(iframe, "width", "100%");
    			attr(iframe, "title", "Hopefully some lyrics");
    			if (iframe.src !== (iframe_src_value = /*lesson*/ ctx[2].tab || "https://www.guitaretab.com")) attr(iframe, "src", iframe_src_value);
    		},
    		m(target, anchor) {
    			insert(target, iframe, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*lesson*/ 4 && iframe.src !== (iframe_src_value = /*lesson*/ ctx[2].tab || "https://www.guitaretab.com")) {
    				attr(iframe, "src", iframe_src_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(iframe);
    		}
    	};
    }

    // (237:4) {#if addVideos}
    function create_if_block_4(ctx) {
    	let ul;
    	let current;
    	let each_value_3 = /*addVideos*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(ul, "class", "video-container svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*addVideo, addVideos*/ 32770) {
    				each_value_3 = /*addVideos*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (239:8) {#each addVideos as video}
    function create_each_block_3(ctx) {
    	let li;
    	let videosnippet;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	videosnippet = new VideoSnippet({
    			props: { snippet: /*video*/ ctx[40].snippet }
    		});

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[24](/*video*/ ctx[40]);
    	}

    	return {
    		c() {
    			li = element("li");
    			create_component(videosnippet.$$.fragment);
    			t = space();
    			this.h();
    		},
    		l(nodes) {
    			li = claim_element(nodes, "LI", { role: true, class: true });
    			var li_nodes = children(li);
    			claim_component(videosnippet.$$.fragment, li_nodes);
    			t = claim_space(li_nodes);
    			li_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(li, "role", "button");
    			attr(li, "class", "svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			mount_component(videosnippet, li, null);
    			append(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen(li, "click", click_handler_2);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const videosnippet_changes = {};
    			if (dirty[0] & /*addVideos*/ 2) videosnippet_changes.snippet = /*video*/ ctx[40].snippet;
    			videosnippet.$set(videosnippet_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(videosnippet.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(videosnippet.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_component(videosnippet);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (253:4) {#if lesson.chords?.length > 0}
    function create_if_block_3$1(ctx) {
    	let div;
    	let each_value_2 = /*lesson*/ ctx[2].chords;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div_nodes);
    			}

    			div_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(div, "class", "chord-wrapper svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*lesson, deleteChord*/ 260) {
    				each_value_2 = /*lesson*/ ctx[2].chords;
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (255:8) {#each lesson.chords as chord, i}
    function create_each_block_2(ctx) {
    	let div1;
    	let button;
    	let i_1;
    	let t0;
    	let div0;
    	let t1_value = /*chord*/ ctx[38] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[26](/*i*/ ctx[35]);
    	}

    	return {
    		c() {
    			div1 = element("div");
    			button = element("button");
    			i_1 = element("i");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			this.h();
    		},
    		l(nodes) {
    			div1 = claim_element(nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			button = claim_element(div1_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			i_1 = claim_element(button_nodes, "I", { class: true });
    			children(i_1).forEach(detach);
    			button_nodes.forEach(detach);
    			t0 = claim_space(div1_nodes);
    			div0 = claim_element(div1_nodes, "DIV", { id: true, class: true });
    			var div0_nodes = children(div0);
    			t1 = claim_text(div0_nodes, t1_value);
    			div0_nodes.forEach(detach);
    			t2 = claim_space(div1_nodes);
    			div1_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i_1, "class", "fa fa-times");
    			attr(button, "class", "naked-button svelte-14qmrxj");
    			attr(div0, "id", `chord-${/*i*/ ctx[35]}`);
    			attr(div0, "class", "svelte-14qmrxj");
    			attr(div1, "class", "chord-holder svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button);
    			append(button, i_1);
    			append(div1, t0);
    			append(div1, div0);
    			append(div0, t1);
    			append(div1, t2);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler_3);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*lesson*/ 4 && t1_value !== (t1_value = /*chord*/ ctx[38] + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (278:6) {#each [...Array(6)] as i}
    function create_each_block_1(ctx) {
    	let hr;

    	return {
    		c() {
    			hr = element("hr");
    		},
    		l(nodes) {
    			hr = claim_element(nodes, "HR", {});
    		},
    		m(target, anchor) {
    			insert(target, hr, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(hr);
    		}
    	};
    }

    // (282:6) {#if lesson?.strumming}
    function create_if_block_2$1(ctx) {
    	let ul;
    	let each_value = /*lesson*/ ctx[2].strumming;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(ul, "class", "svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*lesson*/ 4) {
    				each_value = /*lesson*/ ctx[2].strumming;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (284:10) {#each lesson.strumming as strum, i}
    function create_each_block$2(ctx) {
    	let li;
    	let img;
    	let img_class_value;
    	let img_src_value;
    	let t;
    	let mounted;
    	let dispose;

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[27](/*i*/ ctx[35], ...args);
    	}

    	return {
    		c() {
    			li = element("li");
    			img = element("img");
    			t = space();
    			this.h();
    		},
    		l(nodes) {
    			li = claim_element(nodes, "LI", {});
    			var li_nodes = children(li);

    			img = claim_element(li_nodes, "IMG", {
    				alt: true,
    				width: true,
    				height: true,
    				class: true,
    				src: true
    			});

    			t = claim_space(li_nodes);
    			li_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(img, "alt", "Arrow");
    			attr(img, "width", 60);
    			attr(img, "height", 80);
    			attr(img, "class", img_class_value = "" + (null_to_empty(`arrow-${/*strum*/ ctx[33]}`) + " svelte-14qmrxj"));
    			if (img.src !== (img_src_value = ARROW_SRC)) attr(img, "src", img_src_value);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, img);
    			append(li, t);

    			if (!mounted) {
    				dispose = listen(img, "dragstart", dragstart_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*lesson*/ 4 && img_class_value !== (img_class_value = "" + (null_to_empty(`arrow-${/*strum*/ ctx[33]}`) + " svelte-14qmrxj"))) {
    				attr(img, "class", img_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (325:38) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Finish Lesson");
    		},
    		l(nodes) {
    			t = claim_text(nodes, "Finish Lesson");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (325:6) {#if lesson.finished}
    function create_if_block_1$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open Lesson");
    		},
    		l(nodes) {
    			t = claim_text(nodes, "Open Lesson");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let visualizer;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$1, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*lesson*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	visualizer = new Visualizer({});

    	return {
    		c() {
    			section = element("section");
    			if_block.c();
    			t = space();
    			create_component(visualizer.$$.fragment);
    			this.h();
    		},
    		l(nodes) {
    			section = claim_element(nodes, "SECTION", { class: true });
    			var section_nodes = children(section);
    			if_block.l(section_nodes);
    			section_nodes.forEach(detach);
    			t = claim_space(nodes);
    			claim_component(visualizer.$$.fragment, nodes);
    			this.h();
    		},
    		h() {
    			attr(section, "class", "svelte-14qmrxj");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			if_blocks[current_block_type_index].m(section, null);
    			insert(target, t, anchor);
    			mount_component(visualizer, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(section, "dragover", prevent_default(/*dragover_handler*/ ctx[18])),
    					listen(section, "drop", prevent_default(/*removeStrum*/ ctx[11]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(section, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(visualizer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(visualizer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach(t);
    			destroy_component(visualizer, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const submit_handler = () => {
    	
    };

    const dragstart_handler_1 = e => e.dataTransfer.setData("direction", "down");
    const dragstart_handler_2 = e => e.dataTransfer.setData("direction", "up");

    function instance$2($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let videoSearch;
    	let addVideos;
    	let lesson;
    	let showVideo = 0;
    	let selectedChord = "";
    	let notes = "";
    	let tab = "";

    	async function addChord() {
    		if (!selectedChord) {
    			return;
    		}

    		try {
    			if (lesson.chords) {
    				$$invalidate(2, lesson.chords = [...lesson.chords, selectedChord], lesson);
    			} else {
    				$$invalidate(2, lesson.chords = [selectedChord], lesson);
    			}

    			$$invalidate(4, selectedChord = "");
    			await updateLesson(lesson);
    			renderChords();
    		} catch(error) {
    			console.error(error);
    		}
    	}

    	async function deleteChord(chordPosition) {
    		try {
    			const newChords = [
    				...lesson.chords.slice(0, chordPosition),
    				...lesson.chords.slice(chordPosition + 1)
    			];

    			$$invalidate(2, lesson.chords = [...newChords], lesson);
    			await updateLesson(lesson);
    			renderChords();
    		} catch(error) {
    			console.error(error);
    		}
    	}

    	async function addNotes(notes) {
    		try {
    			$$invalidate(2, lesson.notes = notes, lesson);
    			await updateLesson(lesson);
    		} catch(error) {
    			console.error(error);
    		}
    	}

    	async function handleDrop(e) {
    		e.preventDefault();
    		const direction = e.dataTransfer.getData("direction");

    		if (lesson.strumming) {
    			$$invalidate(2, lesson.strumming = [...lesson.strumming, direction], lesson);
    		} else {
    			$$invalidate(2, lesson.strumming = [direction], lesson);
    		}

    		await updateLesson(lesson);
    		e.stopPropagation();
    	}

    	async function removeStrum(e) {
    		const position = e.dataTransfer.getData("position");

    		if (position && lesson.strumming) {
    			$$invalidate(
    				2,
    				lesson.strumming = [
    					...lesson.strumming.slice(0, position),
    					...lesson.strumming.slice(parseInt(position) + 1)
    				],
    				lesson
    			);
    		}

    		await updateLesson(lesson);
    	}

    	async function finish() {
    		if ("finished" in lesson) {
    			$$invalidate(2, lesson.finished = !lesson.finished, lesson);
    		} else {
    			$$invalidate(2, lesson.finished = true, lesson);
    		}

    		await updateLesson(lesson);
    		navigate("/");
    	}

    	async function searchYoutube() {
    		if (videoSearch && videoSearch.length > 3) {
    			try {
    				const res = await apiCall("https://www.googleapis.com/youtube/v3/search", {
    					q: videoSearch,
    					type: "video",
    					key: "AIzaSyAViHdvitELO2-jct4oVozhk8Wq3hCkjRk",
    					part: "snippet",
    					maxResults: 7,
    					topicId: "/m/04rlf"
    				});

    				$$invalidate(1, addVideos = res.items);
    			} catch(error) {
    				console.log(error.message);
    			}
    		}
    	}

    	async function updateTab() {
    		$$invalidate(2, lesson.tab = tab, lesson);
    		await updateLesson(lesson);
    	}

    	async function addVideo(videoID) {
    		$$invalidate(2, lesson.videos = [...lesson.videos, videoID], lesson);
    		$$invalidate(1, addVideos = null);
    		await updateLesson(lesson);
    	}

    	function changeVideo(count) {
    		if (lesson.videos.length > 1) {
    			if (showVideo + count < 0) {
    				$$invalidate(3, showVideo = lesson.videos.length - 1);
    			} else if (showVideo + count > lesson.videos.length - 1) {
    				$$invalidate(3, showVideo = 0);
    			} else {
    				$$invalidate(3, showVideo += count);
    			}
    		}
    	}

    	function renderChords() {
    		if (lesson.chords?.length > 0) {
    			lesson.chords.forEach((chord, i) => {
    				jtab.render(document.getElementById(`chord-${i}`), chord);
    			});
    		}
    	}

    	onMount(() => {
    		try {
    			const stringifiedLessons = localStorage.getItem(LESSONS);
    			const lessons = JSON.parse(stringifiedLessons);
    			$$invalidate(2, lesson = lessons.find(lesson => lesson.id == id));
    			$$invalidate(5, notes = lesson.notes);
    			setTimeout(renderChords, 500);
    		} catch(error) {
    			console.error(error);
    		}
    	});

    	function dragover_handler(event) {
    		bubble($$self, event);
    	}

    	function dragover_handler_1(event) {
    		bubble($$self, event);
    	}

    	function input0_input_handler() {
    		videoSearch = this.value;
    		$$invalidate(0, videoSearch);
    	}

    	function input1_input_handler() {
    		tab = this.value;
    		$$invalidate(6, tab);
    	}

    	const click_handler = () => changeVideo(-1);
    	const click_handler_1 = () => changeVideo(1);
    	const click_handler_2 = video => addVideo(video.id.videoId);

    	function input2_input_handler() {
    		selectedChord = this.value;
    		$$invalidate(4, selectedChord);
    	}

    	const click_handler_3 = i => deleteChord(i);
    	const dragstart_handler = (i, e) => e.dataTransfer.setData("position", i);

    	function textarea_input_handler() {
    		notes = this.value;
    		$$invalidate(5, notes);
    	}

    	const change_handler = e => addNotes(e.target.value);

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(17, id = $$props.id);
    	};

    	return [
    		videoSearch,
    		addVideos,
    		lesson,
    		showVideo,
    		selectedChord,
    		notes,
    		tab,
    		addChord,
    		deleteChord,
    		addNotes,
    		handleDrop,
    		removeStrum,
    		finish,
    		searchYoutube,
    		updateTab,
    		addVideo,
    		changeVideo,
    		id,
    		dragover_handler,
    		dragover_handler_1,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input2_input_handler,
    		click_handler_3,
    		dragstart_handler,
    		textarea_input_handler,
    		change_handler
    	];
    }

    class Lesson extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { id: 17 }, [-1, -1]);
    	}
    }

    /* src/NavItems.svelte generated by Svelte v3.37.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i].name;
    	child_ctx[6] = list[i].path;
    	child_ctx[7] = list[i].icon;
    	return child_ctx;
    }

    // (35:2) {#each links as { name, path, icon }}
    function create_each_block$1(ctx) {
    	let li;
    	let button;
    	let i;
    	let t0;
    	let t1_value = /*name*/ ctx[5] + "";
    	let t1;
    	let button_class_value;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*path*/ ctx[6]);
    	}

    	return {
    		c() {
    			li = element("li");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			this.h();
    		},
    		l(nodes) {
    			li = claim_element(nodes, "LI", {});
    			var li_nodes = children(li);
    			button = claim_element(li_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			i = claim_element(button_nodes, "I", { class: true });
    			children(i).forEach(detach);
    			t0 = claim_space(button_nodes);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach);
    			t2 = claim_space(li_nodes);
    			li_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "class", "" + (null_to_empty(`fa fa-${/*icon*/ ctx[7]}`) + " svelte-1hf3aby"));
    			attr(button, "class", button_class_value = "" + (null_to_empty(`${/*header*/ ctx[0] ? "" : "fancy-link"} ${/*close*/ ctx[1] ? "modal-nav" : ""}`) + " svelte-1hf3aby"));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, button);
    			append(button, i);
    			append(button, t0);
    			append(button, t1);
    			append(li, t2);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*header, close*/ 3 && button_class_value !== (button_class_value = "" + (null_to_empty(`${/*header*/ ctx[0] ? "" : "fancy-link"} ${/*close*/ ctx[1] ? "modal-nav" : ""}`) + " svelte-1hf3aby"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let ul;
    	let ul_class_value;
    	let each_value = /*links*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(ul, "class", ul_class_value = "" + (null_to_empty(/*header*/ ctx[0] ? "header" : "") + " svelte-1hf3aby"));
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*header, close, navigate, links*/ 15) {
    				each_value = /*links*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*header*/ 1 && ul_class_value !== (ul_class_value = "" + (null_to_empty(/*header*/ ctx[0] ? "header" : "") + " svelte-1hf3aby"))) {
    				attr(ul, "class", ul_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { header = false } = $$props;
    	let { close = null } = $$props;
    	let { navigate } = $$props;

    	const links = [
    		{
    			name: "Practice",
    			path: "/",
    			icon: "guitar"
    		},
    		{
    			name: "Create new Practice",
    			path: "new",
    			icon: "plus"
    		}
    	];

    	const click_handler = path => {
    		navigate(path);

    		if (close) {
    			close();
    		}
    	};

    	$$self.$$set = $$props => {
    		if ("header" in $$props) $$invalidate(0, header = $$props.header);
    		if ("close" in $$props) $$invalidate(1, close = $$props.close);
    		if ("navigate" in $$props) $$invalidate(2, navigate = $$props.navigate);
    	};

    	return [header, close, navigate, links, click_handler];
    }

    class NavItems extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { header: 0, close: 1, navigate: 2 });
    	}
    }

    /* src/App.svelte generated by Svelte v3.37.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].link;
    	child_ctx[11] = list[i].symbol;
    	return child_ctx;
    }

    // (40:6) {#if windowSize > 830}
    function create_if_block_3(ctx) {
    	let h2;
    	let t;

    	return {
    		c() {
    			h2 = element("h2");
    			t = text("Rad Guitar Practice Tool");
    			this.h();
    		},
    		l(nodes) {
    			h2 = claim_element(nodes, "H2", { class: true });
    			var h2_nodes = children(h2);
    			t = claim_text(h2_nodes, "Rad Guitar Practice Tool");
    			h2_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(h2, "class", "svelte-ostqhq");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, t);
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    // (46:4) {:else}
    function create_else_block_1(ctx) {
    	let navigation;
    	let current;

    	navigation = new Navigation({
    			props: {
    				show: /*showNav*/ ctx[0],
    				toggle: /*func*/ ctx[8]
    			}
    		});

    	return {
    		c() {
    			create_component(navigation.$$.fragment);
    		},
    		l(nodes) {
    			claim_component(navigation.$$.fragment, nodes);
    		},
    		m(target, anchor) {
    			mount_component(navigation, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const navigation_changes = {};
    			if (dirty & /*showNav*/ 1) navigation_changes.show = /*showNav*/ ctx[0];
    			if (dirty & /*showNav*/ 1) navigation_changes.toggle = /*func*/ ctx[8];
    			navigation.$set(navigation_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(navigation.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navigation.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(navigation, detaching);
    		}
    	};
    }

    // (44:4) {#if windowSize > 750}
    function create_if_block_2(ctx) {
    	let navitems;
    	let current;

    	navitems = new NavItems({
    			props: {
    				navigate: /*navigate*/ ctx[5],
    				header: true
    			}
    		});

    	return {
    		c() {
    			create_component(navitems.$$.fragment);
    		},
    		l(nodes) {
    			claim_component(navitems.$$.fragment, nodes);
    		},
    		m(target, anchor) {
    			mount_component(navitems, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(navitems.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navitems.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(navitems, detaching);
    		}
    	};
    }

    // (56:4) {:else}
    function create_else_block(ctx) {
    	let lessons;
    	let current;
    	lessons = new Lessons({ props: { navigate: /*navigate*/ ctx[5] } });

    	return {
    		c() {
    			create_component(lessons.$$.fragment);
    		},
    		l(nodes) {
    			claim_component(lessons.$$.fragment, nodes);
    		},
    		m(target, anchor) {
    			mount_component(lessons, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(lessons.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(lessons.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(lessons, detaching);
    		}
    	};
    }

    // (54:36) 
    function create_if_block_1(ctx) {
    	let newlesson;
    	let current;
    	newlesson = new NewLesson({ props: { navigate: /*navigate*/ ctx[5] } });

    	return {
    		c() {
    			create_component(newlesson.$$.fragment);
    		},
    		l(nodes) {
    			claim_component(newlesson.$$.fragment, nodes);
    		},
    		m(target, anchor) {
    			mount_component(newlesson, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(newlesson.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(newlesson.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(newlesson, detaching);
    		}
    	};
    }

    // (52:4) {#if currentRoute == "lesson"}
    function create_if_block(ctx) {
    	let lesson;
    	let current;
    	lesson = new Lesson({ props: { id: /*lessonID*/ ctx[3] } });

    	return {
    		c() {
    			create_component(lesson.$$.fragment);
    		},
    		l(nodes) {
    			claim_component(lesson.$$.fragment, nodes);
    		},
    		m(target, anchor) {
    			mount_component(lesson, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const lesson_changes = {};
    			if (dirty & /*lessonID*/ 8) lesson_changes.id = /*lessonID*/ ctx[3];
    			lesson.$set(lesson_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(lesson.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(lesson.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(lesson, detaching);
    		}
    	};
    }

    // (72:6) {#each socialIcons as { link, symbol }}
    function create_each_block(ctx) {
    	let a;
    	let i;
    	let t;

    	return {
    		c() {
    			a = element("a");
    			i = element("i");
    			t = space();
    			this.h();
    		},
    		l(nodes) {
    			a = claim_element(nodes, "A", {
    				target: true,
    				href: true,
    				key: true,
    				class: true
    			});

    			var a_nodes = children(a);
    			i = claim_element(a_nodes, "I", { class: true });
    			children(i).forEach(detach);
    			t = claim_space(a_nodes);
    			a_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "class", "" + (null_to_empty(`fab fa-${/*symbol*/ ctx[11]}`) + " svelte-ostqhq"));
    			attr(a, "target", "_blank");
    			attr(a, "href", /*link*/ ctx[10]);
    			attr(a, "key", /*symbol*/ ctx[11]);
    			attr(a, "class", "svelte-ostqhq");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, i);
    			append(a, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div2;
    	let header;
    	let div0;
    	let i;
    	let t0;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let current_block_type_index;
    	let if_block1;
    	let t4;
    	let main;
    	let current_block_type_index_1;
    	let if_block2;
    	let t5;
    	let footer;
    	let div1;
    	let span;
    	let t6;
    	let a0;
    	let t7;
    	let t8;
    	let a1;
    	let t9;
    	let t10;
    	let ul;
    	let t11;
    	let nav;
    	let navitems;
    	let nav_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[6]);
    	let if_block0 = /*windowSize*/ ctx[1] > 830 && create_if_block_3();
    	const if_block_creators = [create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*windowSize*/ ctx[1] > 750) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	const if_block_creators_1 = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks_1 = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentRoute*/ ctx[2] == "lesson") return 0;
    		if (/*currentRoute*/ ctx[2] == "new") return 1;
    		return 2;
    	}

    	current_block_type_index_1 = select_block_type_1(ctx);
    	if_block2 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    	let each_value = /*socialIcons*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	navitems = new NavItems({
    			props: {
    				close: /*func_1*/ ctx[9],
    				navigate: /*navigate*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			div2 = element("div");
    			header = element("header");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text("raguprato");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if_block1.c();
    			t4 = space();
    			main = element("main");
    			if_block2.c();
    			t5 = space();
    			footer = element("footer");
    			div1 = element("div");
    			span = element("span");
    			t6 = text("Created by\n        ");
    			a0 = element("a");
    			t7 = text("Gh05d");
    			t8 = space();
    			a1 = element("a");
    			t9 = text("Down Arrow icon by Icons8");
    			t10 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			nav = element("nav");
    			create_component(navitems.$$.fragment);
    			this.h();
    		},
    		l(nodes) {
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			header = claim_element(div2_nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			div0 = claim_element(header_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			i = claim_element(div0_nodes, "I", { class: true });
    			children(i).forEach(detach);
    			t0 = claim_space(div0_nodes);
    			h1 = claim_element(div0_nodes, "H1", { role: true, class: true });
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, "raguprato");
    			h1_nodes.forEach(detach);
    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			div0_nodes.forEach(detach);
    			t3 = claim_space(header_nodes);
    			if_block1.l(header_nodes);
    			header_nodes.forEach(detach);
    			t4 = claim_space(div2_nodes);
    			main = claim_element(div2_nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			if_block2.l(main_nodes);
    			main_nodes.forEach(detach);
    			t5 = claim_space(div2_nodes);
    			footer = claim_element(div2_nodes, "FOOTER", { class: true });
    			var footer_nodes = children(footer);
    			div1 = claim_element(footer_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			span = claim_element(div1_nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t6 = claim_text(span_nodes, "Created by\n        ");
    			a0 = claim_element(span_nodes, "A", { class: true, href: true });
    			var a0_nodes = children(a0);
    			t7 = claim_text(a0_nodes, "Gh05d");
    			a0_nodes.forEach(detach);
    			span_nodes.forEach(detach);
    			t8 = claim_space(div1_nodes);
    			a1 = claim_element(div1_nodes, "A", { href: true, class: true });
    			var a1_nodes = children(a1);
    			t9 = claim_text(a1_nodes, "Down Arrow icon by Icons8");
    			a1_nodes.forEach(detach);
    			div1_nodes.forEach(detach);
    			t10 = claim_space(footer_nodes);
    			ul = claim_element(footer_nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach);
    			footer_nodes.forEach(detach);
    			t11 = claim_space(div2_nodes);
    			nav = claim_element(div2_nodes, "NAV", { class: true });
    			var nav_nodes = children(nav);
    			claim_component(navitems.$$.fragment, nav_nodes);
    			nav_nodes.forEach(detach);
    			div2_nodes.forEach(detach);
    			this.h();
    		},
    		h() {
    			attr(i, "class", "fa fa-guitar svelte-ostqhq");
    			attr(h1, "role", "button");
    			attr(h1, "class", "svelte-ostqhq");
    			attr(div0, "class", "slogan svelte-ostqhq");
    			attr(header, "class", "svelte-ostqhq");
    			attr(main, "class", "svelte-ostqhq");
    			attr(a0, "class", "fancy-link svelte-ostqhq");
    			attr(a0, "href", "https://github.com/Gh05d");
    			attr(span, "class", "svelte-ostqhq");
    			attr(a1, "href", "https://icons8.com/icon/45289/down-arrow");
    			attr(a1, "class", "svelte-ostqhq");
    			attr(div1, "class", "svelte-ostqhq");
    			attr(ul, "class", "svelte-ostqhq");
    			attr(footer, "class", "svelte-ostqhq");
    			attr(nav, "class", nav_class_value = "" + (null_to_empty(/*showNav*/ ctx[0] ? "show" : "") + " svelte-ostqhq"));
    			attr(div2, "class", "wrapper svelte-ostqhq");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, header);
    			append(header, div0);
    			append(div0, i);
    			append(div0, t0);
    			append(div0, h1);
    			append(h1, t1);
    			append(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append(header, t3);
    			if_blocks[current_block_type_index].m(header, null);
    			append(div2, t4);
    			append(div2, main);
    			if_blocks_1[current_block_type_index_1].m(main, null);
    			append(div2, t5);
    			append(div2, footer);
    			append(footer, div1);
    			append(div1, span);
    			append(span, t6);
    			append(span, a0);
    			append(a0, t7);
    			append(div1, t8);
    			append(div1, a1);
    			append(a1, t9);
    			append(footer, t10);
    			append(footer, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append(div2, t11);
    			append(div2, nav);
    			mount_component(navitems, nav, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window, "resize", /*onwindowresize*/ ctx[6]),
    					listen(h1, "click", /*click_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*windowSize*/ ctx[1] > 830) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3();
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				} else {
    					if_block1.p(ctx, dirty);
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(header, null);
    			}

    			let previous_block_index_1 = current_block_type_index_1;
    			current_block_type_index_1 = select_block_type_1(ctx);

    			if (current_block_type_index_1 === previous_block_index_1) {
    				if_blocks_1[current_block_type_index_1].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
    					if_blocks_1[previous_block_index_1] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks_1[current_block_type_index_1];

    				if (!if_block2) {
    					if_block2 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    					if_block2.c();
    				} else {
    					if_block2.p(ctx, dirty);
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(main, null);
    			}

    			if (dirty & /*socialIcons*/ 16) {
    				each_value = /*socialIcons*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const navitems_changes = {};
    			if (dirty & /*showNav*/ 1) navitems_changes.close = /*func_1*/ ctx[9];
    			navitems.$set(navitems_changes);

    			if (!current || dirty & /*showNav*/ 1 && nav_class_value !== (nav_class_value = "" + (null_to_empty(/*showNav*/ ctx[0] ? "show" : "") + " svelte-ostqhq"))) {
    				attr(nav, "class", nav_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(navitems.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(navitems.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			destroy_each(each_blocks, detaching);
    			destroy_component(navitems);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const socialIcons = [
    		{
    			link: "https://github.com/Gh05d",
    			symbol: "github"
    		},
    		{
    			link: "https://www.freecodecamp.org/gh05d",
    			symbol: "free-code-camp"
    		},
    		{
    			link: "https://www.linkedin.com/in/pascal-clanget-545956ba/",
    			symbol: "linkedin"
    		},
    		{
    			link: "https://stackoverflow.com/users/7490871/gh05d",
    			symbol: "stack-overflow"
    		},
    		{
    			link: "https://www.instagram.com/gh05d/?hl=de",
    			symbol: "instagram"
    		}
    	];

    	let showNav = false;
    	let windowSize;
    	let currentRoute = "/";
    	let lessonID = null;

    	function navigate(path, id = null) {
    		$$invalidate(2, currentRoute = path);
    		$$invalidate(3, lessonID = id);
    	}

    	function onwindowresize() {
    		$$invalidate(1, windowSize = window.innerWidth);
    	}

    	const click_handler = () => navigate("/");
    	const func = () => $$invalidate(0, showNav = !showNav);
    	const func_1 = () => $$invalidate(0, showNav = false);

    	return [
    		showNav,
    		windowSize,
    		currentRoute,
    		lessonID,
    		socialIcons,
    		navigate,
    		onwindowresize,
    		click_handler,
    		func,
    		func_1
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
      target: document.body,
      hydrate: true
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
