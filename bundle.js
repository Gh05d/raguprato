
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
        let children = target.childNodes;
        // If target is <head>, there may be children without claim_order
        if (target.nodeName === 'HEAD') {
            const myChildren = [];
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.claim_order !== undefined) {
                    myChildren.push(node);
                }
            }
            children = myChildren;
        }
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            // with fast path for when we are on the current longest subsequence
            const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            // Skip nodes of undefined ordering
            while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
                target.actual_end_child = target.actual_end_child.nextSibling;
            }
            if (node !== target.actual_end_child) {
                // We only insert if the ordering of this node should be modified or the parent node is not target
                if (node.claim_order !== undefined || node.parentNode !== target) {
                    target.insertBefore(node, target.actual_end_child);
                }
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target || node.nextSibling !== null) {
            target.appendChild(node);
        }
    }
    function insert_hydration(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append_hydration(target, node);
        }
        else if (node.parentNode !== target || node.nextSibling != anchor) {
            target.insertBefore(node, anchor || null);
        }
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
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
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
    function init_claim_info(nodes) {
        if (nodes.claim_info === undefined) {
            nodes.claim_info = { last_index: 0, total_claimed: 0 };
        }
    }
    function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
        // Try to find nodes in an order such that we lengthen the longest increasing subsequence
        init_claim_info(nodes);
        const resultNode = (() => {
            // We first try to find an element after the previous one
            for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    return node;
                }
            }
            // Otherwise, we try to find one before
            // We iterate in reverse so that we don't go too far back
            for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    else if (replacement === undefined) {
                        // Since we spliced before the last_index, we decrease it
                        nodes.claim_info.last_index--;
                    }
                    return node;
                }
            }
            // If we can't find any matching node, we create a new one
            return createNode();
        })();
        resultNode.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
        return resultNode;
    }
    function claim_element_base(nodes, name, attributes, create_element) {
        return claim_node(nodes, (node) => node.nodeName === name, (node) => {
            const remove = [];
            for (let j = 0; j < node.attributes.length; j++) {
                const attribute = node.attributes[j];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            remove.forEach(v => node.removeAttribute(v));
            return undefined;
        }, () => create_element(name));
    }
    function claim_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, element);
    }
    function claim_text(nodes, data) {
        return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
            const dataStr = '' + data;
            if (node.data.startsWith(dataStr)) {
                if (node.data.length !== dataStr.length) {
                    return node.splitText(dataStr.length);
                }
            }
            else {
                node.data = dataStr;
            }
        }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
        );
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind$1(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
                start_hydrating();
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
            end_hydrating();
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.2' }, detail), true));
    }
    function append_hydration_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append_hydration(target, node);
    }
    function insert_hydration_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert_hydration(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Navigation.svelte generated by Svelte v3.43.2 */

    const file$e = "src/components/Navigation.svelte";

    // (38:4) {#if !show}
    function create_if_block$8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			children(div).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "nav-button-line svelte-gtup2w");
    			add_location(div, file$e, 38, 6, 894);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(38:4) {#if !show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let button;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let div2_class_value;
    	let mounted;
    	let dispose;
    	let if_block = !/*show*/ ctx[0] && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			div1 = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			div2 = claim_element(button_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			div0 = claim_element(div2_nodes, "DIV", { class: true });
    			children(div0).forEach(detach_dev);
    			t0 = claim_space(div2_nodes);
    			if (if_block) if_block.l(div2_nodes);
    			t1 = claim_space(div2_nodes);
    			div1 = claim_element(div2_nodes, "DIV", { class: true });
    			children(div1).forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div0, "class", "nav-button-line svelte-gtup2w");
    			add_location(div0, file$e, 36, 4, 840);
    			attr_dev(div1, "class", "nav-button-line svelte-gtup2w");
    			add_location(div1, file$e, 40, 4, 940);
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty(/*show*/ ctx[0] ? 'close' : '') + " svelte-gtup2w"));
    			add_location(div2, file$e, 35, 2, 802);
    			attr_dev(button, "class", "nav-button svelte-gtup2w");
    			add_location(button, file$e, 34, 0, 754);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, div2);
    			append_hydration_dev(div2, div0);
    			append_hydration_dev(div2, t0);
    			if (if_block) if_block.m(div2, null);
    			append_hydration_dev(div2, t1);
    			append_hydration_dev(div2, div1);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*toggle*/ ctx[1])) /*toggle*/ ctx[1].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (!/*show*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					if_block.m(div2, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*show*/ 1 && div2_class_value !== (div2_class_value = "" + (null_to_empty(/*show*/ ctx[0] ? 'close' : '') + " svelte-gtup2w"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navigation', slots, []);
    	let { show } = $$props;
    	let { toggle } = $$props;
    	const writable_props = ['show', 'toggle'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navigation> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    		if ('toggle' in $$props) $$invalidate(1, toggle = $$props.toggle);
    	};

    	$$self.$capture_state = () => ({ show, toggle });

    	$$self.$inject_state = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    		if ('toggle' in $$props) $$invalidate(1, toggle = $$props.toggle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, toggle];
    }

    class Navigation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { show: 0, toggle: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navigation",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*show*/ ctx[0] === undefined && !('show' in props)) {
    			console.warn("<Navigation> was created without expected prop 'show'");
    		}

    		if (/*toggle*/ ctx[1] === undefined && !('toggle' in props)) {
    			console.warn("<Navigation> was created without expected prop 'toggle'");
    		}
    	}

    	get show() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggle() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggle(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
      return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
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
    InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null
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
        var responseType = config.responseType;

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

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
            request.responseText : request.response;
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
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
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
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

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
          reject(createError(
            timeoutErrorMessage,
            config,
            config.transitional && config.transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
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
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
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

    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    var defaults = {

      transitional: {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false
      },

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
        if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
          setContentTypeIfUnset(headers, 'application/json');
          return stringifySafely(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        var transitional = this.transitional;
        var silentJSONParsing = transitional && transitional.silentJSONParsing;
        var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

        if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw enhanceError(e, this, 'E_JSON_PARSE');
              }
              throw e;
            }
          }
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
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      var context = this || defaults_1;
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn.call(context, data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

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
      config.data = transformData.call(
        config,
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
        response.data = transformData.call(
          config,
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
            reason.response.data = transformData.call(
              config,
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

    var name="axios";var version="0.21.4";var description="Promise based HTTP client for the browser and node.js";var main="index.js";var scripts={test:"grunt test",start:"node ./sandbox/server.js",build:"NODE_ENV=production grunt build",preversion:"npm test",version:"npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json",postversion:"git push && git push --tags",examples:"node ./examples/server.js",coveralls:"cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js",fix:"eslint --fix lib/**/*.js"};var repository={type:"git",url:"https://github.com/axios/axios.git"};var keywords=["xhr","http","ajax","promise","node"];var author="Matt Zabriskie";var license="MIT";var bugs={url:"https://github.com/axios/axios/issues"};var homepage="https://axios-http.com";var devDependencies={coveralls:"^3.0.0","es6-promise":"^4.2.4",grunt:"^1.3.0","grunt-banner":"^0.6.0","grunt-cli":"^1.2.0","grunt-contrib-clean":"^1.1.0","grunt-contrib-watch":"^1.0.0","grunt-eslint":"^23.0.0","grunt-karma":"^4.0.0","grunt-mocha-test":"^0.13.3","grunt-ts":"^6.0.0-beta.19","grunt-webpack":"^4.0.2","istanbul-instrumenter-loader":"^1.0.0","jasmine-core":"^2.4.1",karma:"^6.3.2","karma-chrome-launcher":"^3.1.0","karma-firefox-launcher":"^2.1.0","karma-jasmine":"^1.1.1","karma-jasmine-ajax":"^0.1.13","karma-safari-launcher":"^1.0.0","karma-sauce-launcher":"^4.3.6","karma-sinon":"^1.0.5","karma-sourcemap-loader":"^0.3.8","karma-webpack":"^4.0.2","load-grunt-tasks":"^3.5.2",minimist:"^1.2.0",mocha:"^8.2.1",sinon:"^4.5.0","terser-webpack-plugin":"^4.2.3",typescript:"^4.0.5","url-search-params":"^0.10.0",webpack:"^4.44.2","webpack-dev-server":"^3.11.0"};var browser={"./lib/adapters/http.js":"./lib/adapters/xhr.js"};var jsdelivr="dist/axios.min.js";var unpkg="dist/axios.min.js";var typings="./index.d.ts";var dependencies={"follow-redirects":"^1.14.0"};var bundlesize=[{path:"./dist/axios.min.js",threshold:"5kB"}];var _package = {name:name,version:version,description:description,main:main,scripts:scripts,repository:repository,keywords:keywords,author:author,license:license,bugs:bugs,homepage:homepage,devDependencies:devDependencies,browser:browser,jsdelivr:jsdelivr,unpkg:unpkg,typings:typings,dependencies:dependencies,bundlesize:bundlesize};

    var _package$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        name: name,
        version: version,
        description: description,
        main: main,
        scripts: scripts,
        repository: repository,
        keywords: keywords,
        author: author,
        license: license,
        bugs: bugs,
        homepage: homepage,
        devDependencies: devDependencies,
        browser: browser,
        jsdelivr: jsdelivr,
        unpkg: unpkg,
        typings: typings,
        dependencies: dependencies,
        bundlesize: bundlesize,
        'default': _package
    });

    function getCjsExportFromNamespace (n) {
    	return n && n['default'] || n;
    }

    var pkg = getCjsExportFromNamespace(_package$1);

    var validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    var deprecatedWarnings = {};
    var currentVerArr = pkg.version.split('.');

    /**
     * Compare package versions
     * @param {string} version
     * @param {string?} thanVersion
     * @returns {boolean}
     */
    function isOlderVersion(version, thanVersion) {
      var pkgVersionArr = thanVersion ? thanVersion.split('.') : currentVerArr;
      var destVer = version.split('.');
      for (var i = 0; i < 3; i++) {
        if (pkgVersionArr[i] > destVer[i]) {
          return true;
        } else if (pkgVersionArr[i] < destVer[i]) {
          return false;
        }
      }
      return false;
    }

    /**
     * Transitional option validator
     * @param {function|boolean?} validator
     * @param {string?} version
     * @param {string} message
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      var isDeprecated = version && isOlderVersion(version);

      function formatMessage(opt, desc) {
        return '[Axios v' + pkg.version + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return function(value, opt, opts) {
        if (validator === false) {
          throw new Error(formatMessage(opt, ' has been removed in ' + version));
        }

        if (isDeprecated && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new TypeError('options must be an object');
      }
      var keys = Object.keys(options);
      var i = keys.length;
      while (i-- > 0) {
        var opt = keys[i];
        var validator = schema[opt];
        if (validator) {
          var value = options[opt];
          var result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new TypeError('option ' + opt + ' must be ' + result);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw Error('Unknown option ' + opt);
        }
      }
    }

    var validator = {
      isOlderVersion: isOlderVersion,
      assertOptions: assertOptions,
      validators: validators$1
    };

    var validators = validator.validators;
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

      var transitional = config.transitional;

      if (transitional !== undefined) {
        validator.assertOptions(transitional, {
          silentJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
          forcedJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
          clarifyTimeoutError: validators.transitional(validators.boolean, '1.0.0')
        }, false);
      }

      // filter out skipped interceptors
      var requestInterceptorChain = [];
      var synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
          return;
        }

        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      var responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });

      var promise;

      if (!synchronousRequestInterceptors) {
        var chain = [dispatchRequest, undefined];

        Array.prototype.unshift.apply(chain, requestInterceptorChain);
        chain = chain.concat(responseInterceptorChain);

        promise = Promise.resolve(config);
        while (chain.length) {
          promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
      }


      var newConfig = config;
      while (requestInterceptorChain.length) {
        var onFulfilled = requestInterceptorChain.shift();
        var onRejected = requestInterceptorChain.shift();
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected(error);
          break;
        }
      }

      try {
        promise = dispatchRequest(newConfig);
      } catch (error) {
        return Promise.reject(error);
      }

      while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
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

    /**
     * @description Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds.
     *
     * @param {function} fn The function to be executed
     * @param {number} [wait] The time after which the function should be executed. Defaults to 300ms
     * @returns {fn} The debounced function
     */
    function debounce(fn, wait = 300) {
      let timeout;

      return function debounced(...args) {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
          timeout = null;

          fn.apply(this, args);
        }, wait);
      };
    }

    const apiCall = async (url, params, method = "GET") => {
      try {
        const { data } = await axios({ method, url, params });

        return data;
      } catch (error) {
        throw new Error(error);
      }
    };

    const createID = () => Math.random().toString(36).substring(7);

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

    /**
     * Takes an array of artists and concats their names
     * @param {Object[]} artists
     *
     * @returns {string} Names separated by commas
     */
    const getArtists = artists =>
      artists?.map(artist => artist.name).join(", ") || "John Doe";

    /* src/Lessons/index.svelte generated by Svelte v3.43.2 */

    const { Error: Error_1$3, Object: Object_1 } = globals;
    const file$d = "src/Lessons/index.svelte";

    function get_each_context$5(ctx, list, i) {
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

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("No lessons yet");
    			t1 = space();
    			button = element("button");
    			t2 = text("Create a new One");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			t0 = claim_text(div_nodes, "No lessons yet");
    			div_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", {});
    			var button_nodes = children(button);
    			t2 = claim_text(button_nodes, "Create a new One");
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(div, file$d, 148, 4, 3947);
    			add_location(button, file$d, 149, 4, 3977);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$3.name,
    		type: "else",
    		source: "(148:2) {:else}",
    		ctx
    	});

    	return block;
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
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			t1 = text("Export Data");
    			this.h();
    		},
    		l: function claim(nodes) {
    			ul = claim_element(nodes, "UL", {});
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			t0 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", {});
    			var button_nodes = children(button);
    			t1 = claim_text(button_nodes, "Export Data");
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(ul, file$d, 111, 4, 2762);
    			add_location(button, file$d, 146, 4, 3882);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*exportData*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*deleteLesson, lessons, computePracticeTime, navigate*/ 35) {
    				each_value = /*lessons*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(111:2) {#if lessons && lessons.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (127:12) {:else}
    function create_else_block$4(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			this.h();
    		},
    		l: function claim(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "title", "Start practicing");
    			attr_dev(i, "class", "fa fa-hourglass-start");
    			add_location(i, file$d, 127, 14, 3376);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, i, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(127:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (122:31) 
    function create_if_block_4$2(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			this.h();
    		},
    		l: function claim(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "title", "Keep goin. The way to mastery is long.");
    			attr_dev(i, "class", "fa fa-hourglass-end");
    			add_location(i, file$d, 122, 14, 3215);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, i, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(122:31) ",
    		ctx
    	});

    	return block;
    }

    // (119:12) {#if totalTime}
    function create_if_block_3$3(ctx) {
    	let i;
    	let t0;
    	let t1_value = computePracticeTime(/*totalTime*/ ctx[12]) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach_dev);
    			t0 = claim_space(nodes);
    			t1 = claim_text(nodes, t1_value);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "title", "Keep practicing");
    			attr_dev(i, "class", "fa fa-hourglass-half");
    			add_location(i, file$d, 119, 14, 3063);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, i, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lessons*/ 2 && t1_value !== (t1_value = computePracticeTime(/*totalTime*/ ctx[12]) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(119:12) {#if totalTime}",
    		ctx
    	});

    	return block;
    }

    // (131:10) {#if finished}
    function create_if_block_2$3(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			this.h();
    		},
    		l: function claim(nodes) {
    			i = claim_element(nodes, "I", { title: true, class: true });
    			children(i).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "title", "Congrats, you finished this lesson");
    			attr_dev(i, "class", "fa fa-trophy svelte-lc5wwu");
    			add_location(i, file$d, 131, 12, 3509);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(131:10) {#if finished}",
    		ctx
    	});

    	return block;
    }

    // (113:6) {#each lessons as { id, title, totalTime, artist, finished }}
    function create_each_block$5(ctx) {
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
    		if (/*finished*/ ctx[14]) return create_if_block_4$2;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*finished*/ ctx[14] && create_if_block_2$3(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*id*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
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
    		l: function claim(nodes) {
    			li = claim_element(nodes, "LI", { class: true });
    			var li_nodes = children(li);
    			button0 = claim_element(li_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			t0 = claim_text(button0_nodes, t0_value);
    			t1 = claim_text(button0_nodes, " - ");
    			t2 = claim_text(button0_nodes, t2_value);
    			button0_nodes.forEach(detach_dev);
    			t3 = claim_space(li_nodes);
    			div = claim_element(li_nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if_block0.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			t4 = claim_space(li_nodes);
    			if (if_block1) if_block1.l(li_nodes);
    			t5 = claim_space(li_nodes);
    			button1 = claim_element(li_nodes, "BUTTON", { title: true, class: true });
    			var button1_nodes = children(button1);
    			i = claim_element(button1_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			button1_nodes.forEach(detach_dev);
    			t6 = claim_space(li_nodes);
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(button0, "class", "fancy-link svelte-lc5wwu");
    			add_location(button0, file$d, 114, 10, 2873);
    			attr_dev(div, "class", "time");
    			add_location(div, file$d, 117, 10, 3002);
    			attr_dev(i, "class", "fa fa-trash-alt");
    			add_location(i, file$d, 141, 12, 3790);
    			attr_dev(button1, "title", "Delete Lesson");
    			attr_dev(button1, "class", "naked-button svelte-lc5wwu");
    			add_location(button1, file$d, 136, 10, 3645);
    			attr_dev(li, "class", "lesson svelte-lc5wwu");
    			add_location(li, file$d, 113, 8, 2843);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			append_hydration_dev(li, button0);
    			append_hydration_dev(button0, t0);
    			append_hydration_dev(button0, t1);
    			append_hydration_dev(button0, t2);
    			append_hydration_dev(li, t3);
    			append_hydration_dev(li, div);
    			if_block0.m(div, null);
    			append_hydration_dev(li, t4);
    			if (if_block1) if_block1.m(li, null);
    			append_hydration_dev(li, t5);
    			append_hydration_dev(li, button1);
    			append_hydration_dev(button1, i);
    			append_hydration_dev(li, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler, false, false, false),
    					listen_dev(button1, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*lessons*/ 2 && t0_value !== (t0_value = /*title*/ ctx[11] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*lessons*/ 2 && t2_value !== (t2_value = /*artist*/ ctx[13] + "")) set_data_dev(t2, t2_value);

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
    					if_block1 = create_if_block_2$3(ctx);
    					if_block1.c();
    					if_block1.m(li, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(113:6) {#each lessons as { id, title, totalTime, artist, finished }}",
    		ctx
    	});

    	return block;
    }

    // (160:2) {#if error}
    function create_if_block$7(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*error*/ ctx[2]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, /*error*/ ctx[2]);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "error");
    			add_location(div, file$d, 160, 4, 4209);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(160:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
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
    	let if_block1 = /*error*/ ctx[2] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
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
    		l: function claim(nodes) {
    			section = claim_element(nodes, "SECTION", {});
    			var section_nodes = children(section);
    			h1 = claim_element(section_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Click a Lesson to start practicing");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(section_nodes);
    			if_block0.l(section_nodes);
    			t2 = claim_space(section_nodes);
    			label = claim_element(section_nodes, "LABEL", {});
    			var label_nodes = children(label);
    			t3 = claim_text(label_nodes, "Import lessons: ");
    			input = claim_element(label_nodes, "INPUT", { accept: true, type: true });
    			label_nodes.forEach(detach_dev);
    			t4 = claim_space(section_nodes);
    			if (if_block1) if_block1.l(section_nodes);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h1, "class", "svelte-lc5wwu");
    			add_location(h1, file$d, 109, 2, 2676);
    			attr_dev(input, "accept", ".json");
    			attr_dev(input, "type", "file");
    			add_location(input, file$d, 152, 21, 4082);
    			add_location(label, file$d, 151, 2, 4054);
    			add_location(section, file$d, 108, 0, 2664);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, section, anchor);
    			append_hydration_dev(section, h1);
    			append_hydration_dev(h1, t0);
    			append_hydration_dev(section, t1);
    			if_block0.m(section, null);
    			append_hydration_dev(section, t2);
    			append_hydration_dev(section, label);
    			append_hydration_dev(label, t3);
    			append_hydration_dev(label, input);
    			append_hydration_dev(section, t4);
    			if (if_block1) if_block1.m(section, null);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", prevent_default(/*importData*/ ctx[4]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    					if_block1 = create_if_block$7(ctx);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Lessons', slots, []);
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

    	const writable_props = ['navigate'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Lessons> was created with unknown prop '${key}'`);
    	});

    	const click_handler = id => navigate("lesson", id);
    	const click_handler_1 = id => deleteLesson(id);
    	const click_handler_2 = () => navigate("new");

    	$$self.$$set = $$props => {
    		if ('navigate' in $$props) $$invalidate(0, navigate = $$props.navigate);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		LESSONS,
    		navigate,
    		lessons,
    		error,
    		computePracticeTime,
    		exportData,
    		importData,
    		renderLessons,
    		deleteLesson
    	});

    	$$self.$inject_state = $$props => {
    		if ('navigate' in $$props) $$invalidate(0, navigate = $$props.navigate);
    		if ('lessons' in $$props) $$invalidate(1, lessons = $$props.lessons);
    		if ('error' in $$props) $$invalidate(2, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Lessons extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { navigate: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lessons",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*navigate*/ ctx[0] === undefined && !('navigate' in props)) {
    			console.warn("<Lessons> was created without expected prop 'navigate'");
    		}
    	}

    	get navigate() {
    		throw new Error_1$3("<Lessons>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navigate(value) {
    		throw new Error_1$3("<Lessons>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const spotifyToken = writable();

    /* src/NewLesson/SpotifyResponse.svelte generated by Svelte v3.43.2 */
    const file$c = "src/NewLesson/SpotifyResponse.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (21:0) {#each data as song}
    function create_each_block$4(ctx) {
    	let section;
    	let h3;
    	let span0;
    	let t0_value = /*song*/ ctx[6]?.name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = getArtists(/*song*/ ctx[6].artists) + "";
    	let t2;
    	let t3;
    	let div1;
    	let div0;
    	let t4_value = transformSongLength(/*song*/ ctx[6]?.duration_ms) + "";
    	let t4;
    	let t5;
    	let a;
    	let i;
    	let a_href_value;
    	let t6;
    	let img;
    	let img_src_value;
    	let img_height_value;
    	let img_width_value;
    	let img_alt_value;
    	let t7;
    	let audio;
    	let source;
    	let source_src_value;
    	let t8;
    	let mounted;
    	let dispose;

    	function keydown_handler() {
    		return /*keydown_handler*/ ctx[3](/*song*/ ctx[6]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[4](/*song*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			h3 = element("h3");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = text(" by\n      ");
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			a = element("a");
    			i = element("i");
    			t6 = space();
    			img = element("img");
    			t7 = space();
    			audio = element("audio");
    			source = element("source");
    			t8 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			section = claim_element(nodes, "SECTION", { role: true, tabindex: true, class: true });
    			var section_nodes = children(section);
    			h3 = claim_element(section_nodes, "H3", { class: true });
    			var h3_nodes = children(h3);
    			span0 = claim_element(h3_nodes, "SPAN", { class: true });
    			var span0_nodes = children(span0);
    			t0 = claim_text(span0_nodes, t0_value);
    			span0_nodes.forEach(detach_dev);
    			t1 = claim_text(h3_nodes, " by\n      ");
    			span1 = claim_element(h3_nodes, "SPAN", { class: true });
    			var span1_nodes = children(span1);
    			t2 = claim_text(span1_nodes, t2_value);
    			span1_nodes.forEach(detach_dev);
    			h3_nodes.forEach(detach_dev);
    			t3 = claim_space(section_nodes);
    			div1 = claim_element(section_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			div0 = claim_element(div1_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			t4 = claim_text(div0_nodes, t4_value);
    			div0_nodes.forEach(detach_dev);
    			t5 = claim_space(div1_nodes);
    			a = claim_element(div1_nodes, "A", { target: true, href: true, class: true });
    			var a_nodes = children(a);
    			i = claim_element(a_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			a_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			t6 = claim_space(section_nodes);

    			img = claim_element(section_nodes, "IMG", {
    				src: true,
    				height: true,
    				width: true,
    				alt: true
    			});

    			t7 = claim_space(section_nodes);
    			audio = claim_element(section_nodes, "AUDIO", {});
    			var audio_nodes = children(audio);
    			source = claim_element(audio_nodes, "SOURCE", { src: true, type: true });
    			audio_nodes.forEach(detach_dev);
    			t8 = claim_space(section_nodes);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span0, "class", "svelte-1kyf0m7");
    			add_location(span0, file$c, 29, 6, 693);
    			attr_dev(span1, "class", "svelte-1kyf0m7");
    			add_location(span1, file$c, 30, 6, 728);
    			attr_dev(h3, "class", "svelte-1kyf0m7");
    			add_location(h3, file$c, 28, 4, 682);
    			attr_dev(div0, "class", "length");
    			add_location(div0, file$c, 34, 6, 808);
    			attr_dev(i, "class", "fab fa-spotify");
    			add_location(i, file$c, 42, 8, 1017);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", a_href_value = /*song*/ ctx[6]?.external_urls?.spotify);
    			attr_dev(a, "class", "svelte-1kyf0m7");
    			add_location(a, file$c, 37, 6, 897);
    			attr_dev(div1, "class", "info svelte-1kyf0m7");
    			add_location(div1, file$c, 33, 4, 783);
    			if (!src_url_equal(img.src, img_src_value = /*song*/ ctx[6].album?.images[1]?.url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", img_height_value = /*song*/ ctx[6].album?.images[1]?.height);
    			attr_dev(img, "width", img_width_value = /*song*/ ctx[6].album?.images[1]?.height);
    			attr_dev(img, "alt", img_alt_value = `Album cover of ${/*song*/ ctx[6].name}`);
    			add_location(img, file$c, 46, 4, 1073);
    			if (!src_url_equal(source.src, source_src_value = /*song*/ ctx[6].preview_url)) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "audio/mpeg");
    			add_location(source, file$c, 54, 6, 1294);
    			audio.controls = "controls";
    			add_location(audio, file$c, 53, 4, 1260);
    			attr_dev(section, "role", "button");
    			attr_dev(section, "tabindex", "0");
    			attr_dev(section, "class", "svelte-1kyf0m7");
    			toggle_class(section, "show", /*song*/ ctx[6]);
    			add_location(section, file$c, 21, 2, 530);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, section, anchor);
    			append_hydration_dev(section, h3);
    			append_hydration_dev(h3, span0);
    			append_hydration_dev(span0, t0);
    			append_hydration_dev(h3, t1);
    			append_hydration_dev(h3, span1);
    			append_hydration_dev(span1, t2);
    			append_hydration_dev(section, t3);
    			append_hydration_dev(section, div1);
    			append_hydration_dev(div1, div0);
    			append_hydration_dev(div0, t4);
    			append_hydration_dev(div1, t5);
    			append_hydration_dev(div1, a);
    			append_hydration_dev(a, i);
    			append_hydration_dev(section, t6);
    			append_hydration_dev(section, img);
    			append_hydration_dev(section, t7);
    			append_hydration_dev(section, audio);
    			append_hydration_dev(audio, source);
    			append_hydration_dev(section, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", stop_propagation(/*click_handler*/ ctx[2]), false, false, true),
    					listen_dev(section, "keydown", keydown_handler, false, false, false),
    					listen_dev(section, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*song*/ ctx[6]?.name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 1 && t2_value !== (t2_value = getArtists(/*song*/ ctx[6].artists) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*data*/ 1 && t4_value !== (t4_value = transformSongLength(/*song*/ ctx[6]?.duration_ms) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = /*song*/ ctx[6]?.external_urls?.spotify)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*data*/ 1 && !src_url_equal(img.src, img_src_value = /*song*/ ctx[6].album?.images[1]?.url)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data*/ 1 && img_height_value !== (img_height_value = /*song*/ ctx[6].album?.images[1]?.height)) {
    				attr_dev(img, "height", img_height_value);
    			}

    			if (dirty & /*data*/ 1 && img_width_value !== (img_width_value = /*song*/ ctx[6].album?.images[1]?.height)) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (dirty & /*data*/ 1 && img_alt_value !== (img_alt_value = `Album cover of ${/*song*/ ctx[6].name}`)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*data*/ 1 && !src_url_equal(source.src, source_src_value = /*song*/ ctx[6].preview_url)) {
    				attr_dev(source, "src", source_src_value);
    			}

    			if (dirty & /*data*/ 1) {
    				toggle_class(section, "show", /*song*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(21:0) {#each data as song}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let each_1_anchor;
    	let each_value = /*data*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(nodes);
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_hydration_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data, returnData, transformSongLength, getArtists*/ 3) {
    				each_value = /*data*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function transformSongLength(ms) {
    	const seconds = ms / 1000;
    	const minutes = seconds / 60;
    	const remainingSeconds = seconds % 60;
    	return `${minutes.toFixed(0)}:${remainingSeconds.toFixed(0) < 10 ? "0" : ""}${remainingSeconds.toFixed(0)}`;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SpotifyResponse', slots, []);
    	let { data } = $$props;
    	const dispatch = createEventDispatcher();
    	const returnData = song => dispatch("song", song);
    	const writable_props = ['data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SpotifyResponse> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const keydown_handler = song => returnData(song);
    	const click_handler_1 = song => returnData(song);

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		getArtists,
    		data,
    		transformSongLength,
    		dispatch,
    		returnData
    	});

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, returnData, click_handler, keydown_handler, click_handler_1];
    }

    class SpotifyResponse extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SpotifyResponse",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !('data' in props)) {
    			console.warn("<SpotifyResponse> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<SpotifyResponse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<SpotifyResponse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Input.svelte generated by Svelte v3.43.2 */
    const file$b = "src/components/Input.svelte";

    // (16:2) {#if error}
    function create_if_block$6(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*error*/ ctx[2]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, /*error*/ ctx[2]);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "error svelte-1nsq3fe");
    			add_location(div, file$b, 16, 4, 371);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(16:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div;
    	let input;
    	let t0;
    	let label_1;
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = /*error*/ ctx[2] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label_1 = element("label");
    			t1 = text(/*label*/ ctx[1]);
    			t2 = space();
    			if (if_block) if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			input = claim_element(div_nodes, "INPUT", { id: true, class: true });
    			t0 = claim_space(div_nodes);
    			label_1 = claim_element(div_nodes, "LABEL", { for: true, class: true });
    			var label_1_nodes = children(label_1);
    			t1 = claim_text(label_1_nodes, /*label*/ ctx[1]);
    			label_1_nodes.forEach(detach_dev);
    			t2 = claim_space(div_nodes);
    			if (if_block) if_block.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(input, "id", /*inputID*/ ctx[4]);
    			attr_dev(input, "class", "svelte-1nsq3fe");
    			add_location(input, file$b, 12, 2, 233);
    			attr_dev(label_1, "for", /*inputID*/ ctx[4]);
    			attr_dev(label_1, "class", "svelte-1nsq3fe");
    			toggle_class(label_1, "flying-label", /*value*/ ctx[0]);
    			add_location(label_1, file$b, 13, 2, 288);
    			attr_dev(div, "class", "input-container svelte-1nsq3fe");
    			add_location(div, file$b, 11, 0, 201);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			append_hydration_dev(div, t0);
    			append_hydration_dev(div, label_1);
    			append_hydration_dev(label_1, t1);
    			append_hydration_dev(div, t2);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input,
    						"input",
    						function () {
    							if (is_function(/*onInput*/ ctx[3])) /*onInput*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (dirty & /*label*/ 2) set_data_dev(t1, /*label*/ ctx[1]);

    			if (dirty & /*value*/ 1) {
    				toggle_class(label_1, "flying-label", /*value*/ ctx[0]);
    			}

    			if (/*error*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Input', slots, []);
    	let { value } = $$props;
    	let { label } = $$props;
    	let { error = null } = $$props;
    	let { onInput = null } = $$props;
    	let inputID = `${label}-${createID()}`;
    	const writable_props = ['value', 'label', 'error', 'onInput'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('error' in $$props) $$invalidate(2, error = $$props.error);
    		if ('onInput' in $$props) $$invalidate(3, onInput = $$props.onInput);
    	};

    	$$self.$capture_state = () => ({
    		createID,
    		value,
    		label,
    		error,
    		onInput,
    		inputID
    	});

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('error' in $$props) $$invalidate(2, error = $$props.error);
    		if ('onInput' in $$props) $$invalidate(3, onInput = $$props.onInput);
    		if ('inputID' in $$props) $$invalidate(4, inputID = $$props.inputID);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, label, error, onInput, inputID, input_input_handler];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { value: 0, label: 1, error: 2, onInput: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[0] === undefined && !('value' in props)) {
    			console.warn("<Input> was created without expected prop 'value'");
    		}

    		if (/*label*/ ctx[1] === undefined && !('label' in props)) {
    			console.warn("<Input> was created without expected prop 'label'");
    		}
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get error() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set error(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onInput() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onInput(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Loading.svelte generated by Svelte v3.43.2 */

    const file$a = "src/components/Loading.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let i;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*text*/ ctx[0]);
    			t1 = space();
    			i = element("i");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			span = claim_element(div_nodes, "SPAN", {});
    			var span_nodes = children(span);
    			t0 = claim_text(span_nodes, /*text*/ ctx[0]);
    			span_nodes.forEach(detach_dev);
    			t1 = claim_space(div_nodes);
    			i = claim_element(div_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(span, file$a, 5, 2, 78);
    			attr_dev(i, "class", "fa fa-spinner fa-spin");
    			add_location(i, file$a, 5, 22, 98);
    			attr_dev(div, "class", "loading svelte-fp2n7");
    			add_location(div, file$a, 4, 0, 54);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, span);
    			append_hydration_dev(span, t0);
    			append_hydration_dev(div, t1);
    			append_hydration_dev(div, i);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) set_data_dev(t0, /*text*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Loading', slots, []);
    	let { text = "Loading..." } = $$props;
    	const writable_props = ['text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loading> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ text });

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text];
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { text: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loading",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get text() {
    		throw new Error("<Loading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Loading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Error.svelte generated by Svelte v3.43.2 */

    const { Error: Error_1$2, console: console_1$3 } = globals;
    const file$9 = "src/components/Error.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*errorMessage*/ ctx[0]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, /*errorMessage*/ ctx[0]);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "svelte-3sgp1q");
    			toggle_class(div, "show", /*error*/ ctx[1]);
    			add_location(div, file$9, 7, 0, 152);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*errorMessage*/ 1) set_data_dev(t, /*errorMessage*/ ctx[0]);

    			if (dirty & /*error*/ 2) {
    				toggle_class(div, "show", /*error*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Error', slots, []);
    	let { errorMessage = "Sorry, something went wrong 😔" } = $$props;
    	let { error = null } = $$props;
    	const writable_props = ['errorMessage', 'error'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Error> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('errorMessage' in $$props) $$invalidate(0, errorMessage = $$props.errorMessage);
    		if ('error' in $$props) $$invalidate(1, error = $$props.error);
    	};

    	$$self.$capture_state = () => ({ errorMessage, error });

    	$$self.$inject_state = $$props => {
    		if ('errorMessage' in $$props) $$invalidate(0, errorMessage = $$props.errorMessage);
    		if ('error' in $$props) $$invalidate(1, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*error*/ 2) {
    			error ? console.error(error) : null;
    		}
    	};

    	return [errorMessage, error];
    }

    class Error$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { errorMessage: 0, error: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Error",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get errorMessage() {
    		throw new Error_1$2("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set errorMessage(value) {
    		throw new Error_1$2("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get error() {
    		throw new Error_1$2("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set error(value) {
    		throw new Error_1$2("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/NewLesson/SpotifySearch.svelte generated by Svelte v3.43.2 */

    const { Error: Error_1$1, console: console_1$2 } = globals;
    const file$8 = "src/NewLesson/SpotifySearch.svelte";

    // (67:2) {#if loading}
    function create_if_block_1$3(ctx) {
    	let loading_1;
    	let current;

    	loading_1 = new Loading({
    			props: { text: "Searching Spotify..." },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(loading_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(loading_1.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(67:2) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (73:2) {#if spotifyResponse}
    function create_if_block$5(ctx) {
    	let div;
    	let spotifyresponse;
    	let current;

    	spotifyresponse = new SpotifyResponse({
    			props: { data: /*spotifyResponse*/ ctx[3] },
    			$$inline: true
    		});

    	spotifyresponse.$on("song", /*song_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(spotifyresponse.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			claim_component(spotifyresponse.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "search-results svelte-1pkvtmg");
    			add_location(div, file$8, 73, 4, 2000);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			mount_component(spotifyresponse, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const spotifyresponse_changes = {};
    			if (dirty & /*spotifyResponse*/ 8) spotifyresponse_changes.data = /*spotifyResponse*/ ctx[3];
    			spotifyresponse.$set(spotifyresponse_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spotifyresponse.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spotifyresponse.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(spotifyresponse);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(73:2) {#if spotifyResponse}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let input;
    	let updating_value;
    	let t0;
    	let div;
    	let t1;
    	let error_1;
    	let t2;
    	let current;

    	function input_value_binding(value) {
    		/*input_value_binding*/ ctx[5](value);
    	}

    	let input_props = {
    		label: "Song",
    		onInput: debounce(/*searchSpotify*/ ctx[4])
    	};

    	if (/*songName*/ ctx[0] !== void 0) {
    		input_props.value = /*songName*/ ctx[0];
    	}

    	input = new Input({ props: input_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(input, 'value', input_value_binding));
    	let if_block0 = /*loading*/ ctx[1] && create_if_block_1$3(ctx);

    	error_1 = new Error$1({
    			props: { error: /*error*/ ctx[2] },
    			$$inline: true
    		});

    	let if_block1 = /*spotifyResponse*/ ctx[3] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			create_component(input.$$.fragment);
    			t0 = space();
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			create_component(error_1.$$.fragment);
    			t2 = space();
    			if (if_block1) if_block1.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			claim_component(input.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			if (if_block0) if_block0.l(div_nodes);
    			t1 = claim_space(div_nodes);
    			claim_component(error_1.$$.fragment, div_nodes);
    			t2 = claim_space(div_nodes);
    			if (if_block1) if_block1.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(div, file$8, 65, 0, 1876);
    		},
    		m: function mount(target, anchor) {
    			mount_component(input, target, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_hydration_dev(div, t1);
    			mount_component(error_1, div, null);
    			append_hydration_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const input_changes = {};

    			if (!updating_value && dirty & /*songName*/ 1) {
    				updating_value = true;
    				input_changes.value = /*songName*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			input.$set(input_changes);

    			if (/*loading*/ ctx[1]) {
    				if (if_block0) {
    					if (dirty & /*loading*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const error_1_changes = {};
    			if (dirty & /*error*/ 4) error_1_changes.error = /*error*/ ctx[2];
    			error_1.$set(error_1_changes);

    			if (/*spotifyResponse*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*spotifyResponse*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(error_1.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(error_1.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(input, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			destroy_component(error_1);
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $spotifyToken;
    	validate_store(spotifyToken, 'spotifyToken');
    	component_subscribe($$self, spotifyToken, $$value => $$invalidate(7, $spotifyToken = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SpotifySearch', slots, []);
    	let { songName = "" } = $$props;
    	let loading = false;
    	let error = null;
    	let spotifyResponse = null;

    	async function searchSpotify() {
    		if ($spotifyToken && songName.length > 1) {
    			$$invalidate(2, error = null);
    			$$invalidate(1, loading = true);

    			try {
    				const { data } = await axios("https://api.spotify.com/v1/search", {
    					headers: {
    						Authorization: `Authorization: Bearer ${$spotifyToken}`
    					},
    					params: { q: songName, type: "track", limit: 5 }
    				});

    				$$invalidate(3, spotifyResponse = data?.tracks?.items);
    			} catch(err) {
    				$$invalidate(2, error = err);
    			} finally {
    				$$invalidate(1, loading = false);
    			}
    		}
    	}

    	onMount(() => {
    		(async function authenticateSpotify() {
    			try {
    				// Needed as content-type means that the server expects tuples
    				const params = new URLSearchParams();

    				params.append("grant_type", "client_credentials");

    				const credentials = await axios.post("https://accounts.spotify.com/api/token", params, {
    					headers: {
    						"Content-type": "application/x-www-form-urlencoded",
    						Authorization: `Basic ${btoa("aca42c0dc02c41989527bbd4735022b9" + ":" + "4e5a491e12284f2690bd5bad7f5a4181")}`
    					}
    				});

    				spotifyToken.set(credentials?.data?.access_token);
    			} catch(err) {
    				console.error(err);
    			}
    		})();
    	});

    	const writable_props = ['songName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<SpotifySearch> was created with unknown prop '${key}'`);
    	});

    	function input_value_binding(value) {
    		songName = value;
    		$$invalidate(0, songName);
    	}

    	function song_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('songName' in $$props) $$invalidate(0, songName = $$props.songName);
    	};

    	$$self.$capture_state = () => ({
    		spotifyToken,
    		onMount,
    		axios,
    		SpotifyResponse,
    		Input,
    		Loading,
    		Error: Error$1,
    		debounce,
    		songName,
    		loading,
    		error,
    		spotifyResponse,
    		searchSpotify,
    		$spotifyToken
    	});

    	$$self.$inject_state = $$props => {
    		if ('songName' in $$props) $$invalidate(0, songName = $$props.songName);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    		if ('error' in $$props) $$invalidate(2, error = $$props.error);
    		if ('spotifyResponse' in $$props) $$invalidate(3, spotifyResponse = $$props.spotifyResponse);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		songName,
    		loading,
    		error,
    		spotifyResponse,
    		searchSpotify,
    		input_value_binding,
    		song_handler
    	];
    }

    class SpotifySearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { songName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SpotifySearch",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get songName() {
    		throw new Error_1$1("<SpotifySearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set songName(value) {
    		throw new Error_1$1("<SpotifySearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/VideoSnippet.svelte generated by Svelte v3.43.2 */

    const file$7 = "src/components/VideoSnippet.svelte";

    // (6:2) {#if snippet}
    function create_if_block$4(ctx) {
    	let div;
    	let img;
    	let img_alt_value;
    	let img_src_value;
    	let img_width_value;
    	let img_height_value;
    	let t0;
    	let h1;
    	let t1_value = /*snippet*/ ctx[0].title + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*snippet*/ ctx[0].description + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);

    			img = claim_element(div_nodes, "IMG", {
    				alt: true,
    				src: true,
    				width: true,
    				height: true,
    				class: true
    			});

    			div_nodes.forEach(detach_dev);
    			t0 = claim_space(nodes);
    			h1 = claim_element(nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, t1_value);
    			h1_nodes.forEach(detach_dev);
    			t2 = claim_space(nodes);
    			p = claim_element(nodes, "P", { class: true });
    			var p_nodes = children(p);
    			t3 = claim_text(p_nodes, t3_value);
    			p_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(img, "alt", img_alt_value = /*snippet*/ ctx[0].title);
    			if (!src_url_equal(img.src, img_src_value = /*snippet*/ ctx[0].thumbnails.medium.url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", img_width_value = /*snippet*/ ctx[0].thumbnails.medium.width);
    			attr_dev(img, "height", img_height_value = /*snippet*/ ctx[0].thumbnails.medium.height);
    			attr_dev(img, "class", "svelte-18andtt");
    			add_location(img, file$7, 7, 6, 106);
    			attr_dev(div, "class", "image-wrapper");
    			add_location(div, file$7, 6, 4, 72);
    			attr_dev(h1, "class", "svelte-18andtt");
    			add_location(h1, file$7, 14, 4, 305);
    			attr_dev(p, "class", "svelte-18andtt");
    			add_location(p, file$7, 15, 4, 334);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, img);
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, h1, anchor);
    			append_hydration_dev(h1, t1);
    			insert_hydration_dev(target, t2, anchor);
    			insert_hydration_dev(target, p, anchor);
    			append_hydration_dev(p, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*snippet*/ 1 && img_alt_value !== (img_alt_value = /*snippet*/ ctx[0].title)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*snippet*/ 1 && !src_url_equal(img.src, img_src_value = /*snippet*/ ctx[0].thumbnails.medium.url)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*snippet*/ 1 && img_width_value !== (img_width_value = /*snippet*/ ctx[0].thumbnails.medium.width)) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (dirty & /*snippet*/ 1 && img_height_value !== (img_height_value = /*snippet*/ ctx[0].thumbnails.medium.height)) {
    				attr_dev(img, "height", img_height_value);
    			}

    			if (dirty & /*snippet*/ 1 && t1_value !== (t1_value = /*snippet*/ ctx[0].title + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*snippet*/ 1 && t3_value !== (t3_value = /*snippet*/ ctx[0].description + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(6:2) {#if snippet}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let section;
    	let if_block = /*snippet*/ ctx[0] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			section = claim_element(nodes, "SECTION", { class: true });
    			var section_nodes = children(section);
    			if (if_block) if_block.l(section_nodes);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(section, "class", "svelte-18andtt");
    			add_location(section, file$7, 4, 0, 42);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    		},
    		p: function update(ctx, [dirty]) {
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('VideoSnippet', slots, []);
    	let { snippet } = $$props;
    	const writable_props = ['snippet'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<VideoSnippet> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('snippet' in $$props) $$invalidate(0, snippet = $$props.snippet);
    	};

    	$$self.$capture_state = () => ({ snippet });

    	$$self.$inject_state = $$props => {
    		if ('snippet' in $$props) $$invalidate(0, snippet = $$props.snippet);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [snippet];
    }

    class VideoSnippet extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { snippet: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VideoSnippet",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*snippet*/ ctx[0] === undefined && !('snippet' in props)) {
    			console.warn("<VideoSnippet> was created without expected prop 'snippet'");
    		}
    	}

    	get snippet() {
    		throw new Error("<VideoSnippet>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set snippet(value) {
    		throw new Error("<VideoSnippet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/NewLesson/YoutubeSearch.svelte generated by Svelte v3.43.2 */

    const { Error: Error_1 } = globals;
    const file$6 = "src/NewLesson/YoutubeSearch.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (64:2) {#each searchResult as video}
    function create_each_block$3(ctx) {
    	let li;
    	let videosnippet;
    	let t;
    	let li_title_value;
    	let current;
    	let mounted;
    	let dispose;

    	videosnippet = new VideoSnippet({
    			props: { snippet: /*video*/ ctx[10].snippet },
    			$$inline: true
    		});

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*video*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(videosnippet.$$.fragment);
    			t = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			li = claim_element(nodes, "LI", { title: true, class: true, role: true });
    			var li_nodes = children(li);
    			claim_component(videosnippet.$$.fragment, li_nodes);
    			t = claim_space(li_nodes);
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(li, "title", li_title_value = `Click to ${/*findID*/ ctx[3](/*video*/ ctx[10].id.videoId)
			? "un"
			: ""}select`);

    			attr_dev(li, "class", "empty-button svelte-krholc");
    			attr_dev(li, "role", "button");
    			toggle_class(li, "selected", /*findID*/ ctx[3](/*video*/ ctx[10].id.videoId));
    			add_location(li, file$6, 64, 4, 1579);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			mount_component(videosnippet, li, null);
    			append_hydration_dev(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const videosnippet_changes = {};
    			if (dirty & /*searchResult*/ 2) videosnippet_changes.snippet = /*video*/ ctx[10].snippet;
    			videosnippet.$set(videosnippet_changes);

    			if (!current || dirty & /*findID, searchResult*/ 10 && li_title_value !== (li_title_value = `Click to ${/*findID*/ ctx[3](/*video*/ ctx[10].id.videoId)
			? "un"
			: ""}select`)) {
    				attr_dev(li, "title", li_title_value);
    			}

    			if (dirty & /*findID, searchResult*/ 10) {
    				toggle_class(li, "selected", /*findID*/ ctx[3](/*video*/ ctx[10].id.videoId));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(videosnippet.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(videosnippet.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(videosnippet);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(64:2) {#each searchResult as video}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let input;
    	let updating_value;
    	let t0;
    	let error;
    	let t1;
    	let ul;
    	let current;

    	function input_value_binding(value) {
    		/*input_value_binding*/ ctx[8](value);
    	}

    	let input_props = {
    		label: "Search Youtube",
    		onInput: debounce(/*searchYoutube*/ ctx[4])
    	};

    	if (/*videoSearch*/ ctx[0] !== void 0) {
    		input_props.value = /*videoSearch*/ ctx[0];
    	}

    	input = new Input({ props: input_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(input, 'value', input_value_binding));

    	error = new Error$1({
    			props: { error: /*videoError*/ ctx[2] },
    			$$inline: true
    		});

    	let each_value = /*searchResult*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			create_component(input.$$.fragment);
    			t0 = space();
    			create_component(error.$$.fragment);
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			claim_component(input.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			claim_component(error.$$.fragment, nodes);
    			t1 = claim_space(nodes);
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(ul, "class", "search-result svelte-krholc");
    			toggle_class(ul, "show", /*searchResult*/ ctx[1]);
    			add_location(ul, file$6, 62, 0, 1490);
    		},
    		m: function mount(target, anchor) {
    			mount_component(input, target, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			mount_component(error, target, anchor);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const input_changes = {};

    			if (!updating_value && dirty & /*videoSearch*/ 1) {
    				updating_value = true;
    				input_changes.value = /*videoSearch*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			input.$set(input_changes);
    			const error_changes = {};
    			if (dirty & /*videoError*/ 4) error_changes.error = /*videoError*/ ctx[2];
    			error.$set(error_changes);

    			if (dirty & /*findID, searchResult, handleClick*/ 42) {
    				each_value = /*searchResult*/ ctx[1];
    				validate_each_argument(each_value);
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
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*searchResult*/ 2) {
    				toggle_class(ul, "show", /*searchResult*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);
    			transition_in(error.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input.$$.fragment, local);
    			transition_out(error.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(input, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(error, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let findID;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('YoutubeSearch', slots, []);
    	let { videos } = $$props;
    	let { videoSearch } = $$props;
    	let { startSearch = false } = $$props;
    	let searchResult = [];
    	let videoError;

    	async function searchYoutube() {
    		if (videoSearch?.length > 2) {
    			try {
    				const res = await apiCall("https://www.googleapis.com/youtube/v3/search", {
    					q: videoSearch,
    					type: "video",
    					key: "AIzaSyAViHdvitELO2-jct4oVozhk8Wq3hCkjRk",
    					part: "snippet",
    					maxResults: 7,
    					topicId: "/m/04rlf"
    				});

    				$$invalidate(1, searchResult = res.items);
    				$$invalidate(2, videoError = null);
    				$$invalidate(7, startSearch = false);
    			} catch(error) {
    				$$invalidate(2, videoError = error);
    			}
    		}
    	}

    	function handleClick(video) {
    		if (videos.length > 0) {
    			const alreadyIn = findID(video.id.videoId);

    			if (alreadyIn) {
    				$$invalidate(6, videos = videos.filter(vid => vid != alreadyIn));
    			} else {
    				$$invalidate(6, videos = [...videos, video.id.videoId]);
    			}
    		} else {
    			$$invalidate(6, videos = [video.id.videoId]);
    		}
    	}

    	const writable_props = ['videos', 'videoSearch', 'startSearch'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<YoutubeSearch> was created with unknown prop '${key}'`);
    	});

    	function input_value_binding(value) {
    		videoSearch = value;
    		$$invalidate(0, videoSearch);
    	}

    	const click_handler = video => handleClick(video);

    	$$self.$$set = $$props => {
    		if ('videos' in $$props) $$invalidate(6, videos = $$props.videos);
    		if ('videoSearch' in $$props) $$invalidate(0, videoSearch = $$props.videoSearch);
    		if ('startSearch' in $$props) $$invalidate(7, startSearch = $$props.startSearch);
    	};

    	$$self.$capture_state = () => ({
    		VideoSnippet,
    		Input,
    		Error: Error$1,
    		debounce,
    		apiCall,
    		videos,
    		videoSearch,
    		startSearch,
    		searchResult,
    		videoError,
    		searchYoutube,
    		handleClick,
    		findID
    	});

    	$$self.$inject_state = $$props => {
    		if ('videos' in $$props) $$invalidate(6, videos = $$props.videos);
    		if ('videoSearch' in $$props) $$invalidate(0, videoSearch = $$props.videoSearch);
    		if ('startSearch' in $$props) $$invalidate(7, startSearch = $$props.startSearch);
    		if ('searchResult' in $$props) $$invalidate(1, searchResult = $$props.searchResult);
    		if ('videoError' in $$props) $$invalidate(2, videoError = $$props.videoError);
    		if ('findID' in $$props) $$invalidate(3, findID = $$props.findID);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*videos*/ 64) {
    			$$invalidate(3, findID = id => videos?.find(videoID => id == videoID));
    		}

    		if ($$self.$$.dirty & /*startSearch*/ 128) {
    			startSearch ? searchYoutube() : null;
    		}
    	};

    	return [
    		videoSearch,
    		searchResult,
    		videoError,
    		findID,
    		searchYoutube,
    		handleClick,
    		videos,
    		startSearch,
    		input_value_binding,
    		click_handler
    	];
    }

    class YoutubeSearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			videos: 6,
    			videoSearch: 0,
    			startSearch: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "YoutubeSearch",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*videos*/ ctx[6] === undefined && !('videos' in props)) {
    			console.warn("<YoutubeSearch> was created without expected prop 'videos'");
    		}

    		if (/*videoSearch*/ ctx[0] === undefined && !('videoSearch' in props)) {
    			console.warn("<YoutubeSearch> was created without expected prop 'videoSearch'");
    		}
    	}

    	get videos() {
    		throw new Error_1("<YoutubeSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set videos(value) {
    		throw new Error_1("<YoutubeSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get videoSearch() {
    		throw new Error_1("<YoutubeSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set videoSearch(value) {
    		throw new Error_1("<YoutubeSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get startSearch() {
    		throw new Error_1("<YoutubeSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set startSearch(value) {
    		throw new Error_1("<YoutubeSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/NewLesson/index.svelte generated by Svelte v3.43.2 */

    const { console: console_1$1 } = globals;
    const file$5 = "src/NewLesson/index.svelte";

    // (153:6) {:else}
    function create_else_block$3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Save Lesson");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", {});
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Save Lesson");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(span, file$5, 153, 8, 4044);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, span, anchor);
    			append_hydration_dev(span, t);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(153:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (151:6) {#if loading}
    function create_if_block$3(ctx) {
    	let loading_1;
    	let current;
    	loading_1 = new Loading({ props: { text: "" }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loading_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(loading_1.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(151:6) {#if loading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let section;
    	let h1;
    	let t0;
    	let t1;
    	let form;
    	let spotifysearch;
    	let updating_songName;
    	let t2;
    	let input0;
    	let updating_value;
    	let t3;
    	let youtubesearch;
    	let updating_videoSearch;
    	let updating_startSearch;
    	let updating_videos;
    	let t4;
    	let input1;
    	let updating_value_1;
    	let t5;
    	let button;
    	let current_block_type_index;
    	let if_block;
    	let button_disabled_value;
    	let current;
    	let mounted;
    	let dispose;

    	function spotifysearch_songName_binding(value) {
    		/*spotifysearch_songName_binding*/ ctx[7](value);
    	}

    	let spotifysearch_props = {};

    	if (/*songData*/ ctx[3].title !== void 0) {
    		spotifysearch_props.songName = /*songData*/ ctx[3].title;
    	}

    	spotifysearch = new SpotifySearch({
    			props: spotifysearch_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind$1(spotifysearch, 'songName', spotifysearch_songName_binding));
    	spotifysearch.$on("song", /*song_handler*/ ctx[8]);

    	function input0_value_binding(value) {
    		/*input0_value_binding*/ ctx[9](value);
    	}

    	let input0_props = { label: "Artist" };

    	if (/*songData*/ ctx[3].artist !== void 0) {
    		input0_props.value = /*songData*/ ctx[3].artist;
    	}

    	input0 = new Input({ props: input0_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(input0, 'value', input0_value_binding));

    	function youtubesearch_videoSearch_binding(value) {
    		/*youtubesearch_videoSearch_binding*/ ctx[10](value);
    	}

    	function youtubesearch_startSearch_binding(value) {
    		/*youtubesearch_startSearch_binding*/ ctx[11](value);
    	}

    	function youtubesearch_videos_binding(value) {
    		/*youtubesearch_videos_binding*/ ctx[12](value);
    	}

    	let youtubesearch_props = {};

    	if (/*videoSearch*/ ctx[0] !== void 0) {
    		youtubesearch_props.videoSearch = /*videoSearch*/ ctx[0];
    	}

    	if (/*startSearch*/ ctx[1] !== void 0) {
    		youtubesearch_props.startSearch = /*startSearch*/ ctx[1];
    	}

    	if (/*songData*/ ctx[3].videos !== void 0) {
    		youtubesearch_props.videos = /*songData*/ ctx[3].videos;
    	}

    	youtubesearch = new YoutubeSearch({
    			props: youtubesearch_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind$1(youtubesearch, 'videoSearch', youtubesearch_videoSearch_binding));
    	binding_callbacks.push(() => bind$1(youtubesearch, 'startSearch', youtubesearch_startSearch_binding));
    	binding_callbacks.push(() => bind$1(youtubesearch, 'videos', youtubesearch_videos_binding));

    	function input1_value_binding(value) {
    		/*input1_value_binding*/ ctx[13](value);
    	}

    	let input1_props = { label: "Enter Url of chord site" };

    	if (/*songData*/ ctx[3].tab !== void 0) {
    		input1_props.value = /*songData*/ ctx[3].tab;
    	}

    	input1 = new Input({ props: input1_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(input1, 'value', input1_value_binding));
    	const if_block_creators = [create_if_block$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			t0 = text("Create a new Lesson");
    			t1 = space();
    			form = element("form");
    			create_component(spotifysearch.$$.fragment);
    			t2 = space();
    			create_component(input0.$$.fragment);
    			t3 = space();
    			create_component(youtubesearch.$$.fragment);
    			t4 = space();
    			create_component(input1.$$.fragment);
    			t5 = space();
    			button = element("button");
    			if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			section = claim_element(nodes, "SECTION", { id: true, class: true });
    			var section_nodes = children(section);
    			h1 = claim_element(section_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Create a new Lesson");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(section_nodes);
    			form = claim_element(section_nodes, "FORM", { class: true });
    			var form_nodes = children(form);
    			claim_component(spotifysearch.$$.fragment, form_nodes);
    			t2 = claim_space(form_nodes);
    			claim_component(input0.$$.fragment, form_nodes);
    			t3 = claim_space(form_nodes);
    			claim_component(youtubesearch.$$.fragment, form_nodes);
    			t4 = claim_space(form_nodes);
    			claim_component(input1.$$.fragment, form_nodes);
    			t5 = claim_space(form_nodes);
    			button = claim_element(form_nodes, "BUTTON", { type: true });
    			var button_nodes = children(button);
    			if_block.l(button_nodes);
    			button_nodes.forEach(detach_dev);
    			form_nodes.forEach(detach_dev);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$5, 109, 2, 2743);
    			button.disabled = button_disabled_value = !/*songData*/ ctx[3].title || /*loading*/ ctx[2];
    			attr_dev(button, "type", "submit");
    			add_location(button, file$5, 149, 4, 3913);
    			attr_dev(form, "class", "svelte-lqnpzt");
    			add_location(form, file$5, 111, 2, 2775);
    			attr_dev(section, "id", "container");
    			attr_dev(section, "class", "svelte-lqnpzt");
    			add_location(section, file$5, 108, 0, 2716);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, section, anchor);
    			append_hydration_dev(section, h1);
    			append_hydration_dev(h1, t0);
    			append_hydration_dev(section, t1);
    			append_hydration_dev(section, form);
    			mount_component(spotifysearch, form, null);
    			append_hydration_dev(form, t2);
    			mount_component(input0, form, null);
    			append_hydration_dev(form, t3);
    			mount_component(youtubesearch, form, null);
    			append_hydration_dev(form, t4);
    			mount_component(input1, form, null);
    			append_hydration_dev(form, t5);
    			append_hydration_dev(form, button);
    			if_blocks[current_block_type_index].m(button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[4]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const spotifysearch_changes = {};

    			if (!updating_songName && dirty & /*songData*/ 8) {
    				updating_songName = true;
    				spotifysearch_changes.songName = /*songData*/ ctx[3].title;
    				add_flush_callback(() => updating_songName = false);
    			}

    			spotifysearch.$set(spotifysearch_changes);
    			const input0_changes = {};

    			if (!updating_value && dirty & /*songData*/ 8) {
    				updating_value = true;
    				input0_changes.value = /*songData*/ ctx[3].artist;
    				add_flush_callback(() => updating_value = false);
    			}

    			input0.$set(input0_changes);
    			const youtubesearch_changes = {};

    			if (!updating_videoSearch && dirty & /*videoSearch*/ 1) {
    				updating_videoSearch = true;
    				youtubesearch_changes.videoSearch = /*videoSearch*/ ctx[0];
    				add_flush_callback(() => updating_videoSearch = false);
    			}

    			if (!updating_startSearch && dirty & /*startSearch*/ 2) {
    				updating_startSearch = true;
    				youtubesearch_changes.startSearch = /*startSearch*/ ctx[1];
    				add_flush_callback(() => updating_startSearch = false);
    			}

    			if (!updating_videos && dirty & /*songData*/ 8) {
    				updating_videos = true;
    				youtubesearch_changes.videos = /*songData*/ ctx[3].videos;
    				add_flush_callback(() => updating_videos = false);
    			}

    			youtubesearch.$set(youtubesearch_changes);
    			const input1_changes = {};

    			if (!updating_value_1 && dirty & /*songData*/ 8) {
    				updating_value_1 = true;
    				input1_changes.value = /*songData*/ ctx[3].tab;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			input1.$set(input1_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(button, null);
    			}

    			if (!current || dirty & /*songData, loading*/ 12 && button_disabled_value !== (button_disabled_value = !/*songData*/ ctx[3].title || /*loading*/ ctx[2])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spotifysearch.$$.fragment, local);
    			transition_in(input0.$$.fragment, local);
    			transition_in(youtubesearch.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spotifysearch.$$.fragment, local);
    			transition_out(input0.$$.fragment, local);
    			transition_out(youtubesearch.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(spotifysearch);
    			destroy_component(input0);
    			destroy_component(youtubesearch);
    			destroy_component(input1);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $spotifyToken;
    	validate_store(spotifyToken, 'spotifyToken');
    	component_subscribe($$self, spotifyToken, $$value => $$invalidate(14, $spotifyToken = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NewLesson', slots, []);
    	let { navigate } = $$props;
    	let videoSearch;
    	let startSearch = false;
    	let loading = false;

    	let songData = {
    		title: null,
    		artist: null,
    		videos: [],
    		tab: null,
    		coordinates: [{ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }]
    	};

    	// let tabSearch;
    	// let tabs;
    	// let tabError;
    	// async function searchSongsterr() {
    	//   if (tabSearch && tabSearch.length > 3) {
    	//     songData.tab = null;
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
    		if ($spotifyToken) {
    			try {
    				$$invalidate(2, loading = true);

    				const { data } = await axios("https://api.spotify.com/v1/audio-features", {
    					headers: {
    						"Content-Type": "application/json",
    						Authorization: `Authorization: Bearer ${$spotifyToken}`
    					},
    					params: { ids: songData.spotifyID }
    				});

    				if (data?.audio_features[0]) {
    					$$invalidate(3, songData = {
    						...songData,
    						audioFeatures: data?.audio_features[0]
    					});
    				}
    			} catch(err) {
    				console.error(err);
    			} finally {
    				$$invalidate(2, loading = false);
    			}
    		}

    		try {
    			$$invalidate(3, songData.id = `${songData.title}-${createID()}`, songData);
    			let lessons;
    			const stringifiedLessons = await localStorage.getItem(LESSONS);

    			if (stringifiedLessons) {
    				lessons = JSON.parse(stringifiedLessons);
    				lessons.push(songData);
    			} else {
    				lessons = [songData];
    			}

    			await localStorage.setItem(LESSONS, JSON.stringify(lessons));
    			navigate("lesson", songData.id);
    		} catch(err) {
    			console.error(err);
    		}
    	};

    	function handleSpotifySearchClick(data) {
    		$$invalidate(3, songData = {
    			...songData,
    			...data,
    			title: data.name,
    			spotifyID: data.id
    		});

    		$$invalidate(3, songData.artist = getArtists(data.artists), songData);
    		$$invalidate(0, videoSearch = `${songData.name} guitar tutorial`);
    		$$invalidate(1, startSearch = true);
    	}

    	const writable_props = ['navigate'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<NewLesson> was created with unknown prop '${key}'`);
    	});

    	function spotifysearch_songName_binding(value) {
    		if ($$self.$$.not_equal(songData.title, value)) {
    			songData.title = value;
    			$$invalidate(3, songData);
    		}
    	}

    	const song_handler = e => handleSpotifySearchClick(e.detail);

    	function input0_value_binding(value) {
    		if ($$self.$$.not_equal(songData.artist, value)) {
    			songData.artist = value;
    			$$invalidate(3, songData);
    		}
    	}

    	function youtubesearch_videoSearch_binding(value) {
    		videoSearch = value;
    		$$invalidate(0, videoSearch);
    	}

    	function youtubesearch_startSearch_binding(value) {
    		startSearch = value;
    		$$invalidate(1, startSearch);
    	}

    	function youtubesearch_videos_binding(value) {
    		if ($$self.$$.not_equal(songData.videos, value)) {
    			songData.videos = value;
    			$$invalidate(3, songData);
    		}
    	}

    	function input1_value_binding(value) {
    		if ($$self.$$.not_equal(songData.tab, value)) {
    			songData.tab = value;
    			$$invalidate(3, songData);
    		}
    	}

    	$$self.$$set = $$props => {
    		if ('navigate' in $$props) $$invalidate(6, navigate = $$props.navigate);
    	};

    	$$self.$capture_state = () => ({
    		spotifyToken,
    		axios,
    		SpotifySearch,
    		YoutubeSearch,
    		Input,
    		Loading,
    		getArtists,
    		createID,
    		LESSONS,
    		navigate,
    		videoSearch,
    		startSearch,
    		loading,
    		songData,
    		handleSubmit,
    		handleSpotifySearchClick,
    		$spotifyToken
    	});

    	$$self.$inject_state = $$props => {
    		if ('navigate' in $$props) $$invalidate(6, navigate = $$props.navigate);
    		if ('videoSearch' in $$props) $$invalidate(0, videoSearch = $$props.videoSearch);
    		if ('startSearch' in $$props) $$invalidate(1, startSearch = $$props.startSearch);
    		if ('loading' in $$props) $$invalidate(2, loading = $$props.loading);
    		if ('songData' in $$props) $$invalidate(3, songData = $$props.songData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		videoSearch,
    		startSearch,
    		loading,
    		songData,
    		handleSubmit,
    		handleSpotifySearchClick,
    		navigate,
    		spotifysearch_songName_binding,
    		song_handler,
    		input0_value_binding,
    		youtubesearch_videoSearch_binding,
    		youtubesearch_startSearch_binding,
    		youtubesearch_videos_binding,
    		input1_value_binding
    	];
    }

    class NewLesson extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { navigate: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NewLesson",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*navigate*/ ctx[6] === undefined && !('navigate' in props)) {
    			console_1$1.warn("<NewLesson> was created without expected prop 'navigate'");
    		}
    	}

    	get navigate() {
    		throw new Error("<NewLesson>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navigate(value) {
    		throw new Error("<NewLesson>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Lesson/Stopwatch.svelte generated by Svelte v3.43.2 */

    const { document: document_1 } = globals;
    const file$4 = "src/Lesson/Stopwatch.svelte";

    function create_fragment$4(ctx) {
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

    	const block = {
    		c: function create() {
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
    			t3 = text(/*normalizedHours*/ ctx[2]);
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
    			t11 = text(/*normalizedSeconds*/ ctx[0]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			const head_nodes = query_selector_all('[data-svelte=\"svelte-1258swp\"]', document_1.head);
    			head_nodes.forEach(detach_dev);
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
    			children(i0).forEach(detach_dev);
    			button0_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);
    			button1 = claim_element(div0_nodes, "BUTTON", { type: true, class: true });
    			var button1_nodes = children(button1);
    			i1 = claim_element(button1_nodes, "I", { class: true });
    			children(i1).forEach(detach_dev);
    			button1_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t2 = claim_space(form_nodes);
    			div1 = claim_element(form_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t3 = claim_text(div1_nodes, /*normalizedHours*/ ctx[2]);
    			div1_nodes.forEach(detach_dev);
    			t4 = claim_space(form_nodes);
    			span0 = claim_element(form_nodes, "SPAN", { class: true });
    			var span0_nodes = children(span0);
    			t5 = claim_text(span0_nodes, ":");
    			span0_nodes.forEach(detach_dev);
    			t6 = claim_space(form_nodes);
    			div2 = claim_element(form_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			t7 = claim_text(div2_nodes, /*normalizedMinutes*/ ctx[1]);
    			div2_nodes.forEach(detach_dev);
    			t8 = claim_space(form_nodes);
    			span1 = claim_element(form_nodes, "SPAN", { class: true });
    			var span1_nodes = children(span1);
    			t9 = claim_text(span1_nodes, ":");
    			span1_nodes.forEach(detach_dev);
    			t10 = claim_space(form_nodes);
    			div3 = claim_element(form_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			t11 = claim_text(div3_nodes, /*normalizedSeconds*/ ctx[0]);
    			div3_nodes.forEach(detach_dev);
    			form_nodes.forEach(detach_dev);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i0, "class", "fa fa-play-circle");
    			add_location(i0, file$4, 85, 8, 1643);
    			attr_dev(button0, "class", "svelte-weu06x");
    			add_location(button0, file$4, 84, 6, 1611);
    			attr_dev(i1, "class", "fa fa-stop-circle");
    			add_location(i1, file$4, 89, 8, 1745);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "svelte-weu06x");
    			add_location(button1, file$4, 88, 6, 1698);
    			attr_dev(div0, "class", "controls svelte-weu06x");
    			add_location(div0, file$4, 83, 4, 1582);
    			attr_dev(div1, "class", "time svelte-weu06x");
    			add_location(div1, file$4, 92, 4, 1808);
    			attr_dev(span0, "class", "svelte-weu06x");
    			add_location(span0, file$4, 93, 4, 1854);
    			attr_dev(div2, "class", "time svelte-weu06x");
    			add_location(div2, file$4, 94, 4, 1873);
    			attr_dev(span1, "class", "svelte-weu06x");
    			add_location(span1, file$4, 95, 4, 1921);
    			attr_dev(div3, "class", "time svelte-weu06x");
    			add_location(div3, file$4, 96, 4, 1940);
    			attr_dev(form, "class", "svelte-weu06x");
    			add_location(form, file$4, 82, 2, 1540);
    			add_location(section, file$4, 81, 0, 1528);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, section, anchor);
    			append_hydration_dev(section, form);
    			append_hydration_dev(form, div0);
    			append_hydration_dev(div0, button0);
    			append_hydration_dev(button0, i0);
    			append_hydration_dev(div0, t1);
    			append_hydration_dev(div0, button1);
    			append_hydration_dev(button1, i1);
    			append_hydration_dev(form, t2);
    			append_hydration_dev(form, div1);
    			append_hydration_dev(div1, t3);
    			append_hydration_dev(form, t4);
    			append_hydration_dev(form, span0);
    			append_hydration_dev(span0, t5);
    			append_hydration_dev(form, t6);
    			append_hydration_dev(form, div2);
    			append_hydration_dev(div2, t7);
    			append_hydration_dev(form, t8);
    			append_hydration_dev(form, span1);
    			append_hydration_dev(span1, t9);
    			append_hydration_dev(form, t10);
    			append_hydration_dev(form, div3);
    			append_hydration_dev(div3, t11);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*run*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*stop*/ ctx[5], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*run*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 8 && title_value !== (title_value = /*title*/ ctx[3])) {
    				document_1.title = title_value;
    			}

    			if (dirty & /*normalizedHours*/ 4) set_data_dev(t3, /*normalizedHours*/ ctx[2]);
    			if (dirty & /*normalizedMinutes*/ 2) set_data_dev(t7, /*normalizedMinutes*/ ctx[1]);
    			if (dirty & /*normalizedSeconds*/ 1) set_data_dev(t11, /*normalizedSeconds*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let normalizedHours;
    	let normalizedMinutes;
    	let normalizedSeconds;
    	let title;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stopwatch', slots, []);
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

    	const writable_props = ['updateTime'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Stopwatch> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('updateTime' in $$props) $$invalidate(6, updateTime = $$props.updateTime);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		updateTime,
    		total,
    		minutes,
    		seconds,
    		hours,
    		running,
    		time,
    		updated,
    		audio,
    		run,
    		timer,
    		stop,
    		normalizedSeconds,
    		normalizedMinutes,
    		normalizedHours,
    		title
    	});

    	$$self.$inject_state = $$props => {
    		if ('updateTime' in $$props) $$invalidate(6, updateTime = $$props.updateTime);
    		if ('total' in $$props) total = $$props.total;
    		if ('minutes' in $$props) $$invalidate(7, minutes = $$props.minutes);
    		if ('seconds' in $$props) $$invalidate(8, seconds = $$props.seconds);
    		if ('hours' in $$props) $$invalidate(9, hours = $$props.hours);
    		if ('running' in $$props) running = $$props.running;
    		if ('time' in $$props) time = $$props.time;
    		if ('updated' in $$props) updated = $$props.updated;
    		if ('normalizedSeconds' in $$props) $$invalidate(0, normalizedSeconds = $$props.normalizedSeconds);
    		if ('normalizedMinutes' in $$props) $$invalidate(1, normalizedMinutes = $$props.normalizedMinutes);
    		if ('normalizedHours' in $$props) $$invalidate(2, normalizedHours = $$props.normalizedHours);
    		if ('title' in $$props) $$invalidate(3, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*hours*/ 512) {
    			$$invalidate(2, normalizedHours = hours > 9 ? hours : `0${hours}`);
    		}

    		if ($$self.$$.dirty & /*minutes*/ 128) {
    			$$invalidate(1, normalizedMinutes = minutes > 9 ? minutes : `0${minutes}`);
    		}

    		if ($$self.$$.dirty & /*seconds*/ 256) {
    			$$invalidate(0, normalizedSeconds = seconds > 9 ? seconds : `0${seconds}`);
    		}

    		if ($$self.$$.dirty & /*normalizedHours, normalizedMinutes, normalizedSeconds*/ 7) {
    			$$invalidate(3, title = `${normalizedHours}:${normalizedMinutes}:${normalizedSeconds}`);
    		}
    	};

    	return [
    		normalizedSeconds,
    		normalizedMinutes,
    		normalizedHours,
    		title,
    		run,
    		stop,
    		updateTime,
    		minutes,
    		seconds,
    		hours
    	];
    }

    class Stopwatch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { updateTime: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stopwatch",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get updateTime() {
    		throw new Error("<Stopwatch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateTime(value) {
    		throw new Error("<Stopwatch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Lesson/LessonHeader.svelte generated by Svelte v3.43.2 */
    const file$3 = "src/Lesson/LessonHeader.svelte";

    // (96:4) {:else}
    function create_else_block_5(ctx) {
    	let button;
    	let t_value = /*lesson*/ ctx[0].title + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t = claim_text(button_nodes, t_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 96, 6, 1817);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t_value !== (t_value = /*lesson*/ ctx[0].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_5.name,
    		type: "else",
    		source: "(96:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (92:4) {#if edit == 1}
    function create_if_block_5$1(ctx) {
    	let form;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			form = claim_element(nodes, "FORM", { name: true });
    			var form_nodes = children(form);
    			input = claim_element(form_nodes, "INPUT", {});
    			form_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(input, file$3, 93, 8, 1756);
    			attr_dev(form, "name", "title");
    			add_location(form, file$3, 92, 6, 1694);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, form, anchor);
    			append_hydration_dev(form, input);
    			set_input_value(input, /*title*/ ctx[3]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(form, "submit", prevent_default(/*update*/ ctx[9]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 8 && input.value !== /*title*/ ctx[3]) {
    				set_input_value(input, /*title*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(92:4) {#if edit == 1}",
    		ctx
    	});

    	return block;
    }

    // (106:4) {:else}
    function create_else_block_4(ctx) {
    	let button;
    	let t_value = /*lesson*/ ctx[0].artist + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t = claim_text(button_nodes, t_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 106, 6, 2094);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t_value !== (t_value = /*lesson*/ ctx[0].artist + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(106:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (102:4) {#if edit == 2}
    function create_if_block_4$1(ctx) {
    	let form;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			form = claim_element(nodes, "FORM", { name: true });
    			var form_nodes = children(form);
    			input = claim_element(form_nodes, "INPUT", {});
    			form_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(input, file$3, 103, 8, 2032);
    			attr_dev(form, "name", "artist");
    			add_location(form, file$3, 102, 6, 1969);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, form, anchor);
    			append_hydration_dev(form, input);
    			set_input_value(input, /*artist*/ ctx[4]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[13]),
    					listen_dev(form, "submit", prevent_default(/*update*/ ctx[9]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*artist*/ 16 && input.value !== /*artist*/ ctx[4]) {
    				set_input_value(input, /*artist*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(102:4) {#if edit == 2}",
    		ctx
    	});

    	return block;
    }

    // (126:4) {:else}
    function create_else_block_3(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = (/*lesson*/ ctx[0].capo || "No") + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Capo:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Capo:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "capo");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 127, 9, 2603);
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 126, 6, 2537);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, label);
    			append_hydration_dev(label, t0);
    			append_hydration_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = (/*lesson*/ ctx[0].capo || "No") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(126:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (116:4) {#if edit == 3}
    function create_if_block_3$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = text("Capo:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Capo:");
    			label_nodes.forEach(detach_dev);
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
    		h: function hydrate() {
    			attr_dev(label, "for", "capo");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 116, 6, 2342);
    			attr_dev(input, "id", "capo");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "placeholder", "X");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "12");
    			attr_dev(input, "class", "svelte-1wil2zc");
    			add_location(input, file$3, 117, 6, 2380);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, label, anchor);
    			append_hydration_dev(label, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, input, anchor);
    			set_input_value(input, /*capo*/ ctx[1]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_2*/ ctx[15]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*capo*/ 2 && to_number(input.value) !== /*capo*/ ctx[1]) {
    				set_input_value(input, /*capo*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(116:4) {#if edit == 3}",
    		ctx
    	});

    	return block;
    }

    // (142:4) {:else}
    function create_else_block_2(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = (/*lesson*/ ctx[0].tuning || "Standard") + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Tuning:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Tuning:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "tuning");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 143, 8, 3044);
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 142, 6, 2978);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, label);
    			append_hydration_dev(label, t0);
    			append_hydration_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = (/*lesson*/ ctx[0].tuning || "Standard") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(142:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (134:4) {#if edit == 4}
    function create_if_block_2$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = text("Tuning:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Tuning:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			input = claim_element(nodes, "INPUT", { id: true, class: true, placeholder: true });
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "tuning");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 134, 6, 2796);
    			attr_dev(input, "id", "tuning");
    			attr_dev(input, "class", "text-input svelte-1wil2zc");
    			attr_dev(input, "placeholder", "Standard");
    			add_location(input, file$3, 135, 6, 2838);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, label, anchor);
    			append_hydration_dev(label, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, input, anchor);
    			set_input_value(input, /*tuning*/ ctx[2]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_3*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tuning*/ 4 && input.value !== /*tuning*/ ctx[2]) {
    				set_input_value(input, /*tuning*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(134:4) {#if edit == 4}",
    		ctx
    	});

    	return block;
    }

    // (153:4) {:else}
    function create_else_block_1$2(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = /*translateKey*/ ctx[10](/*lesson*/ ctx[0].audioFeatures?.key) + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Key:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Key:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "tuning");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 154, 8, 3439);
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 153, 6, 3373);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, label);
    			append_hydration_dev(label, t0);
    			append_hydration_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[20], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = /*translateKey*/ ctx[10](/*lesson*/ ctx[0].audioFeatures?.key) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(153:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (150:4) {#if edit == 5}
    function create_if_block_1$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = text("Key:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Key:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			input = claim_element(nodes, "INPUT", { id: true, class: true, placeholder: true });
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "key");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 150, 6, 3246);
    			attr_dev(input, "id", "key");
    			attr_dev(input, "class", "text-input svelte-1wil2zc");
    			attr_dev(input, "placeholder", "Key");
    			add_location(input, file$3, 151, 6, 3282);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, label, anchor);
    			append_hydration_dev(label, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, input, anchor);
    			set_input_value(input, /*key*/ ctx[5]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_4*/ ctx[19]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*key*/ 32 && input.value !== /*key*/ ctx[5]) {
    				set_input_value(input, /*key*/ ctx[5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(150:4) {#if edit == 5}",
    		ctx
    	});

    	return block;
    }

    // (172:4) {:else}
    function create_else_block$2(ctx) {
    	let button;
    	let label;
    	let t0;
    	let t1_value = (/*lesson*/ ctx[0].audioFeatures?.tempo.toFixed(0) || "Not set") + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			label = element("label");
    			t0 = text("Bpm:");
    			t1 = text(t1_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			label = claim_element(button_nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Bpm:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "tuning");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 173, 8, 3931);
    			attr_dev(button, "class", "naked-button svelte-1wil2zc");
    			add_location(button, file$3, 172, 6, 3865);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, button, anchor);
    			append_hydration_dev(button, label);
    			append_hydration_dev(label, t0);
    			append_hydration_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[22], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lesson*/ 1 && t1_value !== (t1_value = (/*lesson*/ ctx[0].audioFeatures?.tempo.toFixed(0) || "Not set") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(172:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (163:4) {#if edit == 6}
    function create_if_block$2(ctx) {
    	let label;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = text("Bpm:");
    			t1 = space();
    			input = element("input");
    			this.h();
    		},
    		l: function claim(nodes) {
    			label = claim_element(nodes, "LABEL", { for: true, class: true });
    			var label_nodes = children(label);
    			t0 = claim_text(label_nodes, "Bpm:");
    			label_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);

    			input = claim_element(nodes, "INPUT", {
    				id: true,
    				type: true,
    				class: true,
    				placeholder: true
    			});

    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label, "for", "bpm");
    			attr_dev(label, "class", "svelte-1wil2zc");
    			add_location(label, file$3, 163, 6, 3670);
    			attr_dev(input, "id", "bpm");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "text-input svelte-1wil2zc");
    			attr_dev(input, "placeholder", "Enter tempo");
    			add_location(input, file$3, 164, 6, 3706);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, label, anchor);
    			append_hydration_dev(label, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, input, anchor);
    			set_input_value(input, /*bpm*/ ctx[6]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_5*/ ctx[21]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*bpm*/ 64 && to_number(input.value) !== /*bpm*/ ctx[6]) {
    				set_input_value(input, /*bpm*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(163:4) {#if edit == 6}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
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
    	let t6;
    	let form2;
    	let t7;
    	let form3;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 1) return create_if_block_5$1;
    		return create_else_block_5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 2) return create_if_block_4$1;
    		return create_else_block_4;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	stopwatch = new Stopwatch({
    			props: { updateTime: /*updateTime*/ ctx[8] },
    			$$inline: true
    		});

    	function select_block_type_2(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 3) return create_if_block_3$2;
    		return create_else_block_3;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 4) return create_if_block_2$2;
    		return create_else_block_2;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block3 = current_block_type_3(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 5) return create_if_block_1$2;
    		return create_else_block_1$2;
    	}

    	let current_block_type_4 = select_block_type_4(ctx);
    	let if_block4 = current_block_type_4(ctx);

    	function select_block_type_5(ctx, dirty) {
    		if (/*edit*/ ctx[7] == 6) return create_if_block$2;
    		return create_else_block$2;
    	}

    	let current_block_type_5 = select_block_type_5(ctx);
    	let if_block5 = current_block_type_5(ctx);

    	const block = {
    		c: function create() {
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
    			t6 = space();
    			form2 = element("form");
    			if_block4.c();
    			t7 = space();
    			form3 = element("form");
    			if_block5.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			header = claim_element(nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			h1 = claim_element(header_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			if_block0.l(h1_nodes);
    			t0 = claim_space(h1_nodes);
    			span = claim_element(h1_nodes, "SPAN", {});
    			var span_nodes = children(span);
    			t1 = claim_text(span_nodes, "-");
    			span_nodes.forEach(detach_dev);
    			t2 = claim_space(h1_nodes);
    			if_block1.l(h1_nodes);
    			h1_nodes.forEach(detach_dev);
    			t3 = claim_space(header_nodes);
    			claim_component(stopwatch.$$.fragment, header_nodes);
    			t4 = claim_space(header_nodes);
    			form0 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form0_nodes = children(form0);
    			if_block2.l(form0_nodes);
    			form0_nodes.forEach(detach_dev);
    			t5 = claim_space(header_nodes);
    			form1 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form1_nodes = children(form1);
    			if_block3.l(form1_nodes);
    			form1_nodes.forEach(detach_dev);
    			t6 = claim_space(header_nodes);
    			form2 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form2_nodes = children(form2);
    			if_block4.l(form2_nodes);
    			form2_nodes.forEach(detach_dev);
    			t7 = claim_space(header_nodes);
    			form3 = claim_element(header_nodes, "FORM", { name: true, class: true });
    			var form3_nodes = children(form3);
    			if_block5.l(form3_nodes);
    			form3_nodes.forEach(detach_dev);
    			header_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(span, file$3, 100, 4, 1928);
    			attr_dev(h1, "class", "svelte-1wil2zc");
    			add_location(h1, file$3, 90, 2, 1663);
    			attr_dev(form0, "name", "capo");
    			attr_dev(form0, "class", "header-form svelte-1wil2zc");
    			add_location(form0, file$3, 114, 2, 2243);
    			attr_dev(form1, "name", "tuning");
    			attr_dev(form1, "class", "header-form svelte-1wil2zc");
    			add_location(form1, file$3, 132, 2, 2695);
    			attr_dev(form2, "name", "key");
    			attr_dev(form2, "class", "header-form svelte-1wil2zc");
    			add_location(form2, file$3, 148, 2, 3148);
    			attr_dev(form3, "name", "bpm");
    			attr_dev(form3, "class", "header-form svelte-1wil2zc");
    			add_location(form3, file$3, 161, 2, 3572);
    			attr_dev(header, "class", "svelte-1wil2zc");
    			add_location(header, file$3, 89, 0, 1652);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, header, anchor);
    			append_hydration_dev(header, h1);
    			if_block0.m(h1, null);
    			append_hydration_dev(h1, t0);
    			append_hydration_dev(h1, span);
    			append_hydration_dev(span, t1);
    			append_hydration_dev(h1, t2);
    			if_block1.m(h1, null);
    			append_hydration_dev(header, t3);
    			mount_component(stopwatch, header, null);
    			append_hydration_dev(header, t4);
    			append_hydration_dev(header, form0);
    			if_block2.m(form0, null);
    			append_hydration_dev(header, t5);
    			append_hydration_dev(header, form1);
    			if_block3.m(form1, null);
    			append_hydration_dev(header, t6);
    			append_hydration_dev(header, form2);
    			if_block4.m(form2, null);
    			append_hydration_dev(header, t7);
    			append_hydration_dev(header, form3);
    			if_block5.m(form3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(form0, "submit", prevent_default(/*update*/ ctx[9]), false, true, false),
    					listen_dev(form1, "submit", prevent_default(/*update*/ ctx[9]), false, true, false),
    					listen_dev(form2, "submit", prevent_default(/*update*/ ctx[9]), false, true, false),
    					listen_dev(form3, "submit", prevent_default(/*update*/ ctx[9]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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

    			if (current_block_type_4 === (current_block_type_4 = select_block_type_4(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type_4(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(form2, null);
    				}
    			}

    			if (current_block_type_5 === (current_block_type_5 = select_block_type_5(ctx)) && if_block5) {
    				if_block5.p(ctx, dirty);
    			} else {
    				if_block5.d(1);
    				if_block5 = current_block_type_5(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(form3, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stopwatch.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stopwatch.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if_block0.d();
    			if_block1.d();
    			destroy_component(stopwatch);
    			if_block2.d();
    			if_block3.d();
    			if_block4.d();
    			if_block5.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LessonHeader', slots, []);
    	let { lesson } = $$props;
    	let capo;
    	let tuning;
    	let title;
    	let artist;
    	let key;
    	let bpm;
    	let edit;

    	const keys = [
    		"C",
    		"C#/Db",
    		"D",
    		"D#/Eb",
    		"E",
    		"F",
    		"F#/Gb",
    		"G",
    		"G#/Ab",
    		"A",
    		"A#/Bb",
    		"B",
    		"C"
    	];

    	async function updateTime(seconds) {
    		if (!lesson.totalTime) {
    			$$invalidate(0, lesson.totalTime = 0, lesson);
    		}

    		$$invalidate(0, lesson.totalTime += seconds, lesson);
    		await updateLesson(lesson);
    	}

    	async function update({ target: { name } }) {
    		if (name == "key") {
    			if (!lesson.audioFeatures) {
    				$$invalidate(0, lesson.audioFeatures = {}, lesson);
    			}

    			const validKey = keys.findIndex(keyValue => keyValue == key.toUpperCase());
    			$$invalidate(0, lesson.audioFeatures.key = validKey !== -1 ? validKey : null, lesson);
    		} else if (name == "bpm") {
    			if (!lesson.audioFeatures) {
    				$$invalidate(0, lesson.audioFeatures = {}, lesson);
    			}

    			$$invalidate(0, lesson.audioFeatures.tempo = bpm, lesson);
    		} else {
    			$$invalidate(
    				0,
    				lesson[name] = name == "title"
    				? title
    				: name == "artist"
    					? artist
    					: name == "capo" ? capo : tuning,
    				lesson
    			);
    		}

    		await updateLesson(lesson);
    		$$invalidate(7, edit = null);
    	}

    	function translateKey(key) {
    		if (key === undefined || key === null) {
    			return "Not set";
    		}

    		return keys[key];
    	}

    	onMount(() => {
    		$$invalidate(1, capo = lesson.capo);
    		$$invalidate(2, tuning = lesson.tuning);
    		$$invalidate(3, title = lesson.title);
    		$$invalidate(4, artist = lesson.artist);
    		$$invalidate(5, key = lesson.audioFeatures?.key);
    		$$invalidate(6, bpm = lesson.audioFeatures?.tempo);
    	});

    	const writable_props = ['lesson'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LessonHeader> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		title = this.value;
    		$$invalidate(3, title);
    	}

    	const click_handler = () => $$invalidate(7, edit = 1);

    	function input_input_handler_1() {
    		artist = this.value;
    		$$invalidate(4, artist);
    	}

    	const click_handler_1 = () => $$invalidate(7, edit = 2);

    	function input_input_handler_2() {
    		capo = to_number(this.value);
    		$$invalidate(1, capo);
    	}

    	const click_handler_2 = () => $$invalidate(7, edit = 3);

    	function input_input_handler_3() {
    		tuning = this.value;
    		$$invalidate(2, tuning);
    	}

    	const click_handler_3 = () => $$invalidate(7, edit = 4);

    	function input_input_handler_4() {
    		key = this.value;
    		$$invalidate(5, key);
    	}

    	const click_handler_4 = () => $$invalidate(7, edit = 5);

    	function input_input_handler_5() {
    		bpm = to_number(this.value);
    		$$invalidate(6, bpm);
    	}

    	const click_handler_5 = () => $$invalidate(7, edit = 6);

    	$$self.$$set = $$props => {
    		if ('lesson' in $$props) $$invalidate(0, lesson = $$props.lesson);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Stopwatch,
    		updateLesson,
    		lesson,
    		capo,
    		tuning,
    		title,
    		artist,
    		key,
    		bpm,
    		edit,
    		keys,
    		updateTime,
    		update,
    		translateKey
    	});

    	$$self.$inject_state = $$props => {
    		if ('lesson' in $$props) $$invalidate(0, lesson = $$props.lesson);
    		if ('capo' in $$props) $$invalidate(1, capo = $$props.capo);
    		if ('tuning' in $$props) $$invalidate(2, tuning = $$props.tuning);
    		if ('title' in $$props) $$invalidate(3, title = $$props.title);
    		if ('artist' in $$props) $$invalidate(4, artist = $$props.artist);
    		if ('key' in $$props) $$invalidate(5, key = $$props.key);
    		if ('bpm' in $$props) $$invalidate(6, bpm = $$props.bpm);
    		if ('edit' in $$props) $$invalidate(7, edit = $$props.edit);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		lesson,
    		capo,
    		tuning,
    		title,
    		artist,
    		key,
    		bpm,
    		edit,
    		updateTime,
    		update,
    		translateKey,
    		input_input_handler,
    		click_handler,
    		input_input_handler_1,
    		click_handler_1,
    		input_input_handler_2,
    		click_handler_2,
    		input_input_handler_3,
    		click_handler_3,
    		input_input_handler_4,
    		click_handler_4,
    		input_input_handler_5,
    		click_handler_5
    	];
    }

    class LessonHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { lesson: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LessonHeader",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*lesson*/ ctx[0] === undefined && !('lesson' in props)) {
    			console.warn("<LessonHeader> was created without expected prop 'lesson'");
    		}
    	}

    	get lesson() {
    		throw new Error("<LessonHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lesson(value) {
    		throw new Error("<LessonHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Lesson/index.svelte generated by Svelte v3.43.2 */

    const { console: console_1 } = globals;
    const file$2 = "src/Lesson/index.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	return child_ctx;
    }

    // (328:2) {:else}
    function create_else_block_1$1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Sorry, could not load lesson");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			t = claim_text(div_nodes, "Sorry, could not load lesson");
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(div, file$2, 328, 4, 8246);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(328:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (192:2) {#if lesson}
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

    	lessonheader = new LessonHeader({
    			props: { lesson: /*lesson*/ ctx[2] },
    			$$inline: true
    		});

    	let if_block0 = /*lesson*/ ctx[2].videos?.length > 0 && create_if_block_6(ctx);
    	let if_block1 = /*lesson*/ ctx[2].tab && create_if_block_5(ctx);
    	let if_block2 = /*addVideos*/ ctx[1] && create_if_block_4(ctx);
    	let if_block3 = /*lesson*/ ctx[2].chords?.length > 0 && create_if_block_3$1(ctx);
    	let each_value_1 = [...Array(6)];
    	validate_each_argument(each_value_1);
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

    	const block = {
    		c: function create() {
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
    		l: function claim(nodes) {
    			claim_component(lessonheader.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			div0 = claim_element(nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			form0 = claim_element(div0_nodes, "FORM", { class: true });
    			var form0_nodes = children(form0);
    			input0 = claim_element(form0_nodes, "INPUT", { placeholder: true });
    			form0_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);
    			form1 = claim_element(div0_nodes, "FORM", { class: true });
    			var form1_nodes = children(form1);
    			input1 = claim_element(form1_nodes, "INPUT", { placeholder: true });
    			form1_nodes.forEach(detach_dev);
    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			t3 = claim_space(div0_nodes);
    			if (if_block1) if_block1.l(div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			t4 = claim_space(nodes);
    			if (if_block2) if_block2.l(nodes);
    			t5 = claim_space(nodes);
    			h20 = claim_element(nodes, "H2", { class: true });
    			var h20_nodes = children(h20);
    			t6 = claim_text(h20_nodes, "Chords");
    			h20_nodes.forEach(detach_dev);
    			t7 = claim_space(nodes);
    			form2 = claim_element(nodes, "FORM", { class: true });
    			var form2_nodes = children(form2);
    			input2 = claim_element(form2_nodes, "INPUT", { placeholder: true });
    			form2_nodes.forEach(detach_dev);
    			t8 = claim_space(nodes);
    			if (if_block3) if_block3.l(nodes);
    			t9 = claim_space(nodes);
    			h21 = claim_element(nodes, "H2", { class: true });
    			var h21_nodes = children(h21);
    			t10 = claim_text(h21_nodes, "Strumming Pattern");
    			h21_nodes.forEach(detach_dev);
    			t11 = claim_space(nodes);
    			div1 = claim_element(nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div1_nodes);
    			}

    			t12 = claim_space(div1_nodes);
    			if (if_block4) if_block4.l(div1_nodes);
    			div1_nodes.forEach(detach_dev);
    			t13 = claim_space(nodes);
    			div2 = claim_element(nodes, "DIV", {});
    			var div2_nodes = children(div2);
    			t14 = claim_text(div2_nodes, "Drag and Drop the Arrows to create a Strumming Pattern");
    			div2_nodes.forEach(detach_dev);
    			t15 = claim_space(nodes);
    			div3 = claim_element(nodes, "DIV", {});
    			var div3_nodes = children(div3);
    			img0 = claim_element(div3_nodes, "IMG", { alt: true, class: true, src: true });
    			t16 = claim_space(div3_nodes);
    			img1 = claim_element(div3_nodes, "IMG", { class: true, alt: true, src: true });
    			div3_nodes.forEach(detach_dev);
    			t17 = claim_space(nodes);
    			label = claim_element(nodes, "LABEL", { for: true });
    			var label_nodes = children(label);
    			t18 = claim_text(label_nodes, "Notes about the Song");
    			label_nodes.forEach(detach_dev);
    			t19 = claim_space(nodes);
    			textarea = claim_element(nodes, "TEXTAREA", { id: true, rows: true, placeholder: true });
    			children(textarea).forEach(detach_dev);
    			t20 = claim_space(nodes);
    			button = claim_element(nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			if_block5.l(button_nodes);
    			button_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(input0, "placeholder", "Search for another Video");
    			add_location(input0, file$2, 196, 8, 4555);
    			attr_dev(form0, "class", "svelte-14qmrxj");
    			add_location(form0, file$2, 195, 6, 4504);
    			attr_dev(input1, "placeholder", "Update Guitar Tab");
    			add_location(input1, file$2, 204, 8, 4765);
    			attr_dev(form1, "class", "svelte-14qmrxj");
    			add_location(form1, file$2, 203, 6, 4713);
    			attr_dev(div0, "class", "media-wrapper svelte-14qmrxj");
    			add_location(div0, file$2, 194, 4, 4470);
    			attr_dev(h20, "class", "svelte-14qmrxj");
    			add_location(h20, file$2, 247, 4, 6016);
    			attr_dev(input2, "placeholder", "Am");
    			add_location(input2, file$2, 250, 6, 6086);
    			attr_dev(form2, "class", "svelte-14qmrxj");
    			add_location(form2, file$2, 249, 4, 6037);
    			attr_dev(h21, "class", "svelte-14qmrxj");
    			add_location(h21, file$2, 272, 4, 6785);
    			attr_dev(div1, "class", "strumming svelte-14qmrxj");
    			add_location(div1, file$2, 273, 4, 6816);
    			add_location(div2, file$2, 299, 4, 7439);
    			attr_dev(img0, "alt", "Arrow down");
    			attr_dev(img0, "class", "arrow-down");
    			if (!src_url_equal(img0.src, img0_src_value = ARROW_SRC)) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$2, 301, 6, 7521);
    			attr_dev(img1, "class", "arrow-up svelte-14qmrxj");
    			attr_dev(img1, "alt", "Arrow down");
    			if (!src_url_equal(img1.src, img1_src_value = ARROW_SRC)) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$2, 307, 6, 7689);
    			add_location(div3, file$2, 300, 4, 7509);
    			attr_dev(label, "for", "notes");
    			add_location(label, file$2, 315, 4, 7863);
    			attr_dev(textarea, "id", "notes");
    			attr_dev(textarea, "rows", 5);
    			attr_dev(textarea, "placeholder", "Your notes for the song");
    			add_location(textarea, file$2, 316, 4, 7915);
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*lesson*/ ctx[2].finished ? "re-open" : "") + " svelte-14qmrxj"));
    			add_location(button, file$2, 324, 4, 8086);
    		},
    		m: function mount(target, anchor) {
    			mount_component(lessonheader, target, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, div0, anchor);
    			append_hydration_dev(div0, form0);
    			append_hydration_dev(form0, input0);
    			set_input_value(input0, /*videoSearch*/ ctx[0]);
    			append_hydration_dev(div0, t1);
    			append_hydration_dev(div0, form1);
    			append_hydration_dev(form1, input1);
    			set_input_value(input1, /*tab*/ ctx[6]);
    			append_hydration_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_hydration_dev(div0, t3);
    			if (if_block1) if_block1.m(div0, null);
    			insert_hydration_dev(target, t4, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_hydration_dev(target, t5, anchor);
    			insert_hydration_dev(target, h20, anchor);
    			append_hydration_dev(h20, t6);
    			insert_hydration_dev(target, t7, anchor);
    			insert_hydration_dev(target, form2, anchor);
    			append_hydration_dev(form2, input2);
    			set_input_value(input2, /*selectedChord*/ ctx[4]);
    			insert_hydration_dev(target, t8, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_hydration_dev(target, t9, anchor);
    			insert_hydration_dev(target, h21, anchor);
    			append_hydration_dev(h21, t10);
    			insert_hydration_dev(target, t11, anchor);
    			insert_hydration_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_hydration_dev(div1, t12);
    			if (if_block4) if_block4.m(div1, null);
    			insert_hydration_dev(target, t13, anchor);
    			insert_hydration_dev(target, div2, anchor);
    			append_hydration_dev(div2, t14);
    			insert_hydration_dev(target, t15, anchor);
    			insert_hydration_dev(target, div3, anchor);
    			append_hydration_dev(div3, img0);
    			append_hydration_dev(div3, t16);
    			append_hydration_dev(div3, img1);
    			insert_hydration_dev(target, t17, anchor);
    			insert_hydration_dev(target, label, anchor);
    			append_hydration_dev(label, t18);
    			insert_hydration_dev(target, t19, anchor);
    			insert_hydration_dev(target, textarea, anchor);
    			set_input_value(textarea, /*notes*/ ctx[5]);
    			insert_hydration_dev(target, t20, anchor);
    			insert_hydration_dev(target, button, anchor);
    			if_block5.m(button, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*searchYoutube*/ ctx[13], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[20]),
    					listen_dev(form0, "submit", prevent_default(submit_handler), false, true, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[21]),
    					listen_dev(form1, "submit", prevent_default(/*updateTab*/ ctx[14]), false, true, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[25]),
    					listen_dev(form2, "submit", prevent_default(/*addChord*/ ctx[7]), false, true, false),
    					listen_dev(div1, "dragover", prevent_default(/*dragover_handler_1*/ ctx[19]), false, true, false),
    					listen_dev(div1, "drop", prevent_default(/*handleDrop*/ ctx[10]), false, true, false),
    					listen_dev(img0, "dragstart", dragstart_handler_1, false, false, false),
    					listen_dev(img1, "dragstart", dragstart_handler_2, false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[28]),
    					listen_dev(textarea, "change", /*change_handler*/ ctx[29], false, false, false),
    					listen_dev(button, "click", /*finish*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(lessonheader.$$.fragment, local);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(lessonheader.$$.fragment, local);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(lessonheader, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach_dev(t4);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(form2);
    			if (detaching) detach_dev(t8);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (if_block4) if_block4.d();
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(button);
    			if_block5.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(192:2) {#if lesson}",
    		ctx
    	});

    	return block;
    }

    // (208:6) {#if lesson.videos?.length > 0}
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

    	const block = {
    		c: function create() {
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
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			button0 = claim_element(div_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			i0 = claim_element(button0_nodes, "I", { class: true });
    			children(i0).forEach(detach_dev);
    			button0_nodes.forEach(detach_dev);
    			t0 = claim_space(div_nodes);
    			iframe = claim_element(div_nodes, "IFRAME", { title: true, class: true, src: true });
    			children(iframe).forEach(detach_dev);
    			t1 = claim_space(div_nodes);
    			button1 = claim_element(div_nodes, "BUTTON", { class: true });
    			var button1_nodes = children(button1);
    			i1 = claim_element(button1_nodes, "I", { class: true });
    			children(i1).forEach(detach_dev);
    			button1_nodes.forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i0, "class", "fa fa-caret-left");
    			add_location(i0, file$2, 210, 12, 4999);
    			attr_dev(button0, "class", "naked-button svelte-14qmrxj");
    			add_location(button0, file$2, 209, 10, 4924);
    			attr_dev(iframe, "title", iframe_title_value = `Lesson video of ${/*tab*/ ctx[6].title}`);
    			iframe.allowFullscreen = true;
    			attr_dev(iframe, "class", "video svelte-14qmrxj");
    			if (!src_url_equal(iframe.src, iframe_src_value = `https://www.youtube.com/embed/${/*lesson*/ ctx[2].videos[/*showVideo*/ ctx[3]]}`)) attr_dev(iframe, "src", iframe_src_value);
    			add_location(iframe, file$2, 212, 10, 5060);
    			attr_dev(i1, "class", "fa fa-caret-right");
    			add_location(i1, file$2, 219, 12, 5348);
    			attr_dev(button1, "class", "naked-button svelte-14qmrxj");
    			add_location(button1, file$2, 218, 10, 5274);
    			attr_dev(div, "class", "iframe-wrapper svelte-14qmrxj");
    			add_location(div, file$2, 208, 8, 4885);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, button0);
    			append_hydration_dev(button0, i0);
    			append_hydration_dev(div, t0);
    			append_hydration_dev(div, iframe);
    			append_hydration_dev(div, t1);
    			append_hydration_dev(div, button1);
    			append_hydration_dev(button1, i1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[22], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[23], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tab*/ 64 && iframe_title_value !== (iframe_title_value = `Lesson video of ${/*tab*/ ctx[6].title}`)) {
    				attr_dev(iframe, "title", iframe_title_value);
    			}

    			if (dirty[0] & /*lesson, showVideo*/ 12 && !src_url_equal(iframe.src, iframe_src_value = `https://www.youtube.com/embed/${/*lesson*/ ctx[2].videos[/*showVideo*/ ctx[3]]}`)) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(208:6) {#if lesson.videos?.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (225:6) {#if lesson.tab}
    function create_if_block_5(ctx) {
    	let iframe;
    	let iframe_src_value;

    	const block = {
    		c: function create() {
    			iframe = element("iframe");
    			this.h();
    		},
    		l: function claim(nodes) {
    			iframe = claim_element(nodes, "IFRAME", {
    				allow: true,
    				referrerpolicy: true,
    				loading: true,
    				height: true,
    				width: true,
    				title: true,
    				src: true
    			});

    			children(iframe).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(iframe, "allow", "fullscreen");
    			attr_dev(iframe, "referrerpolicy", "no-referrer");
    			attr_dev(iframe, "loading", "lazy");
    			attr_dev(iframe, "height", "100%");
    			attr_dev(iframe, "width", "100%");
    			attr_dev(iframe, "title", "Hopefully some lyrics");
    			if (!src_url_equal(iframe.src, iframe_src_value = /*lesson*/ ctx[2].tab || "https://www.guitaretab.com")) attr_dev(iframe, "src", iframe_src_value);
    			add_location(iframe, file$2, 225, 8, 5459);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, iframe, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lesson*/ 4 && !src_url_equal(iframe.src, iframe_src_value = /*lesson*/ ctx[2].tab || "https://www.guitaretab.com")) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(225:6) {#if lesson.tab}",
    		ctx
    	});

    	return block;
    }

    // (238:4) {#if addVideos}
    function create_if_block_4(ctx) {
    	let ul;
    	let current;
    	let each_value_3 = /*addVideos*/ ctx[1];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(ul, "class", "video-container svelte-14qmrxj");
    			add_location(ul, file$2, 238, 6, 5767);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*addVideo, addVideos*/ 32770) {
    				each_value_3 = /*addVideos*/ ctx[1];
    				validate_each_argument(each_value_3);
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
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(238:4) {#if addVideos}",
    		ctx
    	});

    	return block;
    }

    // (240:8) {#each addVideos as video}
    function create_each_block_3(ctx) {
    	let li;
    	let videosnippet;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	videosnippet = new VideoSnippet({
    			props: { snippet: /*video*/ ctx[38].snippet },
    			$$inline: true
    		});

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[24](/*video*/ ctx[38]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(videosnippet.$$.fragment);
    			t = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			li = claim_element(nodes, "LI", { role: true, class: true });
    			var li_nodes = children(li);
    			claim_component(videosnippet.$$.fragment, li_nodes);
    			t = claim_space(li_nodes);
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(li, "role", "button");
    			attr_dev(li, "class", "svelte-14qmrxj");
    			add_location(li, file$2, 240, 10, 5841);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			mount_component(videosnippet, li, null);
    			append_hydration_dev(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const videosnippet_changes = {};
    			if (dirty[0] & /*addVideos*/ 2) videosnippet_changes.snippet = /*video*/ ctx[38].snippet;
    			videosnippet.$set(videosnippet_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(videosnippet.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(videosnippet.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(videosnippet);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(240:8) {#each addVideos as video}",
    		ctx
    	});

    	return block;
    }

    // (254:4) {#if lesson.chords?.length > 0}
    function create_if_block_3$1(ctx) {
    	let div;
    	let each_value_2 = /*lesson*/ ctx[2].chords;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div_nodes);
    			}

    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "chord-wrapper svelte-14qmrxj");
    			add_location(div, file$2, 254, 6, 6195);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lesson, deleteChord*/ 260) {
    				each_value_2 = /*lesson*/ ctx[2].chords;
    				validate_each_argument(each_value_2);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(254:4) {#if lesson.chords?.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (256:8) {#each lesson.chords as chord, i}
    function create_each_block_2(ctx) {
    	let div1;
    	let button;
    	let i_1;
    	let t0;
    	let div0;
    	let t1_value = /*chord*/ ctx[36] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[26](/*i*/ ctx[33]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button = element("button");
    			i_1 = element("i");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div1 = claim_element(nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			button = claim_element(div1_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			i_1 = claim_element(button_nodes, "I", { class: true });
    			children(i_1).forEach(detach_dev);
    			button_nodes.forEach(detach_dev);
    			t0 = claim_space(div1_nodes);
    			div0 = claim_element(div1_nodes, "DIV", { id: true, class: true });
    			var div0_nodes = children(div0);
    			t1 = claim_text(div0_nodes, t1_value);
    			div0_nodes.forEach(detach_dev);
    			t2 = claim_space(div1_nodes);
    			div1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i_1, "class", "fa fa-times");
    			add_location(i_1, file$2, 258, 14, 6390);
    			attr_dev(button, "class", "naked-button svelte-14qmrxj");
    			add_location(button, file$2, 257, 12, 6314);
    			attr_dev(div0, "id", `chord-${/*i*/ ctx[33]}`);
    			attr_dev(div0, "class", "svelte-14qmrxj");
    			add_location(div0, file$2, 260, 12, 6450);
    			attr_dev(div1, "class", "chord-holder svelte-14qmrxj");
    			add_location(div1, file$2, 256, 10, 6275);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div1, anchor);
    			append_hydration_dev(div1, button);
    			append_hydration_dev(button, i_1);
    			append_hydration_dev(div1, t0);
    			append_hydration_dev(div1, div0);
    			append_hydration_dev(div0, t1);
    			append_hydration_dev(div1, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*lesson*/ 4 && t1_value !== (t1_value = /*chord*/ ctx[36] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(256:8) {#each lesson.chords as chord, i}",
    		ctx
    	});

    	return block;
    }

    // (279:6) {#each [...Array(6)] as i}
    function create_each_block_1(ctx) {
    	let hr;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			this.h();
    		},
    		l: function claim(nodes) {
    			hr = claim_element(nodes, "HR", {});
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(hr, file$2, 279, 8, 6967);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, hr, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(279:6) {#each [...Array(6)] as i}",
    		ctx
    	});

    	return block;
    }

    // (283:6) {#if lesson?.strumming}
    function create_if_block_2$1(ctx) {
    	let ul;
    	let each_value = /*lesson*/ ctx[2].strumming;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(ul, "class", "svelte-14qmrxj");
    			add_location(ul, file$2, 283, 8, 7027);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lesson*/ 4) {
    				each_value = /*lesson*/ ctx[2].strumming;
    				validate_each_argument(each_value);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(283:6) {#if lesson?.strumming}",
    		ctx
    	});

    	return block;
    }

    // (285:10) {#each lesson.strumming as strum, i}
    function create_each_block$2(ctx) {
    	let li;
    	let img;
    	let img_class_value;
    	let img_src_value;
    	let t;
    	let mounted;
    	let dispose;

    	function dragstart_handler(...args) {
    		return /*dragstart_handler*/ ctx[27](/*i*/ ctx[33], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			img = element("img");
    			t = space();
    			this.h();
    		},
    		l: function claim(nodes) {
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
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(img, "alt", "Arrow");
    			attr_dev(img, "width", 60);
    			attr_dev(img, "height", 80);
    			attr_dev(img, "class", img_class_value = "" + (null_to_empty(`arrow-${/*strum*/ ctx[31]}`) + " svelte-14qmrxj"));
    			if (!src_url_equal(img.src, img_src_value = ARROW_SRC)) attr_dev(img, "src", img_src_value);
    			add_location(img, file$2, 286, 14, 7110);
    			add_location(li, file$2, 285, 12, 7091);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			append_hydration_dev(li, img);
    			append_hydration_dev(li, t);

    			if (!mounted) {
    				dispose = listen_dev(img, "dragstart", dragstart_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*lesson*/ 4 && img_class_value !== (img_class_value = "" + (null_to_empty(`arrow-${/*strum*/ ctx[31]}`) + " svelte-14qmrxj"))) {
    				attr_dev(img, "class", img_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(285:10) {#each lesson.strumming as strum, i}",
    		ctx
    	});

    	return block;
    }

    // (326:38) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Finish Lesson");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Finish Lesson");
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(326:38) {:else}",
    		ctx
    	});

    	return block;
    }

    // (326:6) {#if lesson.finished}
    function create_if_block_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Open Lesson");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Open Lesson");
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(326:6) {#if lesson.finished}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
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

    	const block = {
    		c: function create() {
    			section = element("section");
    			if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			section = claim_element(nodes, "SECTION", { class: true });
    			var section_nodes = children(section);
    			if_block.l(section_nodes);
    			section_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(section, "class", "svelte-14qmrxj");
    			add_location(section, file$2, 190, 0, 4346);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, section, anchor);
    			if_blocks[current_block_type_index].m(section, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(section, "dragover", prevent_default(/*dragover_handler*/ ctx[18]), false, true, false),
    					listen_dev(section, "drop", prevent_default(/*removeStrum*/ ctx[11]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const submit_handler = () => {
    	
    };

    const dragstart_handler_1 = e => e.dataTransfer.setData("direction", "down");
    const dragstart_handler_2 = e => e.dataTransfer.setData("direction", "up");

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Lesson', slots, []);
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

    	// async function addTab() {
    	//   lesson.coordinates = [
    	//     ...lesson.coordinates,
    	//     [...new Array(6).keys()].reduce((acc, cV) => {
    	//       acc[cV] = {};
    	//       return acc;
    	//     }, {}),
    	//   ];
    	//   await updateLesson(lesson);
    	// }
    	// async function deleteTab(position) {
    	//   lesson.coordinates = [
    	//     ...lesson.coordinates.slice(0, position),
    	//     ...lesson.coordinates.slice(position + 1),
    	//   ];
    	//   await updateLesson(lesson);
    	// }
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

    	const writable_props = ['id'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Lesson> was created with unknown prop '${key}'`);
    	});

    	function dragover_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function dragover_handler_1(event) {
    		bubble.call(this, $$self, event);
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
    		if ('id' in $$props) $$invalidate(17, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		apiCall,
    		LESSONS,
    		ARROW_SRC,
    		updateLesson,
    		VideoSnippet,
    		LessonHeader,
    		id,
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
    		renderChords
    	});

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate(17, id = $$props.id);
    		if ('videoSearch' in $$props) $$invalidate(0, videoSearch = $$props.videoSearch);
    		if ('addVideos' in $$props) $$invalidate(1, addVideos = $$props.addVideos);
    		if ('lesson' in $$props) $$invalidate(2, lesson = $$props.lesson);
    		if ('showVideo' in $$props) $$invalidate(3, showVideo = $$props.showVideo);
    		if ('selectedChord' in $$props) $$invalidate(4, selectedChord = $$props.selectedChord);
    		if ('notes' in $$props) $$invalidate(5, notes = $$props.notes);
    		if ('tab' in $$props) $$invalidate(6, tab = $$props.tab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Lesson extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { id: 17 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lesson",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[17] === undefined && !('id' in props)) {
    			console_1.warn("<Lesson> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Lesson>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Lesson>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/NavItems.svelte generated by Svelte v3.43.2 */

    const file$1 = "src/components/NavItems.svelte";

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

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			li = claim_element(nodes, "LI", {});
    			var li_nodes = children(li);
    			button = claim_element(li_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			i = claim_element(button_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			t0 = claim_space(button_nodes);
    			t1 = claim_text(button_nodes, t1_value);
    			button_nodes.forEach(detach_dev);
    			t2 = claim_space(li_nodes);
    			li_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "class", "" + (null_to_empty(`fa fa-${/*icon*/ ctx[7]}`) + " svelte-1hf3aby"));
    			add_location(i, file$1, 44, 8, 898);
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(`${/*header*/ ctx[0] ? '' : 'fancy-link'} ${/*close*/ ctx[1] ? 'modal-nav' : ''}`) + " svelte-1hf3aby"));
    			add_location(button, file$1, 36, 6, 686);
    			add_location(li, file$1, 35, 4, 675);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, li, anchor);
    			append_hydration_dev(li, button);
    			append_hydration_dev(button, i);
    			append_hydration_dev(button, t0);
    			append_hydration_dev(button, t1);
    			append_hydration_dev(li, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*header, close*/ 3 && button_class_value !== (button_class_value = "" + (null_to_empty(`${/*header*/ ctx[0] ? '' : 'fancy-link'} ${/*close*/ ctx[1] ? 'modal-nav' : ''}`) + " svelte-1hf3aby"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(35:2) {#each links as { name, path, icon }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let ul;
    	let ul_class_value;
    	let each_value = /*links*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			ul = claim_element(nodes, "UL", { class: true });
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(ul, "class", ul_class_value = "" + (null_to_empty(/*header*/ ctx[0] ? 'header' : '') + " svelte-1hf3aby"));
    			add_location(ul, file$1, 33, 0, 595);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*header, close, navigate, links*/ 15) {
    				each_value = /*links*/ ctx[3];
    				validate_each_argument(each_value);
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

    			if (dirty & /*header*/ 1 && ul_class_value !== (ul_class_value = "" + (null_to_empty(/*header*/ ctx[0] ? 'header' : '') + " svelte-1hf3aby"))) {
    				attr_dev(ul, "class", ul_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NavItems', slots, []);
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

    	const writable_props = ['header', 'close', 'navigate'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NavItems> was created with unknown prop '${key}'`);
    	});

    	const click_handler = path => {
    		navigate(path);

    		if (close) {
    			close();
    		}
    	};

    	$$self.$$set = $$props => {
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    		if ('close' in $$props) $$invalidate(1, close = $$props.close);
    		if ('navigate' in $$props) $$invalidate(2, navigate = $$props.navigate);
    	};

    	$$self.$capture_state = () => ({ header, close, navigate, links });

    	$$self.$inject_state = $$props => {
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    		if ('close' in $$props) $$invalidate(1, close = $$props.close);
    		if ('navigate' in $$props) $$invalidate(2, navigate = $$props.navigate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [header, close, navigate, links, click_handler];
    }

    class NavItems extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { header: 0, close: 1, navigate: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavItems",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*navigate*/ ctx[2] === undefined && !('navigate' in props)) {
    			console.warn("<NavItems> was created without expected prop 'navigate'");
    		}
    	}

    	get header() {
    		throw new Error("<NavItems>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set header(value) {
    		throw new Error("<NavItems>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get close() {
    		throw new Error("<NavItems>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<NavItems>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get navigate() {
    		throw new Error("<NavItems>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navigate(value) {
    		throw new Error("<NavItems>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.43.2 */
    const file = "src/App.svelte";

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

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t = text("Rad Guitar Practice Tool");
    			this.h();
    		},
    		l: function claim(nodes) {
    			h2 = claim_element(nodes, "H2", { class: true });
    			var h2_nodes = children(h2);
    			t = claim_text(h2_nodes, "Rad Guitar Practice Tool");
    			h2_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h2, "class", "svelte-zpyaps");
    			add_location(h2, file, 40, 8, 1163);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, h2, anchor);
    			append_hydration_dev(h2, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(40:6) {#if windowSize > 830}",
    		ctx
    	});

    	return block;
    }

    // (46:4) {:else}
    function create_else_block_1(ctx) {
    	let navigation;
    	let current;

    	navigation = new Navigation({
    			props: {
    				show: /*showNav*/ ctx[0],
    				toggle: /*func*/ ctx[8]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navigation.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(navigation.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navigation, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const navigation_changes = {};
    			if (dirty & /*showNav*/ 1) navigation_changes.show = /*showNav*/ ctx[0];
    			if (dirty & /*showNav*/ 1) navigation_changes.toggle = /*func*/ ctx[8];
    			navigation.$set(navigation_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navigation.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navigation.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navigation, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(46:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (44:4) {#if windowSize > 750}
    function create_if_block_2(ctx) {
    	let navitems;
    	let current;

    	navitems = new NavItems({
    			props: {
    				navigate: /*navigate*/ ctx[5],
    				header: true
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navitems.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(navitems.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navitems, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navitems.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navitems.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navitems, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(44:4) {#if windowSize > 750}",
    		ctx
    	});

    	return block;
    }

    // (56:4) {:else}
    function create_else_block(ctx) {
    	let lessons;
    	let current;

    	lessons = new Lessons({
    			props: { navigate: /*navigate*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(lessons.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(lessons.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(lessons, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(lessons.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(lessons.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(lessons, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(56:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (54:36) 
    function create_if_block_1(ctx) {
    	let newlesson;
    	let current;

    	newlesson = new NewLesson({
    			props: { navigate: /*navigate*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(newlesson.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(newlesson.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(newlesson, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(newlesson.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(newlesson.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(newlesson, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(54:36) ",
    		ctx
    	});

    	return block;
    }

    // (52:4) {#if currentRoute == "lesson"}
    function create_if_block(ctx) {
    	let lesson;
    	let current;

    	lesson = new Lesson({
    			props: { id: /*lessonID*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(lesson.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(lesson.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(lesson, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const lesson_changes = {};
    			if (dirty & /*lessonID*/ 8) lesson_changes.id = /*lessonID*/ ctx[3];
    			lesson.$set(lesson_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(lesson.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(lesson.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(lesson, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(52:4) {#if currentRoute == \\\"lesson\\\"}",
    		ctx
    	});

    	return block;
    }

    // (72:6) {#each socialIcons as { link, symbol }}
    function create_each_block(ctx) {
    	let a;
    	let i;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			i = element("i");
    			t = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", {
    				target: true,
    				href: true,
    				key: true,
    				class: true
    			});

    			var a_nodes = children(a);
    			i = claim_element(a_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			t = claim_space(a_nodes);
    			a_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "class", "" + (null_to_empty(`fab fa-${/*symbol*/ ctx[11]}`) + " svelte-zpyaps"));
    			add_location(i, file, 73, 10, 1974);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*link*/ ctx[10]);
    			attr_dev(a, "key", /*symbol*/ ctx[11]);
    			attr_dev(a, "class", "svelte-zpyaps");
    			add_location(a, file, 72, 8, 1919);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, a, anchor);
    			append_hydration_dev(a, i);
    			append_hydration_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(72:6) {#each socialIcons as { link, symbol }}",
    		ctx
    	});

    	return block;
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
    	let if_block0 = /*windowSize*/ ctx[1] > 830 && create_if_block_3(ctx);
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
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	navitems = new NavItems({
    			props: {
    				close: /*func_1*/ ctx[9],
    				navigate: /*navigate*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
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
    		l: function claim(nodes) {
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			header = claim_element(div2_nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			div0 = claim_element(header_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			i = claim_element(div0_nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			t0 = claim_space(div0_nodes);
    			h1 = claim_element(div0_nodes, "H1", { role: true, class: true });
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, "raguprato");
    			h1_nodes.forEach(detach_dev);
    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			t3 = claim_space(header_nodes);
    			if_block1.l(header_nodes);
    			header_nodes.forEach(detach_dev);
    			t4 = claim_space(div2_nodes);
    			main = claim_element(div2_nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			if_block2.l(main_nodes);
    			main_nodes.forEach(detach_dev);
    			t5 = claim_space(div2_nodes);
    			footer = claim_element(div2_nodes, "FOOTER", { class: true });
    			var footer_nodes = children(footer);
    			div1 = claim_element(footer_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			span = claim_element(div1_nodes, "SPAN", {});
    			var span_nodes = children(span);
    			t6 = claim_text(span_nodes, "Created by\n        ");
    			a0 = claim_element(span_nodes, "A", { class: true, href: true });
    			var a0_nodes = children(a0);
    			t7 = claim_text(a0_nodes, "Gh05d");
    			a0_nodes.forEach(detach_dev);
    			span_nodes.forEach(detach_dev);
    			t8 = claim_space(div1_nodes);
    			a1 = claim_element(div1_nodes, "A", { href: true, class: true });
    			var a1_nodes = children(a1);
    			t9 = claim_text(a1_nodes, "Down Arrow icon by Icons8");
    			a1_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			t10 = claim_space(footer_nodes);
    			ul = claim_element(footer_nodes, "UL", {});
    			var ul_nodes = children(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(ul_nodes);
    			}

    			ul_nodes.forEach(detach_dev);
    			footer_nodes.forEach(detach_dev);
    			t11 = claim_space(div2_nodes);
    			nav = claim_element(div2_nodes, "NAV", { class: true });
    			var nav_nodes = children(nav);
    			claim_component(navitems.$$.fragment, nav_nodes);
    			nav_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "class", "fa fa-guitar svelte-zpyaps");
    			add_location(i, file, 37, 6, 1029);
    			attr_dev(h1, "role", "button");
    			attr_dev(h1, "class", "svelte-zpyaps");
    			add_location(h1, file, 38, 6, 1062);
    			attr_dev(div0, "class", "slogan svelte-zpyaps");
    			add_location(div0, file, 36, 4, 1002);
    			attr_dev(header, "class", "svelte-zpyaps");
    			add_location(header, file, 35, 2, 989);
    			attr_dev(main, "class", "svelte-zpyaps");
    			add_location(main, file, 50, 2, 1400);
    			attr_dev(a0, "class", "fancy-link svelte-zpyaps");
    			attr_dev(a0, "href", "https://github.com/Gh05d");
    			add_location(a0, file, 64, 8, 1664);
    			add_location(span, file, 62, 6, 1630);
    			attr_dev(a1, "href", "https://icons8.com/icon/45289/down-arrow");
    			attr_dev(a1, "class", "svelte-zpyaps");
    			add_location(a1, file, 66, 6, 1748);
    			attr_dev(div1, "class", "svelte-zpyaps");
    			add_location(div1, file, 61, 4, 1618);
    			add_location(ul, file, 70, 4, 1860);
    			attr_dev(footer, "class", "svelte-zpyaps");
    			add_location(footer, file, 60, 2, 1605);
    			attr_dev(nav, "class", nav_class_value = "" + (null_to_empty(/*showNav*/ ctx[0] ? "show" : "") + " svelte-zpyaps"));
    			add_location(nav, file, 79, 2, 2059);
    			attr_dev(div2, "class", "wrapper svelte-zpyaps");
    			add_location(div2, file, 34, 0, 965);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div2, anchor);
    			append_hydration_dev(div2, header);
    			append_hydration_dev(header, div0);
    			append_hydration_dev(div0, i);
    			append_hydration_dev(div0, t0);
    			append_hydration_dev(div0, h1);
    			append_hydration_dev(h1, t1);
    			append_hydration_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_hydration_dev(header, t3);
    			if_blocks[current_block_type_index].m(header, null);
    			append_hydration_dev(div2, t4);
    			append_hydration_dev(div2, main);
    			if_blocks_1[current_block_type_index_1].m(main, null);
    			append_hydration_dev(div2, t5);
    			append_hydration_dev(div2, footer);
    			append_hydration_dev(footer, div1);
    			append_hydration_dev(div1, span);
    			append_hydration_dev(span, t6);
    			append_hydration_dev(span, a0);
    			append_hydration_dev(a0, t7);
    			append_hydration_dev(div1, t8);
    			append_hydration_dev(div1, a1);
    			append_hydration_dev(a1, t9);
    			append_hydration_dev(footer, t10);
    			append_hydration_dev(footer, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_hydration_dev(div2, t11);
    			append_hydration_dev(div2, nav);
    			mount_component(navitems, nav, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[6]),
    					listen_dev(h1, "click", /*click_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*windowSize*/ ctx[1] > 830) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3(ctx);
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
    				validate_each_argument(each_value);
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

    			if (!current || dirty & /*showNav*/ 1 && nav_class_value !== (nav_class_value = "" + (null_to_empty(/*showNav*/ ctx[0] ? "show" : "") + " svelte-zpyaps"))) {
    				attr_dev(nav, "class", nav_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(navitems.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(navitems.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			destroy_each(each_blocks, detaching);
    			destroy_component(navitems);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

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

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(1, windowSize = window.innerWidth);
    	}

    	const click_handler = () => navigate("/");
    	const func = () => $$invalidate(0, showNav = !showNav);
    	const func_1 = () => $$invalidate(0, showNav = false);

    	$$self.$capture_state = () => ({
    		Navigation,
    		Lessons,
    		NewLesson,
    		Lesson,
    		NavItems,
    		socialIcons,
    		showNav,
    		windowSize,
    		currentRoute,
    		lessonID,
    		navigate
    	});

    	$$self.$inject_state = $$props => {
    		if ('showNav' in $$props) $$invalidate(0, showNav = $$props.showNav);
    		if ('windowSize' in $$props) $$invalidate(1, windowSize = $$props.windowSize);
    		if ('currentRoute' in $$props) $$invalidate(2, currentRoute = $$props.currentRoute);
    		if ('lessonID' in $$props) $$invalidate(3, lessonID = $$props.lessonID);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      hydrate: true,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
