
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
function noop$1() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
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
        return noop$1;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
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
function attr$1(node, attribute, value) {
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
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
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
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
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
    seen_callbacks.clear();
    set_current_component(saved_component);
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

const globals$1 = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}

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
        update: noop$1,
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
        this.$destroy = noop$1;
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
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
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
    attr$1(node, attribute, value);
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

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop$1) {
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
    function subscribe(run, invalidate = noop$1) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop$1;
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
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop$1;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop$1;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

/**
 * @typedef {Object} WrappedComponent Object returned by the `wrap` method
 * @property {SvelteComponent} component - Component to load (this is always asynchronous)
 * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
 * @property {Object} [props] - Optional dictionary of static props
 * @property {Object} [userData] - Optional user data dictionary
 * @property {bool} _sveltesparouter - Internal flag; always set to true
 */

/**
 * @callback AsyncSvelteComponent
 * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
 */

/**
 * @callback RoutePrecondition
 * @param {RouteDetail} detail - Route detail object
 * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
 */

/**
 * @typedef {Object} WrapOptions Options object for the call to `wrap`
 * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
 * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
 * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
 * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
 * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
 * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
 * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
 */

/**
 * Wraps a component to enable multiple capabilities:
 * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
 * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
 * 3. Adding static props that are passed to the component
 * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
 * 
 * @param {WrapOptions} args - Arguments object
 * @returns {WrappedComponent} Wrapped component
 */
function wrap$1(args) {
    if (!args) {
        throw Error('Parameter args is required')
    }

    // We need to have one and only one of component and asyncComponent
    // This does a "XNOR"
    if (!args.component == !args.asyncComponent) {
        throw Error('One and only one of component and asyncComponent is required')
    }

    // If the component is not async, wrap it into a function returning a Promise
    if (args.component) {
        args.asyncComponent = () => Promise.resolve(args.component);
    }

    // Parameter asyncComponent and each item of conditions must be functions
    if (typeof args.asyncComponent != 'function') {
        throw Error('Parameter asyncComponent must be a function')
    }
    if (args.conditions) {
        // Ensure it's an array
        if (!Array.isArray(args.conditions)) {
            args.conditions = [args.conditions];
        }
        for (let i = 0; i < args.conditions.length; i++) {
            if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                throw Error('Invalid parameter conditions[' + i + ']')
            }
        }
    }

    // Check if we have a placeholder component
    if (args.loadingComponent) {
        args.asyncComponent.loading = args.loadingComponent;
        args.asyncComponent.loadingParams = args.loadingParams || undefined;
    }

    // Returns an object that contains all the functions to execute too
    // The _sveltesparouter flag is to confirm the object was created by this router
    const obj = {
        component: args.asyncComponent,
        userData: args.userData,
        conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
        props: (args.props && Object.keys(args.props).length) ? args.props : {},
        _sveltesparouter: true
    };

    return obj
}

function parse(str, loose) {
	if (str instanceof RegExp) return { keys:false, pattern:str };
	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push('wild');
			pattern += '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

/* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.47.0 */

const { Error: Error_1, Object: Object_1, console: console_1 } = globals$1;

// (251:0) {:else}
function create_else_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [/*props*/ ctx[2]];
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return {
			props: switch_instance_props,
			$$inline: true
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props());
		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		l: function claim(nodes) {
			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_hydration_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const switch_instance_changes = (dirty & /*props*/ 4)
			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
			: {};

			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(251:0) {:else}",
		ctx
	});

	return block;
}

// (244:0) {#if componentParams}
function create_if_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return {
			props: switch_instance_props,
			$$inline: true
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props());
		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		l: function claim(nodes) {
			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_hydration_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
			? get_spread_update(switch_instance_spread_levels, [
					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
				])
			: {};

			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(244:0) {#if componentParams}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*componentParams*/ ctx[1]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			if_block.l(nodes);
			if_block_anchor = empty();
		},
		m: function mount(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert_hydration_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
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
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach_dev(if_block_anchor);
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

function wrap(component, userData, ...conditions) {
	// Use the new wrap method and show a deprecation warning
	// eslint-disable-next-line no-console
	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

	return wrap$1({ component, userData, conditions });
}

/**
 * @typedef {Object} Location
 * @property {string} location - Location (page/view), for example `/book`
 * @property {string} [querystring] - Querystring from the hash, as a string not parsed
 */
/**
 * Returns the current location from the hash.
 *
 * @returns {Location} Location object
 * @private
 */
function getLocation() {
	const hashPosition = window.location.href.indexOf('#/');

	let location = hashPosition > -1
	? window.location.href.substr(hashPosition + 1)
	: '/';

	// Check if there's a querystring
	const qsPosition = location.indexOf('?');

	let querystring = '';

	if (qsPosition > -1) {
		querystring = location.substr(qsPosition + 1);
		location = location.substr(0, qsPosition);
	}

	return { location, querystring };
}

const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
function start(set) {
	set(getLocation());

	const update = () => {
		set(getLocation());
	};

	window.addEventListener('hashchange', update, false);

	return function stop() {
		window.removeEventListener('hashchange', update, false);
	};
});

const location = derived(loc, $loc => $loc.location);
const querystring = derived(loc, $loc => $loc.querystring);
const params = writable(undefined);

async function push(location) {
	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
		throw Error('Invalid parameter location');
	}

	// Execute this code when the current call stack is complete
	await tick();

	// Note: this will include scroll state in history even when restoreScrollState is false
	history.replaceState(
		{
			...history.state,
			__svelte_spa_router_scrollX: window.scrollX,
			__svelte_spa_router_scrollY: window.scrollY
		},
		undefined,
		undefined
	);

	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
}

async function pop() {
	// Execute this code when the current call stack is complete
	await tick();

	window.history.back();
}

async function replace(location) {
	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
		throw Error('Invalid parameter location');
	}

	// Execute this code when the current call stack is complete
	await tick();

	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

	try {
		const newState = { ...history.state };
		delete newState['__svelte_spa_router_scrollX'];
		delete newState['__svelte_spa_router_scrollY'];
		window.history.replaceState(newState, undefined, dest);
	} catch(e) {
		// eslint-disable-next-line no-console
		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
	}

	// The method above doesn't trigger the hashchange event, so let's do that manually
	window.dispatchEvent(new Event('hashchange'));
}

function link(node, opts) {
	opts = linkOpts(opts);

	// Only apply to <a> tags
	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
		throw Error('Action "link" can only be used with <a> tags');
	}

	updateLink(node, opts);

	return {
		update(updated) {
			updated = linkOpts(updated);
			updateLink(node, updated);
		}
	};
}

// Internal function used by the link function
function updateLink(node, opts) {
	let href = opts.href || node.getAttribute('href');

	// Destination must start with '/' or '#/'
	if (href && href.charAt(0) == '/') {
		// Add # to the href attribute
		href = '#' + href;
	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
		throw Error('Invalid value for "href" attribute: ' + href);
	}

	node.setAttribute('href', href);

	node.addEventListener('click', event => {
		// Prevent default anchor onclick behaviour
		event.preventDefault();

		if (!opts.disabled) {
			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
		}
	});
}

// Internal function that ensures the argument of the link action is always an object
function linkOpts(val) {
	if (val && typeof val == 'string') {
		return { href: val };
	} else {
		return val || {};
	}
}

/**
 * The handler attached to an anchor tag responsible for updating the
 * current history state with the current scroll state
 *
 * @param {string} href - Destination
 */
function scrollstateHistoryHandler(href) {
	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
	history.replaceState(
		{
			...history.state,
			__svelte_spa_router_scrollX: window.scrollX,
			__svelte_spa_router_scrollY: window.scrollY
		},
		undefined,
		undefined
	);

	// This will force an update as desired, but this time our scroll state will be attached
	window.location.hash = href;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Router', slots, []);
	let { routes = {} } = $$props;
	let { prefix = '' } = $$props;
	let { restoreScrollState = false } = $$props;

	/**
 * Container for a route: path, component
 */
	class RouteItem {
		/**
 * Initializes the object and creates a regular expression from the path, using regexparam.
 *
 * @param {string} path - Path to the route (must start with '/' or '*')
 * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
 */
		constructor(path, component) {
			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
				throw Error('Invalid component object');
			}

			// Path must be a regular or expression, or a string starting with '/' or '*'
			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
				throw Error('Invalid value for "path" argument - strings must start with / or *');
			}

			const { pattern, keys } = parse(path);
			this.path = path;

			// Check if the component is wrapped and we have conditions
			if (typeof component == 'object' && component._sveltesparouter === true) {
				this.component = component.component;
				this.conditions = component.conditions || [];
				this.userData = component.userData;
				this.props = component.props || {};
			} else {
				// Convert the component to a function that returns a Promise, to normalize it
				this.component = () => Promise.resolve(component);

				this.conditions = [];
				this.props = {};
			}

			this._pattern = pattern;
			this._keys = keys;
		}

		/**
 * Checks if `path` matches the current route.
 * If there's a match, will return the list of parameters from the URL (if any).
 * In case of no match, the method will return `null`.
 *
 * @param {string} path - Path to test
 * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
 */
		match(path) {
			// If there's a prefix, check if it matches the start of the path.
			// If not, bail early, else remove it before we run the matching.
			if (prefix) {
				if (typeof prefix == 'string') {
					if (path.startsWith(prefix)) {
						path = path.substr(prefix.length) || '/';
					} else {
						return null;
					}
				} else if (prefix instanceof RegExp) {
					const match = path.match(prefix);

					if (match && match[0]) {
						path = path.substr(match[0].length) || '/';
					} else {
						return null;
					}
				}
			}

			// Check if the pattern matches
			const matches = this._pattern.exec(path);

			if (matches === null) {
				return null;
			}

			// If the input was a regular expression, this._keys would be false, so return matches as is
			if (this._keys === false) {
				return matches;
			}

			const out = {};
			let i = 0;

			while (i < this._keys.length) {
				// In the match parameters, URL-decode all values
				try {
					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
				} catch(e) {
					out[this._keys[i]] = null;
				}

				i++;
			}

			return out;
		}

		/**
 * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
 * @typedef {Object} RouteDetail
 * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
 * @property {string} location - Location path
 * @property {string} querystring - Querystring from the hash
 * @property {object} [userData] - Custom data passed by the user
 * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
 * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
 */
		/**
 * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
 * 
 * @param {RouteDetail} detail - Route detail
 * @returns {boolean} Returns true if all the conditions succeeded
 */
		async checkConditions(detail) {
			for (let i = 0; i < this.conditions.length; i++) {
				if (!await this.conditions[i](detail)) {
					return false;
				}
			}

			return true;
		}
	}

	// Set up all routes
	const routesList = [];

	if (routes instanceof Map) {
		// If it's a map, iterate on it right away
		routes.forEach((route, path) => {
			routesList.push(new RouteItem(path, route));
		});
	} else {
		// We have an object, so iterate on its own properties
		Object.keys(routes).forEach(path => {
			routesList.push(new RouteItem(path, routes[path]));
		});
	}

	// Props for the component to render
	let component = null;

	let componentParams = null;
	let props = {};

	// Event dispatcher from Svelte
	const dispatch = createEventDispatcher();

	// Just like dispatch, but executes on the next iteration of the event loop
	async function dispatchNextTick(name, detail) {
		// Execute this code when the current call stack is complete
		await tick();

		dispatch(name, detail);
	}

	// If this is set, then that means we have popped into this var the state of our last scroll position
	let previousScrollState = null;

	let popStateChanged = null;

	if (restoreScrollState) {
		popStateChanged = event => {
			// If this event was from our history.replaceState, event.state will contain
			// our scroll history. Otherwise, event.state will be null (like on forward
			// navigation)
			if (event.state && event.state.__svelte_spa_router_scrollY) {
				previousScrollState = event.state;
			} else {
				previousScrollState = null;
			}
		};

		// This is removed in the destroy() invocation below
		window.addEventListener('popstate', popStateChanged);

		afterUpdate(() => {
			// If this exists, then this is a back navigation: restore the scroll position
			if (previousScrollState) {
				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
			} else {
				// Otherwise this is a forward navigation: scroll to top
				window.scrollTo(0, 0);
			}
		});
	}

	// Always have the latest value of loc
	let lastLoc = null;

	// Current object of the component loaded
	let componentObj = null;

	// Handle hash change events
	// Listen to changes in the $loc store and update the page
	// Do not use the $: syntax because it gets triggered by too many things
	const unsubscribeLoc = loc.subscribe(async newLoc => {
		lastLoc = newLoc;

		// Find a route matching the location
		let i = 0;

		while (i < routesList.length) {
			const match = routesList[i].match(newLoc.location);

			if (!match) {
				i++;
				continue;
			}

			const detail = {
				route: routesList[i].path,
				location: newLoc.location,
				querystring: newLoc.querystring,
				userData: routesList[i].userData,
				params: match && typeof match == 'object' && Object.keys(match).length
				? match
				: null
			};

			// Check if the route can be loaded - if all conditions succeed
			if (!await routesList[i].checkConditions(detail)) {
				// Don't display anything
				$$invalidate(0, component = null);

				componentObj = null;

				// Trigger an event to notify the user, then exit
				dispatchNextTick('conditionsFailed', detail);

				return;
			}

			// Trigger an event to alert that we're loading the route
			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
			dispatchNextTick('routeLoading', Object.assign({}, detail));

			// If there's a component to show while we're loading the route, display it
			const obj = routesList[i].component;

			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
			if (componentObj != obj) {
				if (obj.loading) {
					$$invalidate(0, component = obj.loading);
					componentObj = obj;
					$$invalidate(1, componentParams = obj.loadingParams);
					$$invalidate(2, props = {});

					// Trigger the routeLoaded event for the loading component
					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
						component,
						name: component.name,
						params: componentParams
					}));
				} else {
					$$invalidate(0, component = null);
					componentObj = null;
				}

				// Invoke the Promise
				const loaded = await obj();

				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
				if (newLoc != lastLoc) {
					// Don't update the component, just exit
					return;
				}

				// If there is a "default" property, which is used by async routes, then pick that
				$$invalidate(0, component = loaded && loaded.default || loaded);

				componentObj = obj;
			}

			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
			if (match && typeof match == 'object' && Object.keys(match).length) {
				$$invalidate(1, componentParams = match);
			} else {
				$$invalidate(1, componentParams = null);
			}

			// Set static props, if any
			$$invalidate(2, props = routesList[i].props);

			// Dispatch the routeLoaded event then exit
			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
				component,
				name: component.name,
				params: componentParams
			})).then(() => {
				params.set(componentParams);
			});

			return;
		}

		// If we're still here, there was no match, so show the empty component
		$$invalidate(0, component = null);

		componentObj = null;
		params.set(undefined);
	});

	onDestroy(() => {
		unsubscribeLoc();
		popStateChanged && window.removeEventListener('popstate', popStateChanged);
	});

	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Router> was created with unknown prop '${key}'`);
	});

	function routeEvent_handler(event) {
		bubble.call(this, $$self, event);
	}

	function routeEvent_handler_1(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
	};

	$$self.$capture_state = () => ({
		readable,
		writable,
		derived,
		tick,
		_wrap: wrap$1,
		wrap,
		getLocation,
		loc,
		location,
		querystring,
		params,
		push,
		pop,
		replace,
		link,
		updateLink,
		linkOpts,
		scrollstateHistoryHandler,
		onDestroy,
		createEventDispatcher,
		afterUpdate,
		parse,
		routes,
		prefix,
		restoreScrollState,
		RouteItem,
		routesList,
		component,
		componentParams,
		props,
		dispatch,
		dispatchNextTick,
		previousScrollState,
		popStateChanged,
		lastLoc,
		componentObj,
		unsubscribeLoc
	});

	$$self.$inject_state = $$props => {
		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
		if ('component' in $$props) $$invalidate(0, component = $$props.component);
		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
		if ('props' in $$props) $$invalidate(2, props = $$props.props);
		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
		if ('componentObj' in $$props) componentObj = $$props.componentObj;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
			// Update history.scrollRestoration depending on restoreScrollState
			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
		}
	};

	return [
		component,
		componentParams,
		props,
		routes,
		prefix,
		restoreScrollState,
		routeEvent_handler,
		routeEvent_handler_1
	];
}

class Router extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance, create_fragment, safe_not_equal, {
			routes: 3,
			prefix: 4,
			restoreScrollState: 5
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Router",
			options,
			id: create_fragment.name
		});
	}

	get routes() {
		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set routes(value) {
		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get prefix() {
		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set prefix(value) {
		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get restoreScrollState() {
		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set restoreScrollState(value) {
		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
function isNumber$1(val) {
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
function extend$1(a, b, thisArg) {
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
  isNumber: isNumber$1,
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
  extend: extend$1,
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

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function range(length, from) {
    if (from === void 0) { from = 0; }
    return Array.from({ length: length }, function (_, i) { return i + from; });
}

var constants = {
    /**
     * The viewbox width of the svg
     */
    width: 400,
};

function t(t,e,s){if(t&&t.length){const[n,o]=e,a=Math.PI/180*s,r=Math.cos(a),h=Math.sin(a);t.forEach((t=>{const[e,s]=t;t[0]=(e-n)*r-(s-o)*h+n,t[1]=(e-n)*h+(s-o)*r+o;}));}}function e(t){const e=t[0],s=t[1];return Math.sqrt(Math.pow(e[0]-s[0],2)+Math.pow(e[1]-s[1],2))}function s(t,e,s,n){const o=e[1]-t[1],a=t[0]-e[0],r=o*t[0]+a*t[1],h=n[1]-s[1],i=s[0]-n[0],c=h*s[0]+i*s[1],l=o*i-h*a;return l?[(i*r-a*c)/l,(o*c-h*r)/l]:null}function n(t,e,s){const n=t.length;if(n<3)return !1;const h=[Number.MAX_SAFE_INTEGER,s],i=[e,s];let c=0;for(let e=0;e<n;e++){const s=t[e],l=t[(e+1)%n];if(r(s,l,i,h)){if(0===a(s,i,l))return o(s,i,l);c++;}}return c%2==1}function o(t,e,s){return e[0]<=Math.max(t[0],s[0])&&e[0]>=Math.min(t[0],s[0])&&e[1]<=Math.max(t[1],s[1])&&e[1]>=Math.min(t[1],s[1])}function a(t,e,s){const n=(e[1]-t[1])*(s[0]-e[0])-(e[0]-t[0])*(s[1]-e[1]);return 0===n?0:n>0?1:2}function r(t,e,s,n){const r=a(t,e,s),h=a(t,e,n),i=a(s,n,t),c=a(s,n,e);return r!==h&&i!==c||(!(0!==r||!o(t,s,e))||(!(0!==h||!o(t,n,e))||(!(0!==i||!o(s,t,n))||!(0!==c||!o(s,e,n)))))}function h(e,s){const n=[0,0],o=Math.round(s.hachureAngle+90);o&&t(e,n,o);const a=function(t,e){const s=[...t];s[0].join(",")!==s[s.length-1].join(",")&&s.push([s[0][0],s[0][1]]);const n=[];if(s&&s.length>2){let t=e.hachureGap;t<0&&(t=4*e.strokeWidth),t=Math.max(t,.1);const o=[];for(let t=0;t<s.length-1;t++){const e=s[t],n=s[t+1];if(e[1]!==n[1]){const t=Math.min(e[1],n[1]);o.push({ymin:t,ymax:Math.max(e[1],n[1]),x:t===e[1]?e[0]:n[0],islope:(n[0]-e[0])/(n[1]-e[1])});}}if(o.sort(((t,e)=>t.ymin<e.ymin?-1:t.ymin>e.ymin?1:t.x<e.x?-1:t.x>e.x?1:t.ymax===e.ymax?0:(t.ymax-e.ymax)/Math.abs(t.ymax-e.ymax))),!o.length)return n;let a=[],r=o[0].ymin;for(;a.length||o.length;){if(o.length){let t=-1;for(let e=0;e<o.length&&!(o[e].ymin>r);e++)t=e;o.splice(0,t+1).forEach((t=>{a.push({s:r,edge:t});}));}if(a=a.filter((t=>!(t.edge.ymax<=r))),a.sort(((t,e)=>t.edge.x===e.edge.x?0:(t.edge.x-e.edge.x)/Math.abs(t.edge.x-e.edge.x))),a.length>1)for(let t=0;t<a.length;t+=2){const e=t+1;if(e>=a.length)break;const s=a[t].edge,o=a[e].edge;n.push([[Math.round(s.x),r],[Math.round(o.x),r]]);}r+=t,a.forEach((e=>{e.edge.x=e.edge.x+t*e.edge.islope;}));}}return n}(e,s);return o&&(t(e,n,-o),function(e,s,n){const o=[];e.forEach((t=>o.push(...t))),t(o,s,n);}(a,n,-o)),a}class i{constructor(t){this.helper=t;}fillPolygon(t,e){return this._fillPolygon(t,e)}_fillPolygon(t,e,s=!1){let n=h(t,e);if(s){const e=this.connectingLines(t,n);n=n.concat(e);}return {type:"fillSketch",ops:this.renderLines(n,e)}}renderLines(t,e){const s=[];for(const n of t)s.push(...this.helper.doubleLineOps(n[0][0],n[0][1],n[1][0],n[1][1],e));return s}connectingLines(t,s){const n=[];if(s.length>1)for(let o=1;o<s.length;o++){const a=s[o-1];if(e(a)<3)continue;const r=[s[o][0],a[1]];if(e(r)>3){const e=this.splitOnIntersections(t,r);n.push(...e);}}return n}midPointInPolygon(t,e){return n(t,(e[0][0]+e[1][0])/2,(e[0][1]+e[1][1])/2)}splitOnIntersections(t,o){const a=Math.max(5,.1*e(o)),h=[];for(let n=0;n<t.length;n++){const i=t[n],c=t[(n+1)%t.length];if(r(i,c,...o)){const t=s(i,c,o[0],o[1]);if(t){const s=e([t,o[0]]),n=e([t,o[1]]);s>a&&n>a&&h.push({point:t,distance:s});}}}if(h.length>1){const e=h.sort(((t,e)=>t.distance-e.distance)).map((t=>t.point));if(n(t,...o[0])||e.shift(),n(t,...o[1])||e.pop(),e.length<=1)return this.midPointInPolygon(t,o)?[o]:[];const s=[o[0],...e,o[1]],a=[];for(let e=0;e<s.length-1;e+=2){const n=[s[e],s[e+1]];this.midPointInPolygon(t,n)&&a.push(n);}return a}return this.midPointInPolygon(t,o)?[o]:[]}}class c extends i{fillPolygon(t,e){return this._fillPolygon(t,e,!0)}}class l extends i{fillPolygon(t,e){const s=this._fillPolygon(t,e),n=Object.assign({},e,{hachureAngle:e.hachureAngle+90}),o=this._fillPolygon(t,n);return s.ops=s.ops.concat(o.ops),s}}class u{constructor(t){this.helper=t;}fillPolygon(t,e){const s=h(t,e=Object.assign({},e,{curveStepCount:4,hachureAngle:0,roughness:1}));return this.dotsOnLines(s,e)}dotsOnLines(t,s){const n=[];let o=s.hachureGap;o<0&&(o=4*s.strokeWidth),o=Math.max(o,.1);let a=s.fillWeight;a<0&&(a=s.strokeWidth/2);const r=o/4;for(const h of t){const t=e(h),i=t/o,c=Math.ceil(i)-1,l=t-c*o,u=(h[0][0]+h[1][0])/2-o/4,p=Math.min(h[0][1],h[1][1]);for(let t=0;t<c;t++){const e=p+l+t*o,h=this.helper.randOffsetWithRange(u-r,u+r,s),i=this.helper.randOffsetWithRange(e-r,e+r,s),c=this.helper.ellipse(h,i,a,a,s);n.push(...c.ops);}}return {type:"fillSketch",ops:n}}}class p{constructor(t){this.helper=t;}fillPolygon(t,e){const s=h(t,e);return {type:"fillSketch",ops:this.dashedLine(s,e)}}dashedLine(t,s){const n=s.dashOffset<0?s.hachureGap<0?4*s.strokeWidth:s.hachureGap:s.dashOffset,o=s.dashGap<0?s.hachureGap<0?4*s.strokeWidth:s.hachureGap:s.dashGap,a=[];return t.forEach((t=>{const r=e(t),h=Math.floor(r/(n+o)),i=(r+o-h*(n+o))/2;let c=t[0],l=t[1];c[0]>l[0]&&(c=t[1],l=t[0]);const u=Math.atan((l[1]-c[1])/(l[0]-c[0]));for(let t=0;t<h;t++){const e=t*(n+o),r=e+n,h=[c[0]+e*Math.cos(u)+i*Math.cos(u),c[1]+e*Math.sin(u)+i*Math.sin(u)],l=[c[0]+r*Math.cos(u)+i*Math.cos(u),c[1]+r*Math.sin(u)+i*Math.sin(u)];a.push(...this.helper.doubleLineOps(h[0],h[1],l[0],l[1],s));}})),a}}class f{constructor(t){this.helper=t;}fillPolygon(t,e){const s=e.hachureGap<0?4*e.strokeWidth:e.hachureGap,n=e.zigzagOffset<0?s:e.zigzagOffset,o=h(t,e=Object.assign({},e,{hachureGap:s+n}));return {type:"fillSketch",ops:this.zigzagLines(o,n,e)}}zigzagLines(t,s,n){const o=[];return t.forEach((t=>{const a=e(t),r=Math.round(a/(2*s));let h=t[0],i=t[1];h[0]>i[0]&&(h=t[1],i=t[0]);const c=Math.atan((i[1]-h[1])/(i[0]-h[0]));for(let t=0;t<r;t++){const e=2*t*s,a=2*(t+1)*s,r=Math.sqrt(2*Math.pow(s,2)),i=[h[0]+e*Math.cos(c),h[1]+e*Math.sin(c)],l=[h[0]+a*Math.cos(c),h[1]+a*Math.sin(c)],u=[i[0]+r*Math.cos(c+Math.PI/4),i[1]+r*Math.sin(c+Math.PI/4)];o.push(...this.helper.doubleLineOps(i[0],i[1],u[0],u[1],n),...this.helper.doubleLineOps(u[0],u[1],l[0],l[1],n));}})),o}}const d={};class g{constructor(t){this.seed=t;}next(){return this.seed?(2**31-1&(this.seed=Math.imul(48271,this.seed)))/2**31:Math.random()}}const M={A:7,a:7,C:6,c:6,H:1,h:1,L:2,l:2,M:2,m:2,Q:4,q:4,S:4,s:4,T:2,t:2,V:1,v:1,Z:0,z:0};function k(t,e){return t.type===e}function b(t){const e=[],s=function(t){const e=new Array;for(;""!==t;)if(t.match(/^([ \t\r\n,]+)/))t=t.substr(RegExp.$1.length);else if(t.match(/^([aAcChHlLmMqQsStTvVzZ])/))e[e.length]={type:0,text:RegExp.$1},t=t.substr(RegExp.$1.length);else {if(!t.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/))return [];e[e.length]={type:1,text:`${parseFloat(RegExp.$1)}`},t=t.substr(RegExp.$1.length);}return e[e.length]={type:2,text:""},e}(t);let n="BOD",o=0,a=s[o];for(;!k(a,2);){let r=0;const h=[];if("BOD"===n){if("M"!==a.text&&"m"!==a.text)return b("M0,0"+t);o++,r=M[a.text],n=a.text;}else k(a,1)?r=M[n]:(o++,r=M[a.text],n=a.text);if(!(o+r<s.length))throw new Error("Path data ended short");for(let t=o;t<o+r;t++){const e=s[t];if(!k(e,1))throw new Error("Param not a number: "+n+","+e.text);h[h.length]=+e.text;}if("number"!=typeof M[n])throw new Error("Bad segment: "+n);{const t={key:n,data:h};e.push(t),o+=r,a=s[o],"M"===n&&(n="L"),"m"===n&&(n="l");}}return e}function y(t){let e=0,s=0,n=0,o=0;const a=[];for(const{key:r,data:h}of t)switch(r){case"M":a.push({key:"M",data:[...h]}),[e,s]=h,[n,o]=h;break;case"m":e+=h[0],s+=h[1],a.push({key:"M",data:[e,s]}),n=e,o=s;break;case"L":a.push({key:"L",data:[...h]}),[e,s]=h;break;case"l":e+=h[0],s+=h[1],a.push({key:"L",data:[e,s]});break;case"C":a.push({key:"C",data:[...h]}),e=h[4],s=h[5];break;case"c":{const t=h.map(((t,n)=>n%2?t+s:t+e));a.push({key:"C",data:t}),e=t[4],s=t[5];break}case"Q":a.push({key:"Q",data:[...h]}),e=h[2],s=h[3];break;case"q":{const t=h.map(((t,n)=>n%2?t+s:t+e));a.push({key:"Q",data:t}),e=t[2],s=t[3];break}case"A":a.push({key:"A",data:[...h]}),e=h[5],s=h[6];break;case"a":e+=h[5],s+=h[6],a.push({key:"A",data:[h[0],h[1],h[2],h[3],h[4],e,s]});break;case"H":a.push({key:"H",data:[...h]}),e=h[0];break;case"h":e+=h[0],a.push({key:"H",data:[e]});break;case"V":a.push({key:"V",data:[...h]}),s=h[0];break;case"v":s+=h[0],a.push({key:"V",data:[s]});break;case"S":a.push({key:"S",data:[...h]}),e=h[2],s=h[3];break;case"s":{const t=h.map(((t,n)=>n%2?t+s:t+e));a.push({key:"S",data:t}),e=t[2],s=t[3];break}case"T":a.push({key:"T",data:[...h]}),e=h[0],s=h[1];break;case"t":e+=h[0],s+=h[1],a.push({key:"T",data:[e,s]});break;case"Z":case"z":a.push({key:"Z",data:[]}),e=n,s=o;}return a}function m(t){const e=[];let s="",n=0,o=0,a=0,r=0,h=0,i=0;for(const{key:c,data:l}of t){switch(c){case"M":e.push({key:"M",data:[...l]}),[n,o]=l,[a,r]=l;break;case"C":e.push({key:"C",data:[...l]}),n=l[4],o=l[5],h=l[2],i=l[3];break;case"L":e.push({key:"L",data:[...l]}),[n,o]=l;break;case"H":n=l[0],e.push({key:"L",data:[n,o]});break;case"V":o=l[0],e.push({key:"L",data:[n,o]});break;case"S":{let t=0,a=0;"C"===s||"S"===s?(t=n+(n-h),a=o+(o-i)):(t=n,a=o),e.push({key:"C",data:[t,a,...l]}),h=l[0],i=l[1],n=l[2],o=l[3];break}case"T":{const[t,a]=l;let r=0,c=0;"Q"===s||"T"===s?(r=n+(n-h),c=o+(o-i)):(r=n,c=o);const u=n+2*(r-n)/3,p=o+2*(c-o)/3,f=t+2*(r-t)/3,d=a+2*(c-a)/3;e.push({key:"C",data:[u,p,f,d,t,a]}),h=r,i=c,n=t,o=a;break}case"Q":{const[t,s,a,r]=l,c=n+2*(t-n)/3,u=o+2*(s-o)/3,p=a+2*(t-a)/3,f=r+2*(s-r)/3;e.push({key:"C",data:[c,u,p,f,a,r]}),h=t,i=s,n=a,o=r;break}case"A":{const t=Math.abs(l[0]),s=Math.abs(l[1]),a=l[2],r=l[3],h=l[4],i=l[5],c=l[6];if(0===t||0===s)e.push({key:"C",data:[n,o,i,c,i,c]}),n=i,o=c;else if(n!==i||o!==c){w(n,o,i,c,t,s,a,r,h).forEach((function(t){e.push({key:"C",data:t});})),n=i,o=c;}break}case"Z":e.push({key:"Z",data:[]}),n=a,o=r;}s=c;}return e}function P(t,e,s){return [t*Math.cos(s)-e*Math.sin(s),t*Math.sin(s)+e*Math.cos(s)]}function w(t,e,s,n,o,a,r,h,i,c){const l=(u=r,Math.PI*u/180);var u;let p=[],f=0,d=0,g=0,M=0;if(c)[f,d,g,M]=c;else {[t,e]=P(t,e,-l),[s,n]=P(s,n,-l);const r=(t-s)/2,c=(e-n)/2;let u=r*r/(o*o)+c*c/(a*a);u>1&&(u=Math.sqrt(u),o*=u,a*=u);const p=o*o,k=a*a,b=p*k-p*c*c-k*r*r,y=p*c*c+k*r*r,m=(h===i?-1:1)*Math.sqrt(Math.abs(b/y));g=m*o*c/a+(t+s)/2,M=m*-a*r/o+(e+n)/2,f=Math.asin(parseFloat(((e-M)/a).toFixed(9))),d=Math.asin(parseFloat(((n-M)/a).toFixed(9))),t<g&&(f=Math.PI-f),s<g&&(d=Math.PI-d),f<0&&(f=2*Math.PI+f),d<0&&(d=2*Math.PI+d),i&&f>d&&(f-=2*Math.PI),!i&&d>f&&(d-=2*Math.PI);}let k=d-f;if(Math.abs(k)>120*Math.PI/180){const t=d,e=s,h=n;d=i&&d>f?f+120*Math.PI/180*1:f+120*Math.PI/180*-1,p=w(s=g+o*Math.cos(d),n=M+a*Math.sin(d),e,h,o,a,r,0,i,[d,t,g,M]);}k=d-f;const b=Math.cos(f),y=Math.sin(f),m=Math.cos(d),x=Math.sin(d),v=Math.tan(k/4),O=4/3*o*v,S=4/3*a*v,L=[t,e],T=[t+O*y,e-S*b],D=[s+O*x,n-S*m],I=[s,n];if(T[0]=2*L[0]-T[0],T[1]=2*L[1]-T[1],c)return [T,D,I].concat(p);{p=[T,D,I].concat(p);const t=[];for(let e=0;e<p.length;e+=3){const s=P(p[e][0],p[e][1],l),n=P(p[e+1][0],p[e+1][1],l),o=P(p[e+2][0],p[e+2][1],l);t.push([s[0],s[1],n[0],n[1],o[0],o[1]]);}return t}}const x={randOffset:function(t,e){return W(t,e)},randOffsetWithRange:function(t,e,s){return E(t,e,s)},ellipse:function(t,e,s,n,o){const a=T(s,n,o);return D(t,e,o,a).opset},doubleLineOps:function(t,e,s,n,o){return z(t,e,s,n,o,!0)}};function v(t,e,s,n,o){return {type:"path",ops:z(t,e,s,n,o)}}function O(t,e,s){const n=(t||[]).length;if(n>2){const o=[];for(let e=0;e<n-1;e++)o.push(...z(t[e][0],t[e][1],t[e+1][0],t[e+1][1],s));return e&&o.push(...z(t[n-1][0],t[n-1][1],t[0][0],t[0][1],s)),{type:"path",ops:o}}return 2===n?v(t[0][0],t[0][1],t[1][0],t[1][1],s):{type:"path",ops:[]}}function S(t,e,s,n,o){return function(t,e){return O(t,!0,e)}([[t,e],[t+s,e],[t+s,e+n],[t,e+n]],o)}function L(t,e){let s=$(t,1*(1+.2*e.roughness),e);if(!e.disableMultiStroke){const n=$(t,1.5*(1+.22*e.roughness),function(t){const e=Object.assign({},t);e.randomizer=void 0,t.seed&&(e.seed=t.seed+1);return e}(e));s=s.concat(n);}return {type:"path",ops:s}}function T(t,e,s){const n=Math.sqrt(2*Math.PI*Math.sqrt((Math.pow(t/2,2)+Math.pow(e/2,2))/2)),o=Math.max(s.curveStepCount,s.curveStepCount/Math.sqrt(200)*n),a=2*Math.PI/o;let r=Math.abs(t/2),h=Math.abs(e/2);const i=1-s.curveFitting;return r+=W(r*i,s),h+=W(h*i,s),{increment:a,rx:r,ry:h}}function D(t,e,s,n){const[o,a]=q(n.increment,t,e,n.rx,n.ry,1,n.increment*E(.1,E(.4,1,s),s),s);let r=G(o,null,s);if(!s.disableMultiStroke&&0!==s.roughness){const[o]=q(n.increment,t,e,n.rx,n.ry,1.5,0,s),a=G(o,null,s);r=r.concat(a);}return {estimatedPoints:a,opset:{type:"path",ops:r}}}function I(t,e,s,n,o,a,r,h,i){const c=t,l=e;let u=Math.abs(s/2),p=Math.abs(n/2);u+=W(.01*u,i),p+=W(.01*p,i);let f=o,d=a;for(;f<0;)f+=2*Math.PI,d+=2*Math.PI;d-f>2*Math.PI&&(f=0,d=2*Math.PI);const g=2*Math.PI/i.curveStepCount,M=Math.min(g/2,(d-f)/2),k=F(M,c,l,u,p,f,d,1,i);if(!i.disableMultiStroke){const t=F(M,c,l,u,p,f,d,1.5,i);k.push(...t);}return r&&(h?k.push(...z(c,l,c+u*Math.cos(f),l+p*Math.sin(f),i),...z(c,l,c+u*Math.cos(d),l+p*Math.sin(d),i)):k.push({op:"lineTo",data:[c,l]},{op:"lineTo",data:[c+u*Math.cos(f),l+p*Math.sin(f)]})),{type:"path",ops:k}}function A(t,e){const s=[];if(t.length){const n=e.maxRandomnessOffset||0,o=t.length;if(o>2){s.push({op:"move",data:[t[0][0]+W(n,e),t[0][1]+W(n,e)]});for(let a=1;a<o;a++)s.push({op:"lineTo",data:[t[a][0]+W(n,e),t[a][1]+W(n,e)]});}}return {type:"fillPath",ops:s}}function _(t,e){return function(t,e){let s=t.fillStyle||"hachure";if(!d[s])switch(s){case"zigzag":d[s]||(d[s]=new c(e));break;case"cross-hatch":d[s]||(d[s]=new l(e));break;case"dots":d[s]||(d[s]=new u(e));break;case"dashed":d[s]||(d[s]=new p(e));break;case"zigzag-line":d[s]||(d[s]=new f(e));break;case"hachure":default:s="hachure",d[s]||(d[s]=new i(e));}return d[s]}(e,x).fillPolygon(t,e)}function C(t){return t.randomizer||(t.randomizer=new g(t.seed||0)),t.randomizer.next()}function E(t,e,s,n=1){return s.roughness*n*(C(s)*(e-t)+t)}function W(t,e,s=1){return E(-t,t,e,s)}function z(t,e,s,n,o,a=!1){const r=a?o.disableMultiStrokeFill:o.disableMultiStroke,h=R(t,e,s,n,o,!0,!1);if(r)return h;const i=R(t,e,s,n,o,!0,!0);return h.concat(i)}function R(t,e,s,n,o,a,r){const h=Math.pow(t-s,2)+Math.pow(e-n,2),i=Math.sqrt(h);let c=1;c=i<200?1:i>500?.4:-.0016668*i+1.233334;let l=o.maxRandomnessOffset||0;l*l*100>h&&(l=i/10);const u=l/2,p=.2+.2*C(o);let f=o.bowing*o.maxRandomnessOffset*(n-e)/200,d=o.bowing*o.maxRandomnessOffset*(t-s)/200;f=W(f,o,c),d=W(d,o,c);const g=[],M=()=>W(u,o,c),k=()=>W(l,o,c),b=o.preserveVertices;return a&&(r?g.push({op:"move",data:[t+(b?0:M()),e+(b?0:M())]}):g.push({op:"move",data:[t+(b?0:W(l,o,c)),e+(b?0:W(l,o,c))]})),r?g.push({op:"bcurveTo",data:[f+t+(s-t)*p+M(),d+e+(n-e)*p+M(),f+t+2*(s-t)*p+M(),d+e+2*(n-e)*p+M(),s+(b?0:M()),n+(b?0:M())]}):g.push({op:"bcurveTo",data:[f+t+(s-t)*p+k(),d+e+(n-e)*p+k(),f+t+2*(s-t)*p+k(),d+e+2*(n-e)*p+k(),s+(b?0:k()),n+(b?0:k())]}),g}function $(t,e,s){const n=[];n.push([t[0][0]+W(e,s),t[0][1]+W(e,s)]),n.push([t[0][0]+W(e,s),t[0][1]+W(e,s)]);for(let o=1;o<t.length;o++)n.push([t[o][0]+W(e,s),t[o][1]+W(e,s)]),o===t.length-1&&n.push([t[o][0]+W(e,s),t[o][1]+W(e,s)]);return G(n,null,s)}function G(t,e,s){const n=t.length,o=[];if(n>3){const a=[],r=1-s.curveTightness;o.push({op:"move",data:[t[1][0],t[1][1]]});for(let e=1;e+2<n;e++){const s=t[e];a[0]=[s[0],s[1]],a[1]=[s[0]+(r*t[e+1][0]-r*t[e-1][0])/6,s[1]+(r*t[e+1][1]-r*t[e-1][1])/6],a[2]=[t[e+1][0]+(r*t[e][0]-r*t[e+2][0])/6,t[e+1][1]+(r*t[e][1]-r*t[e+2][1])/6],a[3]=[t[e+1][0],t[e+1][1]],o.push({op:"bcurveTo",data:[a[1][0],a[1][1],a[2][0],a[2][1],a[3][0],a[3][1]]});}if(e&&2===e.length){const t=s.maxRandomnessOffset;o.push({op:"lineTo",data:[e[0]+W(t,s),e[1]+W(t,s)]});}}else 3===n?(o.push({op:"move",data:[t[1][0],t[1][1]]}),o.push({op:"bcurveTo",data:[t[1][0],t[1][1],t[2][0],t[2][1],t[2][0],t[2][1]]})):2===n&&o.push(...z(t[0][0],t[0][1],t[1][0],t[1][1],s));return o}function q(t,e,s,n,o,a,r,h){const i=[],c=[],l=W(.5,h)-Math.PI/2,u=0===h.roughness;u||c.push([W(a,h)+e+.9*n*Math.cos(l-t),W(a,h)+s+.9*o*Math.sin(l-t)]);const p=2*Math.PI+(u?0:l-.01);for(let r=l;r<p;r+=t){const t=[W(a,h)+e+n*Math.cos(r),W(a,h)+s+o*Math.sin(r)];i.push(t),c.push(t);}return u||(c.push([W(a,h)+e+n*Math.cos(l+2*Math.PI+.5*r),W(a,h)+s+o*Math.sin(l+2*Math.PI+.5*r)]),c.push([W(a,h)+e+.98*n*Math.cos(l+r),W(a,h)+s+.98*o*Math.sin(l+r)]),c.push([W(a,h)+e+.9*n*Math.cos(l+.5*r),W(a,h)+s+.9*o*Math.sin(l+.5*r)])),[c,i]}function F(t,e,s,n,o,a,r,h,i){const c=a+W(.1,i),l=[];l.push([W(h,i)+e+.9*n*Math.cos(c-t),W(h,i)+s+.9*o*Math.sin(c-t)]);for(let a=c;a<=r;a+=t)l.push([W(h,i)+e+n*Math.cos(a),W(h,i)+s+o*Math.sin(a)]);return l.push([e+n*Math.cos(r),s+o*Math.sin(r)]),l.push([e+n*Math.cos(r),s+o*Math.sin(r)]),G(l,null,i)}function j(t,e,s,n,o,a,r,h){const i=[],c=[h.maxRandomnessOffset||1,(h.maxRandomnessOffset||1)+.3];let l=[0,0];const u=h.disableMultiStroke?1:2,p=h.preserveVertices;for(let f=0;f<u;f++)0===f?i.push({op:"move",data:[r[0],r[1]]}):i.push({op:"move",data:[r[0]+(p?0:W(c[0],h)),r[1]+(p?0:W(c[0],h))]}),l=p?[o,a]:[o+W(c[f],h),a+W(c[f],h)],i.push({op:"bcurveTo",data:[t+W(c[f],h),e+W(c[f],h),s+W(c[f],h),n+W(c[f],h),l[0],l[1]]});return i}function V(t){return [...t]}function N(t,e){return Math.pow(t[0]-e[0],2)+Math.pow(t[1]-e[1],2)}function Z(t,e,s){const n=N(e,s);if(0===n)return N(t,e);let o=((t[0]-e[0])*(s[0]-e[0])+(t[1]-e[1])*(s[1]-e[1]))/n;return o=Math.max(0,Math.min(1,o)),N(t,Q(e,s,o))}function Q(t,e,s){return [t[0]+(e[0]-t[0])*s,t[1]+(e[1]-t[1])*s]}function H(t,e,s,n){const o=n||[];if(function(t,e){const s=t[e+0],n=t[e+1],o=t[e+2],a=t[e+3];let r=3*n[0]-2*s[0]-a[0];r*=r;let h=3*n[1]-2*s[1]-a[1];h*=h;let i=3*o[0]-2*a[0]-s[0];i*=i;let c=3*o[1]-2*a[1]-s[1];return c*=c,r<i&&(r=i),h<c&&(h=c),r+h}(t,e)<s){const s=t[e+0];if(o.length){(a=o[o.length-1],r=s,Math.sqrt(N(a,r)))>1&&o.push(s);}else o.push(s);o.push(t[e+3]);}else {const n=.5,a=t[e+0],r=t[e+1],h=t[e+2],i=t[e+3],c=Q(a,r,n),l=Q(r,h,n),u=Q(h,i,n),p=Q(c,l,n),f=Q(l,u,n),d=Q(p,f,n);H([a,c,p,d],0,s,o),H([d,f,u,i],0,s,o);}var a,r;return o}function B(t,e){return X(t,0,t.length,e)}function X(t,e,s,n,o){const a=o||[],r=t[e],h=t[s-1];let i=0,c=1;for(let n=e+1;n<s-1;++n){const e=Z(t[n],r,h);e>i&&(i=e,c=n);}return Math.sqrt(i)>n?(X(t,e,c+1,n,a),X(t,c,s,n,a)):(a.length||a.push(r),a.push(h)),a}function J(t,e=.15,s){const n=[],o=(t.length-1)/3;for(let s=0;s<o;s++){H(t,3*s,e,n);}return s&&s>0?X(n,0,n.length,s):n}const K="none";class U{constructor(t){this.defaultOptions={maxRandomnessOffset:2,roughness:1,bowing:1,stroke:"#000",strokeWidth:1,curveTightness:0,curveFitting:.95,curveStepCount:9,fillStyle:"hachure",fillWeight:-1,hachureAngle:-41,hachureGap:-1,dashOffset:-1,dashGap:-1,zigzagOffset:-1,seed:0,combineNestedSvgPaths:!1,disableMultiStroke:!1,disableMultiStrokeFill:!1,preserveVertices:!1},this.config=t||{},this.config.options&&(this.defaultOptions=this._o(this.config.options));}static newSeed(){return Math.floor(Math.random()*2**31)}_o(t){return t?Object.assign({},this.defaultOptions,t):this.defaultOptions}_d(t,e,s){return {shape:t,sets:e||[],options:s||this.defaultOptions}}line(t,e,s,n,o){const a=this._o(o);return this._d("line",[v(t,e,s,n,a)],a)}rectangle(t,e,s,n,o){const a=this._o(o),r=[],h=S(t,e,s,n,a);if(a.fill){const o=[[t,e],[t+s,e],[t+s,e+n],[t,e+n]];"solid"===a.fillStyle?r.push(A(o,a)):r.push(_(o,a));}return a.stroke!==K&&r.push(h),this._d("rectangle",r,a)}ellipse(t,e,s,n,o){const a=this._o(o),r=[],h=T(s,n,a),i=D(t,e,a,h);if(a.fill)if("solid"===a.fillStyle){const s=D(t,e,a,h).opset;s.type="fillPath",r.push(s);}else r.push(_(i.estimatedPoints,a));return a.stroke!==K&&r.push(i.opset),this._d("ellipse",r,a)}circle(t,e,s,n){const o=this.ellipse(t,e,s,s,n);return o.shape="circle",o}linearPath(t,e){const s=this._o(e);return this._d("linearPath",[O(t,!1,s)],s)}arc(t,e,s,n,o,a,r=!1,h){const i=this._o(h),c=[],l=I(t,e,s,n,o,a,r,!0,i);if(r&&i.fill)if("solid"===i.fillStyle){const r=Object.assign({},i);r.disableMultiStroke=!0;const h=I(t,e,s,n,o,a,!0,!1,r);h.type="fillPath",c.push(h);}else c.push(function(t,e,s,n,o,a,r){const h=t,i=e;let c=Math.abs(s/2),l=Math.abs(n/2);c+=W(.01*c,r),l+=W(.01*l,r);let u=o,p=a;for(;u<0;)u+=2*Math.PI,p+=2*Math.PI;p-u>2*Math.PI&&(u=0,p=2*Math.PI);const f=(p-u)/r.curveStepCount,d=[];for(let t=u;t<=p;t+=f)d.push([h+c*Math.cos(t),i+l*Math.sin(t)]);return d.push([h+c*Math.cos(p),i+l*Math.sin(p)]),d.push([h,i]),_(d,r)}(t,e,s,n,o,a,i));return i.stroke!==K&&c.push(l),this._d("arc",c,i)}curve(t,e){const s=this._o(e),n=[],o=L(t,s);if(s.fill&&s.fill!==K&&t.length>=3){const e=J(function(t,e=0){const s=t.length;if(s<3)throw new Error("A curve must have at least three points.");const n=[];if(3===s)n.push(V(t[0]),V(t[1]),V(t[2]),V(t[2]));else {const s=[];s.push(t[0],t[0]);for(let e=1;e<t.length;e++)s.push(t[e]),e===t.length-1&&s.push(t[e]);const o=[],a=1-e;n.push(V(s[0]));for(let t=1;t+2<s.length;t++){const e=s[t];o[0]=[e[0],e[1]],o[1]=[e[0]+(a*s[t+1][0]-a*s[t-1][0])/6,e[1]+(a*s[t+1][1]-a*s[t-1][1])/6],o[2]=[s[t+1][0]+(a*s[t][0]-a*s[t+2][0])/6,s[t+1][1]+(a*s[t][1]-a*s[t+2][1])/6],o[3]=[s[t+1][0],s[t+1][1]],n.push(o[1],o[2],o[3]);}}return n}(t),10,(1+s.roughness)/2);"solid"===s.fillStyle?n.push(A(e,s)):n.push(_(e,s));}return s.stroke!==K&&n.push(o),this._d("curve",n,s)}polygon(t,e){const s=this._o(e),n=[],o=O(t,!0,s);return s.fill&&("solid"===s.fillStyle?n.push(A(t,s)):n.push(_(t,s))),s.stroke!==K&&n.push(o),this._d("polygon",n,s)}path(t,e){const s=this._o(e),n=[];if(!t)return this._d("path",n,s);t=(t||"").replace(/\n/g," ").replace(/(-\s)/g,"-").replace("/(ss)/g"," ");const o=s.fill&&"transparent"!==s.fill&&s.fill!==K,a=s.stroke!==K,r=!!(s.simplification&&s.simplification<1),h=function(t,e,s){const n=m(y(b(t))),o=[];let a=[],r=[0,0],h=[];const i=()=>{h.length>=4&&a.push(...J(h,e)),h=[];},c=()=>{i(),a.length&&(o.push(a),a=[]);};for(const{key:t,data:e}of n)switch(t){case"M":c(),r=[e[0],e[1]],a.push(r);break;case"L":i(),a.push([e[0],e[1]]);break;case"C":if(!h.length){const t=a.length?a[a.length-1]:r;h.push([t[0],t[1]]);}h.push([e[0],e[1]]),h.push([e[2],e[3]]),h.push([e[4],e[5]]);break;case"Z":i(),a.push([r[0],r[1]]);}if(c(),!s)return o;const l=[];for(const t of o){const e=B(t,s);e.length&&l.push(e);}return l}(t,1,r?4-4*s.simplification:(1+s.roughness)/2);if(o)if(s.combineNestedSvgPaths){const t=[];h.forEach((e=>t.push(...e))),"solid"===s.fillStyle?n.push(A(t,s)):n.push(_(t,s));}else h.forEach((t=>{"solid"===s.fillStyle?n.push(A(t,s)):n.push(_(t,s));}));return a&&(r?h.forEach((t=>{n.push(O(t,!1,s));})):n.push(function(t,e){const s=m(y(b(t))),n=[];let o=[0,0],a=[0,0];for(const{key:t,data:r}of s)switch(t){case"M":{const t=1*(e.maxRandomnessOffset||0),s=e.preserveVertices;n.push({op:"move",data:r.map((n=>n+(s?0:W(t,e))))}),a=[r[0],r[1]],o=[r[0],r[1]];break}case"L":n.push(...z(a[0],a[1],r[0],r[1],e)),a=[r[0],r[1]];break;case"C":{const[t,s,o,h,i,c]=r;n.push(...j(t,s,o,h,i,c,a,e)),a=[i,c];break}case"Z":n.push(...z(a[0],a[1],o[0],o[1],e)),a=[o[0],o[1]];}return {type:"path",ops:n}}(t,s))),this._d("path",n,s)}opsToPath(t,e){let s="";for(const n of t.ops){const t="number"==typeof e&&e>=0?n.data.map((t=>+t.toFixed(e))):n.data;switch(n.op){case"move":s+=`M${t[0]} ${t[1]} `;break;case"bcurveTo":s+=`C${t[0]} ${t[1]}, ${t[2]} ${t[3]}, ${t[4]} ${t[5]} `;break;case"lineTo":s+=`L${t[0]} ${t[1]} `;}}return s.trim()}toPaths(t){const e=t.sets||[],s=t.options||this.defaultOptions,n=[];for(const t of e){let e=null;switch(t.type){case"path":e={d:this.opsToPath(t),stroke:s.stroke,strokeWidth:s.strokeWidth,fill:K};break;case"fillPath":e={d:this.opsToPath(t),stroke:K,strokeWidth:0,fill:s.fill||K};break;case"fillSketch":e=this.fillSketch(t,s);}e&&n.push(e);}return n}fillSketch(t,e){let s=e.fillWeight;return s<0&&(s=e.strokeWidth/2),{d:this.opsToPath(t),stroke:e.fill||K,strokeWidth:s,fill:K}}}class Y{constructor(t,e){this.canvas=t,this.ctx=this.canvas.getContext("2d"),this.gen=new U(e);}draw(t){const e=t.sets||[],s=t.options||this.getDefaultOptions(),n=this.ctx,o=t.options.fixedDecimalPlaceDigits;for(const a of e)switch(a.type){case"path":n.save(),n.strokeStyle="none"===s.stroke?"transparent":s.stroke,n.lineWidth=s.strokeWidth,s.strokeLineDash&&n.setLineDash(s.strokeLineDash),s.strokeLineDashOffset&&(n.lineDashOffset=s.strokeLineDashOffset),this._drawToContext(n,a,o),n.restore();break;case"fillPath":{n.save(),n.fillStyle=s.fill||"";const e="curve"===t.shape||"polygon"===t.shape?"evenodd":"nonzero";this._drawToContext(n,a,o,e),n.restore();break}case"fillSketch":this.fillSketch(n,a,s);}}fillSketch(t,e,s){let n=s.fillWeight;n<0&&(n=s.strokeWidth/2),t.save(),s.fillLineDash&&t.setLineDash(s.fillLineDash),s.fillLineDashOffset&&(t.lineDashOffset=s.fillLineDashOffset),t.strokeStyle=s.fill||"",t.lineWidth=n,this._drawToContext(t,e,s.fixedDecimalPlaceDigits),t.restore();}_drawToContext(t,e,s,n="nonzero"){t.beginPath();for(const n of e.ops){const e="number"==typeof s&&s>=0?n.data.map((t=>+t.toFixed(s))):n.data;switch(n.op){case"move":t.moveTo(e[0],e[1]);break;case"bcurveTo":t.bezierCurveTo(e[0],e[1],e[2],e[3],e[4],e[5]);break;case"lineTo":t.lineTo(e[0],e[1]);}}"fillPath"===e.type?t.fill(n):t.stroke();}get generator(){return this.gen}getDefaultOptions(){return this.gen.defaultOptions}line(t,e,s,n,o){const a=this.gen.line(t,e,s,n,o);return this.draw(a),a}rectangle(t,e,s,n,o){const a=this.gen.rectangle(t,e,s,n,o);return this.draw(a),a}ellipse(t,e,s,n,o){const a=this.gen.ellipse(t,e,s,n,o);return this.draw(a),a}circle(t,e,s,n){const o=this.gen.circle(t,e,s,n);return this.draw(o),o}linearPath(t,e){const s=this.gen.linearPath(t,e);return this.draw(s),s}polygon(t,e){const s=this.gen.polygon(t,e);return this.draw(s),s}arc(t,e,s,n,o,a,r=!1,h){const i=this.gen.arc(t,e,s,n,o,a,r,h);return this.draw(i),i}curve(t,e){const s=this.gen.curve(t,e);return this.draw(s),s}path(t,e){const s=this.gen.path(t,e);return this.draw(s),s}}const tt="http://www.w3.org/2000/svg";class et{constructor(t,e){this.svg=t,this.gen=new U(e);}draw(t){const e=t.sets||[],s=t.options||this.getDefaultOptions(),n=this.svg.ownerDocument||window.document,o=n.createElementNS(tt,"g"),a=t.options.fixedDecimalPlaceDigits;for(const r of e){let e=null;switch(r.type){case"path":e=n.createElementNS(tt,"path"),e.setAttribute("d",this.opsToPath(r,a)),e.setAttribute("stroke",s.stroke),e.setAttribute("stroke-width",s.strokeWidth+""),e.setAttribute("fill","none"),s.strokeLineDash&&e.setAttribute("stroke-dasharray",s.strokeLineDash.join(" ").trim()),s.strokeLineDashOffset&&e.setAttribute("stroke-dashoffset",`${s.strokeLineDashOffset}`);break;case"fillPath":e=n.createElementNS(tt,"path"),e.setAttribute("d",this.opsToPath(r,a)),e.setAttribute("stroke","none"),e.setAttribute("stroke-width","0"),e.setAttribute("fill",s.fill||""),"curve"!==t.shape&&"polygon"!==t.shape||e.setAttribute("fill-rule","evenodd");break;case"fillSketch":e=this.fillSketch(n,r,s);}e&&o.appendChild(e);}return o}fillSketch(t,e,s){let n=s.fillWeight;n<0&&(n=s.strokeWidth/2);const o=t.createElementNS(tt,"path");return o.setAttribute("d",this.opsToPath(e,s.fixedDecimalPlaceDigits)),o.setAttribute("stroke",s.fill||""),o.setAttribute("stroke-width",n+""),o.setAttribute("fill","none"),s.fillLineDash&&o.setAttribute("stroke-dasharray",s.fillLineDash.join(" ").trim()),s.fillLineDashOffset&&o.setAttribute("stroke-dashoffset",`${s.fillLineDashOffset}`),o}get generator(){return this.gen}getDefaultOptions(){return this.gen.defaultOptions}opsToPath(t,e){return this.gen.opsToPath(t,e)}line(t,e,s,n,o){const a=this.gen.line(t,e,s,n,o);return this.draw(a)}rectangle(t,e,s,n,o){const a=this.gen.rectangle(t,e,s,n,o);return this.draw(a)}ellipse(t,e,s,n,o){const a=this.gen.ellipse(t,e,s,n,o);return this.draw(a)}circle(t,e,s,n){const o=this.gen.circle(t,e,s,n);return this.draw(o)}linearPath(t,e){const s=this.gen.linearPath(t,e);return this.draw(s)}polygon(t,e){const s=this.gen.polygon(t,e);return this.draw(s)}arc(t,e,s,n,o,a,r=!1,h){const i=this.gen.arc(t,e,s,n,o,a,r,h);return this.draw(i)}curve(t,e){const s=this.gen.curve(t,e);return this.draw(s)}path(t,e){const s=this.gen.path(t,e);return this.draw(s)}}var st={canvas:(t,e)=>new Y(t,e),svg:(t,e)=>new et(t,e),generator:t=>new U(t),newSeed:()=>U.newSeed()};

var defs = "\n<defs>\n  <style>\n    @font-face {\n      font-family: 'Patrick Hand';\n      font-style: normal;\n      font-weight: 400;\n      font-display: swap;\n      src: local('Patrick Hand'), local('PatrickHand-Regular'), url(data:font/woff2;base64,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) format('woff2');\n      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n    }\n  </style>\n</defs>\n";

var Alignment;
(function (Alignment) {
    Alignment["LEFT"] = "left";
    Alignment["MIDDLE"] = "middle";
    Alignment["RIGHT"] = "right";
})(Alignment || (Alignment = {}));
var Renderer = /** @class */ (function () {
    function Renderer(container) {
        this.container = container;
    }
    Renderer.trianglePath = function (x, y, size) {
        return "M" + (x + size / 2) + " " + y + " L" + (x + size) + " " + (y + size) + " L" + x + " " + (y + size);
    };
    Renderer.ngonPath = function (x, y, size, edges) {
        var i;
        var a;
        var degrees = 360 / edges;
        var radius = size / 2;
        var points = [];
        var curX = x;
        var curY = y;
        for (i = 0; i < edges; i += 1) {
            a = i * degrees - 90;
            curX = radius + radius * Math.cos((a * Math.PI) / 180);
            curY = radius + radius * Math.sin((a * Math.PI) / 180);
            points.push([curX, curY]);
        }
        var lines = points.reduce(function (acc, _a) {
            var _b = __read(_a, 2), posX = _b[0], posY = _b[1];
            return acc + " L" + posX + " " + posY;
        }, '');
        return "M" + curX + " " + curY + " " + lines;
    };
    Renderer.toClassName = function (classes) {
        if (!classes) {
            return '';
        }
        return Array.isArray(classes) ? classes.join(' ') : classes;
    };
    return Renderer;
}());

/* istanbul ignore file */
/**
 * Currently the font is hard-coded to 'Patrick Hand' when using the handdrawn chord diagram style.
 * The reason is that the font needs to be base64 encoded and embedded in the SVG. In theory a web-font
 * could be downloaded, base64 encoded and embedded in the SVG but that's too much of a hassle. But if the
 * need arises it should be possible.
 */
var FONT_FAMLILY = 'Patrick Hand';
var RoughJsRenderer = /** @class */ (function (_super) {
    __extends(RoughJsRenderer, _super);
    function RoughJsRenderer(container) {
        var _this = _super.call(this, container) || this;
        // initialize the container
        if (container instanceof HTMLElement) {
            _this.containerNode = container;
        }
        else {
            _this.containerNode = container;
            var node = document.querySelector(container);
            if (!node) {
                throw new Error("No element found with selector \"" + container + "\"");
            }
            _this.containerNode = node;
        }
        // create an empty SVG element
        _this.svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        _this.svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        _this.svgNode.setAttribute('version', '1.1');
        _this.svgNode.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        _this.svgNode.setAttribute('xmlns:svgjs', 'http://svgjs.com/svgjs');
        _this.svgNode.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        _this.svgNode.setAttribute('viewBox', '0 0 400 400');
        _this.embedDefs();
        _this.containerNode.appendChild(_this.svgNode);
        _this.rc = st.svg(_this.svgNode);
        return _this;
    }
    /**
     * This will embed all defs defined in the defs.html file. Specifically this is used to embed the base64
     * encoded font into the SVG so that the font always looks correct.
     */
    RoughJsRenderer.prototype.embedDefs = function () {
        var _this = this;
        /*
        Embed the base64 encoded font. This is done in a timeout because roughjs also creates defs which will simply overwrite existing defs.
        By putting this in a timeout we make sure that the style tag is added after roughjs finished rendering.
        ATTENTION: This will only work as long as we're synchronously rendering the diagram! If we ever switch to asynchronous rendering a different
        solution must be found.
        */
        setTimeout(function () {
            var _a, _b, _c;
            // check if defs were already added
            if (_this.svgNode.querySelector('defs [data-svguitar-def]')) {
                return;
            }
            var currentDefs = _this.svgNode.querySelector('defs');
            if (!currentDefs) {
                currentDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                _this.svgNode.prepend(currentDefs);
            }
            // create dom nodes from HTML string
            var template = document.createElement('template');
            template.innerHTML = defs.trim();
            // typescript is complaining when I access content.firstChild.children, therefore this ugly workaround.
            var defsToAdd = (_c = (_b = (_a = template.content.firstChild) === null || _a === void 0 ? void 0 : _a.firstChild) === null || _b === void 0 ? void 0 : _b.parentElement) === null || _c === void 0 ? void 0 : _c.children;
            if (defsToAdd) {
                Array.from(defsToAdd).forEach(function (def) {
                    def.setAttribute('data-svguitar-def', 'true');
                    currentDefs === null || currentDefs === void 0 ? void 0 : currentDefs.appendChild(def);
                });
            }
        });
    };
    RoughJsRenderer.prototype.circle = function (x, y, diameter, strokeWidth, strokeColor, fill, classes) {
        var _a;
        var options = {
            fill: fill || 'none',
            fillWeight: 2.5,
            stroke: strokeColor || fill || 'none',
            roughness: 1.5,
        };
        if (strokeWidth > 0) {
            options.strokeWidth = strokeWidth;
        }
        var circle = this.rc.circle(x + diameter / 2, y + diameter / 2, diameter, options);
        (_a = circle.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
        this.svgNode.appendChild(circle);
        return RoughJsRenderer.boxToElement(circle.getBBox(), function () {
            return circle ? circle.remove() : undefined;
        });
    };
    RoughJsRenderer.prototype.clear = function () {
        while (this.svgNode.firstChild) {
            this.svgNode.removeChild(this.svgNode.firstChild);
        }
        this.rc = st.svg(this.svgNode);
        this.embedDefs();
    };
    RoughJsRenderer.prototype.remove = function () {
        this.svgNode.remove();
    };
    RoughJsRenderer.prototype.line = function (x1, y1, x2, y2, strokeWidth, color, classes) {
        var _a;
        if (strokeWidth > 5 && (x1 - x2 === 0 || y1 - y2 === 0)) {
            if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
                this.rect(x1, y1, x2 - x1, strokeWidth, 0, color, color);
            }
            else {
                this.rect(x1 - strokeWidth / 2, y1, strokeWidth, y2 - y1, 0, color, color);
            }
        }
        else {
            var line = this.rc.line(x1, y1, x2, y2, {
                strokeWidth: strokeWidth,
                stroke: color,
            });
            (_a = line.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
            this.svgNode.appendChild(line);
        }
    };
    RoughJsRenderer.prototype.rect = function (x, y, width, height, strokeWidth, strokeColor, classes, fill, radius) {
        var _a, _b;
        var rect2 = this.rc.rectangle(x, y, width, height, {
            // fill: fill || 'none',
            fill: 'none',
            fillWeight: 2,
            strokeWidth: strokeWidth,
            stroke: strokeColor,
            roughness: 2.8,
            fillStyle: 'cross-hatch',
            hachureAngle: 60,
            hachureGap: 4,
        });
        var rectRadius = radius || 0;
        var path = RoughJsRenderer.roundedRectData(width, height, rectRadius, rectRadius, rectRadius, rectRadius);
        var rect = this.rc.path(path, {
            fill: fill || 'none',
            fillWeight: 2.5,
            stroke: strokeColor || fill || 'none',
            roughness: 1.5,
        });
        rect.setAttribute('transform', "translate(" + x + ", " + y + ")");
        (_a = rect.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
        (_b = rect2.classList).add.apply(_b, __spread(RoughJsRenderer.toClassArray(classes)));
        this.svgNode.appendChild(rect);
        this.svgNode.appendChild(rect2);
        return RoughJsRenderer.boxToElement(rect.getBBox(), function () { return rect.remove(); });
    };
    RoughJsRenderer.prototype.triangle = function (x, y, size, strokeWidth, strokeColor, classes, fill) {
        var _a;
        var triangle = this.rc.path(Renderer.trianglePath(0, 0, size), {
            fill: fill || 'none',
            fillWeight: 2.5,
            stroke: strokeColor || fill || 'none',
            roughness: 1.5,
        });
        triangle.setAttribute('transform', "translate(" + x + ", " + y + ")");
        (_a = triangle.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
        this.svgNode.appendChild(triangle);
        return RoughJsRenderer.boxToElement(triangle.getBBox(), function () { return triangle.remove(); });
    };
    RoughJsRenderer.prototype.pentagon = function (x, y, size, strokeWidth, strokeColor, fill, classes, spikes) {
        var _a;
        if (spikes === void 0) { spikes = 5; }
        var pentagon = this.rc.path(Renderer.ngonPath(0, 0, size, spikes), {
            fill: fill || 'none',
            fillWeight: 2.5,
            stroke: strokeColor || fill || 'none',
            roughness: 1.5,
        });
        pentagon.setAttribute('transform', "translate(" + x + ", " + y + ")");
        (_a = pentagon.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
        this.svgNode.appendChild(pentagon);
        return RoughJsRenderer.boxToElement(pentagon.getBBox(), function () { return pentagon.remove(); });
    };
    RoughJsRenderer.prototype.size = function (width, height) {
        this.svgNode.setAttribute('viewBox', "0 0 " + Math.ceil(width) + " " + Math.ceil(height));
    };
    RoughJsRenderer.prototype.background = function (color) {
        var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttributeNS(null, 'width', '100%');
        bg.setAttributeNS(null, 'height', '100%');
        bg.setAttributeNS(null, 'fill', color);
        this.svgNode.insertBefore(bg, this.svgNode.firstChild);
    };
    RoughJsRenderer.prototype.text = function (text, x, y, fontSize, color, fontFamily, alignment, classes, plain) {
        var _a;
        // Place the SVG namespace in a variable to easily reference it.
        var txtElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txtElem.setAttributeNS(null, 'x', String(x));
        txtElem.setAttributeNS(null, 'y', String(y));
        txtElem.setAttributeNS(null, 'font-size', String(fontSize));
        txtElem.setAttributeNS(null, 'font-family', FONT_FAMLILY);
        txtElem.setAttributeNS(null, 'align', alignment);
        txtElem.setAttributeNS(null, 'fill', color);
        if (plain) {
            txtElem.setAttributeNS(null, 'dominant-baseline', 'central');
        }
        txtElem.appendChild(document.createTextNode(text));
        this.svgNode.appendChild(txtElem);
        var bbox = txtElem.getBBox();
        var xOffset;
        switch (alignment) {
            case Alignment.MIDDLE:
                xOffset = -(bbox.width / 2);
                break;
            case Alignment.LEFT:
                xOffset = 0;
                break;
            case Alignment.RIGHT:
                xOffset = -bbox.width;
                break;
            default:
                throw new Error("Invalid alignment " + alignment);
        }
        (_a = txtElem.classList).add.apply(_a, __spread(RoughJsRenderer.toClassArray(classes)));
        txtElem.setAttributeNS(null, 'x', String(x + xOffset));
        txtElem.setAttributeNS(null, 'y', String(y + (plain ? 0 : bbox.height / 2)));
        return RoughJsRenderer.boxToElement(txtElem.getBBox(), txtElem.remove.bind(txtElem));
    };
    RoughJsRenderer.boxToElement = function (box, remove) {
        return {
            width: box.width,
            height: box.height,
            x: box.x,
            y: box.y,
            remove: remove,
        };
    };
    RoughJsRenderer.roundedRectData = function (w, h, tlr, trr, brr, blr) {
        return ("M 0 " + tlr + " A " + tlr + " " + tlr + " 0 0 1 " + tlr + " 0" +
            (" L " + (w - trr) + " 0") +
            (" A " + trr + " " + trr + " 0 0 1 " + w + " " + trr + " L " + w + " " + (h - brr) + " A " + brr + " " + brr + " 0 0 1 " + (w - brr) + " " + h + " L " + blr + " " + h + " A " + blr + " " + blr + " 0 0 1 0 " + (h - blr) + " Z"));
    };
    RoughJsRenderer.toClassArray = function (classes) {
        if (!classes) {
            return [];
        }
        return Renderer.toClassName(classes).split(' ');
    };
    return RoughJsRenderer;
}(Renderer));

const methods = {};
const names = [];

function registerMethods (name, m) {
  if (Array.isArray(name)) {
    for (const _name of name) {
      registerMethods(_name, m);
    }
    return
  }

  if (typeof name === 'object') {
    for (const _name in name) {
      registerMethods(_name, name[_name]);
    }
    return
  }

  addMethodNames(Object.getOwnPropertyNames(m));
  methods[name] = Object.assign(methods[name] || {}, m);
}

function getMethodsFor (name) {
  return methods[name] || {}
}

function getMethodNames () {
  return [ ...new Set(names) ]
}

function addMethodNames (_names) {
  names.push(..._names);
}

// Map function
function map (array, block) {
  var i;
  var il = array.length;
  var result = [];

  for (i = 0; i < il; i++) {
    result.push(block(array[i]));
  }

  return result
}

// Degrees to radians
function radians (d) {
  return d % 360 * Math.PI / 180
}

// Convert dash-separated-string to camelCase
function camelCase (s) {
  return s.toLowerCase().replace(/-(.)/g, function (m, g) {
    return g.toUpperCase()
  })
}

// Convert camel cased string to string seperated
function unCamelCase (s) {
  return s.replace(/([A-Z])/g, function (m, g) {
    return '-' + g.toLowerCase()
  })
}

// Capitalize first letter of a string
function capitalize (s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Calculate proportional width and height values when necessary
function proportionalSize (element, width, height, box) {
  if (width == null || height == null) {
    box = box || element.bbox();

    if (width == null) {
      width = box.width / box.height * height;
    } else if (height == null) {
      height = box.height / box.width * width;
    }
  }

  return {
    width: width,
    height: height
  }
}

function getOrigin (o, element) {
  // Allow origin or around as the names
  const origin = o.origin; // o.around == null ? o.origin : o.around
  let ox, oy;

  // Allow the user to pass a string to rotate around a given point
  if (typeof origin === 'string' || origin == null) {
    // Get the bounding box of the element with no transformations applied
    const string = (origin || 'center').toLowerCase().trim();
    const { height, width, x, y } = element.bbox();

    // Calculate the transformed x and y coordinates
    const bx = string.includes('left') ? x
      : string.includes('right') ? x + width
      : x + width / 2;
    const by = string.includes('top') ? y
      : string.includes('bottom') ? y + height
      : y + height / 2;

    // Set the bounds eg : "bottom-left", "Top right", "middle" etc...
    ox = o.ox != null ? o.ox : bx;
    oy = o.oy != null ? o.oy : by;
  } else {
    ox = origin[0];
    oy = origin[1];
  }

  // Return the origin as it is if it wasn't a string
  return [ ox, oy ]
}

// Default namespaces
const ns = 'http://www.w3.org/2000/svg';
const xmlns = 'http://www.w3.org/2000/xmlns/';
const xlink = 'http://www.w3.org/1999/xlink';
const svgjs = 'http://svgjs.com/svgjs';

const globals = {
  window: typeof window === 'undefined' ? null : window,
  document: typeof document === 'undefined' ? null : document
};

class Base {
  // constructor (node/*, {extensions = []} */) {
  //   // this.tags = []
  //   //
  //   // for (let extension of extensions) {
  //   //   extension.setup.call(this, node)
  //   //   this.tags.push(extension.name)
  //   // }
  // }
}

const elements = {};
const root = '___SYMBOL___ROOT___';

// Method for element creation
function create (name) {
  // create element
  return globals.document.createElementNS(ns, name)
}

function makeInstance (element) {
  if (element instanceof Base) return element

  if (typeof element === 'object') {
    return adopter(element)
  }

  if (element == null) {
    return new elements[root]()
  }

  if (typeof element === 'string' && element.charAt(0) !== '<') {
    return adopter(globals.document.querySelector(element))
  }

  var node = create('svg');
  node.innerHTML = element;

  // We can use firstChild here because we know,
  // that the first char is < and thus an element
  element = adopter(node.firstChild);

  return element
}

function nodeOrNew (name, node) {
  return node instanceof globals.window.Node ? node : create(name)
}

// Adopt existing svg elements
function adopt (node) {
  // check for presence of node
  if (!node) return null

  // make sure a node isn't already adopted
  if (node.instance instanceof Base) return node.instance

  // initialize variables
  var className = capitalize(node.nodeName || 'Dom');

  // Make sure that gradients are adopted correctly
  if (className === 'LinearGradient' || className === 'RadialGradient') {
    className = 'Gradient';

  // Fallback to Dom if element is not known
  } else if (!elements[className]) {
    className = 'Dom';
  }

  return new elements[className](node)
}

let adopter = adopt;

function register (element, name = element.name, asRoot = false) {
  elements[name] = element;
  if (asRoot) elements[root] = element;

  addMethodNames(Object.getOwnPropertyNames(element.prototype));

  return element
}

function getClass (name) {
  return elements[name]
}

// Element id sequence
let did = 1000;

// Get next named element id
function eid (name) {
  return 'Svgjs' + capitalize(name) + (did++)
}

// Deep new id assignment
function assignNewId (node) {
  // do the same for SVG child nodes as well
  for (var i = node.children.length - 1; i >= 0; i--) {
    assignNewId(node.children[i]);
  }

  if (node.id) {
    return adopt(node).id(eid(node.nodeName))
  }

  return adopt(node)
}

// Method for extending objects
function extend (modules, methods, attrCheck) {
  var key, i;

  modules = Array.isArray(modules) ? modules : [ modules ];

  for (i = modules.length - 1; i >= 0; i--) {
    for (key in methods) {
      let method = methods[key];
      if (attrCheck) {
        method = wrapWithAttrCheck(methods[key]);
      }
      modules[i].prototype[key] = method;
    }
  }
}

// export function extendWithAttrCheck (...args) {
//   extend(...args, true)
// }

function wrapWithAttrCheck (fn) {
  return function (...args) {
    const o = args[args.length - 1];

    if (o && o.constructor === Object && !(o instanceof Array)) {
      return fn.apply(this, args.slice(0, -1)).attr(o)
    } else {
      return fn.apply(this, args)
    }
  }
}

// Get all siblings, including myself
function siblings () {
  return this.parent().children()
}

// Get the curent position siblings
function position () {
  return this.parent().index(this)
}

// Get the next element (will return null if there is none)
function next () {
  return this.siblings()[this.position() + 1]
}

// Get the next element (will return null if there is none)
function prev () {
  return this.siblings()[this.position() - 1]
}

// Send given element one step forward
function forward () {
  var i = this.position() + 1;
  var p = this.parent();

  // move node one step forward
  p.removeElement(this).add(this, i);

  // make sure defs node is always at the top
  if (typeof p.isRoot === 'function' && p.isRoot()) {
    p.node.appendChild(p.defs().node);
  }

  return this
}

// Send given element one step backward
function backward () {
  var i = this.position();

  if (i > 0) {
    this.parent().removeElement(this).add(this, i - 1);
  }

  return this
}

// Send given element all the way to the front
function front () {
  var p = this.parent();

  // Move node forward
  p.node.appendChild(this.node);

  // Make sure defs node is always at the top
  if (typeof p.isRoot === 'function' && p.isRoot()) {
    p.node.appendChild(p.defs().node);
  }

  return this
}

// Send given element all the way to the back
function back () {
  if (this.position() > 0) {
    this.parent().removeElement(this).add(this, 0);
  }

  return this
}

// Inserts a given element before the targeted element
function before (element) {
  element = makeInstance(element);
  element.remove();

  var i = this.position();

  this.parent().add(element, i);

  return this
}

// Inserts a given element after the targeted element
function after (element) {
  element = makeInstance(element);
  element.remove();

  var i = this.position();

  this.parent().add(element, i + 1);

  return this
}

function insertBefore (element) {
  element = makeInstance(element);
  element.before(this);
  return this
}

function insertAfter (element) {
  element = makeInstance(element);
  element.after(this);
  return this
}

registerMethods('Dom', {
  siblings,
  position,
  next,
  prev,
  forward,
  backward,
  front,
  back,
  before,
  after,
  insertBefore,
  insertAfter
});

// Parse unit value
const numberAndUnit = /^([+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)([a-z%]*)$/i;

// Parse hex value
const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

// Parse rgb value
const rgb = /rgb\((\d+),(\d+),(\d+)\)/;

// Parse reference id
const reference = /(#[a-z0-9\-_]+)/i;

// splits a transformation chain
const transforms = /\)\s*,?\s*/;

// Whitespace
const whitespace = /\s/g;

// Test hex value
const isHex = /^#[a-f0-9]{3,6}$/i;

// Test rgb value
const isRgb = /^rgb\(/;

// Test for blank string
const isBlank = /^(\s+)?$/;

// Test for numeric string
const isNumber = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

// Test for image url
const isImage = /\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i;

// split at whitespace and comma
const delimiter = /[\s,]+/;

// The following regex are used to parse the d attribute of a path

// Matches all hyphens which are not after an exponent
const hyphen = /([^e])-/gi;

// Replaces and tests for all path letters
const pathLetters = /[MLHVCSQTAZ]/gi;

// yes we need this one, too
const isPathLetter = /[MLHVCSQTAZ]/i;

// matches 0.154.23.45
const numbersWithDots = /((\d?\.\d+(?:e[+-]?\d+)?)((?:\.\d+(?:e[+-]?\d+)?)+))+/gi;

// matches .
const dots = /\./g;

// Return array of classes on the node
function classes () {
  var attr = this.attr('class');
  return attr == null ? [] : attr.trim().split(delimiter)
}

// Return true if class exists on the node, false otherwise
function hasClass (name) {
  return this.classes().indexOf(name) !== -1
}

// Add class to the node
function addClass (name) {
  if (!this.hasClass(name)) {
    var array = this.classes();
    array.push(name);
    this.attr('class', array.join(' '));
  }

  return this
}

// Remove class from the node
function removeClass (name) {
  if (this.hasClass(name)) {
    this.attr('class', this.classes().filter(function (c) {
      return c !== name
    }).join(' '));
  }

  return this
}

// Toggle the presence of a class on the node
function toggleClass (name) {
  return this.hasClass(name) ? this.removeClass(name) : this.addClass(name)
}

registerMethods('Dom', {
  classes, hasClass, addClass, removeClass, toggleClass
});

// Dynamic style generator
function css (style, val) {
  const ret = {};
  if (arguments.length === 0) {
    // get full style as object
    this.node.style.cssText.split(/\s*;\s*/)
      .filter(function (el) {
        return !!el.length
      })
      .forEach(function (el) {
        const t = el.split(/\s*:\s*/);
        ret[t[0]] = t[1];
      });
    return ret
  }

  if (arguments.length < 2) {
    // get style properties in the array
    if (Array.isArray(style)) {
      for (const name of style) {
        const cased = camelCase(name);
        ret[cased] = this.node.style[cased];
      }
      return ret
    }

    // get style for property
    if (typeof style === 'string') {
      return this.node.style[camelCase(style)]
    }

    // set styles in object
    if (typeof style === 'object') {
      for (const name in style) {
        // set empty string if null/undefined/'' was given
        this.node.style[camelCase(name)]
          = (style[name] == null || isBlank.test(style[name])) ? '' : style[name];
      }
    }
  }

  // set style for property
  if (arguments.length === 2) {
    this.node.style[camelCase(style)]
      = (val == null || isBlank.test(val)) ? '' : val;
  }

  return this
}

// Show element
function show () {
  return this.css('display', '')
}

// Hide element
function hide () {
  return this.css('display', 'none')
}

// Is element visible?
function visible () {
  return this.css('display') !== 'none'
}

registerMethods('Dom', {
  css, show, hide, visible
});

// Store data values on svg nodes
function data (a, v, r) {
  if (typeof a === 'object') {
    for (v in a) {
      this.data(v, a[v]);
    }
  } else if (arguments.length < 2) {
    try {
      return JSON.parse(this.attr('data-' + a))
    } catch (e) {
      return this.attr('data-' + a)
    }
  } else {
    this.attr('data-' + a,
      v === null ? null
      : r === true || typeof v === 'string' || typeof v === 'number' ? v
      : JSON.stringify(v)
    );
  }

  return this
}

registerMethods('Dom', { data });

// Remember arbitrary data
function remember (k, v) {
  // remember every item in an object individually
  if (typeof arguments[0] === 'object') {
    for (var key in k) {
      this.remember(key, k[key]);
    }
  } else if (arguments.length === 1) {
    // retrieve memory
    return this.memory()[k]
  } else {
    // store memory
    this.memory()[k] = v;
  }

  return this
}

// Erase a given memory
function forget () {
  if (arguments.length === 0) {
    this._memory = {};
  } else {
    for (var i = arguments.length - 1; i >= 0; i--) {
      delete this.memory()[arguments[i]];
    }
  }
  return this
}

// This triggers creation of a new hidden class which is not performant
// However, this function is not rarely used so it will not happen frequently
// Return local memory object
function memory () {
  return (this._memory = this._memory || {})
}

registerMethods('Dom', { remember, forget, memory });

let listenerId = 0;
const windowEvents = {};

function getEvents (instance) {
  let n = instance.getEventHolder();

  // We dont want to save events in global space
  if (n === globals.window) n = windowEvents;
  if (!n.events) n.events = {};
  return n.events
}

function getEventTarget (instance) {
  return instance.getEventTarget()
}

function clearEvents (instance) {
  const n = instance.getEventHolder();
  if (n.events) n.events = {};
}

// Add event binder in the SVG namespace
function on (node, events, listener, binding, options) {
  var l = listener.bind(binding || node);
  var instance = makeInstance(node);
  var bag = getEvents(instance);
  var n = getEventTarget(instance);

  // events can be an array of events or a string of events
  events = Array.isArray(events) ? events : events.split(delimiter);

  // add id to listener
  if (!listener._svgjsListenerId) {
    listener._svgjsListenerId = ++listenerId;
  }

  events.forEach(function (event) {
    var ev = event.split('.')[0];
    var ns = event.split('.')[1] || '*';

    // ensure valid object
    bag[ev] = bag[ev] || {};
    bag[ev][ns] = bag[ev][ns] || {};

    // reference listener
    bag[ev][ns][listener._svgjsListenerId] = l;

    // add listener
    n.addEventListener(ev, l, options || false);
  });
}

// Add event unbinder in the SVG namespace
function off (node, events, listener, options) {
  var instance = makeInstance(node);
  var bag = getEvents(instance);
  var n = getEventTarget(instance);

  // listener can be a function or a number
  if (typeof listener === 'function') {
    listener = listener._svgjsListenerId;
    if (!listener) return
  }

  // events can be an array of events or a string or undefined
  events = Array.isArray(events) ? events : (events || '').split(delimiter);

  events.forEach(function (event) {
    var ev = event && event.split('.')[0];
    var ns = event && event.split('.')[1];
    var namespace, l;

    if (listener) {
      // remove listener reference
      if (bag[ev] && bag[ev][ns || '*']) {
        // removeListener
        n.removeEventListener(ev, bag[ev][ns || '*'][listener], options || false);

        delete bag[ev][ns || '*'][listener];
      }
    } else if (ev && ns) {
      // remove all listeners for a namespaced event
      if (bag[ev] && bag[ev][ns]) {
        for (l in bag[ev][ns]) {
          off(n, [ ev, ns ].join('.'), l);
        }

        delete bag[ev][ns];
      }
    } else if (ns) {
      // remove all listeners for a specific namespace
      for (event in bag) {
        for (namespace in bag[event]) {
          if (ns === namespace) {
            off(n, [ event, ns ].join('.'));
          }
        }
      }
    } else if (ev) {
      // remove all listeners for the event
      if (bag[ev]) {
        for (namespace in bag[ev]) {
          off(n, [ ev, namespace ].join('.'));
        }

        delete bag[ev];
      }
    } else {
      // remove all listeners on a given node
      for (event in bag) {
        off(n, event);
      }

      clearEvents(instance);
    }
  });
}

function dispatch (node, event, data) {
  var n = getEventTarget(node);

  // Dispatch event
  if (event instanceof globals.window.Event) {
    n.dispatchEvent(event);
  } else {
    event = new globals.window.CustomEvent(event, { detail: data, cancelable: true });
    n.dispatchEvent(event);
  }
  return event
}

function sixDigitHex (hex) {
  return hex.length === 4
    ? [ '#',
      hex.substring(1, 2), hex.substring(1, 2),
      hex.substring(2, 3), hex.substring(2, 3),
      hex.substring(3, 4), hex.substring(3, 4)
    ].join('')
    : hex
}

function componentHex (component) {
  const integer = Math.round(component);
  const bounded = Math.max(0, Math.min(255, integer));
  const hex = bounded.toString(16);
  return hex.length === 1 ? '0' + hex : hex
}

function is (object, space) {
  for (let i = space.length; i--;) {
    if (object[space[i]] == null) {
      return false
    }
  }
  return true
}

function getParameters (a, b) {
  const params = is(a, 'rgb') ? { _a: a.r, _b: a.g, _c: a.b, space: 'rgb' }
    : is(a, 'xyz') ? { _a: a.x, _b: a.y, _c: a.z, _d: 0, space: 'xyz' }
    : is(a, 'hsl') ? { _a: a.h, _b: a.s, _c: a.l, _d: 0, space: 'hsl' }
    : is(a, 'lab') ? { _a: a.l, _b: a.a, _c: a.b, _d: 0, space: 'lab' }
    : is(a, 'lch') ? { _a: a.l, _b: a.c, _c: a.h, _d: 0, space: 'lch' }
    : is(a, 'cmyk') ? { _a: a.c, _b: a.m, _c: a.y, _d: a.k, space: 'cmyk' }
    : { _a: 0, _b: 0, _c: 0, space: 'rgb' };

  params.space = b || params.space;
  return params
}

function cieSpace (space) {
  if (space === 'lab' || space === 'xyz' || space === 'lch') {
    return true
  } else {
    return false
  }
}

function hueToRgb (p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

class Color {
  constructor (...inputs) {
    this.init(...inputs);
  }

  init (a = 0, b = 0, c = 0, d = 0, space = 'rgb') {
    // This catches the case when a falsy value is passed like ''
    a = !a ? 0 : a;

    // Reset all values in case the init function is rerun with new color space
    if (this.space) {
      for (const component in this.space) {
        delete this[this.space[component]];
      }
    }

    if (typeof a === 'number') {
      // Allow for the case that we don't need d...
      space = typeof d === 'string' ? d : space;
      d = typeof d === 'string' ? 0 : d;

      // Assign the values straight to the color
      Object.assign(this, { _a: a, _b: b, _c: c, _d: d, space });
    // If the user gave us an array, make the color from it
    } else if (a instanceof Array) {
      this.space = b || (typeof a[3] === 'string' ? a[3] : a[4]) || 'rgb';
      Object.assign(this, { _a: a[0], _b: a[1], _c: a[2], _d: a[3] || 0 });
    } else if (a instanceof Object) {
      // Set the object up and assign its values directly
      const values = getParameters(a, b);
      Object.assign(this, values);
    } else if (typeof a === 'string') {
      if (isRgb.test(a)) {
        const noWhitespace = a.replace(whitespace, '');
        const [ _a, _b, _c ] = rgb.exec(noWhitespace)
          .slice(1, 4).map(v => parseInt(v));
        Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
      } else if (isHex.test(a)) {
        const hexParse = v => parseInt(v, 16);
        const [ , _a, _b, _c ] = hex.exec(sixDigitHex(a)).map(hexParse);
        Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
      } else throw Error('Unsupported string format, can\'t construct Color')
    }

    // Now add the components as a convenience
    const { _a, _b, _c, _d } = this;
    const components = this.space === 'rgb' ? { r: _a, g: _b, b: _c }
      : this.space === 'xyz' ? { x: _a, y: _b, z: _c }
      : this.space === 'hsl' ? { h: _a, s: _b, l: _c }
      : this.space === 'lab' ? { l: _a, a: _b, b: _c }
      : this.space === 'lch' ? { l: _a, c: _b, h: _c }
      : this.space === 'cmyk' ? { c: _a, m: _b, y: _c, k: _d }
      : {};
    Object.assign(this, components);
  }

  /*
  Conversion Methods
  */

  rgb () {
    if (this.space === 'rgb') {
      return this
    } else if (cieSpace(this.space)) {
      // Convert to the xyz color space
      let { x, y, z } = this;
      if (this.space === 'lab' || this.space === 'lch') {
        // Get the values in the lab space
        let { l, a, b } = this;
        if (this.space === 'lch') {
          const { c, h } = this;
          const dToR = Math.PI / 180;
          a = c * Math.cos(dToR * h);
          b = c * Math.sin(dToR * h);
        }

        // Undo the nonlinear function
        const yL = (l + 16) / 116;
        const xL = a / 500 + yL;
        const zL = yL - b / 200;

        // Get the xyz values
        const ct = 16 / 116;
        const mx = 0.008856;
        const nm = 7.787;
        x = 0.95047 * ((xL ** 3 > mx) ? xL ** 3 : (xL - ct) / nm);
        y = 1.00000 * ((yL ** 3 > mx) ? yL ** 3 : (yL - ct) / nm);
        z = 1.08883 * ((zL ** 3 > mx) ? zL ** 3 : (zL - ct) / nm);
      }

      // Convert xyz to unbounded rgb values
      const rU = x * 3.2406 + y * -1.5372 + z * -0.4986;
      const gU = x * -0.9689 + y * 1.8758 + z * 0.0415;
      const bU = x * 0.0557 + y * -0.2040 + z * 1.0570;

      // Convert the values to true rgb values
      const pow = Math.pow;
      const bd = 0.0031308;
      const r = (rU > bd) ? (1.055 * pow(rU, 1 / 2.4) - 0.055) : 12.92 * rU;
      const g = (gU > bd) ? (1.055 * pow(gU, 1 / 2.4) - 0.055) : 12.92 * gU;
      const b = (bU > bd) ? (1.055 * pow(bU, 1 / 2.4) - 0.055) : 12.92 * bU;

      // Make and return the color
      const color = new Color(255 * r, 255 * g, 255 * b);
      return color
    } else if (this.space === 'hsl') {
      // https://bgrins.github.io/TinyColor/docs/tinycolor.html
      // Get the current hsl values
      let { h, s, l } = this;
      h /= 360;
      s /= 100;
      l /= 100;

      // If we are grey, then just make the color directly
      if (s === 0) {
        l *= 255;
        const color = new Color(l, l, l);
        return color
      }

      // TODO I have no idea what this does :D If you figure it out, tell me!
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      // Get the rgb values
      const r = 255 * hueToRgb(p, q, h + 1 / 3);
      const g = 255 * hueToRgb(p, q, h);
      const b = 255 * hueToRgb(p, q, h - 1 / 3);

      // Make a new color
      const color = new Color(r, g, b);
      return color
    } else if (this.space === 'cmyk') {
      // https://gist.github.com/felipesabino/5066336
      // Get the normalised cmyk values
      const { c, m, y, k } = this;

      // Get the rgb values
      const r = 255 * (1 - Math.min(1, c * (1 - k) + k));
      const g = 255 * (1 - Math.min(1, m * (1 - k) + k));
      const b = 255 * (1 - Math.min(1, y * (1 - k) + k));

      // Form the color and return it
      const color = new Color(r, g, b);
      return color
    } else {
      return this
    }
  }

  lab () {
    // Get the xyz color
    const { x, y, z } = this.xyz();

    // Get the lab components
    const l = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    // Construct and return a new color
    const color = new Color(l, a, b, 'lab');
    return color
  }

  xyz () {

    // Normalise the red, green and blue values
    const { _a: r255, _b: g255, _c: b255 } = this.rgb();
    const [ r, g, b ] = [ r255, g255, b255 ].map(v => v / 255);

    // Convert to the lab rgb space
    const rL = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    const gL = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    const bL = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to the xyz color space without bounding the values
    const xU = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) / 0.95047;
    const yU = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) / 1.00000;
    const zU = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) / 1.08883;

    // Get the proper xyz values by applying the bounding
    const x = (xU > 0.008856) ? Math.pow(xU, 1 / 3) : (7.787 * xU) + 16 / 116;
    const y = (yU > 0.008856) ? Math.pow(yU, 1 / 3) : (7.787 * yU) + 16 / 116;
    const z = (zU > 0.008856) ? Math.pow(zU, 1 / 3) : (7.787 * zU) + 16 / 116;

    // Make and return the color
    const color = new Color(x, y, z, 'xyz');
    return color
  }

  lch () {

    // Get the lab color directly
    const { l, a, b } = this.lab();

    // Get the chromaticity and the hue using polar coordinates
    const c = Math.sqrt(a ** 2 + b ** 2);
    let h = 180 * Math.atan2(b, a) / Math.PI;
    if (h < 0) {
      h *= -1;
      h = 360 - h;
    }

    // Make a new color and return it
    const color = new Color(l, c, h, 'lch');
    return color
  }

  hsl () {

    // Get the rgb values
    const { _a, _b, _c } = this.rgb();
    const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

    // Find the maximum and minimum values to get the lightness
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    // If the r, g, v values are identical then we are grey
    const isGrey = max === min;

    // Calculate the hue and saturation
    const delta = max - min;
    const s = isGrey ? 0
      : l > 0.5 ? delta / (2 - max - min)
      : delta / (max + min);
    const h = isGrey ? 0
      : max === r ? ((g - b) / delta + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / delta + 2) / 6
      : max === b ? ((r - g) / delta + 4) / 6
      : 0;

    // Construct and return the new color
    const color = new Color(360 * h, 100 * s, 100 * l, 'hsl');
    return color
  }

  cmyk () {

    // Get the rgb values for the current color
    const { _a, _b, _c } = this.rgb();
    const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

    // Get the cmyk values in an unbounded format
    const k = Math.min(1 - r, 1 - g, 1 - b);

    if (k === 1) {
      // Catch the black case
      return new Color(0, 0, 0, 1, 'cmyk')
    }

    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    // Construct the new color
    const color = new Color(c, m, y, k, 'cmyk');
    return color
  }

  /*
  Input and Output methods
  */

  _clamped () {
    const { _a, _b, _c } = this.rgb();
    const { max, min, round } = Math;
    const format = v => max(0, min(round(v), 255));
    return [ _a, _b, _c ].map(format)
  }

  toHex () {
    const [ r, g, b ] = this._clamped().map(componentHex);
    return `#${r}${g}${b}`
  }

  toString () {
    return this.toHex()
  }

  toRgb () {
    const [ rV, gV, bV ] = this._clamped();
    const string = `rgb(${rV},${gV},${bV})`;
    return string
  }

  toArray () {
    const { _a, _b, _c, _d, space } = this;
    return [ _a, _b, _c, _d, space ]
  }

  /*
  Generating random colors
  */

  static random (mode = 'vibrant', t, u) {

    // Get the math modules
    const { random, round, sin, PI: pi } = Math;

    // Run the correct generator
    if (mode === 'vibrant') {

      const l = (81 - 57) * random() + 57;
      const c = (83 - 45) * random() + 45;
      const h = 360 * random();
      const color = new Color(l, c, h, 'lch');
      return color

    } else if (mode === 'sine') {

      t = t == null ? random() : t;
      const r = round(80 * sin(2 * pi * t / 0.5 + 0.01) + 150);
      const g = round(50 * sin(2 * pi * t / 0.5 + 4.6) + 200);
      const b = round(100 * sin(2 * pi * t / 0.5 + 2.3) + 150);
      const color = new Color(r, g, b);
      return color

    } else if (mode === 'pastel') {

      const l = (94 - 86) * random() + 86;
      const c = (26 - 9) * random() + 9;
      const h = 360 * random();
      const color = new Color(l, c, h, 'lch');
      return color

    } else if (mode === 'dark') {

      const l = 10 + 10 * random();
      const c = (125 - 75) * random() + 86;
      const h = 360 * random();
      const color = new Color(l, c, h, 'lch');
      return color

    } else if (mode === 'rgb') {

      const r = 255 * random();
      const g = 255 * random();
      const b = 255 * random();
      const color = new Color(r, g, b);
      return color

    } else if (mode === 'lab') {

      const l = 100 * random();
      const a = 256 * random() - 128;
      const b = 256 * random() - 128;
      const color = new Color(l, a, b, 'lab');
      return color

    } else if (mode === 'grey') {

      const grey = 255 * random();
      const color = new Color(grey, grey, grey);
      return color

    }
  }

  /*
  Constructing colors
  */

  // Test if given value is a color string
  static test (color) {
    return (typeof color === 'string')
      && (isHex.test(color) || isRgb.test(color))
  }

  // Test if given value is an rgb object
  static isRgb (color) {
    return color && typeof color.r === 'number'
      && typeof color.g === 'number'
      && typeof color.b === 'number'
  }

  // Test if given value is a color
  static isColor (color) {
    return color && (
      color instanceof Color
      || this.isRgb(color)
      || this.test(color)
    )
  }
}

class Point {
  // Initialize
  constructor (...args) {
    this.init(...args);
  }

  init (x, y) {
    const base = { x: 0, y: 0 };

    // ensure source as object
    const source = Array.isArray(x) ? { x: x[0], y: x[1] }
      : typeof x === 'object' ? { x: x.x, y: x.y }
      : { x: x, y: y };

    // merge source
    this.x = source.x == null ? base.x : source.x;
    this.y = source.y == null ? base.y : source.y;

    return this
  }

  // Clone point
  clone () {
    return new Point(this)
  }

  transform (m) {
    return this.clone().transformO(m)
  }

  // Transform point with matrix
  transformO (m) {
    if (!Matrix.isMatrixLike(m)) {
      m = new Matrix(m);
    }

    const { x, y } = this;

    // Perform the matrix multiplication
    this.x = m.a * x + m.c * y + m.e;
    this.y = m.b * x + m.d * y + m.f;

    return this
  }

  toArray () {
    return [ this.x, this.y ]
  }
}

function point (x, y) {
  return new Point(x, y).transform(this.screenCTM().inverse())
}

function closeEnough (a, b, threshold) {
  return Math.abs(b - a) < (threshold || 1e-6)
}

class Matrix {
  constructor (...args) {
    this.init(...args);
  }

  // Initialize
  init (source) {
    var base = Matrix.fromArray([ 1, 0, 0, 1, 0, 0 ]);

    // ensure source as object
    source = source instanceof Element ? source.matrixify()
      : typeof source === 'string' ? Matrix.fromArray(source.split(delimiter).map(parseFloat))
      : Array.isArray(source) ? Matrix.fromArray(source)
      : (typeof source === 'object' && Matrix.isMatrixLike(source)) ? source
      : (typeof source === 'object') ? new Matrix().transform(source)
      : arguments.length === 6 ? Matrix.fromArray([].slice.call(arguments))
      : base;

    // Merge the source matrix with the base matrix
    this.a = source.a != null ? source.a : base.a;
    this.b = source.b != null ? source.b : base.b;
    this.c = source.c != null ? source.c : base.c;
    this.d = source.d != null ? source.d : base.d;
    this.e = source.e != null ? source.e : base.e;
    this.f = source.f != null ? source.f : base.f;

    return this
  }

  // Clones this matrix
  clone () {
    return new Matrix(this)
  }

  // Transform a matrix into another matrix by manipulating the space
  transform (o) {
    // Check if o is a matrix and then left multiply it directly
    if (Matrix.isMatrixLike(o)) {
      var matrix = new Matrix(o);
      return matrix.multiplyO(this)
    }

    // Get the proposed transformations and the current transformations
    var t = Matrix.formatTransforms(o);
    var current = this;
    const { x: ox, y: oy } = new Point(t.ox, t.oy).transform(current);

    // Construct the resulting matrix
    var transformer = new Matrix()
      .translateO(t.rx, t.ry)
      .lmultiplyO(current)
      .translateO(-ox, -oy)
      .scaleO(t.scaleX, t.scaleY)
      .skewO(t.skewX, t.skewY)
      .shearO(t.shear)
      .rotateO(t.theta)
      .translateO(ox, oy);

    // If we want the origin at a particular place, we force it there
    if (isFinite(t.px) || isFinite(t.py)) {
      const origin = new Point(ox, oy).transform(transformer);
      // TODO: Replace t.px with isFinite(t.px)
      const dx = t.px ? t.px - origin.x : 0;
      const dy = t.py ? t.py - origin.y : 0;
      transformer.translateO(dx, dy);
    }

    // Translate now after positioning
    transformer.translateO(t.tx, t.ty);
    return transformer
  }

  // Applies a matrix defined by its affine parameters
  compose (o) {
    if (o.origin) {
      o.originX = o.origin[0];
      o.originY = o.origin[1];
    }
    // Get the parameters
    var ox = o.originX || 0;
    var oy = o.originY || 0;
    var sx = o.scaleX || 1;
    var sy = o.scaleY || 1;
    var lam = o.shear || 0;
    var theta = o.rotate || 0;
    var tx = o.translateX || 0;
    var ty = o.translateY || 0;

    // Apply the standard matrix
    var result = new Matrix()
      .translateO(-ox, -oy)
      .scaleO(sx, sy)
      .shearO(lam)
      .rotateO(theta)
      .translateO(tx, ty)
      .lmultiplyO(this)
      .translateO(ox, oy);
    return result
  }

  // Decomposes this matrix into its affine parameters
  decompose (cx = 0, cy = 0) {
    // Get the parameters from the matrix
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var e = this.e;
    var f = this.f;

    // Figure out if the winding direction is clockwise or counterclockwise
    var determinant = a * d - b * c;
    var ccw = determinant > 0 ? 1 : -1;

    // Since we only shear in x, we can use the x basis to get the x scale
    // and the rotation of the resulting matrix
    var sx = ccw * Math.sqrt(a * a + b * b);
    var thetaRad = Math.atan2(ccw * b, ccw * a);
    var theta = 180 / Math.PI * thetaRad;
    var ct = Math.cos(thetaRad);
    var st = Math.sin(thetaRad);

    // We can then solve the y basis vector simultaneously to get the other
    // two affine parameters directly from these parameters
    var lam = (a * c + b * d) / determinant;
    var sy = ((c * sx) / (lam * a - b)) || ((d * sx) / (lam * b + a));

    // Use the translations
    const tx = e - cx + cx * ct * sx + cy * (lam * ct * sx - st * sy);
    const ty = f - cy + cx * st * sx + cy * (lam * st * sx + ct * sy);

    // Construct the decomposition and return it
    return {
      // Return the affine parameters
      scaleX: sx,
      scaleY: sy,
      shear: lam,
      rotate: theta,
      translateX: tx,
      translateY: ty,
      originX: cx,
      originY: cy,

      // Return the matrix parameters
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f
    }
  }

  // Left multiplies by the given matrix
  multiply (matrix) {
    return this.clone().multiplyO(matrix)
  }

  multiplyO (matrix) {
    // Get the matrices
    var l = this;
    var r = matrix instanceof Matrix
      ? matrix
      : new Matrix(matrix);

    return Matrix.matrixMultiply(l, r, this)
  }

  lmultiply (matrix) {
    return this.clone().lmultiplyO(matrix)
  }

  lmultiplyO (matrix) {
    var r = this;
    var l = matrix instanceof Matrix
      ? matrix
      : new Matrix(matrix);

    return Matrix.matrixMultiply(l, r, this)
  }

  // Inverses matrix
  inverseO () {
    // Get the current parameters out of the matrix
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var e = this.e;
    var f = this.f;

    // Invert the 2x2 matrix in the top left
    var det = a * d - b * c;
    if (!det) throw new Error('Cannot invert ' + this)

    // Calculate the top 2x2 matrix
    var na = d / det;
    var nb = -b / det;
    var nc = -c / det;
    var nd = a / det;

    // Apply the inverted matrix to the top right
    var ne = -(na * e + nc * f);
    var nf = -(nb * e + nd * f);

    // Construct the inverted matrix
    this.a = na;
    this.b = nb;
    this.c = nc;
    this.d = nd;
    this.e = ne;
    this.f = nf;

    return this
  }

  inverse () {
    return this.clone().inverseO()
  }

  // Translate matrix
  translate (x, y) {
    return this.clone().translateO(x, y)
  }

  translateO (x, y) {
    this.e += x || 0;
    this.f += y || 0;
    return this
  }

  // Scale matrix
  scale (x, y, cx, cy) {
    return this.clone().scaleO(...arguments)
  }

  scaleO (x, y = x, cx = 0, cy = 0) {
    // Support uniform scaling
    if (arguments.length === 3) {
      cy = cx;
      cx = y;
      y = x;
    }

    const { a, b, c, d, e, f } = this;

    this.a = a * x;
    this.b = b * y;
    this.c = c * x;
    this.d = d * y;
    this.e = e * x - cx * x + cx;
    this.f = f * y - cy * y + cy;

    return this
  }

  // Rotate matrix
  rotate (r, cx, cy) {
    return this.clone().rotateO(r, cx, cy)
  }

  rotateO (r, cx = 0, cy = 0) {
    // Convert degrees to radians
    r = radians(r);

    const cos = Math.cos(r);
    const sin = Math.sin(r);

    const { a, b, c, d, e, f } = this;

    this.a = a * cos - b * sin;
    this.b = b * cos + a * sin;
    this.c = c * cos - d * sin;
    this.d = d * cos + c * sin;
    this.e = e * cos - f * sin + cy * sin - cx * cos + cx;
    this.f = f * cos + e * sin - cx * sin - cy * cos + cy;

    return this
  }

  // Flip matrix on x or y, at a given offset
  flip (axis, around) {
    return this.clone().flipO(axis, around)
  }

  flipO (axis, around) {
    return axis === 'x' ? this.scaleO(-1, 1, around, 0)
      : axis === 'y' ? this.scaleO(1, -1, 0, around)
      : this.scaleO(-1, -1, axis, around || axis) // Define an x, y flip point
  }

  // Shear matrix
  shear (a, cx, cy) {
    return this.clone().shearO(a, cx, cy)
  }

  shearO (lx, cx = 0, cy = 0) {
    const { a, b, c, d, e, f } = this;

    this.a = a + b * lx;
    this.c = c + d * lx;
    this.e = e + f * lx - cy * lx;

    return this
  }

  // Skew Matrix
  skew (x, y, cx, cy) {
    return this.clone().skewO(...arguments)
  }

  skewO (x, y = x, cx = 0, cy = 0) {
    // support uniformal skew
    if (arguments.length === 3) {
      cy = cx;
      cx = y;
      y = x;
    }

    // Convert degrees to radians
    x = radians(x);
    y = radians(y);

    const lx = Math.tan(x);
    const ly = Math.tan(y);

    const { a, b, c, d, e, f } = this;

    this.a = a + b * lx;
    this.b = b + a * ly;
    this.c = c + d * lx;
    this.d = d + c * ly;
    this.e = e + f * lx - cy * lx;
    this.f = f + e * ly - cx * ly;

    return this
  }

  // SkewX
  skewX (x, cx, cy) {
    return this.skew(x, 0, cx, cy)
  }

  skewXO (x, cx, cy) {
    return this.skewO(x, 0, cx, cy)
  }

  // SkewY
  skewY (y, cx, cy) {
    return this.skew(0, y, cx, cy)
  }

  skewYO (y, cx, cy) {
    return this.skewO(0, y, cx, cy)
  }

  // Transform around a center point
  aroundO (cx, cy, matrix) {
    var dx = cx || 0;
    var dy = cy || 0;
    return this.translateO(-dx, -dy).lmultiplyO(matrix).translateO(dx, dy)
  }

  around (cx, cy, matrix) {
    return this.clone().aroundO(cx, cy, matrix)
  }

  // Check if two matrices are equal
  equals (other) {
    var comp = new Matrix(other);
    return closeEnough(this.a, comp.a) && closeEnough(this.b, comp.b)
      && closeEnough(this.c, comp.c) && closeEnough(this.d, comp.d)
      && closeEnough(this.e, comp.e) && closeEnough(this.f, comp.f)
  }

  // Convert matrix to string
  toString () {
    return 'matrix(' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f + ')'
  }

  toArray () {
    return [ this.a, this.b, this.c, this.d, this.e, this.f ]
  }

  valueOf () {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f
    }
  }

  static fromArray (a) {
    return { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }
  }

  static isMatrixLike (o) {
    return (
      o.a != null
      || o.b != null
      || o.c != null
      || o.d != null
      || o.e != null
      || o.f != null
    )
  }

  static formatTransforms (o) {
    // Get all of the parameters required to form the matrix
    var flipBoth = o.flip === 'both' || o.flip === true;
    var flipX = o.flip && (flipBoth || o.flip === 'x') ? -1 : 1;
    var flipY = o.flip && (flipBoth || o.flip === 'y') ? -1 : 1;
    var skewX = o.skew && o.skew.length ? o.skew[0]
      : isFinite(o.skew) ? o.skew
      : isFinite(o.skewX) ? o.skewX
      : 0;
    var skewY = o.skew && o.skew.length ? o.skew[1]
      : isFinite(o.skew) ? o.skew
      : isFinite(o.skewY) ? o.skewY
      : 0;
    var scaleX = o.scale && o.scale.length ? o.scale[0] * flipX
      : isFinite(o.scale) ? o.scale * flipX
      : isFinite(o.scaleX) ? o.scaleX * flipX
      : flipX;
    var scaleY = o.scale && o.scale.length ? o.scale[1] * flipY
      : isFinite(o.scale) ? o.scale * flipY
      : isFinite(o.scaleY) ? o.scaleY * flipY
      : flipY;
    var shear = o.shear || 0;
    var theta = o.rotate || o.theta || 0;
    var origin = new Point(o.origin || o.around || o.ox || o.originX, o.oy || o.originY);
    var ox = origin.x;
    var oy = origin.y;
    var position = new Point(o.position || o.px || o.positionX, o.py || o.positionY);
    var px = position.x;
    var py = position.y;
    var translate = new Point(o.translate || o.tx || o.translateX, o.ty || o.translateY);
    var tx = translate.x;
    var ty = translate.y;
    var relative = new Point(o.relative || o.rx || o.relativeX, o.ry || o.relativeY);
    var rx = relative.x;
    var ry = relative.y;

    // Populate all of the values
    return {
      scaleX, scaleY, skewX, skewY, shear, theta, rx, ry, tx, ty, ox, oy, px, py
    }
  }

  // left matrix, right matrix, target matrix which is overwritten
  static matrixMultiply (l, r, o) {
    // Work out the product directly
    var a = l.a * r.a + l.c * r.b;
    var b = l.b * r.a + l.d * r.b;
    var c = l.a * r.c + l.c * r.d;
    var d = l.b * r.c + l.d * r.d;
    var e = l.e + l.a * r.e + l.c * r.f;
    var f = l.f + l.b * r.e + l.d * r.f;

    // make sure to use local variables because l/r and o could be the same
    o.a = a;
    o.b = b;
    o.c = c;
    o.d = d;
    o.e = e;
    o.f = f;

    return o
  }
}

function ctm () {
  return new Matrix(this.node.getCTM())
}

function screenCTM () {
  /* https://bugzilla.mozilla.org/show_bug.cgi?id=1344537
     This is needed because FF does not return the transformation matrix
     for the inner coordinate system when getScreenCTM() is called on nested svgs.
     However all other Browsers do that */
  if (typeof this.isRoot === 'function' && !this.isRoot()) {
    var rect = this.rect(1, 1);
    var m = rect.node.getScreenCTM();
    rect.remove();
    return new Matrix(m)
  }
  return new Matrix(this.node.getScreenCTM())
}

register(Matrix, 'Matrix');

function parser () {
  // Reuse cached element if possible
  if (!parser.nodes) {
    const svg = makeInstance().size(2, 0);
    svg.node.style.cssText = [
      'opacity: 0',
      'position: absolute',
      'left: -100%',
      'top: -100%',
      'overflow: hidden'
    ].join(';');

    svg.attr('focusable', 'false');
    svg.attr('aria-hidden', 'true');

    const path = svg.path().node;

    parser.nodes = { svg, path };
  }

  if (!parser.nodes.svg.node.parentNode) {
    const b = globals.document.body || globals.document.documentElement;
    parser.nodes.svg.addTo(b);
  }

  return parser.nodes
}

function isNulledBox (box) {
  return !box.width && !box.height && !box.x && !box.y
}

function domContains (node) {
  return node === globals.document
    || (globals.document.documentElement.contains || function (node) {
      // This is IE - it does not support contains() for top-level SVGs
      while (node.parentNode) {
        node = node.parentNode;
      }
      return node === globals.document
    }).call(globals.document.documentElement, node)
}

class Box {
  constructor (...args) {
    this.init(...args);
  }

  init (source) {
    var base = [ 0, 0, 0, 0 ];
    source = typeof source === 'string' ? source.split(delimiter).map(parseFloat)
      : Array.isArray(source) ? source
      : typeof source === 'object' ? [ source.left != null ? source.left
      : source.x, source.top != null ? source.top : source.y, source.width, source.height ]
      : arguments.length === 4 ? [].slice.call(arguments)
      : base;

    this.x = source[0] || 0;
    this.y = source[1] || 0;
    this.width = this.w = source[2] || 0;
    this.height = this.h = source[3] || 0;

    // Add more bounding box properties
    this.x2 = this.x + this.w;
    this.y2 = this.y + this.h;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;

    return this
  }

  // Merge rect box with another, return a new instance
  merge (box) {
    const x = Math.min(this.x, box.x);
    const y = Math.min(this.y, box.y);
    const width = Math.max(this.x + this.width, box.x + box.width) - x;
    const height = Math.max(this.y + this.height, box.y + box.height) - y;

    return new Box(x, y, width, height)
  }

  transform (m) {
    if (!(m instanceof Matrix)) {
      m = new Matrix(m);
    }

    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    const pts = [
      new Point(this.x, this.y),
      new Point(this.x2, this.y),
      new Point(this.x, this.y2),
      new Point(this.x2, this.y2)
    ];

    pts.forEach(function (p) {
      p = p.transform(m);
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    });

    return new Box(
      xMin, yMin,
      xMax - xMin,
      yMax - yMin
    )
  }

  addOffset () {
    // offset by window scroll position, because getBoundingClientRect changes when window is scrolled
    this.x += globals.window.pageXOffset;
    this.y += globals.window.pageYOffset;
    return this
  }

  toString () {
    return this.x + ' ' + this.y + ' ' + this.width + ' ' + this.height
  }

  toArray () {
    return [ this.x, this.y, this.width, this.height ]
  }

  isNulled () {
    return isNulledBox(this)
  }
}

function getBox (cb, retry) {
  let box;

  try {
    box = cb(this.node);

    if (isNulledBox(box) && !domContains(this.node)) {
      throw new Error('Element not in the dom')
    }
  } catch (e) {
    box = retry(this);
  }

  return box
}

function bbox () {
  return new Box(getBox.call(this, (node) => node.getBBox(), (el) => {
    try {
      const clone = el.clone().addTo(parser().svg).show();
      const box = clone.node.getBBox();
      clone.remove();
      return box
    } catch (e) {
      throw new Error('Getting bbox of element "' + el.node.nodeName + '" is not possible. ' + e.toString())
    }
  }))
}

function rbox (el) {
  const box = new Box(getBox.call(this, (node) => node.getBoundingClientRect(), (el) => {
    throw new Error('Getting rbox of element "' + el.node.nodeName + '" is not possible')
  }));
  if (el) return box.transform(el.screenCTM().inverse())
  return box.addOffset()
}

registerMethods({
  viewbox: {
    viewbox (x, y, width, height) {
      // act as getter
      if (x == null) return new Box(this.attr('viewBox'))

      // act as setter
      return this.attr('viewBox', new Box(x, y, width, height))
    },

    zoom (level, point) {
      let width = this.node.clientWidth;
      let height = this.node.clientHeight;
      const v = this.viewbox();

      // Firefox does not support clientHeight and returns 0
      // https://bugzilla.mozilla.org/show_bug.cgi?id=874811
      if (!width && !height) {
        var style = window.getComputedStyle(this.node);
        width = parseFloat(style.getPropertyValue('width'));
        height = parseFloat(style.getPropertyValue('height'));
      }

      const zoomX = width / v.width;
      const zoomY = height / v.height;
      const zoom = Math.min(zoomX, zoomY);

      if (level == null) {
        return zoom
      }

      let zoomAmount = zoom / level;
      if (zoomAmount === Infinity) zoomAmount = Number.MIN_VALUE;

      point = point || new Point(width / 2 / zoomX + v.x, height / 2 / zoomY + v.y);

      const box = new Box(v).transform(
        new Matrix({ scale: zoomAmount, origin: point })
      );

      return this.viewbox(box)
    }
  }
});

register(Box, 'Box');

/* eslint no-new-func: "off" */
const subClassArray = (function () {
  try {
    // try es6 subclassing
    return Function('name', 'baseClass', '_constructor', [
      'baseClass = baseClass || Array',
      'return {',
      '  [name]: class extends baseClass {',
      '    constructor (...args) {',
      '      super(...args)',
      '      _constructor && _constructor.apply(this, args)',
      '    }',
      '  }',
      '}[name]'
    ].join('\n'))
  } catch (e) {
    // Use es5 approach
    return (name, baseClass = Array, _constructor) => {
      const Arr = function () {
        baseClass.apply(this, arguments);
        _constructor && _constructor.apply(this, arguments);
      };

      Arr.prototype = Object.create(baseClass.prototype);
      Arr.prototype.constructor = Arr;

      Arr.prototype.map = function (fn) {
        const arr = new Arr();
        arr.push.apply(arr, Array.prototype.map.call(this, fn));
        return arr
      };

      return Arr
    }
  }
})();

const List = subClassArray('List', Array, function (arr = []) {
  // This catches the case, that native map tries to create an array with new Array(1)
  if (typeof arr === 'number') return this
  this.length = 0;
  this.push(...arr);
});

extend(List, {
  each (fnOrMethodName, ...args) {
    if (typeof fnOrMethodName === 'function') {
      return this.map((el) => {
        return fnOrMethodName.call(el, el)
      })
    } else {
      return this.map(el => {
        return el[fnOrMethodName](...args)
      })
    }
  },

  toArray () {
    return Array.prototype.concat.apply([], this)
  }
});

const reserved = [ 'toArray', 'constructor', 'each' ];

List.extend = function (methods) {
  methods = methods.reduce((obj, name) => {
    // Don't overwrite own methods
    if (reserved.includes(name)) return obj

    // Don't add private methods
    if (name[0] === '_') return obj

    // Relay every call to each()
    obj[name] = function (...attrs) {
      return this.each(name, ...attrs)
    };
    return obj
  }, {});

  extend(List, methods);
};

function baseFind (query, parent) {
  return new List(map((parent || globals.document).querySelectorAll(query), function (node) {
    return adopt(node)
  }))
}

// Scoped find method
function find (query) {
  return baseFind(query, this.node)
}

function findOne (query) {
  return adopt(this.node.querySelector(query))
}

class EventTarget extends Base {
  constructor ({ events = {} } = {}) {
    super();
    this.events = events;
  }

  addEventListener () {}

  dispatch (event, data) {
    return dispatch(this, event, data)
  }

  dispatchEvent (event) {
    const bag = this.getEventHolder().events;
    if (!bag) return true

    const events = bag[event.type];

    for (const i in events) {
      for (const j in events[i]) {
        events[i][j](event);
      }
    }

    return !event.defaultPrevented
  }

  // Fire given event
  fire (event, data) {
    this.dispatch(event, data);
    return this
  }

  getEventHolder () {
    return this
  }

  getEventTarget () {
    return this
  }

  // Unbind event from listener
  off (event, listener) {
    off(this, event, listener);
    return this
  }

  // Bind given event to listener
  on (event, listener, binding, options) {
    on(this, event, listener, binding, options);
    return this
  }

  removeEventListener () {}
}

register(EventTarget, 'EventTarget');

function noop () {}

// Default animation values
const timeline = {
  duration: 400,
  ease: '>',
  delay: 0
};

// Default attribute values
const attrs = {

  // fill and stroke
  'fill-opacity': 1,
  'stroke-opacity': 1,
  'stroke-width': 0,
  'stroke-linejoin': 'miter',
  'stroke-linecap': 'butt',
  fill: '#000000',
  stroke: '#000000',
  opacity: 1,

  // position
  x: 0,
  y: 0,
  cx: 0,
  cy: 0,

  // size
  width: 0,
  height: 0,

  // radius
  r: 0,
  rx: 0,
  ry: 0,

  // gradient
  offset: 0,
  'stop-opacity': 1,
  'stop-color': '#000000',

  // text
  'text-anchor': 'start'
};

const SVGArray = subClassArray('SVGArray', Array, function (arr) {
  this.init(arr);
});

extend(SVGArray, {
  init (arr) {
    // This catches the case, that native map tries to create an array with new Array(1)
    if (typeof arr === 'number') return this
    this.length = 0;
    this.push(...this.parse(arr));
    return this
  },

  toArray () {
    return Array.prototype.concat.apply([], this)
  },

  toString () {
    return this.join(' ')
  },

  // Flattens the array if needed
  valueOf () {
    const ret = [];
    ret.push(...this);
    return ret
  },

  // Parse whitespace separated string
  parse (array = []) {
    // If already is an array, no need to parse it
    if (array instanceof Array) return array

    return array.trim().split(delimiter).map(parseFloat)
  },

  clone () {
    return new this.constructor(this)
  },

  toSet () {
    return new Set(this)
  }
});

// Module for unit convertions
class SVGNumber {
  // Initialize
  constructor (...args) {
    this.init(...args);
  }

  init (value, unit) {
    unit = Array.isArray(value) ? value[1] : unit;
    value = Array.isArray(value) ? value[0] : value;

    // initialize defaults
    this.value = 0;
    this.unit = unit || '';

    // parse value
    if (typeof value === 'number') {
      // ensure a valid numeric value
      this.value = isNaN(value) ? 0 : !isFinite(value) ? (value < 0 ? -3.4e+38 : +3.4e+38) : value;
    } else if (typeof value === 'string') {
      unit = value.match(numberAndUnit);

      if (unit) {
        // make value numeric
        this.value = parseFloat(unit[1]);

        // normalize
        if (unit[5] === '%') {
          this.value /= 100;
        } else if (unit[5] === 's') {
          this.value *= 1000;
        }

        // store unit
        this.unit = unit[5];
      }
    } else {
      if (value instanceof SVGNumber) {
        this.value = value.valueOf();
        this.unit = value.unit;
      }
    }

    return this
  }

  toString () {
    return (this.unit === '%' ? ~~(this.value * 1e8) / 1e6
      : this.unit === 's' ? this.value / 1e3
      : this.value
    ) + this.unit
  }

  toJSON () {
    return this.toString()
  }

  toArray () {
    return [ this.value, this.unit ]
  }

  valueOf () {
    return this.value
  }

  // Add number
  plus (number) {
    number = new SVGNumber(number);
    return new SVGNumber(this + number, this.unit || number.unit)
  }

  // Subtract number
  minus (number) {
    number = new SVGNumber(number);
    return new SVGNumber(this - number, this.unit || number.unit)
  }

  // Multiply number
  times (number) {
    number = new SVGNumber(number);
    return new SVGNumber(this * number, this.unit || number.unit)
  }

  // Divide number
  divide (number) {
    number = new SVGNumber(number);
    return new SVGNumber(this / number, this.unit || number.unit)
  }

  convert (unit) {
    return new SVGNumber(this.value, unit)
  }
}

const hooks = [];
function registerAttrHook (fn) {
  hooks.push(fn);
}

// Set svg element attribute
function attr (attr, val, ns) {
  // act as full getter
  if (attr == null) {
    // get an object of attributes
    attr = {};
    val = this.node.attributes;

    for (const node of val) {
      attr[node.nodeName] = isNumber.test(node.nodeValue)
        ? parseFloat(node.nodeValue)
        : node.nodeValue;
    }

    return attr
  } else if (attr instanceof Array) {
    // loop through array and get all values
    return attr.reduce((last, curr) => {
      last[curr] = this.attr(curr);
      return last
    }, {})
  } else if (typeof attr === 'object' && attr.constructor === Object) {
    // apply every attribute individually if an object is passed
    for (val in attr) this.attr(val, attr[val]);
  } else if (val === null) {
    // remove value
    this.node.removeAttribute(attr);
  } else if (val == null) {
    // act as a getter if the first and only argument is not an object
    val = this.node.getAttribute(attr);
    return val == null ? attrs[attr]
      : isNumber.test(val) ? parseFloat(val)
      : val
  } else {
    // Loop through hooks and execute them to convert value
    val = hooks.reduce((_val, hook) => {
      return hook(attr, _val, this)
    }, val);

    // ensure correct numeric values (also accepts NaN and Infinity)
    if (typeof val === 'number') {
      val = new SVGNumber(val);
    } else if (Color.isColor(val)) {
      // ensure full hex color
      val = new Color(val);
    } else if (val.constructor === Array) {
      // Check for plain arrays and parse array values
      val = new SVGArray(val);
    }

    // if the passed attribute is leading...
    if (attr === 'leading') {
      // ... call the leading method instead
      if (this.leading) {
        this.leading(val);
      }
    } else {
      // set given attribute on node
      typeof ns === 'string' ? this.node.setAttributeNS(ns, attr, val.toString())
        : this.node.setAttribute(attr, val.toString());
    }

    // rebuild if required
    if (this.rebuild && (attr === 'font-size' || attr === 'x')) {
      this.rebuild();
    }
  }

  return this
}

class Dom extends EventTarget {
  constructor (node, attrs) {
    super(node);
    this.node = node;
    this.type = node.nodeName;

    if (attrs && node !== attrs) {
      this.attr(attrs);
    }
  }

  // Add given element at a position
  add (element, i) {
    element = makeInstance(element);

    if (i == null) {
      this.node.appendChild(element.node);
    } else if (element.node !== this.node.childNodes[i]) {
      this.node.insertBefore(element.node, this.node.childNodes[i]);
    }

    return this
  }

  // Add element to given container and return self
  addTo (parent) {
    return makeInstance(parent).put(this)
  }

  // Returns all child elements
  children () {
    return new List(map(this.node.children, function (node) {
      return adopt(node)
    }))
  }

  // Remove all elements in this container
  clear () {
    // remove children
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }

    return this
  }

  // Clone element
  clone () {
    // write dom data to the dom so the clone can pickup the data
    this.writeDataToDom();

    // clone element and assign new id
    return assignNewId(this.node.cloneNode(true))
  }

  // Iterates over all children and invokes a given block
  each (block, deep) {
    var children = this.children();
    var i, il;

    for (i = 0, il = children.length; i < il; i++) {
      block.apply(children[i], [ i, children ]);

      if (deep) {
        children[i].each(block, deep);
      }
    }

    return this
  }

  element (nodeName) {
    return this.put(new Dom(create(nodeName)))
  }

  // Get first child
  first () {
    return adopt(this.node.firstChild)
  }

  // Get a element at the given index
  get (i) {
    return adopt(this.node.childNodes[i])
  }

  getEventHolder () {
    return this.node
  }

  getEventTarget () {
    return this.node
  }

  // Checks if the given element is a child
  has (element) {
    return this.index(element) >= 0
  }

  // Get / set id
  id (id) {
    // generate new id if no id set
    if (typeof id === 'undefined' && !this.node.id) {
      this.node.id = eid(this.type);
    }

    // dont't set directly width this.node.id to make `null` work correctly
    return this.attr('id', id)
  }

  // Gets index of given element
  index (element) {
    return [].slice.call(this.node.childNodes).indexOf(element.node)
  }

  // Get the last child
  last () {
    return adopt(this.node.lastChild)
  }

  // matches the element vs a css selector
  matches (selector) {
    const el = this.node;
    return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector)
  }

  // Returns the parent element instance
  parent (type) {
    var parent = this;

    // check for parent
    if (!parent.node.parentNode) return null

    // get parent element
    parent = adopt(parent.node.parentNode);

    if (!type) return parent

    // loop trough ancestors if type is given
    while (parent) {
      if (typeof type === 'string' ? parent.matches(type) : parent instanceof type) return parent
      if (!parent.node.parentNode || parent.node.parentNode.nodeName === '#document' || parent.node.parentNode.nodeName === '#document-fragment') return null // #759, #720
      parent = adopt(parent.node.parentNode);
    }
  }

  // Basically does the same as `add()` but returns the added element instead
  put (element, i) {
    this.add(element, i);
    return element
  }

  // Add element to given container and return container
  putIn (parent) {
    return makeInstance(parent).add(this)
  }

  // Remove element
  remove () {
    if (this.parent()) {
      this.parent().removeElement(this);
    }

    return this
  }

  // Remove a given child
  removeElement (element) {
    this.node.removeChild(element.node);

    return this
  }

  // Replace this with element
  replace (element) {
    element = makeInstance(element);
    this.node.parentNode.replaceChild(element.node, this.node);
    return element
  }

  round (precision = 2, map) {
    const factor = 10 ** precision;
    const attrs = this.attr();

    // If we have no map, build one from attrs
    if (!map) {
      map = Object.keys(attrs);
    }

    // Holds rounded attributes
    const newAttrs = {};
    map.forEach((key) => {
      newAttrs[key] = Math.round(attrs[key] * factor) / factor;
    });

    this.attr(newAttrs);
    return this
  }

  // Return id on string conversion
  toString () {
    return this.id()
  }

  // Import raw svg
  svg (svgOrFn, outerHTML) {
    var well, len, fragment;

    if (svgOrFn === false) {
      outerHTML = false;
      svgOrFn = null;
    }

    // act as getter if no svg string is given
    if (svgOrFn == null || typeof svgOrFn === 'function') {
      // The default for exports is, that the outerNode is included
      outerHTML = outerHTML == null ? true : outerHTML;

      // write svgjs data to the dom
      this.writeDataToDom();
      let current = this;

      // An export modifier was passed
      if (svgOrFn != null) {
        current = adopt(current.node.cloneNode(true));

        // If the user wants outerHTML we need to process this node, too
        if (outerHTML) {
          const result = svgOrFn(current);
          current = result || current;

          // The user does not want this node? Well, then he gets nothing
          if (result === false) return ''
        }

        // Deep loop through all children and apply modifier
        current.each(function () {
          const result = svgOrFn(this);
          const _this = result || this;

          // If modifier returns false, discard node
          if (result === false) {
            this.remove();

            // If modifier returns new node, use it
          } else if (result && this !== _this) {
            this.replace(_this);
          }
        }, true);
      }

      // Return outer or inner content
      return outerHTML
        ? current.node.outerHTML
        : current.node.innerHTML
    }

    // Act as setter if we got a string

    // The default for import is, that the current node is not replaced
    outerHTML = outerHTML == null ? false : outerHTML;

    // Create temporary holder
    well = globals.document.createElementNS(ns, 'svg');
    fragment = globals.document.createDocumentFragment();

    // Dump raw svg
    well.innerHTML = svgOrFn;

    // Transplant nodes into the fragment
    for (len = well.children.length; len--;) {
      fragment.appendChild(well.firstElementChild);
    }

    const parent = this.parent();

    // Add the whole fragment at once
    return outerHTML
      ? this.replace(fragment) && parent
      : this.add(fragment)
  }

  words (text) {
    // This is faster than removing all children and adding a new one
    this.node.textContent = text;
    return this
  }

  // write svgjs data to the dom
  writeDataToDom () {
    // dump variables recursively
    this.each(function () {
      this.writeDataToDom();
    });

    return this
  }
}

extend(Dom, { attr, find, findOne });
register(Dom, 'Dom');

class Element extends Dom {
  constructor (node, attrs) {
    super(node, attrs);

    // initialize data object
    this.dom = {};

    // create circular reference
    this.node.instance = this;

    if (node.hasAttribute('svgjs:data')) {
      // pull svgjs data from the dom (getAttributeNS doesn't work in html5)
      this.setData(JSON.parse(node.getAttribute('svgjs:data')) || {});
    }
  }

  // Move element by its center
  center (x, y) {
    return this.cx(x).cy(y)
  }

  // Move by center over x-axis
  cx (x) {
    return x == null ? this.x() + this.width() / 2 : this.x(x - this.width() / 2)
  }

  // Move by center over y-axis
  cy (y) {
    return y == null
      ? this.y() + this.height() / 2
      : this.y(y - this.height() / 2)
  }

  // Get defs
  defs () {
    return this.root().defs()
  }

  // Relative move over x and y axes
  dmove (x, y) {
    return this.dx(x).dy(y)
  }

  // Relative move over x axis
  dx (x = 0) {
    return this.x(new SVGNumber(x).plus(this.x()))
  }

  // Relative move over y axis
  dy (y = 0) {
    return this.y(new SVGNumber(y).plus(this.y()))
  }

  // Get parent document
  root () {
    const p = this.parent(getClass(root));
    return p && p.root()
  }

  getEventHolder () {
    return this
  }

  // Set height of element
  height (height) {
    return this.attr('height', height)
  }

  // Checks whether the given point inside the bounding box of the element
  inside (x, y) {
    const box = this.bbox();

    return x > box.x
      && y > box.y
      && x < box.x + box.width
      && y < box.y + box.height
  }

  // Move element to given x and y values
  move (x, y) {
    return this.x(x).y(y)
  }

  // return array of all ancestors of given type up to the root svg
  parents (until = globals.document) {
    until = makeInstance(until);
    const parents = new List();
    let parent = this;

    while (
      (parent = parent.parent())
      && parent.node !== until.node
      && parent.node !== globals.document
    ) {
      parents.push(parent);
    }

    return parents
  }

  // Get referenced element form attribute value
  reference (attr) {
    attr = this.attr(attr);
    if (!attr) return null

    const m = attr.match(reference);
    return m ? makeInstance(m[1]) : null
  }

  // set given data to the elements data property
  setData (o) {
    this.dom = o;
    return this
  }

  // Set element size to given width and height
  size (width, height) {
    const p = proportionalSize(this, width, height);

    return this
      .width(new SVGNumber(p.width))
      .height(new SVGNumber(p.height))
  }

  // Set width of element
  width (width) {
    return this.attr('width', width)
  }

  // write svgjs data to the dom
  writeDataToDom () {
    // remove previously set data
    this.node.removeAttribute('svgjs:data');

    if (Object.keys(this.dom).length) {
      this.node.setAttribute('svgjs:data', JSON.stringify(this.dom)); // see #428
    }

    return super.writeDataToDom()
  }

  // Move over x-axis
  x (x) {
    return this.attr('x', x)
  }

  // Move over y-axis
  y (y) {
    return this.attr('y', y)
  }
}

extend(Element, {
  bbox, rbox, point, ctm, screenCTM
});

register(Element, 'Element');

// Define list of available attributes for stroke and fill
var sugar = {
  stroke: [ 'color', 'width', 'opacity', 'linecap', 'linejoin', 'miterlimit', 'dasharray', 'dashoffset' ],
  fill: [ 'color', 'opacity', 'rule' ],
  prefix: function (t, a) {
    return a === 'color' ? t : t + '-' + a
  }
}

// Add sugar for fill and stroke
;[ 'fill', 'stroke' ].forEach(function (m) {
  var extension = {};
  var i;

  extension[m] = function (o) {
    if (typeof o === 'undefined') {
      return this.attr(m)
    }
    if (typeof o === 'string' || o instanceof Color || Color.isRgb(o) || (o instanceof Element)) {
      this.attr(m, o);
    } else {
      // set all attributes from sugar.fill and sugar.stroke list
      for (i = sugar[m].length - 1; i >= 0; i--) {
        if (o[sugar[m][i]] != null) {
          this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]]);
        }
      }
    }

    return this
  };

  registerMethods([ 'Element', 'Runner' ], extension);
});

registerMethods([ 'Element', 'Runner' ], {
  // Let the user set the matrix directly
  matrix: function (mat, b, c, d, e, f) {
    // Act as a getter
    if (mat == null) {
      return new Matrix(this)
    }

    // Act as a setter, the user can pass a matrix or a set of numbers
    return this.attr('transform', new Matrix(mat, b, c, d, e, f))
  },

  // Map rotation to transform
  rotate: function (angle, cx, cy) {
    return this.transform({ rotate: angle, ox: cx, oy: cy }, true)
  },

  // Map skew to transform
  skew: function (x, y, cx, cy) {
    return arguments.length === 1 || arguments.length === 3
      ? this.transform({ skew: x, ox: y, oy: cx }, true)
      : this.transform({ skew: [ x, y ], ox: cx, oy: cy }, true)
  },

  shear: function (lam, cx, cy) {
    return this.transform({ shear: lam, ox: cx, oy: cy }, true)
  },

  // Map scale to transform
  scale: function (x, y, cx, cy) {
    return arguments.length === 1 || arguments.length === 3
      ? this.transform({ scale: x, ox: y, oy: cx }, true)
      : this.transform({ scale: [ x, y ], ox: cx, oy: cy }, true)
  },

  // Map translate to transform
  translate: function (x, y) {
    return this.transform({ translate: [ x, y ] }, true)
  },

  // Map relative translations to transform
  relative: function (x, y) {
    return this.transform({ relative: [ x, y ] }, true)
  },

  // Map flip to transform
  flip: function (direction, around) {
    var directionString = typeof direction === 'string' ? direction
      : isFinite(direction) ? 'both'
      : 'both';
    var origin = (direction === 'both' && isFinite(around)) ? [ around, around ]
      : (direction === 'x') ? [ around, 0 ]
      : (direction === 'y') ? [ 0, around ]
      : isFinite(direction) ? [ direction, direction ]
      : [ 0, 0 ];
    return this.transform({ flip: directionString, origin: origin }, true)
  },

  // Opacity
  opacity: function (value) {
    return this.attr('opacity', value)
  }
});

registerMethods('radius', {
  // Add x and y radius
  radius: function (x, y) {
    var type = (this._element || this).type;
    return type === 'radialGradient' || type === 'radialGradient'
      ? this.attr('r', new SVGNumber(x))
      : this.rx(x).ry(y == null ? x : y)
  }
});

registerMethods('Path', {
  // Get path length
  length: function () {
    return this.node.getTotalLength()
  },
  // Get point at length
  pointAt: function (length) {
    return new Point(this.node.getPointAtLength(length))
  }
});

registerMethods([ 'Element', 'Runner' ], {
  // Set font
  font: function (a, v) {
    if (typeof a === 'object') {
      for (v in a) this.font(v, a[v]);
      return this
    }

    return a === 'leading'
      ? this.leading(v)
      : a === 'anchor'
        ? this.attr('text-anchor', v)
        : a === 'size' || a === 'family' || a === 'weight' || a === 'stretch' || a === 'variant' || a === 'style'
          ? this.attr('font-' + a, v)
          : this.attr(a, v)
  }
});

registerMethods('Text', {
  ax (x) {
    return this.attr('x', x)
  },
  ay (y) {
    return this.attr('y', y)
  },
  amove (x, y) {
    return this.ax(x).ay(y)
  }
});

// Add events to elements
const methods$1 = [ 'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'touchstart',
  'touchmove',
  'touchleave',
  'touchend',
  'touchcancel' ].reduce(function (last, event) {
  // add event to Element
  const fn = function (f) {
    if (f === null) {
      off(this, event);
    } else {
      on(this, event, f);
    }
    return this
  };

  last[event] = fn;
  return last
}, {});

registerMethods('Element', methods$1);

// Reset all transformations
function untransform () {
  return this.attr('transform', null)
}

// merge the whole transformation chain into one matrix and returns it
function matrixify () {
  var matrix = (this.attr('transform') || '')
    // split transformations
    .split(transforms).slice(0, -1).map(function (str) {
      // generate key => value pairs
      var kv = str.trim().split('(');
      return [ kv[0],
        kv[1].split(delimiter)
          .map(function (str) {
            return parseFloat(str)
          })
      ]
    })
    .reverse()
    // merge every transformation into one matrix
    .reduce(function (matrix, transform) {
      if (transform[0] === 'matrix') {
        return matrix.lmultiply(Matrix.fromArray(transform[1]))
      }
      return matrix[transform[0]].apply(matrix, transform[1])
    }, new Matrix());

  return matrix
}

// add an element to another parent without changing the visual representation on the screen
function toParent (parent) {
  if (this === parent) return this
  var ctm = this.screenCTM();
  var pCtm = parent.screenCTM().inverse();

  this.addTo(parent).untransform().transform(pCtm.multiply(ctm));

  return this
}

// same as above with parent equals root-svg
function toRoot () {
  return this.toParent(this.root())
}

// Add transformations
function transform (o, relative) {
  // Act as a getter if no object was passed
  if (o == null || typeof o === 'string') {
    var decomposed = new Matrix(this).decompose();
    return o == null ? decomposed : decomposed[o]
  }

  if (!Matrix.isMatrixLike(o)) {
    // Set the origin according to the defined transform
    o = { ...o, origin: getOrigin(o, this) };
  }

  // The user can pass a boolean, an Element or an Matrix or nothing
  var cleanRelative = relative === true ? this : (relative || false);
  var result = new Matrix(cleanRelative).transform(o);
  return this.attr('transform', result)
}

registerMethods('Element', {
  untransform, matrixify, toParent, toRoot, transform
});

// Radius x value
function rx (rx) {
  return this.attr('rx', rx)
}

// Radius y value
function ry (ry) {
  return this.attr('ry', ry)
}

// Move over x-axis
function x$1 (x) {
  return x == null
    ? this.cx() - this.rx()
    : this.cx(x + this.rx())
}

// Move over y-axis
function y$1 (y) {
  return y == null
    ? this.cy() - this.ry()
    : this.cy(y + this.ry())
}

// Move by center over x-axis
function cx (x) {
  return x == null
    ? this.attr('cx')
    : this.attr('cx', x)
}

// Move by center over y-axis
function cy (y) {
  return y == null
    ? this.attr('cy')
    : this.attr('cy', y)
}

// Set width of element
function width (width) {
  return width == null
    ? this.rx() * 2
    : this.rx(new SVGNumber(width).divide(2))
}

// Set height of element
function height (height) {
  return height == null
    ? this.ry() * 2
    : this.ry(new SVGNumber(height).divide(2))
}

var circled = /*#__PURE__*/Object.freeze({
    __proto__: null,
    rx: rx,
    ry: ry,
    x: x$1,
    y: y$1,
    cx: cx,
    cy: cy,
    width: width,
    height: height
});

class Shape extends Element {}

register(Shape, 'Shape');

class Circle extends Shape {
  constructor (node) {
    super(nodeOrNew('circle', node), node);
  }

  radius (r) {
    return this.attr('r', r)
  }

  // Radius x value
  rx (rx) {
    return this.attr('r', rx)
  }

  // Alias radius x value
  ry (ry) {
    return this.rx(ry)
  }

  size (size) {
    return this.radius(new SVGNumber(size).divide(2))
  }
}

extend(Circle, { x: x$1, y: y$1, cx, cy, width, height });

registerMethods({
  Container: {
    // Create circle element
    circle: wrapWithAttrCheck(function (size) {
      return this.put(new Circle())
        .size(size)
        .move(0, 0)
    })
  }
});

register(Circle, 'Circle');

class Container extends Element {
  flatten (parent) {
    this.each(function () {
      if (this instanceof Container) return this.flatten(parent).ungroup(parent)
      return this.toParent(parent)
    });

    // we need this so that the root does not get removed
    this.node.firstElementChild || this.remove();

    return this
  }

  ungroup (parent) {
    parent = parent || this.parent();

    this.each(function () {
      return this.toParent(parent)
    });

    this.remove();

    return this
  }
}

register(Container, 'Container');

class Defs extends Container {
  constructor (node) {
    super(nodeOrNew('defs', node), node);
  }

  flatten () {
    return this
  }

  ungroup () {
    return this
  }
}

register(Defs, 'Defs');

class Ellipse extends Shape {
  constructor (node) {
    super(nodeOrNew('ellipse', node), node);
  }

  size (width, height) {
    var p = proportionalSize(this, width, height);

    return this
      .rx(new SVGNumber(p.width).divide(2))
      .ry(new SVGNumber(p.height).divide(2))
  }
}

extend(Ellipse, circled);

registerMethods('Container', {
  // Create an ellipse
  ellipse: wrapWithAttrCheck(function (width = 0, height = width) {
    return this.put(new Ellipse()).size(width, height).move(0, 0)
  })
});

register(Ellipse, 'Ellipse');

class Stop extends Element {
  constructor (node) {
    super(nodeOrNew('stop', node), node);
  }

  // add color stops
  update (o) {
    if (typeof o === 'number' || o instanceof SVGNumber) {
      o = {
        offset: arguments[0],
        color: arguments[1],
        opacity: arguments[2]
      };
    }

    // set attributes
    if (o.opacity != null) this.attr('stop-opacity', o.opacity);
    if (o.color != null) this.attr('stop-color', o.color);
    if (o.offset != null) this.attr('offset', new SVGNumber(o.offset));

    return this
  }
}

register(Stop, 'Stop');

function from (x, y) {
  return (this._element || this).type === 'radialGradient'
    ? this.attr({ fx: new SVGNumber(x), fy: new SVGNumber(y) })
    : this.attr({ x1: new SVGNumber(x), y1: new SVGNumber(y) })
}

function to (x, y) {
  return (this._element || this).type === 'radialGradient'
    ? this.attr({ cx: new SVGNumber(x), cy: new SVGNumber(y) })
    : this.attr({ x2: new SVGNumber(x), y2: new SVGNumber(y) })
}

var gradiented = /*#__PURE__*/Object.freeze({
    __proto__: null,
    from: from,
    to: to
});

class Gradient extends Container {
  constructor (type, attrs) {
    super(
      nodeOrNew(type + 'Gradient', typeof type === 'string' ? null : type),
      attrs
    );
  }

  // Add a color stop
  stop (offset, color, opacity) {
    return this.put(new Stop()).update(offset, color, opacity)
  }

  // Update gradient
  update (block) {
    // remove all stops
    this.clear();

    // invoke passed block
    if (typeof block === 'function') {
      block.call(this, this);
    }

    return this
  }

  // Return the fill id
  url () {
    return 'url(#' + this.id() + ')'
  }

  // Alias string convertion to fill
  toString () {
    return this.url()
  }

  // custom attr to handle transform
  attr (a, b, c) {
    if (a === 'transform') a = 'gradientTransform';
    return super.attr(a, b, c)
  }

  targets () {
    return baseFind('svg [fill*="' + this.id() + '"]')
  }

  bbox () {
    return new Box()
  }
}

extend(Gradient, gradiented);

registerMethods({
  Container: {
    // Create gradient element in defs
    gradient: wrapWithAttrCheck(function (type, block) {
      return this.defs().gradient(type, block)
    })
  },
  // define gradient
  Defs: {
    gradient: wrapWithAttrCheck(function (type, block) {
      return this.put(new Gradient(type)).update(block)
    })
  }
});

register(Gradient, 'Gradient');

class Pattern extends Container {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('pattern', node), node);
  }

  // Return the fill id
  url () {
    return 'url(#' + this.id() + ')'
  }

  // Update pattern by rebuilding
  update (block) {
    // remove content
    this.clear();

    // invoke passed block
    if (typeof block === 'function') {
      block.call(this, this);
    }

    return this
  }

  // Alias string convertion to fill
  toString () {
    return this.url()
  }

  // custom attr to handle transform
  attr (a, b, c) {
    if (a === 'transform') a = 'patternTransform';
    return super.attr(a, b, c)
  }

  targets () {
    return baseFind('svg [fill*="' + this.id() + '"]')
  }

  bbox () {
    return new Box()
  }
}

registerMethods({
  Container: {
    // Create pattern element in defs
    pattern (...args) {
      return this.defs().pattern(...args)
    }
  },
  Defs: {
    pattern: wrapWithAttrCheck(function (width, height, block) {
      return this.put(new Pattern()).update(block).attr({
        x: 0,
        y: 0,
        width: width,
        height: height,
        patternUnits: 'userSpaceOnUse'
      })
    })
  }
});

register(Pattern, 'Pattern');

class Image extends Shape {
  constructor (node) {
    super(nodeOrNew('image', node), node);
  }

  // (re)load image
  load (url, callback) {
    if (!url) return this

    var img = new globals.window.Image();

    on(img, 'load', function (e) {
      var p = this.parent(Pattern);

      // ensure image size
      if (this.width() === 0 && this.height() === 0) {
        this.size(img.width, img.height);
      }

      if (p instanceof Pattern) {
        // ensure pattern size if not set
        if (p.width() === 0 && p.height() === 0) {
          p.size(this.width(), this.height());
        }
      }

      if (typeof callback === 'function') {
        callback.call(this, e);
      }
    }, this);

    on(img, 'load error', function () {
      // dont forget to unbind memory leaking events
      off(img);
    });

    return this.attr('href', (img.src = url), xlink)
  }
}

registerAttrHook(function (attr, val, _this) {
  // convert image fill and stroke to patterns
  if (attr === 'fill' || attr === 'stroke') {
    if (isImage.test(val)) {
      val = _this.root().defs().image(val);
    }
  }

  if (val instanceof Image) {
    val = _this.root().defs().pattern(0, 0, (pattern) => {
      pattern.add(val);
    });
  }

  return val
});

registerMethods({
  Container: {
    // create image element, load image and set its size
    image: wrapWithAttrCheck(function (source, callback) {
      return this.put(new Image()).size(0, 0).load(source, callback)
    })
  }
});

register(Image, 'Image');

const PointArray = subClassArray('PointArray', SVGArray);

extend(PointArray, {
  // Convert array to string
  toString () {
    // convert to a poly point string
    for (var i = 0, il = this.length, array = []; i < il; i++) {
      array.push(this[i].join(','));
    }

    return array.join(' ')
  },

  // Convert array to line object
  toLine () {
    return {
      x1: this[0][0],
      y1: this[0][1],
      x2: this[1][0],
      y2: this[1][1]
    }
  },

  // Get morphed array at given position
  at (pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    // generate morphed point string
    for (var i = 0, il = this.length, array = []; i < il; i++) {
      array.push([
        this[i][0] + (this.destination[i][0] - this[i][0]) * pos,
        this[i][1] + (this.destination[i][1] - this[i][1]) * pos
      ]);
    }

    return new PointArray(array)
  },

  // Parse point string and flat array
  parse (array = [ [ 0, 0 ] ]) {
    var points = [];

    // if it is an array
    if (array instanceof Array) {
      // and it is not flat, there is no need to parse it
      if (array[0] instanceof Array) {
        return array
      }
    } else { // Else, it is considered as a string
      // parse points
      array = array.trim().split(delimiter).map(parseFloat);
    }

    // validate points - https://svgwg.org/svg2-draft/shapes.html#DataTypePoints
    // Odd number of coordinates is an error. In such cases, drop the last odd coordinate.
    if (array.length % 2 !== 0) array.pop();

    // wrap points in two-tuples
    for (var i = 0, len = array.length; i < len; i = i + 2) {
      points.push([ array[i], array[i + 1] ]);
    }

    return points
  },

  // transform points with matrix (similar to Point.transform)
  transform (m) {
    const points = [];

    for (let i = 0; i < this.length; i++) {
      const point = this[i];
      // Perform the matrix multiplication
      points.push([
        m.a * point[0] + m.c * point[1] + m.e,
        m.b * point[0] + m.d * point[1] + m.f
      ]);
    }

    // Return the required point
    return new PointArray(points)
  },

  // Move point string
  move (x, y) {
    var box = this.bbox();

    // get relative offset
    x -= box.x;
    y -= box.y;

    // move every point
    if (!isNaN(x) && !isNaN(y)) {
      for (var i = this.length - 1; i >= 0; i--) {
        this[i] = [ this[i][0] + x, this[i][1] + y ];
      }
    }

    return this
  },

  // Resize poly string
  size (width, height) {
    var i;
    var box = this.bbox();

    // recalculate position of all points according to new size
    for (i = this.length - 1; i >= 0; i--) {
      if (box.width) this[i][0] = ((this[i][0] - box.x) * width) / box.width + box.x;
      if (box.height) this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
    }

    return this
  },

  // Get bounding box of points
  bbox () {
    var maxX = -Infinity;
    var maxY = -Infinity;
    var minX = Infinity;
    var minY = Infinity;
    this.forEach(function (el) {
      maxX = Math.max(el[0], maxX);
      maxY = Math.max(el[1], maxY);
      minX = Math.min(el[0], minX);
      minY = Math.min(el[1], minY);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
});

const MorphArray = PointArray;

// Move by left top corner over x-axis
function x$2 (x) {
  return x == null ? this.bbox().x : this.move(x, this.bbox().y)
}

// Move by left top corner over y-axis
function y$2 (y) {
  return y == null ? this.bbox().y : this.move(this.bbox().x, y)
}

// Set width of element
function width$1 (width) {
  const b = this.bbox();
  return width == null ? b.width : this.size(width, b.height)
}

// Set height of element
function height$1 (height) {
  const b = this.bbox();
  return height == null ? b.height : this.size(b.width, height)
}

var pointed = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MorphArray: MorphArray,
    x: x$2,
    y: y$2,
    width: width$1,
    height: height$1
});

class Line extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('line', node), node);
  }

  // Get array
  array () {
    return new PointArray([
      [ this.attr('x1'), this.attr('y1') ],
      [ this.attr('x2'), this.attr('y2') ]
    ])
  }

  // Overwrite native plot() method
  plot (x1, y1, x2, y2) {
    if (x1 == null) {
      return this.array()
    } else if (typeof y1 !== 'undefined') {
      x1 = { x1: x1, y1: y1, x2: x2, y2: y2 };
    } else {
      x1 = new PointArray(x1).toLine();
    }

    return this.attr(x1)
  }

  // Move by left top corner
  move (x, y) {
    return this.attr(this.array().move(x, y).toLine())
  }

  // Set element size to given width and height
  size (width, height) {
    var p = proportionalSize(this, width, height);
    return this.attr(this.array().size(p.width, p.height).toLine())
  }
}

extend(Line, pointed);

registerMethods({
  Container: {
    // Create a line element
    line: wrapWithAttrCheck(function (...args) {
      // make sure plot is called as a setter
      // x1 is not necessarily a number, it can also be an array, a string and a PointArray
      return Line.prototype.plot.apply(
        this.put(new Line())
        , args[0] != null ? args : [ 0, 0, 0, 0 ]
      )
    })
  }
});

register(Line, 'Line');

class Marker extends Container {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('marker', node), node);
  }

  // Set width of element
  width (width) {
    return this.attr('markerWidth', width)
  }

  // Set height of element
  height (height) {
    return this.attr('markerHeight', height)
  }

  // Set marker refX and refY
  ref (x, y) {
    return this.attr('refX', x).attr('refY', y)
  }

  // Update marker
  update (block) {
    // remove all content
    this.clear();

    // invoke passed block
    if (typeof block === 'function') {
      block.call(this, this);
    }

    return this
  }

  // Return the fill id
  toString () {
    return 'url(#' + this.id() + ')'
  }
}

registerMethods({
  Container: {
    marker (...args) {
      // Create marker element in defs
      return this.defs().marker(...args)
    }
  },
  Defs: {
    // Create marker
    marker: wrapWithAttrCheck(function (width, height, block) {
      // Set default viewbox to match the width and height, set ref to cx and cy and set orient to auto
      return this.put(new Marker())
        .size(width, height)
        .ref(width / 2, height / 2)
        .viewbox(0, 0, width, height)
        .attr('orient', 'auto')
        .update(block)
    })
  },
  marker: {
    // Create and attach markers
    marker (marker, width, height, block) {
      var attr = [ 'marker' ];

      // Build attribute name
      if (marker !== 'all') attr.push(marker);
      attr = attr.join('-');

      // Set marker attribute
      marker = arguments[1] instanceof Marker
        ? arguments[1]
        : this.defs().marker(width, height, block);

      return this.attr(attr, marker)
    }
  }
});

register(Marker, 'Marker');

/***
Base Class
==========
The base stepper class that will be
***/

function makeSetterGetter (k, f) {
  return function (v) {
    if (v == null) return this[v]
    this[k] = v;
    if (f) f.call(this);
    return this
  }
}

const easing = {
  '-': function (pos) {
    return pos
  },
  '<>': function (pos) {
    return -Math.cos(pos * Math.PI) / 2 + 0.5
  },
  '>': function (pos) {
    return Math.sin(pos * Math.PI / 2)
  },
  '<': function (pos) {
    return -Math.cos(pos * Math.PI / 2) + 1
  },
  bezier: function (x1, y1, x2, y2) {
    // see https://www.w3.org/TR/css-easing-1/#cubic-bezier-algo
    return function (t) {
      if (t < 0) {
        if (x1 > 0) {
          return y1 / x1 * t
        } else if (x2 > 0) {
          return y2 / x2 * t
        } else {
          return 0
        }
      } else if (t > 1) {
        if (x2 < 1) {
          return (1 - y2) / (1 - x2) * t + (y2 - x2) / (1 - x2)
        } else if (x1 < 1) {
          return (1 - y1) / (1 - x1) * t + (y1 - x1) / (1 - x1)
        } else {
          return 1
        }
      } else {
        return 3 * t * (1 - t) ** 2 * y1 + 3 * t ** 2 * (1 - t) * y2 + t ** 3
      }
    }
  },
  // see https://www.w3.org/TR/css-easing-1/#step-timing-function-algo
  steps: function (steps, stepPosition = 'end') {
    // deal with "jump-" prefix
    stepPosition = stepPosition.split('-').reverse()[0];

    let jumps = steps;
    if (stepPosition === 'none') {
      --jumps;
    } else if (stepPosition === 'both') {
      ++jumps;
    }

    // The beforeFlag is essentially useless
    return (t, beforeFlag = false) => {
      // Step is called currentStep in referenced url
      let step = Math.floor(t * steps);
      const jumping = (t * step) % 1 === 0;

      if (stepPosition === 'start' || stepPosition === 'both') {
        ++step;
      }

      if (beforeFlag && jumping) {
        --step;
      }

      if (t >= 0 && step < 0) {
        step = 0;
      }

      if (t <= 1 && step > jumps) {
        step = jumps;
      }

      return step / jumps
    }
  }
};

class Stepper {
  done () {
    return false
  }
}

/***
Easing Functions
================
***/

class Ease extends Stepper {
  constructor (fn) {
    super();
    this.ease = easing[fn || timeline.ease] || fn;
  }

  step (from, to, pos) {
    if (typeof from !== 'number') {
      return pos < 1 ? from : to
    }
    return from + (to - from) * this.ease(pos)
  }
}

/***
Controller Types
================
***/

class Controller extends Stepper {
  constructor (fn) {
    super();
    this.stepper = fn;
  }

  step (current, target, dt, c) {
    return this.stepper(current, target, dt, c)
  }

  done (c) {
    return c.done
  }
}

function recalculate () {
  // Apply the default parameters
  var duration = (this._duration || 500) / 1000;
  var overshoot = this._overshoot || 0;

  // Calculate the PID natural response
  var eps = 1e-10;
  var pi = Math.PI;
  var os = Math.log(overshoot / 100 + eps);
  var zeta = -os / Math.sqrt(pi * pi + os * os);
  var wn = 3.9 / (zeta * duration);

  // Calculate the Spring values
  this.d = 2 * zeta * wn;
  this.k = wn * wn;
}

class Spring extends Controller {
  constructor (duration, overshoot) {
    super();
    this.duration(duration || 500)
      .overshoot(overshoot || 0);
  }

  step (current, target, dt, c) {
    if (typeof current === 'string') return current
    c.done = dt === Infinity;
    if (dt === Infinity) return target
    if (dt === 0) return current

    if (dt > 100) dt = 16;

    dt /= 1000;

    // Get the previous velocity
    var velocity = c.velocity || 0;

    // Apply the control to get the new position and store it
    var acceleration = -this.d * velocity - this.k * (current - target);
    var newPosition = current
      + velocity * dt
      + acceleration * dt * dt / 2;

    // Store the velocity
    c.velocity = velocity + acceleration * dt;

    // Figure out if we have converged, and if so, pass the value
    c.done = Math.abs(target - newPosition) + Math.abs(velocity) < 0.002;
    return c.done ? target : newPosition
  }
}

extend(Spring, {
  duration: makeSetterGetter('_duration', recalculate),
  overshoot: makeSetterGetter('_overshoot', recalculate)
});

class PID extends Controller {
  constructor (p, i, d, windup) {
    super();

    p = p == null ? 0.1 : p;
    i = i == null ? 0.01 : i;
    d = d == null ? 0 : d;
    windup = windup == null ? 1000 : windup;
    this.p(p).i(i).d(d).windup(windup);
  }

  step (current, target, dt, c) {
    if (typeof current === 'string') return current
    c.done = dt === Infinity;

    if (dt === Infinity) return target
    if (dt === 0) return current

    var p = target - current;
    var i = (c.integral || 0) + p * dt;
    var d = (p - (c.error || 0)) / dt;
    var windup = this.windup;

    // antiwindup
    if (windup !== false) {
      i = Math.max(-windup, Math.min(i, windup));
    }

    c.error = p;
    c.integral = i;

    c.done = Math.abs(p) < 0.001;

    return c.done ? target : current + (this.P * p + this.I * i + this.D * d)
  }
}

extend(PID, {
  windup: makeSetterGetter('windup'),
  p: makeSetterGetter('P'),
  i: makeSetterGetter('I'),
  d: makeSetterGetter('D')
});

const PathArray = subClassArray('PathArray', SVGArray);

function pathRegReplace (a, b, c, d) {
  return c + d.replace(dots, ' .')
}

function arrayToString (a) {
  for (var i = 0, il = a.length, s = ''; i < il; i++) {
    s += a[i][0];

    if (a[i][1] != null) {
      s += a[i][1];

      if (a[i][2] != null) {
        s += ' ';
        s += a[i][2];

        if (a[i][3] != null) {
          s += ' ';
          s += a[i][3];
          s += ' ';
          s += a[i][4];

          if (a[i][5] != null) {
            s += ' ';
            s += a[i][5];
            s += ' ';
            s += a[i][6];

            if (a[i][7] != null) {
              s += ' ';
              s += a[i][7];
            }
          }
        }
      }
    }
  }

  return s + ' '
}

const pathHandlers = {
  M: function (c, p, p0) {
    p.x = p0.x = c[0];
    p.y = p0.y = c[1];

    return [ 'M', p.x, p.y ]
  },
  L: function (c, p) {
    p.x = c[0];
    p.y = c[1];
    return [ 'L', c[0], c[1] ]
  },
  H: function (c, p) {
    p.x = c[0];
    return [ 'H', c[0] ]
  },
  V: function (c, p) {
    p.y = c[0];
    return [ 'V', c[0] ]
  },
  C: function (c, p) {
    p.x = c[4];
    p.y = c[5];
    return [ 'C', c[0], c[1], c[2], c[3], c[4], c[5] ]
  },
  S: function (c, p) {
    p.x = c[2];
    p.y = c[3];
    return [ 'S', c[0], c[1], c[2], c[3] ]
  },
  Q: function (c, p) {
    p.x = c[2];
    p.y = c[3];
    return [ 'Q', c[0], c[1], c[2], c[3] ]
  },
  T: function (c, p) {
    p.x = c[0];
    p.y = c[1];
    return [ 'T', c[0], c[1] ]
  },
  Z: function (c, p, p0) {
    p.x = p0.x;
    p.y = p0.y;
    return [ 'Z' ]
  },
  A: function (c, p) {
    p.x = c[5];
    p.y = c[6];
    return [ 'A', c[0], c[1], c[2], c[3], c[4], c[5], c[6] ]
  }
};

const mlhvqtcsaz = 'mlhvqtcsaz'.split('');

for (var i$1 = 0, il = mlhvqtcsaz.length; i$1 < il; ++i$1) {
  pathHandlers[mlhvqtcsaz[i$1]] = (function (i) {
    return function (c, p, p0) {
      if (i === 'H') c[0] = c[0] + p.x;
      else if (i === 'V') c[0] = c[0] + p.y;
      else if (i === 'A') {
        c[5] = c[5] + p.x;
        c[6] = c[6] + p.y;
      } else {
        for (var j = 0, jl = c.length; j < jl; ++j) {
          c[j] = c[j] + (j % 2 ? p.y : p.x);
        }
      }

      return pathHandlers[i](c, p, p0)
    }
  })(mlhvqtcsaz[i$1].toUpperCase());
}

extend(PathArray, {
  // Convert array to string
  toString () {
    return arrayToString(this)
  },

  // Move path string
  move (x, y) {
    // get bounding box of current situation
    var box = this.bbox();

    // get relative offset
    x -= box.x;
    y -= box.y;

    if (!isNaN(x) && !isNaN(y)) {
      // move every point
      for (var l, i = this.length - 1; i >= 0; i--) {
        l = this[i][0];

        if (l === 'M' || l === 'L' || l === 'T') {
          this[i][1] += x;
          this[i][2] += y;
        } else if (l === 'H') {
          this[i][1] += x;
        } else if (l === 'V') {
          this[i][1] += y;
        } else if (l === 'C' || l === 'S' || l === 'Q') {
          this[i][1] += x;
          this[i][2] += y;
          this[i][3] += x;
          this[i][4] += y;

          if (l === 'C') {
            this[i][5] += x;
            this[i][6] += y;
          }
        } else if (l === 'A') {
          this[i][6] += x;
          this[i][7] += y;
        }
      }
    }

    return this
  },

  // Resize path string
  size (width, height) {
    // get bounding box of current situation
    var box = this.bbox();
    var i, l;

    // If the box width or height is 0 then we ignore
    // transformations on the respective axis
    box.width = box.width === 0 ? 1 : box.width;
    box.height = box.height === 0 ? 1 : box.height;

    // recalculate position of all points according to new size
    for (i = this.length - 1; i >= 0; i--) {
      l = this[i][0];

      if (l === 'M' || l === 'L' || l === 'T') {
        this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
        this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
      } else if (l === 'H') {
        this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
      } else if (l === 'V') {
        this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
      } else if (l === 'C' || l === 'S' || l === 'Q') {
        this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
        this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
        this[i][3] = ((this[i][3] - box.x) * width) / box.width + box.x;
        this[i][4] = ((this[i][4] - box.y) * height) / box.height + box.y;

        if (l === 'C') {
          this[i][5] = ((this[i][5] - box.x) * width) / box.width + box.x;
          this[i][6] = ((this[i][6] - box.y) * height) / box.height + box.y;
        }
      } else if (l === 'A') {
        // resize radii
        this[i][1] = (this[i][1] * width) / box.width;
        this[i][2] = (this[i][2] * height) / box.height;

        // move position values
        this[i][6] = ((this[i][6] - box.x) * width) / box.width + box.x;
        this[i][7] = ((this[i][7] - box.y) * height) / box.height + box.y;
      }
    }

    return this
  },

  // Test if the passed path array use the same path data commands as this path array
  equalCommands (pathArray) {
    var i, il, equalCommands;

    pathArray = new PathArray(pathArray);

    equalCommands = this.length === pathArray.length;
    for (i = 0, il = this.length; equalCommands && i < il; i++) {
      equalCommands = this[i][0] === pathArray[i][0];
    }

    return equalCommands
  },

  // Make path array morphable
  morph (pathArray) {
    pathArray = new PathArray(pathArray);

    if (this.equalCommands(pathArray)) {
      this.destination = pathArray;
    } else {
      this.destination = null;
    }

    return this
  },

  // Get morphed path array at given position
  at (pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    var sourceArray = this;
    var destinationArray = this.destination.value;
    var array = [];
    var pathArray = new PathArray();
    var i, il, j, jl;

    // Animate has specified in the SVG spec
    // See: https://www.w3.org/TR/SVG11/paths.html#PathElement
    for (i = 0, il = sourceArray.length; i < il; i++) {
      array[i] = [ sourceArray[i][0] ];
      for (j = 1, jl = sourceArray[i].length; j < jl; j++) {
        array[i][j] = sourceArray[i][j] + (destinationArray[i][j] - sourceArray[i][j]) * pos;
      }
      // For the two flags of the elliptical arc command, the SVG spec say:
      // Flags and booleans are interpolated as fractions between zero and one, with any non-zero value considered to be a value of one/true
      // Elliptical arc command as an array followed by corresponding indexes:
      // ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
      //   0    1   2        3                 4             5      6  7
      if (array[i][0] === 'A') {
        array[i][4] = +(array[i][4] !== 0);
        array[i][5] = +(array[i][5] !== 0);
      }
    }

    // Directly modify the value of a path array, this is done this way for performance
    pathArray.value = array;
    return pathArray
  },

  // Absolutize and parse path to array
  parse (array = [ [ 'M', 0, 0 ] ]) {
    // if it's already a patharray, no need to parse it
    if (array instanceof PathArray) return array

    // prepare for parsing
    var s;
    var paramCnt = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

    if (typeof array === 'string') {
      array = array
        .replace(numbersWithDots, pathRegReplace) // convert 45.123.123 to 45.123 .123
        .replace(pathLetters, ' $& ') // put some room between letters and numbers
        .replace(hyphen, '$1 -') // add space before hyphen
        .trim() // trim
        .split(delimiter); // split into array
    } else {
      array = array.reduce(function (prev, curr) {
        return [].concat.call(prev, curr)
      }, []);
    }

    // array now is an array containing all parts of a path e.g. ['M', '0', '0', 'L', '30', '30' ...]
    var result = [];
    var p = new Point();
    var p0 = new Point();
    var index = 0;
    var len = array.length;

    do {
      // Test if we have a path letter
      if (isPathLetter.test(array[index])) {
        s = array[index];
        ++index;
        // If last letter was a move command and we got no new, it defaults to [L]ine
      } else if (s === 'M') {
        s = 'L';
      } else if (s === 'm') {
        s = 'l';
      }

      result.push(pathHandlers[s].call(null,
        array.slice(index, (index = index + paramCnt[s.toUpperCase()])).map(parseFloat),
        p, p0
      )
      );
    } while (len > index)

    return result
  },

  // Get bounding box of path
  bbox () {
    parser().path.setAttribute('d', this.toString());
    return parser.nodes.path.getBBox()
  }
});

class Morphable {
  constructor (stepper) {
    this._stepper = stepper || new Ease('-');

    this._from = null;
    this._to = null;
    this._type = null;
    this._context = null;
    this._morphObj = null;
  }

  from (val) {
    if (val == null) {
      return this._from
    }

    this._from = this._set(val);
    return this
  }

  to (val) {
    if (val == null) {
      return this._to
    }

    this._to = this._set(val);
    return this
  }

  type (type) {
    // getter
    if (type == null) {
      return this._type
    }

    // setter
    this._type = type;
    return this
  }

  _set (value) {
    if (!this._type) {
      var type = typeof value;

      if (type === 'number') {
        this.type(SVGNumber);
      } else if (type === 'string') {
        if (Color.isColor(value)) {
          this.type(Color);
        } else if (delimiter.test(value)) {
          this.type(pathLetters.test(value)
            ? PathArray
            : SVGArray
          );
        } else if (numberAndUnit.test(value)) {
          this.type(SVGNumber);
        } else {
          this.type(NonMorphable);
        }
      } else if (morphableTypes.indexOf(value.constructor) > -1) {
        this.type(value.constructor);
      } else if (Array.isArray(value)) {
        this.type(SVGArray);
      } else if (type === 'object') {
        this.type(ObjectBag);
      } else {
        this.type(NonMorphable);
      }
    }

    var result = (new this._type(value));
    if (this._type === Color) {
      result = this._to ? result[this._to[4]]()
        : this._from ? result[this._from[4]]()
        : result;
    }
    result = result.toArray();

    this._morphObj = this._morphObj || new this._type();
    this._context = this._context
      || Array.apply(null, Array(result.length))
        .map(Object)
        .map(function (o) {
          o.done = true;
          return o
        });
    return result
  }

  stepper (stepper) {
    if (stepper == null) return this._stepper
    this._stepper = stepper;
    return this
  }

  done () {
    var complete = this._context
      .map(this._stepper.done)
      .reduce(function (last, curr) {
        return last && curr
      }, true);
    return complete
  }

  at (pos) {
    var _this = this;

    return this._morphObj.fromArray(
      this._from.map(function (i, index) {
        return _this._stepper.step(i, _this._to[index], pos, _this._context[index], _this._context)
      })
    )
  }
}

class NonMorphable {
  constructor (...args) {
    this.init(...args);
  }

  init (val) {
    val = Array.isArray(val) ? val[0] : val;
    this.value = val;
    return this
  }

  valueOf () {
    return this.value
  }

  toArray () {
    return [ this.value ]
  }
}

class TransformBag {
  constructor (...args) {
    this.init(...args);
  }

  init (obj) {
    if (Array.isArray(obj)) {
      obj = {
        scaleX: obj[0],
        scaleY: obj[1],
        shear: obj[2],
        rotate: obj[3],
        translateX: obj[4],
        translateY: obj[5],
        originX: obj[6],
        originY: obj[7]
      };
    }

    Object.assign(this, TransformBag.defaults, obj);
    return this
  }

  toArray () {
    var v = this;

    return [
      v.scaleX,
      v.scaleY,
      v.shear,
      v.rotate,
      v.translateX,
      v.translateY,
      v.originX,
      v.originY
    ]
  }
}

TransformBag.defaults = {
  scaleX: 1,
  scaleY: 1,
  shear: 0,
  rotate: 0,
  translateX: 0,
  translateY: 0,
  originX: 0,
  originY: 0
};

class ObjectBag {
  constructor (...args) {
    this.init(...args);
  }

  init (objOrArr) {
    this.values = [];

    if (Array.isArray(objOrArr)) {
      this.values = objOrArr;
      return
    }

    objOrArr = objOrArr || {};
    var entries = [];

    for (const i in objOrArr) {
      entries.push([ i, objOrArr[i] ]);
    }

    entries.sort((a, b) => {
      return a[0] - b[0]
    });

    this.values = entries.reduce((last, curr) => last.concat(curr), []);
    return this
  }

  valueOf () {
    var obj = {};
    var arr = this.values;

    for (var i = 0, len = arr.length; i < len; i += 2) {
      obj[arr[i]] = arr[i + 1];
    }

    return obj
  }

  toArray () {
    return this.values
  }
}

const morphableTypes = [
  NonMorphable,
  TransformBag,
  ObjectBag
];

function registerMorphableType (type = []) {
  morphableTypes.push(...[].concat(type));
}

function makeMorphable () {
  extend(morphableTypes, {
    to (val) {
      return new Morphable()
        .type(this.constructor)
        .from(this.valueOf())
        .to(val)
    },
    fromArray (arr) {
      this.init(arr);
      return this
    }
  });
}

class Path extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('path', node), node);
  }

  // Get array
  array () {
    return this._array || (this._array = new PathArray(this.attr('d')))
  }

  // Plot new path
  plot (d) {
    return (d == null) ? this.array()
      : this.clear().attr('d', typeof d === 'string' ? d : (this._array = new PathArray(d)))
  }

  // Clear array cache
  clear () {
    delete this._array;
    return this
  }

  // Move by left top corner
  move (x, y) {
    return this.attr('d', this.array().move(x, y))
  }

  // Move by left top corner over x-axis
  x (x) {
    return x == null ? this.bbox().x : this.move(x, this.bbox().y)
  }

  // Move by left top corner over y-axis
  y (y) {
    return y == null ? this.bbox().y : this.move(this.bbox().x, y)
  }

  // Set element size to given width and height
  size (width, height) {
    var p = proportionalSize(this, width, height);
    return this.attr('d', this.array().size(p.width, p.height))
  }

  // Set width of element
  width (width) {
    return width == null ? this.bbox().width : this.size(width, this.bbox().height)
  }

  // Set height of element
  height (height) {
    return height == null ? this.bbox().height : this.size(this.bbox().width, height)
  }

  targets () {
    return baseFind('svg textpath [href*="' + this.id() + '"]')
  }
}

// Define morphable array
Path.prototype.MorphArray = PathArray;

// Add parent method
registerMethods({
  Container: {
    // Create a wrapped path element
    path: wrapWithAttrCheck(function (d) {
      // make sure plot is called as a setter
      return this.put(new Path()).plot(d || new PathArray())
    })
  }
});

register(Path, 'Path');

// Get array
function array () {
  return this._array || (this._array = new PointArray(this.attr('points')))
}

// Plot new path
function plot (p) {
  return (p == null) ? this.array()
    : this.clear().attr('points', typeof p === 'string' ? p
    : (this._array = new PointArray(p)))
}

// Clear array cache
function clear () {
  delete this._array;
  return this
}

// Move by left top corner
function move (x, y) {
  return this.attr('points', this.array().move(x, y))
}

// Set element size to given width and height
function size (width, height) {
  const p = proportionalSize(this, width, height);
  return this.attr('points', this.array().size(p.width, p.height))
}

var poly = /*#__PURE__*/Object.freeze({
    __proto__: null,
    array: array,
    plot: plot,
    clear: clear,
    move: move,
    size: size
});

class Polygon extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('polygon', node), node);
  }
}

registerMethods({
  Container: {
    // Create a wrapped polygon element
    polygon: wrapWithAttrCheck(function (p) {
      // make sure plot is called as a setter
      return this.put(new Polygon()).plot(p || new PointArray())
    })
  }
});

extend(Polygon, pointed);
extend(Polygon, poly);
register(Polygon, 'Polygon');

class Polyline extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('polyline', node), node);
  }
}

registerMethods({
  Container: {
    // Create a wrapped polygon element
    polyline: wrapWithAttrCheck(function (p) {
      // make sure plot is called as a setter
      return this.put(new Polyline()).plot(p || new PointArray())
    })
  }
});

extend(Polyline, pointed);
extend(Polyline, poly);
register(Polyline, 'Polyline');

class Rect extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('rect', node), node);
  }
}

extend(Rect, { rx, ry });

registerMethods({
  Container: {
    // Create a rect element
    rect: wrapWithAttrCheck(function (width, height) {
      return this.put(new Rect()).size(width, height)
    })
  }
});

register(Rect, 'Rect');

class Queue {
  constructor () {
    this._first = null;
    this._last = null;
  }

  push (value) {
    // An item stores an id and the provided value
    var item = value.next ? value : { value: value, next: null, prev: null };

    // Deal with the queue being empty or populated
    if (this._last) {
      item.prev = this._last;
      this._last.next = item;
      this._last = item;
    } else {
      this._last = item;
      this._first = item;
    }

    // Return the current item
    return item
  }

  shift () {
    // Check if we have a value
    var remove = this._first;
    if (!remove) return null

    // If we do, remove it and relink things
    this._first = remove.next;
    if (this._first) this._first.prev = null;
    this._last = this._first ? this._last : null;
    return remove.value
  }

  // Shows us the first item in the list
  first () {
    return this._first && this._first.value
  }

  // Shows us the last item in the list
  last () {
    return this._last && this._last.value
  }

  // Removes the item that was returned from the push
  remove (item) {
    // Relink the previous item
    if (item.prev) item.prev.next = item.next;
    if (item.next) item.next.prev = item.prev;
    if (item === this._last) this._last = item.prev;
    if (item === this._first) this._first = item.next;

    // Invalidate item
    item.prev = null;
    item.next = null;
  }
}

const Animator = {
  nextDraw: null,
  frames: new Queue(),
  timeouts: new Queue(),
  immediates: new Queue(),
  timer: () => globals.window.performance || globals.window.Date,
  transforms: [],

  frame (fn) {
    // Store the node
    var node = Animator.frames.push({ run: fn });

    // Request an animation frame if we don't have one
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }

    // Return the node so we can remove it easily
    return node
  },

  timeout (fn, delay) {
    delay = delay || 0;

    // Work out when the event should fire
    var time = Animator.timer().now() + delay;

    // Add the timeout to the end of the queue
    var node = Animator.timeouts.push({ run: fn, time: time });

    // Request another animation frame if we need one
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }

    return node
  },

  immediate (fn) {
    // Add the immediate fn to the end of the queue
    var node = Animator.immediates.push(fn);
    // Request another animation frame if we need one
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }

    return node
  },

  cancelFrame (node) {
    node != null && Animator.frames.remove(node);
  },

  clearTimeout (node) {
    node != null && Animator.timeouts.remove(node);
  },

  cancelImmediate (node) {
    node != null && Animator.immediates.remove(node);
  },

  _draw (now) {
    // Run all the timeouts we can run, if they are not ready yet, add them
    // to the end of the queue immediately! (bad timeouts!!! [sarcasm])
    var nextTimeout = null;
    var lastTimeout = Animator.timeouts.last();
    while ((nextTimeout = Animator.timeouts.shift())) {
      // Run the timeout if its time, or push it to the end
      if (now >= nextTimeout.time) {
        nextTimeout.run();
      } else {
        Animator.timeouts.push(nextTimeout);
      }

      // If we hit the last item, we should stop shifting out more items
      if (nextTimeout === lastTimeout) break
    }

    // Run all of the animation frames
    var nextFrame = null;
    var lastFrame = Animator.frames.last();
    while ((nextFrame !== lastFrame) && (nextFrame = Animator.frames.shift())) {
      nextFrame.run(now);
    }

    var nextImmediate = null;
    while ((nextImmediate = Animator.immediates.shift())) {
      nextImmediate();
    }

    // If we have remaining timeouts or frames, draw until we don't anymore
    Animator.nextDraw = Animator.timeouts.first() || Animator.frames.first()
      ? globals.window.requestAnimationFrame(Animator._draw)
      : null;
  }
};

var makeSchedule = function (runnerInfo) {
  var start = runnerInfo.start;
  var duration = runnerInfo.runner.duration();
  var end = start + duration;
  return { start: start, duration: duration, end: end, runner: runnerInfo.runner }
};

const defaultSource = function () {
  const w = globals.window;
  return (w.performance || w.Date).now()
};

class Timeline extends EventTarget {
  // Construct a new timeline on the given element
  constructor (timeSource = defaultSource) {
    super();

    this._timeSource = timeSource;

    // Store the timing variables
    this._startTime = 0;
    this._speed = 1.0;

    // Determines how long a runner is hold in memory. Can be a dt or true/false
    this._persist = 0;

    // Keep track of the running animations and their starting parameters
    this._nextFrame = null;
    this._paused = true;
    this._runners = [];
    this._runnerIds = [];
    this._lastRunnerId = -1;
    this._time = 0;
    this._lastSourceTime = 0;
    this._lastStepTime = 0;

    // Make sure that step is always called in class context
    this._step = this._stepFn.bind(this, false);
    this._stepImmediate = this._stepFn.bind(this, true);
  }

  // schedules a runner on the timeline
  schedule (runner, delay, when) {
    if (runner == null) {
      return this._runners.map(makeSchedule)
    }

    // The start time for the next animation can either be given explicitly,
    // derived from the current timeline time or it can be relative to the
    // last start time to chain animations direclty

    var absoluteStartTime = 0;
    var endTime = this.getEndTime();
    delay = delay || 0;

    // Work out when to start the animation
    if (when == null || when === 'last' || when === 'after') {
      // Take the last time and increment
      absoluteStartTime = endTime;
    } else if (when === 'absolute' || when === 'start') {
      absoluteStartTime = delay;
      delay = 0;
    } else if (when === 'now') {
      absoluteStartTime = this._time;
    } else if (when === 'relative') {
      const runnerInfo = this._runners[runner.id];
      if (runnerInfo) {
        absoluteStartTime = runnerInfo.start + delay;
        delay = 0;
      }
    } else {
      throw new Error('Invalid value for the "when" parameter')
    }

    // Manage runner
    runner.unschedule();
    runner.timeline(this);

    const persist = runner.persist();
    const runnerInfo = {
      persist: persist === null ? this._persist : persist,
      start: absoluteStartTime + delay,
      runner
    };

    this._lastRunnerId = runner.id;

    this._runners.push(runnerInfo);
    this._runners.sort((a, b) => a.start - b.start);
    this._runnerIds = this._runners.map(info => info.runner.id);

    this.updateTime()._continue();
    return this
  }

  // Remove the runner from this timeline
  unschedule (runner) {
    var index = this._runnerIds.indexOf(runner.id);
    if (index < 0) return this

    this._runners.splice(index, 1);
    this._runnerIds.splice(index, 1);

    runner.timeline(null);
    return this
  }

  // Calculates the end of the timeline
  getEndTime () {
    var lastRunnerInfo = this._runners[this._runnerIds.indexOf(this._lastRunnerId)];
    var lastDuration = lastRunnerInfo ? lastRunnerInfo.runner.duration() : 0;
    var lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : 0;
    return lastStartTime + lastDuration
  }

  getEndTimeOfTimeline () {
    let lastEndTime = 0;
    for (var i = 0; i < this._runners.length; i++) {
      const runnerInfo = this._runners[i];
      var duration = runnerInfo ? runnerInfo.runner.duration() : 0;
      var startTime = runnerInfo ? runnerInfo.start : 0;
      const endTime = startTime + duration;
      if (endTime > lastEndTime) {
        lastEndTime = endTime;
      }
    }
    return lastEndTime
  }

  // Makes sure, that after pausing the time doesn't jump
  updateTime () {
    if (!this.active()) {
      this._lastSourceTime = this._timeSource();
    }
    return this
  }

  play () {
    // Now make sure we are not paused and continue the animation
    this._paused = false;
    return this.updateTime()._continue()
  }

  pause () {
    this._paused = true;
    return this._continue()
  }

  stop () {
    // Go to start and pause
    this.time(0);
    return this.pause()
  }

  finish () {
    // Go to end and pause
    this.time(this.getEndTimeOfTimeline() + 1);
    return this.pause()
  }

  speed (speed) {
    if (speed == null) return this._speed
    this._speed = speed;
    return this
  }

  reverse (yes) {
    var currentSpeed = this.speed();
    if (yes == null) return this.speed(-currentSpeed)

    var positive = Math.abs(currentSpeed);
    return this.speed(yes ? positive : -positive)
  }

  seek (dt) {
    return this.time(this._time + dt)
  }

  time (time) {
    if (time == null) return this._time
    this._time = time;
    return this._continue(true)
  }

  persist (dtOrForever) {
    if (dtOrForever == null) return this._persist
    this._persist = dtOrForever;
    return this
  }

  source (fn) {
    if (fn == null) return this._timeSource
    this._timeSource = fn;
    return this
  }

  _stepFn (immediateStep = false) {
    // Get the time delta from the last time and update the time
    var time = this._timeSource();
    var dtSource = time - this._lastSourceTime;

    if (immediateStep) dtSource = 0;

    var dtTime = this._speed * dtSource + (this._time - this._lastStepTime);
    this._lastSourceTime = time;

    // Only update the time if we use the timeSource.
    // Otherwise use the current time
    if (!immediateStep) {
      // Update the time
      this._time += dtTime;
      this._time = this._time < 0 ? 0 : this._time;
    }
    this._lastStepTime = this._time;
    this.fire('time', this._time);

    // This is for the case that the timeline was seeked so that the time
    // is now before the startTime of the runner. Thats why we need to set
    // the runner to position 0

    // FIXME:
    // However, reseting in insertion order leads to bugs. Considering the case,
    // where 2 runners change the same attriute but in different times,
    // reseting both of them will lead to the case where the later defined
    // runner always wins the reset even if the other runner started earlier
    // and therefore should win the attribute battle
    // this can be solved by reseting them backwards
    for (var k = this._runners.length; k--;) {
      // Get and run the current runner and ignore it if its inactive
      const runnerInfo = this._runners[k];
      const runner = runnerInfo.runner;

      // Make sure that we give the actual difference
      // between runner start time and now
      const dtToStart = this._time - runnerInfo.start;

      // Dont run runner if not started yet
      // and try to reset it
      if (dtToStart <= 0) {
        runner.reset();
      }
    }

    // Run all of the runners directly
    var runnersLeft = false;
    for (var i = 0, len = this._runners.length; i < len; i++) {
      // Get and run the current runner and ignore it if its inactive
      const runnerInfo = this._runners[i];
      const runner = runnerInfo.runner;
      let dt = dtTime;

      // Make sure that we give the actual difference
      // between runner start time and now
      const dtToStart = this._time - runnerInfo.start;

      // Dont run runner if not started yet
      if (dtToStart <= 0) {
        runnersLeft = true;
        continue
      } else if (dtToStart < dt) {
        // Adjust dt to make sure that animation is on point
        dt = dtToStart;
      }

      if (!runner.active()) continue

      // If this runner is still going, signal that we need another animation
      // frame, otherwise, remove the completed runner
      var finished = runner.step(dt).done;
      if (!finished) {
        runnersLeft = true;
        // continue
      } else if (runnerInfo.persist !== true) {
        // runner is finished. And runner might get removed
        var endTime = runner.duration() - runner.time() + this._time;

        if (endTime + runnerInfo.persist < this._time) {
          // Delete runner and correct index
          runner.unschedule();
          --i;
          --len;
        }
      }
    }

    // Basically: we continue when there are runners right from us in time
    // when -->, and when runners are left from us when <--
    if ((runnersLeft && !(this._speed < 0 && this._time === 0)) || (this._runnerIds.length && this._speed < 0 && this._time > 0)) {
      this._continue();
    } else {
      this.pause();
      this.fire('finished');
    }

    return this
  }

  // Checks if we are running and continues the animation
  _continue (immediateStep = false) {
    Animator.cancelFrame(this._nextFrame);
    this._nextFrame = null;

    if (immediateStep) return this._stepImmediate()
    if (this._paused) return this

    this._nextFrame = Animator.frame(this._step);
    return this
  }

  active () {
    return !!this._nextFrame
  }
}

registerMethods({
  Element: {
    timeline: function (timeline) {
      if (timeline == null) {
        this._timeline = (this._timeline || new Timeline());
        return this._timeline
      } else {
        this._timeline = timeline;
        return this
      }
    }
  }
});

class Runner extends EventTarget {
  constructor (options) {
    super();

    // Store a unique id on the runner, so that we can identify it later
    this.id = Runner.id++;

    // Ensure a default value
    options = options == null
      ? timeline.duration
      : options;

    // Ensure that we get a controller
    options = typeof options === 'function'
      ? new Controller(options)
      : options;

    // Declare all of the variables
    this._element = null;
    this._timeline = null;
    this.done = false;
    this._queue = [];

    // Work out the stepper and the duration
    this._duration = typeof options === 'number' && options;
    this._isDeclarative = options instanceof Controller;
    this._stepper = this._isDeclarative ? options : new Ease();

    // We copy the current values from the timeline because they can change
    this._history = {};

    // Store the state of the runner
    this.enabled = true;
    this._time = 0;
    this._lastTime = 0;

    // At creation, the runner is in reseted state
    this._reseted = true;

    // Save transforms applied to this runner
    this.transforms = new Matrix();
    this.transformId = 1;

    // Looping variables
    this._haveReversed = false;
    this._reverse = false;
    this._loopsDone = 0;
    this._swing = false;
    this._wait = 0;
    this._times = 1;

    this._frameId = null;

    // Stores how long a runner is stored after beeing done
    this._persist = this._isDeclarative ? true : null;
  }

  /*
  Runner Definitions
  ==================
  These methods help us define the runtime behaviour of the Runner or they
  help us make new runners from the current runner
  */

  element (element) {
    if (element == null) return this._element
    this._element = element;
    element._prepareRunner();
    return this
  }

  timeline (timeline) {
    // check explicitly for undefined so we can set the timeline to null
    if (typeof timeline === 'undefined') return this._timeline
    this._timeline = timeline;
    return this
  }

  animate (duration, delay, when) {
    var o = Runner.sanitise(duration, delay, when);
    var runner = new Runner(o.duration);
    if (this._timeline) runner.timeline(this._timeline);
    if (this._element) runner.element(this._element);
    return runner.loop(o).schedule(o.delay, o.when)
  }

  schedule (timeline, delay, when) {
    // The user doesn't need to pass a timeline if we already have one
    if (!(timeline instanceof Timeline)) {
      when = delay;
      delay = timeline;
      timeline = this.timeline();
    }

    // If there is no timeline, yell at the user...
    if (!timeline) {
      throw Error('Runner cannot be scheduled without timeline')
    }

    // Schedule the runner on the timeline provided
    timeline.schedule(this, delay, when);
    return this
  }

  unschedule () {
    var timeline = this.timeline();
    timeline && timeline.unschedule(this);
    return this
  }

  loop (times, swing, wait) {
    // Deal with the user passing in an object
    if (typeof times === 'object') {
      swing = times.swing;
      wait = times.wait;
      times = times.times;
    }

    // Sanitise the values and store them
    this._times = times || Infinity;
    this._swing = swing || false;
    this._wait = wait || 0;

    // Allow true to be passed
    if (this._times === true) { this._times = Infinity; }

    return this
  }

  delay (delay) {
    return this.animate(0, delay)
  }

  /*
  Basic Functionality
  ===================
  These methods allow us to attach basic functions to the runner directly
  */

  queue (initFn, runFn, retargetFn, isTransform) {
    this._queue.push({
      initialiser: initFn || noop,
      runner: runFn || noop,
      retarget: retargetFn,
      isTransform: isTransform,
      initialised: false,
      finished: false
    });
    var timeline = this.timeline();
    timeline && this.timeline()._continue();
    return this
  }

  during (fn) {
    return this.queue(null, fn)
  }

  after (fn) {
    return this.on('finished', fn)
  }

  /*
  Runner animation methods
  ========================
  Control how the animation plays
  */

  time (time) {
    if (time == null) {
      return this._time
    }
    const dt = time - this._time;
    this.step(dt);
    return this
  }

  duration () {
    return this._times * (this._wait + this._duration) - this._wait
  }

  loops (p) {
    var loopDuration = this._duration + this._wait;
    if (p == null) {
      var loopsDone = Math.floor(this._time / loopDuration);
      var relativeTime = (this._time - loopsDone * loopDuration);
      var position = relativeTime / this._duration;
      return Math.min(loopsDone + position, this._times)
    }
    var whole = Math.floor(p);
    var partial = p % 1;
    var time = loopDuration * whole + this._duration * partial;
    return this.time(time)
  }

  persist (dtOrForever) {
    if (dtOrForever == null) return this._persist
    this._persist = dtOrForever;
    return this
  }

  position (p) {
    // Get all of the variables we need
    var x = this._time;
    var d = this._duration;
    var w = this._wait;
    var t = this._times;
    var s = this._swing;
    var r = this._reverse;
    var position;

    if (p == null) {
      /*
      This function converts a time to a position in the range [0, 1]
      The full explanation can be found in this desmos demonstration
        https://www.desmos.com/calculator/u4fbavgche
      The logic is slightly simplified here because we can use booleans
      */

      // Figure out the value without thinking about the start or end time
      const f = function (x) {
        var swinging = s * Math.floor(x % (2 * (w + d)) / (w + d));
        var backwards = (swinging && !r) || (!swinging && r);
        var uncliped = Math.pow(-1, backwards) * (x % (w + d)) / d + backwards;
        var clipped = Math.max(Math.min(uncliped, 1), 0);
        return clipped
      };

      // Figure out the value by incorporating the start time
      var endTime = t * (w + d) - w;
      position = x <= 0 ? Math.round(f(1e-5))
        : x < endTime ? f(x)
        : Math.round(f(endTime - 1e-5));
      return position
    }

    // Work out the loops done and add the position to the loops done
    var loopsDone = Math.floor(this.loops());
    var swingForward = s && (loopsDone % 2 === 0);
    var forwards = (swingForward && !r) || (r && swingForward);
    position = loopsDone + (forwards ? p : 1 - p);
    return this.loops(position)
  }

  progress (p) {
    if (p == null) {
      return Math.min(1, this._time / this.duration())
    }
    return this.time(p * this.duration())
  }

  step (dt) {
    // If we are inactive, this stepper just gets skipped
    if (!this.enabled) return this

    // Update the time and get the new position
    dt = dt == null ? 16 : dt;
    this._time += dt;
    var position = this.position();

    // Figure out if we need to run the stepper in this frame
    var running = this._lastPosition !== position && this._time >= 0;
    this._lastPosition = position;

    // Figure out if we just started
    var duration = this.duration();
    var justStarted = this._lastTime <= 0 && this._time > 0;
    var justFinished = this._lastTime < duration && this._time >= duration;

    this._lastTime = this._time;
    if (justStarted) {
      this.fire('start', this);
    }

    // Work out if the runner is finished set the done flag here so animations
    // know, that they are running in the last step (this is good for
    // transformations which can be merged)
    var declarative = this._isDeclarative;
    this.done = !declarative && !justFinished && this._time >= duration;

    // Runner is running. So its not in reseted state anymore
    this._reseted = false;

    // Call initialise and the run function
    if (running || declarative) {
      this._initialise(running);

      // clear the transforms on this runner so they dont get added again and again
      this.transforms = new Matrix();
      var converged = this._run(declarative ? dt : position);

      this.fire('step', this);
    }
    // correct the done flag here
    // declaritive animations itself know when they converged
    this.done = this.done || (converged && declarative);
    if (justFinished) {
      this.fire('finished', this);
    }
    return this
  }

  reset () {
    if (this._reseted) return this
    this.time(0);
    this._reseted = true;
    return this
  }

  finish () {
    return this.step(Infinity)
  }

  reverse (reverse) {
    this._reverse = reverse == null ? !this._reverse : reverse;
    return this
  }

  ease (fn) {
    this._stepper = new Ease(fn);
    return this
  }

  active (enabled) {
    if (enabled == null) return this.enabled
    this.enabled = enabled;
    return this
  }

  /*
  Private Methods
  ===============
  Methods that shouldn't be used externally
  */

  // Save a morpher to the morpher list so that we can retarget it later
  _rememberMorpher (method, morpher) {
    this._history[method] = {
      morpher: morpher,
      caller: this._queue[this._queue.length - 1]
    };

    // We have to resume the timeline in case a controller
    // is already done without beeing ever run
    // This can happen when e.g. this is done:
    //    anim = el.animate(new SVG.Spring)
    // and later
    //    anim.move(...)
    if (this._isDeclarative) {
      var timeline = this.timeline();
      timeline && timeline.play();
    }
  }

  // Try to set the target for a morpher if the morpher exists, otherwise
  // do nothing and return false
  _tryRetarget (method, target, extra) {
    if (this._history[method]) {
      // if the last method wasnt even initialised, throw it away
      if (!this._history[method].caller.initialised) {
        const index = this._queue.indexOf(this._history[method].caller);
        this._queue.splice(index, 1);
        return false
      }

      // for the case of transformations, we use the special retarget function
      // which has access to the outer scope
      if (this._history[method].caller.retarget) {
        this._history[method].caller.retarget(target, extra);
        // for everything else a simple morpher change is sufficient
      } else {
        this._history[method].morpher.to(target);
      }

      this._history[method].caller.finished = false;
      var timeline = this.timeline();
      timeline && timeline.play();
      return true
    }
    return false
  }

  // Run each initialise function in the runner if required
  _initialise (running) {
    // If we aren't running, we shouldn't initialise when not declarative
    if (!running && !this._isDeclarative) return

    // Loop through all of the initialisers
    for (var i = 0, len = this._queue.length; i < len; ++i) {
      // Get the current initialiser
      var current = this._queue[i];

      // Determine whether we need to initialise
      var needsIt = this._isDeclarative || (!current.initialised && running);
      running = !current.finished;

      // Call the initialiser if we need to
      if (needsIt && running) {
        current.initialiser.call(this);
        current.initialised = true;
      }
    }
  }

  // Run each run function for the position or dt given
  _run (positionOrDt) {
    // Run all of the _queue directly
    var allfinished = true;
    for (var i = 0, len = this._queue.length; i < len; ++i) {
      // Get the current function to run
      var current = this._queue[i];

      // Run the function if its not finished, we keep track of the finished
      // flag for the sake of declarative _queue
      var converged = current.runner.call(this, positionOrDt);
      current.finished = current.finished || (converged === true);
      allfinished = allfinished && current.finished;
    }

    // We report when all of the constructors are finished
    return allfinished
  }

  addTransform (transform, index) {
    this.transforms.lmultiplyO(transform);
    return this
  }

  clearTransform () {
    this.transforms = new Matrix();
    return this
  }

  // TODO: Keep track of all transformations so that deletion is faster
  clearTransformsFromQueue () {
    if (!this.done || !this._timeline || !this._timeline._runnerIds.includes(this.id)) {
      this._queue = this._queue.filter((item) => {
        return !item.isTransform
      });
    }
  }

  static sanitise (duration, delay, when) {
    // Initialise the default parameters
    var times = 1;
    var swing = false;
    var wait = 0;
    duration = duration || timeline.duration;
    delay = delay || timeline.delay;
    when = when || 'last';

    // If we have an object, unpack the values
    if (typeof duration === 'object' && !(duration instanceof Stepper)) {
      delay = duration.delay || delay;
      when = duration.when || when;
      swing = duration.swing || swing;
      times = duration.times || times;
      wait = duration.wait || wait;
      duration = duration.duration || timeline.duration;
    }

    return {
      duration: duration,
      delay: delay,
      swing: swing,
      times: times,
      wait: wait,
      when: when
    }
  }
}

Runner.id = 0;

class FakeRunner {
  constructor (transforms = new Matrix(), id = -1, done = true) {
    this.transforms = transforms;
    this.id = id;
    this.done = done;
  }

  clearTransformsFromQueue () { }
}

extend([ Runner, FakeRunner ], {
  mergeWith (runner) {
    return new FakeRunner(
      runner.transforms.lmultiply(this.transforms),
      runner.id
    )
  }
});

// FakeRunner.emptyRunner = new FakeRunner()

const lmultiply = (last, curr) => last.lmultiplyO(curr);
const getRunnerTransform = (runner) => runner.transforms;

function mergeTransforms () {
  // Find the matrix to apply to the element and apply it
  const runners = this._transformationRunners.runners;
  const netTransform = runners
    .map(getRunnerTransform)
    .reduce(lmultiply, new Matrix());

  this.transform(netTransform);

  this._transformationRunners.merge();

  if (this._transformationRunners.length() === 1) {
    this._frameId = null;
  }
}

class RunnerArray {
  constructor () {
    this.runners = [];
    this.ids = [];
  }

  add (runner) {
    if (this.runners.includes(runner)) return
    const id = runner.id + 1;

    this.runners.push(runner);
    this.ids.push(id);

    return this
  }

  getByID (id) {
    return this.runners[this.ids.indexOf(id + 1)]
  }

  remove (id) {
    const index = this.ids.indexOf(id + 1);
    this.ids.splice(index, 1);
    this.runners.splice(index, 1);
    return this
  }

  merge () {
    let lastRunner = null;
    this.runners.forEach((runner, i) => {

      const condition = lastRunner
        && runner.done && lastRunner.done
        // don't merge runner when persisted on timeline
        && (!runner._timeline || !runner._timeline._runnerIds.includes(runner.id))
        && (!lastRunner._timeline || !lastRunner._timeline._runnerIds.includes(lastRunner.id));

      if (condition) {
        // the +1 happens in the function
        this.remove(runner.id);
        this.edit(lastRunner.id, runner.mergeWith(lastRunner));
      }

      lastRunner = runner;
    });

    return this
  }

  edit (id, newRunner) {
    const index = this.ids.indexOf(id + 1);
    this.ids.splice(index, 1, id + 1);
    this.runners.splice(index, 1, newRunner);
    return this
  }

  length () {
    return this.ids.length
  }

  clearBefore (id) {
    const deleteCnt = this.ids.indexOf(id + 1) || 1;
    this.ids.splice(0, deleteCnt, 0);
    this.runners.splice(0, deleteCnt, new FakeRunner())
      .forEach((r) => r.clearTransformsFromQueue());
    return this
  }
}

registerMethods({
  Element: {
    animate (duration, delay, when) {
      var o = Runner.sanitise(duration, delay, when);
      var timeline = this.timeline();
      return new Runner(o.duration)
        .loop(o)
        .element(this)
        .timeline(timeline.play())
        .schedule(o.delay, o.when)
    },

    delay (by, when) {
      return this.animate(0, by, when)
    },

    // this function searches for all runners on the element and deletes the ones
    // which run before the current one. This is because absolute transformations
    // overwfrite anything anyway so there is no need to waste time computing
    // other runners
    _clearTransformRunnersBefore (currentRunner) {
      this._transformationRunners.clearBefore(currentRunner.id);
    },

    _currentTransform (current) {
      return this._transformationRunners.runners
        // we need the equal sign here to make sure, that also transformations
        // on the same runner which execute before the current transformation are
        // taken into account
        .filter((runner) => runner.id <= current.id)
        .map(getRunnerTransform)
        .reduce(lmultiply, new Matrix())
    },

    _addRunner (runner) {
      this._transformationRunners.add(runner);

      // Make sure that the runner merge is executed at the very end of
      // all Animator functions. Thats why we use immediate here to execute
      // the merge right after all frames are run
      Animator.cancelImmediate(this._frameId);
      this._frameId = Animator.immediate(mergeTransforms.bind(this));
    },

    _prepareRunner () {
      if (this._frameId == null) {
        this._transformationRunners = new RunnerArray()
          .add(new FakeRunner(new Matrix(this)));
      }
    }
  }
});

extend(Runner, {
  attr (a, v) {
    return this.styleAttr('attr', a, v)
  },

  // Add animatable styles
  css (s, v) {
    return this.styleAttr('css', s, v)
  },

  styleAttr (type, name, val) {
    // apply attributes individually
    if (typeof name === 'object') {
      for (var key in name) {
        this.styleAttr(type, key, name[key]);
      }
      return this
    }

    var morpher = new Morphable(this._stepper).to(val);

    this.queue(function () {
      morpher = morpher.from(this.element()[type](name));
    }, function (pos) {
      this.element()[type](name, morpher.at(pos));
      return morpher.done()
    });

    return this
  },

  zoom (level, point) {
    if (this._tryRetarget('zoom', to, point)) return this

    var morpher = new Morphable(this._stepper).to(new SVGNumber(level));

    this.queue(function () {
      morpher = morpher.from(this.element().zoom());
    }, function (pos) {
      this.element().zoom(morpher.at(pos), point);
      return morpher.done()
    }, function (newLevel, newPoint) {
      point = newPoint;
      morpher.to(newLevel);
    });

    this._rememberMorpher('zoom', morpher);
    return this
  },

  /**
   ** absolute transformations
   **/

  //
  // M v -----|-----(D M v = F v)------|----->  T v
  //
  // 1. define the final state (T) and decompose it (once)
  //    t = [tx, ty, the, lam, sy, sx]
  // 2. on every frame: pull the current state of all previous transforms
  //    (M - m can change)
  //   and then write this as m = [tx0, ty0, the0, lam0, sy0, sx0]
  // 3. Find the interpolated matrix F(pos) = m + pos * (t - m)
  //   - Note F(0) = M
  //   - Note F(1) = T
  // 4. Now you get the delta matrix as a result: D = F * inv(M)

  transform (transforms, relative, affine) {
    // If we have a declarative function, we should retarget it if possible
    relative = transforms.relative || relative;
    if (this._isDeclarative && !relative && this._tryRetarget('transform', transforms)) {
      return this
    }

    // Parse the parameters
    var isMatrix = Matrix.isMatrixLike(transforms);
    affine = transforms.affine != null
      ? transforms.affine
      : (affine != null ? affine : !isMatrix);

    // Create a morepher and set its type
    const morpher = new Morphable(this._stepper)
      .type(affine ? TransformBag : Matrix);

    let origin;
    let element;
    let current;
    let currentAngle;
    let startTransform;

    function setup () {
      // make sure element and origin is defined
      element = element || this.element();
      origin = origin || getOrigin(transforms, element);

      startTransform = new Matrix(relative ? undefined : element);

      // add the runner to the element so it can merge transformations
      element._addRunner(this);

      // Deactivate all transforms that have run so far if we are absolute
      if (!relative) {
        element._clearTransformRunnersBefore(this);
      }
    }

    function run (pos) {
      // clear all other transforms before this in case something is saved
      // on this runner. We are absolute. We dont need these!
      if (!relative) this.clearTransform();

      const { x, y } = new Point(origin).transform(element._currentTransform(this));

      let target = new Matrix({ ...transforms, origin: [ x, y ] });
      let start = this._isDeclarative && current
        ? current
        : startTransform;

      if (affine) {
        target = target.decompose(x, y);
        start = start.decompose(x, y);

        // Get the current and target angle as it was set
        const rTarget = target.rotate;
        const rCurrent = start.rotate;

        // Figure out the shortest path to rotate directly
        const possibilities = [ rTarget - 360, rTarget, rTarget + 360 ];
        const distances = possibilities.map(a => Math.abs(a - rCurrent));
        const shortest = Math.min(...distances);
        const index = distances.indexOf(shortest);
        target.rotate = possibilities[index];
      }

      if (relative) {
        // we have to be careful here not to overwrite the rotation
        // with the rotate method of Matrix
        if (!isMatrix) {
          target.rotate = transforms.rotate || 0;
        }
        if (this._isDeclarative && currentAngle) {
          start.rotate = currentAngle;
        }
      }

      morpher.from(start);
      morpher.to(target);

      const affineParameters = morpher.at(pos);
      currentAngle = affineParameters.rotate;
      current = new Matrix(affineParameters);

      this.addTransform(current);
      element._addRunner(this);
      return morpher.done()
    }

    function retarget (newTransforms) {
      // only get a new origin if it changed since the last call
      if (
        (newTransforms.origin || 'center').toString()
        !== (transforms.origin || 'center').toString()
      ) {
        origin = getOrigin(transforms, element);
      }

      // overwrite the old transformations with the new ones
      transforms = { ...newTransforms, origin };
    }

    this.queue(setup, run, retarget, true);
    this._isDeclarative && this._rememberMorpher('transform', morpher);
    return this
  },

  // Animatable x-axis
  x (x, relative) {
    return this._queueNumber('x', x)
  },

  // Animatable y-axis
  y (y) {
    return this._queueNumber('y', y)
  },

  dx (x = 0) {
    return this._queueNumberDelta('x', x)
  },

  dy (y = 0) {
    return this._queueNumberDelta('y', y)
  },

  dmove (x, y) {
    return this.dx(x).dy(y)
  },

  _queueNumberDelta (method, to) {
    to = new SVGNumber(to);

    // Try to change the target if we have this method already registerd
    if (this._tryRetarget(method, to)) return this

    // Make a morpher and queue the animation
    var morpher = new Morphable(this._stepper).to(to);
    var from = null;
    this.queue(function () {
      from = this.element()[method]();
      morpher.from(from);
      morpher.to(from + to);
    }, function (pos) {
      this.element()[method](morpher.at(pos));
      return morpher.done()
    }, function (newTo) {
      morpher.to(from + new SVGNumber(newTo));
    });

    // Register the morpher so that if it is changed again, we can retarget it
    this._rememberMorpher(method, morpher);
    return this
  },

  _queueObject (method, to) {
    // Try to change the target if we have this method already registerd
    if (this._tryRetarget(method, to)) return this

    // Make a morpher and queue the animation
    var morpher = new Morphable(this._stepper).to(to);
    this.queue(function () {
      morpher.from(this.element()[method]());
    }, function (pos) {
      this.element()[method](morpher.at(pos));
      return morpher.done()
    });

    // Register the morpher so that if it is changed again, we can retarget it
    this._rememberMorpher(method, morpher);
    return this
  },

  _queueNumber (method, value) {
    return this._queueObject(method, new SVGNumber(value))
  },

  // Animatable center x-axis
  cx (x) {
    return this._queueNumber('cx', x)
  },

  // Animatable center y-axis
  cy (y) {
    return this._queueNumber('cy', y)
  },

  // Add animatable move
  move (x, y) {
    return this.x(x).y(y)
  },

  // Add animatable center
  center (x, y) {
    return this.cx(x).cy(y)
  },

  // Add animatable size
  size (width, height) {
    // animate bbox based size for all other elements
    var box;

    if (!width || !height) {
      box = this._element.bbox();
    }

    if (!width) {
      width = box.width / box.height * height;
    }

    if (!height) {
      height = box.height / box.width * width;
    }

    return this
      .width(width)
      .height(height)
  },

  // Add animatable width
  width (width) {
    return this._queueNumber('width', width)
  },

  // Add animatable height
  height (height) {
    return this._queueNumber('height', height)
  },

  // Add animatable plot
  plot (a, b, c, d) {
    // Lines can be plotted with 4 arguments
    if (arguments.length === 4) {
      return this.plot([ a, b, c, d ])
    }

    if (this._tryRetarget('plot', a)) return this

    var morpher = new Morphable(this._stepper)
      .type(this._element.MorphArray).to(a);

    this.queue(function () {
      morpher.from(this._element.array());
    }, function (pos) {
      this._element.plot(morpher.at(pos));
      return morpher.done()
    });

    this._rememberMorpher('plot', morpher);
    return this
  },

  // Add leading method
  leading (value) {
    return this._queueNumber('leading', value)
  },

  // Add animatable viewbox
  viewbox (x, y, width, height) {
    return this._queueObject('viewbox', new Box(x, y, width, height))
  },

  update (o) {
    if (typeof o !== 'object') {
      return this.update({
        offset: arguments[0],
        color: arguments[1],
        opacity: arguments[2]
      })
    }

    if (o.opacity != null) this.attr('stop-opacity', o.opacity);
    if (o.color != null) this.attr('stop-color', o.color);
    if (o.offset != null) this.attr('offset', o.offset);

    return this
  }
});

extend(Runner, { rx, ry, from, to });
register(Runner, 'Runner');

class Svg extends Container {
  constructor (node) {
    super(nodeOrNew('svg', node), node);
    this.namespace();
  }

  isRoot () {
    return !this.node.parentNode
      || !(this.node.parentNode instanceof globals.window.SVGElement)
      || this.node.parentNode.nodeName === '#document'
  }

  // Check if this is a root svg
  // If not, call docs from this element
  root () {
    if (this.isRoot()) return this
    return super.root()
  }

  // Add namespaces
  namespace () {
    if (!this.isRoot()) return this.root().namespace()
    return this
      .attr({ xmlns: ns, version: '1.1' })
      .attr('xmlns:xlink', xlink, xmlns)
      .attr('xmlns:svgjs', svgjs, xmlns)
  }

  // Creates and returns defs element
  defs () {
    if (!this.isRoot()) return this.root().defs()

    return adopt(this.node.querySelector('defs'))
      || this.put(new Defs())
  }

  // custom parent method
  parent (type) {
    if (this.isRoot()) {
      return this.node.parentNode.nodeName === '#document'
        ? null
        : adopt(this.node.parentNode)
    }

    return super.parent(type)
  }

  clear () {
    // remove children
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }

    // remove defs reference
    delete this._defs;

    return this
  }
}

registerMethods({
  Container: {
    // Create nested svg document
    nested: wrapWithAttrCheck(function () {
      return this.put(new Svg())
    })
  }
});

register(Svg, 'Svg', true);

class Symbol$1 extends Container {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('symbol', node), node);
  }
}

registerMethods({
  Container: {
    symbol: wrapWithAttrCheck(function () {
      return this.put(new Symbol$1())
    })
  }
});

register(Symbol$1, 'Symbol');

// Create plain text node
function plain (text) {
  // clear if build mode is disabled
  if (this._build === false) {
    this.clear();
  }

  // create text node
  this.node.appendChild(globals.document.createTextNode(text));

  return this
}

// Get length of text element
function length () {
  return this.node.getComputedTextLength()
}

var textable = /*#__PURE__*/Object.freeze({
    __proto__: null,
    plain: plain,
    length: length
});

class Text extends Shape {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('text', node), node);

    this.dom.leading = new SVGNumber(1.3); // store leading value for rebuilding
    this._rebuild = true; // enable automatic updating of dy values
    this._build = false; // disable build mode for adding multiple lines
  }

  // Move over x-axis
  // Text is moved its bounding box
  // text-anchor does NOT matter
  x (x, box = this.bbox()) {
    if (x == null) {
      return box.x
    }

    return this.attr('x', this.attr('x') + x - box.x)
  }

  // Move over y-axis
  y (y, box = this.bbox()) {
    if (y == null) {
      return box.y
    }

    return this.attr('y', this.attr('y') + y - box.y)
  }

  move (x, y, box = this.bbox()) {
    return this.x(x, box).y(y, box)
  }

  // Move center over x-axis
  cx (x, box = this.bbox()) {
    if (x == null) {
      return box.cx
    }

    return this.attr('x', this.attr('x') + x - box.cx)
  }

  // Move center over y-axis
  cy (y, box = this.bbox()) {
    if (y == null) {
      return box.cy
    }

    return this.attr('y', this.attr('y') + y - box.cy)
  }

  center (x, y, box = this.bbox()) {
    return this.cx(x, box).cy(y, box)
  }

  // Set the text content
  text (text) {
    // act as getter
    if (text === undefined) {
      var children = this.node.childNodes;
      var firstLine = 0;
      text = '';

      for (var i = 0, len = children.length; i < len; ++i) {
        // skip textPaths - they are no lines
        if (children[i].nodeName === 'textPath') {
          if (i === 0) firstLine = 1;
          continue
        }

        // add newline if its not the first child and newLined is set to true
        if (i !== firstLine && children[i].nodeType !== 3 && adopt(children[i]).dom.newLined === true) {
          text += '\n';
        }

        // add content of this node
        text += children[i].textContent;
      }

      return text
    }

    // remove existing content
    this.clear().build(true);

    if (typeof text === 'function') {
      // call block
      text.call(this, this);
    } else {
      // store text and make sure text is not blank
      text = text.split('\n');

      // build new lines
      for (var j = 0, jl = text.length; j < jl; j++) {
        this.tspan(text[j]).newLine();
      }
    }

    // disable build mode and rebuild lines
    return this.build(false).rebuild()
  }

  // Set / get leading
  leading (value) {
    // act as getter
    if (value == null) {
      return this.dom.leading
    }

    // act as setter
    this.dom.leading = new SVGNumber(value);

    return this.rebuild()
  }

  // Rebuild appearance type
  rebuild (rebuild) {
    // store new rebuild flag if given
    if (typeof rebuild === 'boolean') {
      this._rebuild = rebuild;
    }

    // define position of all lines
    if (this._rebuild) {
      var self = this;
      var blankLineOffset = 0;
      var leading = this.dom.leading;

      this.each(function () {
        var fontSize = globals.window.getComputedStyle(this.node)
          .getPropertyValue('font-size');
        var dy = leading * new SVGNumber(fontSize);

        if (this.dom.newLined) {
          this.attr('x', self.attr('x'));

          if (this.text() === '\n') {
            blankLineOffset += dy;
          } else {
            this.attr('dy', dy + blankLineOffset);
            blankLineOffset = 0;
          }
        }
      });

      this.fire('rebuild');
    }

    return this
  }

  // Enable / disable build mode
  build (build) {
    this._build = !!build;
    return this
  }

  // overwrite method from parent to set data properly
  setData (o) {
    this.dom = o;
    this.dom.leading = new SVGNumber(o.leading || 1.3);
    return this
  }
}

extend(Text, textable);

registerMethods({
  Container: {
    // Create text element
    text: wrapWithAttrCheck(function (text) {
      return this.put(new Text()).text(text)
    }),

    // Create plain text element
    plain: wrapWithAttrCheck(function (text) {
      return this.put(new Text()).plain(text)
    })
  }
});

register(Text, 'Text');

class Tspan extends Text {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('tspan', node), node);
  }

  // Set text content
  text (text) {
    if (text == null) return this.node.textContent + (this.dom.newLined ? '\n' : '')

    typeof text === 'function' ? text.call(this, this) : this.plain(text);

    return this
  }

  // Shortcut dx
  dx (dx) {
    return this.attr('dx', dx)
  }

  // Shortcut dy
  dy (dy) {
    return this.attr('dy', dy)
  }

  x (x) {
    return this.attr('x', x)
  }

  y (y) {
    return this.attr('x', y)
  }

  move (x, y) {
    return this.x(x).y(y)
  }

  // Create new line
  newLine () {
    // fetch text parent
    var t = this.parent(Text);

    // mark new line
    this.dom.newLined = true;

    var fontSize = globals.window.getComputedStyle(this.node)
      .getPropertyValue('font-size');
    var dy = t.dom.leading * new SVGNumber(fontSize);

    // apply new position
    return this.dy(dy).attr('x', t.x())
  }
}

extend(Tspan, textable);

registerMethods({
  Tspan: {
    tspan: wrapWithAttrCheck(function (text) {
      var tspan = new Tspan();

      // clear if build mode is disabled
      if (!this._build) {
        this.clear();
      }

      // add new tspan
      this.node.appendChild(tspan.node);

      return tspan.text(text)
    })
  }
});

register(Tspan, 'Tspan');

class ClipPath extends Container {
  constructor (node) {
    super(nodeOrNew('clipPath', node), node);
  }

  // Unclip all clipped elements and remove itself
  remove () {
    // unclip all targets
    this.targets().forEach(function (el) {
      el.unclip();
    });

    // remove clipPath from parent
    return super.remove()
  }

  targets () {
    return baseFind('svg [clip-path*="' + this.id() + '"]')
  }
}

registerMethods({
  Container: {
    // Create clipping element
    clip: wrapWithAttrCheck(function () {
      return this.defs().put(new ClipPath())
    })
  },
  Element: {
    // Distribute clipPath to svg element
    clipWith (element) {
      // use given clip or create a new one
      const clipper = element instanceof ClipPath
        ? element
        : this.parent().clip().add(element);

      // apply mask
      return this.attr('clip-path', 'url("#' + clipper.id() + '")')
    },

    // Unclip element
    unclip () {
      return this.attr('clip-path', null)
    },

    clipper () {
      return this.reference('clip-path')
    }
  }
});

register(ClipPath, 'ClipPath');

class ForeignObject extends Element {
  constructor (node) {
    super(nodeOrNew('foreignObject', node), node);
  }
}

registerMethods({
  Container: {
    foreignObject: wrapWithAttrCheck(function (width, height) {
      return this.put(new ForeignObject()).size(width, height)
    })
  }
});

register(ForeignObject, 'ForeignObject');

class G$1 extends Container {
  constructor (node) {
    super(nodeOrNew('g', node), node);
  }

  x (x, box = this.bbox()) {
    if (x == null) return box.x
    return this.move(x, box.y, box)
  }

  y (y, box = this.bbox()) {
    if (y == null) return box.y
    return this.move(box.x, y, box)
  }

  move (x = 0, y = 0, box = this.bbox()) {
    const dx = x - box.x;
    const dy = y - box.y;

    return this.dmove(dx, dy)
  }

  dx (dx) {
    return this.dmove(dx, 0)
  }

  dy (dy) {
    return this.dmove(0, dy)
  }

  dmove (dx, dy) {
    this.children().forEach((child, i) => {
      // Get the childs bbox
      const bbox = child.bbox();
      // Get childs matrix
      const m = new Matrix(child);
      // Translate childs matrix by amount and
      // transform it back into parents space
      const matrix = m.translate(dx, dy).transform(m.inverse());
      // Calculate new x and y from old box
      const p = new Point(bbox.x, bbox.y).transform(matrix);
      // Move element
      child.move(p.x, p.y);
    });

    return this
  }

  width (width, box = this.bbox()) {
    if (width == null) return box.width
    return this.size(width, box.height, box)
  }

  height (height, box = this.bbox()) {
    if (height == null) return box.height
    return this.size(box.width, height, box)
  }

  size (width, height, box = this.bbox()) {
    const p = proportionalSize(this, width, height, box);
    const scaleX = p.width / box.width;
    const scaleY = p.height / box.height;

    this.children().forEach((child, i) => {
      const o = new Point(box).transform(new Matrix(child).inverse());
      child.scale(scaleX, scaleY, o.x, o.y);
    });

    return this
  }
}

registerMethods({
  Container: {
    // Create a group element
    group: wrapWithAttrCheck(function () {
      return this.put(new G$1())
    })
  }
});

register(G$1, 'G');

class A$1 extends Container {
  constructor (node) {
    super(nodeOrNew('a', node), node);
  }

  // Link url
  to (url) {
    return this.attr('href', url, xlink)
  }

  // Link target attribute
  target (target) {
    return this.attr('target', target)
  }
}

registerMethods({
  Container: {
    // Create a hyperlink element
    link: wrapWithAttrCheck(function (url) {
      return this.put(new A$1()).to(url)
    })
  },
  Element: {
    // Create a hyperlink element
    linkTo: function (url) {
      var link = new A$1();

      if (typeof url === 'function') {
        url.call(link, link);
      } else {
        link.to(url);
      }

      return this.parent().put(link).put(this)
    }
  }
});

register(A$1, 'A');

class Mask extends Container {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('mask', node), node);
  }

  // Unmask all masked elements and remove itself
  remove () {
    // unmask all targets
    this.targets().forEach(function (el) {
      el.unmask();
    });

    // remove mask from parent
    return super.remove()
  }

  targets () {
    return baseFind('svg [mask*="' + this.id() + '"]')
  }
}

registerMethods({
  Container: {
    mask: wrapWithAttrCheck(function () {
      return this.defs().put(new Mask())
    })
  },
  Element: {
    // Distribute mask to svg element
    maskWith (element) {
      // use given mask or create a new one
      var masker = element instanceof Mask
        ? element
        : this.parent().mask().add(element);

      // apply mask
      return this.attr('mask', 'url("#' + masker.id() + '")')
    },

    // Unmask element
    unmask () {
      return this.attr('mask', null)
    },

    masker () {
      return this.reference('mask')
    }
  }
});

register(Mask, 'Mask');

function cssRule (selector, rule) {
  if (!selector) return ''
  if (!rule) return selector

  var ret = selector + '{';

  for (var i in rule) {
    ret += unCamelCase(i) + ':' + rule[i] + ';';
  }

  ret += '}';

  return ret
}

class Style extends Element {
  constructor (node) {
    super(nodeOrNew('style', node), node);
  }

  addText (w = '') {
    this.node.textContent += w;
    return this
  }

  font (name, src, params = {}) {
    return this.rule('@font-face', {
      fontFamily: name,
      src: src,
      ...params
    })
  }

  rule (selector, obj) {
    return this.addText(cssRule(selector, obj))
  }
}

registerMethods('Dom', {
  style: wrapWithAttrCheck(function (selector, obj) {
    return this.put(new Style()).rule(selector, obj)
  }),
  fontface: wrapWithAttrCheck(function (name, src, params) {
    return this.put(new Style()).font(name, src, params)
  })
});

register(Style, 'Style');

class TextPath extends Text {
  // Initialize node
  constructor (node) {
    super(nodeOrNew('textPath', node), node);
  }

  // return the array of the path track element
  array () {
    var track = this.track();

    return track ? track.array() : null
  }

  // Plot path if any
  plot (d) {
    var track = this.track();
    var pathArray = null;

    if (track) {
      pathArray = track.plot(d);
    }

    return (d == null) ? pathArray : this
  }

  // Get the path element
  track () {
    return this.reference('href')
  }
}

registerMethods({
  Container: {
    textPath: wrapWithAttrCheck(function (text, path) {
      // Convert text to instance if needed
      if (!(text instanceof Text)) {
        text = this.text(text);
      }

      return text.path(path)
    })
  },
  Text: {
    // Create path for text to run on
    path: wrapWithAttrCheck(function (track, importNodes = true) {
      var textPath = new TextPath();

      // if track is a path, reuse it
      if (!(track instanceof Path)) {
        // create path element
        track = this.defs().path(track);
      }

      // link textPath to path and add content
      textPath.attr('href', '#' + track, xlink);

      // Transplant all nodes from text to textPath
      let node;
      if (importNodes) {
        while ((node = this.node.firstChild)) {
          textPath.node.appendChild(node);
        }
      }

      // add textPath element as child node and return textPath
      return this.put(textPath)
    }),

    // Get the textPath children
    textPath () {
      return this.findOne('textPath')
    }
  },
  Path: {
    // creates a textPath from this path
    text: wrapWithAttrCheck(function (text) {
      // Convert text to instance if needed
      if (!(text instanceof Text)) {
        text = new Text().addTo(this.parent()).text(text);
      }

      // Create textPath from text and path and return
      return text.path(this)
    }),

    targets () {
      return baseFind('svg [href*="' + this.id() + '"]')
    }
  }
});

TextPath.prototype.MorphArray = PathArray;
register(TextPath, 'TextPath');

class Use extends Shape {
  constructor (node) {
    super(nodeOrNew('use', node), node);
  }

  // Use element as a reference
  element (element, file) {
    // Set lined element
    return this.attr('href', (file || '') + '#' + element, xlink)
  }
}

registerMethods({
  Container: {
    // Create a use element
    use: wrapWithAttrCheck(function (element, file) {
      return this.put(new Use()).element(element, file)
    })
  }
});

register(Use, 'Use');

/* Optional Modules */
const SVG = makeInstance;

extend([
  Svg,
  Symbol$1,
  Image,
  Pattern,
  Marker
], getMethodsFor('viewbox'));

extend([
  Line,
  Polyline,
  Polygon,
  Path
], getMethodsFor('marker'));

extend(Text, getMethodsFor('Text'));
extend(Path, getMethodsFor('Path'));

extend(Defs, getMethodsFor('Defs'));

extend([
  Text,
  Tspan
], getMethodsFor('Tspan'));

extend([
  Rect,
  Ellipse,
  Circle,
  Gradient
], getMethodsFor('radius'));

extend(EventTarget, getMethodsFor('EventTarget'));
extend(Dom, getMethodsFor('Dom'));
extend(Element, getMethodsFor('Element'));
extend(Shape, getMethodsFor('Shape'));
// extend(Element, getConstructor('Memory'))
extend(Container, getMethodsFor('Container'));

extend(Runner, getMethodsFor('Runner'));

List.extend(getMethodNames());

registerMorphableType([
  SVGNumber,
  Color,
  Box,
  Matrix,
  SVGArray,
  PointArray,
  PathArray
]);

makeMorphable();

function isNode() {
    // tslint:disable-next-line:strict-type-predicates
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

var SvgJsRenderer = /** @class */ (function (_super) {
    __extends(SvgJsRenderer, _super);
    function SvgJsRenderer(container) {
        var _this = _super.call(this, container) || this;
        // initialize the SVG
        var width = constants.width;
        var height = 0;
        /*
        For some reason the container needs to be initiated differently with svgdom (node) and
        and in the browser. Might be a bug in either svg.js or svgdom. But this workaround works fine
        so I'm not going to care for now.
         */
        /* istanbul ignore else */
        if (isNode()) {
            // node (jest)
            _this.svg = SVG(container);
        }
        else {
            // browser
            _this.svg = SVG().addTo(container);
        }
        _this.svg.attr('preserveAspectRatio', 'xMidYMid meet').viewbox(0, 0, width, height);
        return _this;
    }
    SvgJsRenderer.prototype.line = function (fromX, fromY, toX, toY, strokeWidth, color) {
        this.svg.line(fromX, fromY, toX, toY).stroke({ color: color, width: strokeWidth });
    };
    SvgJsRenderer.prototype.size = function (width, height) {
        this.svg.viewbox(0, 0, width, height);
    };
    SvgJsRenderer.prototype.clear = function () {
        this.svg.children().forEach(function (child) { return child.remove(); });
    };
    SvgJsRenderer.prototype.remove = function () {
        this.svg.remove();
    };
    SvgJsRenderer.prototype.background = function (color) {
        this.svg.rect().size('100%', '100%').fill(color);
    };
    SvgJsRenderer.prototype.text = function (text, x, y, fontSize, color, fontFamily, alignment, classes, plain) {
        var element;
        if (plain) {
            // create a text element centered at x,y. No SVG.js magic.
            element = this.svg
                .plain(text)
                .attr({
                x: x,
                y: y,
            })
                .font({
                family: fontFamily,
                size: fontSize,
                anchor: alignment,
                'dominant-baseline': 'central',
            })
                .fill(color)
                .addClass(Renderer.toClassName(classes));
        }
        else {
            element = this.svg
                .text(text)
                .move(x, y)
                .font({
                family: fontFamily,
                size: fontSize,
                anchor: alignment,
            })
                .fill(color)
                .addClass(Renderer.toClassName(classes));
        }
        return SvgJsRenderer.boxToElement(element.bbox(), element.remove.bind(element));
    };
    SvgJsRenderer.prototype.circle = function (x, y, diameter, strokeWidth, strokeColor, fill, classes) {
        var element = this.svg
            .circle(diameter)
            .move(x, y)
            .fill(fill || 'none')
            .stroke({
            color: strokeColor,
            width: strokeWidth,
        })
            .addClass(Renderer.toClassName(classes));
        return SvgJsRenderer.boxToElement(element.bbox(), element.remove.bind(element));
    };
    SvgJsRenderer.prototype.rect = function (x, y, width, height, strokeWidth, strokeColor, classes, fill, radius) {
        var element = this.svg
            .rect(width, height)
            .move(x, y)
            .fill(fill || 'none')
            .stroke({
            width: strokeWidth,
            color: strokeColor,
        })
            .radius(radius || 0)
            .addClass(Renderer.toClassName(classes));
        return SvgJsRenderer.boxToElement(element.bbox(), element.remove.bind(element));
    };
    SvgJsRenderer.prototype.triangle = function (x, y, size, strokeWidth, strokeColor, classes, fill) {
        var element = this.svg
            .path(Renderer.trianglePath(x, y, size))
            .move(x, y)
            .fill(fill || 'none')
            .stroke({
            width: strokeWidth,
            color: strokeColor,
        })
            .addClass(Renderer.toClassName(classes));
        return SvgJsRenderer.boxToElement(element.bbox(), element.remove.bind(element));
    };
    SvgJsRenderer.prototype.pentagon = function (x, y, size, strokeWidth, strokeColor, fill, classes) {
        return this.ngon(x, y, size, strokeWidth, strokeColor, fill, 5, classes);
    };
    SvgJsRenderer.prototype.ngon = function (x, y, size, strokeWidth, strokeColor, fill, edges, classes) {
        var element = this.svg
            .path(Renderer.ngonPath(x, y, size, edges))
            .move(x, y)
            .fill(fill || 'none')
            .stroke({
            width: strokeWidth,
            color: strokeColor,
        })
            .addClass(Renderer.toClassName(classes));
        return SvgJsRenderer.boxToElement(element.bbox(), element.remove.bind(element));
    };
    SvgJsRenderer.boxToElement = function (box, remove) {
        return {
            width: box.width,
            height: box.height,
            x: box.x,
            y: box.y,
            remove: remove,
        };
    };
    return SvgJsRenderer;
}(Renderer));

/**
 * Value for an open string (O)
 */
var OPEN = 0;
/**
 * Value for a silent string (X)
 */
var SILENT = 'x';
/**
 * Possible positions of the fret label (eg. "3fr").
 */
var FretLabelPosition;
(function (FretLabelPosition) {
    FretLabelPosition["LEFT"] = "left";
    FretLabelPosition["RIGHT"] = "right";
})(FretLabelPosition || (FretLabelPosition = {}));
var Shape$1;
(function (Shape) {
    Shape["CIRCLE"] = "circle";
    Shape["SQUARE"] = "square";
    Shape["TRIANGLE"] = "triangle";
    Shape["PENTAGON"] = "pentagon";
})(Shape$1 || (Shape$1 = {}));
var ChordStyle;
(function (ChordStyle) {
    ChordStyle["normal"] = "normal";
    ChordStyle["handdrawn"] = "handdrawn";
})(ChordStyle || (ChordStyle = {}));
var Orientation;
(function (Orientation) {
    Orientation["vertical"] = "vertical";
    Orientation["horizontal"] = "horizontal";
})(Orientation || (Orientation = {}));
var ElementType;
(function (ElementType) {
    ElementType["FRET"] = "fret";
    ElementType["STRING"] = "string";
    ElementType["BARRE"] = "barre";
    ElementType["BARRE_TEXT"] = "barre-text";
    ElementType["FINGER"] = "finger";
    ElementType["TITLE"] = "title";
    ElementType["TUNING"] = "tuning";
    ElementType["FRET_POSITION"] = "fret-position";
    ElementType["STRING_TEXT"] = "string-text";
    ElementType["SILENT_STRING"] = "silent-string";
    ElementType["OPEN_STRING"] = "open-string";
})(ElementType || (ElementType = {}));
var defaultSettings = {
    style: ChordStyle.normal,
    strings: 6,
    frets: 5,
    position: 1,
    tuning: [],
    tuningsFontSize: 28,
    fretLabelFontSize: 38,
    fretLabelPosition: FretLabelPosition.RIGHT,
    nutSize: 0.65,
    nutTextColor: '#FFF',
    nutTextSize: 24,
    nutStrokeWidth: 0,
    barreChordStrokeWidth: 0,
    sidePadding: 0.2,
    titleFontSize: 48,
    titleBottomMargin: 0,
    color: '#000',
    emptyStringIndicatorSize: 0.6,
    strokeWidth: 2,
    topFretWidth: 10,
    fretSize: 1.5,
    barreChordRadius: 0.25,
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    shape: Shape$1.CIRCLE,
    orientation: Orientation.vertical,
};
var SVGuitarChord = /** @class */ (function () {
    function SVGuitarChord(container) {
        var _this = this;
        this.container = container;
        this.settings = {};
        this.chordInternal = { fingers: [], barres: [] };
        // apply plugins
        // https://stackoverflow.com/a/16345172
        var classConstructor = this.constructor;
        classConstructor.plugins.forEach(function (plugin) {
            Object.assign(_this, plugin(_this));
        });
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    SVGuitarChord.plugin = function (plugin) {
        var _a;
        var currentPlugins = this.plugins;
        var BaseWithPlugins = (_a = /** @class */ (function (_super) {
                __extends(class_1, _super);
                function class_1() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return class_1;
            }(this)),
            _a.plugins = currentPlugins.concat(plugin),
            _a);
        return BaseWithPlugins;
    };
    Object.defineProperty(SVGuitarChord.prototype, "renderer", {
        get: function () {
            var _a;
            if (!this.rendererInternal) {
                var style = (_a = this.settings.style) !== null && _a !== void 0 ? _a : defaultSettings.style;
                switch (style) {
                    case ChordStyle.normal:
                        this.rendererInternal = new SvgJsRenderer(this.container);
                        break;
                    case ChordStyle.handdrawn:
                        this.rendererInternal = new RoughJsRenderer(this.container);
                        break;
                    default:
                        throw new Error(style + " is not a valid chord diagram style.");
                }
            }
            return this.rendererInternal;
        },
        enumerable: false,
        configurable: true
    });
    SVGuitarChord.prototype.configure = function (settings) {
        SVGuitarChord.sanityCheckSettings(settings);
        // special case for style: remove current renderer instance if style changed. The new renderer
        // instance will be created lazily.
        if (settings.style !== this.settings.style) {
            this.renderer.remove();
            delete this.rendererInternal;
        }
        this.settings = __assign(__assign({}, this.settings), settings);
        return this;
    };
    SVGuitarChord.prototype.chord = function (chord) {
        this.chordInternal = chord;
        return this;
    };
    SVGuitarChord.prototype.draw = function () {
        var _a;
        this.clear();
        this.drawBackground();
        var y;
        y = this.drawTitle((_a = this.settings.titleFontSize) !== null && _a !== void 0 ? _a : defaultSettings.titleFontSize);
        y = this.drawEmptyStringIndicators(y);
        y = this.drawTopFret(y);
        this.drawPosition(y);
        y = this.drawGrid(y);
        y = this.drawTunings(y);
        // now set the final height of the svg (and add some padding relative to the fret spacing)
        y += this.fretSpacing() / 10;
        var width = this.width(constants.width, y);
        var height = this.height(y, constants.width);
        this.renderer.size(width, height);
        this.drawTopEdges(y);
        return {
            width: constants.width,
            height: y,
        };
    };
    SVGuitarChord.sanityCheckSettings = function (settings) {
        if (typeof settings.strings !== 'undefined' && settings.strings <= 1) {
            throw new Error('Must have at least 2 strings');
        }
        if (typeof settings.frets !== 'undefined' && settings.frets < 0) {
            throw new Error('Cannot have less than 0 frets');
        }
        if (typeof settings.position !== 'undefined' && settings.position < 1) {
            throw new Error('Position cannot be less than 1');
        }
        if (typeof settings.fretSize !== 'undefined' && settings.fretSize < 0) {
            throw new Error('Fret size cannot be smaller than 0');
        }
        if (typeof settings.nutSize !== 'undefined' && settings.nutSize < 0) {
            throw new Error('Nut size cannot be smaller than 0');
        }
        if (typeof settings.strokeWidth !== 'undefined' && settings.strokeWidth < 0) {
            throw new Error('Stroke width cannot be smaller than 0');
        }
    };
    SVGuitarChord.prototype.drawTunings = function (y) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        // add some padding relative to the fret spacing
        var padding = this.fretSpacing() / 5;
        var stringXPositions = this.stringXPos();
        var strings = (_a = this.settings.strings) !== null && _a !== void 0 ? _a : defaultSettings.strings;
        var color = (_c = (_b = this.settings.tuningsColor) !== null && _b !== void 0 ? _b : this.settings.color) !== null && _c !== void 0 ? _c : defaultSettings.color;
        var tuning = (_d = this.settings.tuning) !== null && _d !== void 0 ? _d : defaultSettings.tuning;
        var fontFamily = (_e = this.settings.fontFamily) !== null && _e !== void 0 ? _e : defaultSettings.fontFamily;
        var tuningsFontSize = (_f = this.settings.tuningsFontSize) !== null && _f !== void 0 ? _f : defaultSettings.tuningsFontSize;
        var text;
        tuning.forEach(function (tuning_, i) {
            if (i < strings) {
                var classNames = [ElementType.TUNING, ElementType.TUNING + "-" + i];
                var _a = _this.coordinates(stringXPositions[i], y + padding), textX = _a.x, textY = _a.y;
                var tuningText = _this.renderer.text(tuning_, textX, textY, tuningsFontSize, color, fontFamily, Alignment.MIDDLE, classNames, true);
                if (tuning_) {
                    text = tuningText;
                }
            }
        });
        if (text) {
            return y + this.height(text.height, text.width) + padding * 2;
        }
        return y;
    };
    SVGuitarChord.prototype.drawPosition = function (y) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var position = (_b = (_a = this.chordInternal.position) !== null && _a !== void 0 ? _a : this.settings.position) !== null && _b !== void 0 ? _b : defaultSettings.position;
        if (position <= 1) {
            return;
        }
        var stringXPositions = this.stringXPos();
        var endX = stringXPositions[stringXPositions.length - 1];
        var startX = stringXPositions[0];
        var text = position + "fr";
        var size = (_c = this.settings.fretLabelFontSize) !== null && _c !== void 0 ? _c : defaultSettings.fretLabelFontSize;
        var color = (_e = (_d = this.settings.fretLabelColor) !== null && _d !== void 0 ? _d : this.settings.color) !== null && _e !== void 0 ? _e : defaultSettings.color;
        var nutSize = this.stringSpacing() * ((_f = this.settings.nutSize) !== null && _f !== void 0 ? _f : defaultSettings.nutSize);
        var fontFamily = (_g = this.settings.fontFamily) !== null && _g !== void 0 ? _g : defaultSettings.fontFamily;
        var fretLabelPosition = (_h = this.settings.fretLabelPosition) !== null && _h !== void 0 ? _h : defaultSettings.fretLabelPosition;
        // add some padding relative to the string spacing. Also make sure the padding is at least
        // 1/2 nutSize plus some padding to prevent the nut overlapping the position label.
        var padding = Math.max(this.stringSpacing() / 5, nutSize / 2 + 5);
        var className = ElementType.FRET_POSITION;
        if (this.orientation === Orientation.vertical) {
            var drawText_1 = function (sizeMultiplier) {
                if (sizeMultiplier === void 0) { sizeMultiplier = 1; }
                if (sizeMultiplier < 0.01) {
                    // text does not fit: don't render it at all.
                    // eslint-disable-next-line no-console
                    console.warn('Not enough space to draw the starting fret');
                    return;
                }
                if (fretLabelPosition === FretLabelPosition.RIGHT) {
                    var svgText = _this.renderer.text(text, endX + padding, y, size * sizeMultiplier, color, fontFamily, Alignment.LEFT, className);
                    var width = svgText.width, x = svgText.x;
                    if (x + width > constants.width) {
                        svgText.remove();
                        drawText_1(sizeMultiplier * 0.9);
                    }
                }
                else {
                    var svgText = _this.renderer.text(text, 1 / sizeMultiplier + startX - padding, y, size * sizeMultiplier, color, fontFamily, Alignment.RIGHT, className);
                    var x = svgText.x;
                    if (x < 0) {
                        svgText.remove();
                        drawText_1(sizeMultiplier * 0.8);
                    }
                }
            };
            drawText_1();
            return;
        }
        // Horizontal orientation
        var _j = fretLabelPosition === FretLabelPosition.RIGHT
            ? this.coordinates(endX + padding, y)
            : this.coordinates(startX - padding, y), textX = _j.x, textY = _j.y;
        this.renderer.text(text, textX, textY, size, color, fontFamily, Alignment.MIDDLE, className, true);
    };
    /**
     * Hack to prevent the empty space of the svg from being cut off without having to define a
     * fixed width
     */
    SVGuitarChord.prototype.drawTopEdges = function (y) {
        var _a;
        var orientation = (_a = this.settings.orientation) !== null && _a !== void 0 ? _a : defaultSettings.orientation;
        var xTopRight = orientation === Orientation.vertical ? constants.width : y;
        this.renderer.circle(0, 0, 0, 0, 'transparent', 'none', 'top-left');
        this.renderer.circle(xTopRight, 0, 0, 0, 'transparent', 'none', 'top-right');
    };
    SVGuitarChord.prototype.drawBackground = function () {
        if (this.settings.backgroundColor) {
            this.renderer.background(this.settings.backgroundColor);
        }
    };
    SVGuitarChord.prototype.drawTopFret = function (y) {
        var _a, _b, _c, _d, _e, _f;
        var stringXpositions = this.stringXPos();
        var strokeWidth = (_a = this.settings.strokeWidth) !== null && _a !== void 0 ? _a : defaultSettings.strokeWidth;
        var topFretWidth = (_b = this.settings.topFretWidth) !== null && _b !== void 0 ? _b : defaultSettings.topFretWidth;
        var startX = stringXpositions[0] - strokeWidth / 2;
        var endX = stringXpositions[stringXpositions.length - 1] + strokeWidth / 2;
        var position = (_d = (_c = this.chordInternal.position) !== null && _c !== void 0 ? _c : this.settings.position) !== null && _d !== void 0 ? _d : defaultSettings.position;
        var color = (_f = (_e = this.settings.fretColor) !== null && _e !== void 0 ? _e : this.settings.color) !== null && _f !== void 0 ? _f : defaultSettings.color;
        var fretSize;
        if (position > 1) {
            fretSize = strokeWidth;
        }
        else {
            fretSize = topFretWidth;
        }
        var _g = this.coordinates(startX, y + fretSize / 2), lineX1 = _g.x, lineY1 = _g.y;
        var _h = this.coordinates(endX, y + fretSize / 2), lineX2 = _h.x, lineY2 = _h.y;
        this.renderer.line(lineX1, lineY1, lineX2, lineY2, fretSize, color, ['top-fret', 'fret-0']);
        return y + fretSize;
    };
    SVGuitarChord.prototype.stringXPos = function () {
        var _a, _b;
        var strings = (_a = this.settings.strings) !== null && _a !== void 0 ? _a : defaultSettings.strings;
        var sidePadding = (_b = this.settings.sidePadding) !== null && _b !== void 0 ? _b : defaultSettings.sidePadding;
        var startX = constants.width * sidePadding;
        var stringsSpacing = this.stringSpacing();
        return range(strings).map(function (i) { return startX + stringsSpacing * i; });
    };
    SVGuitarChord.prototype.stringSpacing = function () {
        var _a, _b;
        var sidePadding = (_a = this.settings.sidePadding) !== null && _a !== void 0 ? _a : defaultSettings.sidePadding;
        var strings = (_b = this.settings.strings) !== null && _b !== void 0 ? _b : defaultSettings.strings;
        var startX = constants.width * sidePadding;
        var endX = constants.width - startX;
        var width = endX - startX;
        return width / (strings - 1);
    };
    SVGuitarChord.prototype.fretSpacing = function () {
        var _a;
        var stringSpacing = this.stringSpacing();
        var fretSize = (_a = this.settings.fretSize) !== null && _a !== void 0 ? _a : defaultSettings.fretSize;
        return stringSpacing * fretSize;
    };
    SVGuitarChord.prototype.fretLinesYPos = function (startY) {
        var _a;
        var frets = (_a = this.settings.frets) !== null && _a !== void 0 ? _a : defaultSettings.frets;
        var fretSpacing = this.fretSpacing();
        return range(frets, 1).map(function (i) { return startY + fretSpacing * i; });
    };
    SVGuitarChord.prototype.toArrayIndex = function (stringIndex) {
        var _a;
        var strings = (_a = this.settings.strings) !== null && _a !== void 0 ? _a : defaultSettings.strings;
        return Math.abs(stringIndex - strings);
    };
    SVGuitarChord.prototype.drawEmptyStringIndicators = function (y) {
        var _this = this;
        var _a, _b, _c;
        var stringXPositions = this.stringXPos();
        var stringSpacing = this.stringSpacing();
        var emptyStringIndicatorSize = (_a = this.settings.emptyStringIndicatorSize) !== null && _a !== void 0 ? _a : defaultSettings.emptyStringIndicatorSize;
        var size = emptyStringIndicatorSize * stringSpacing;
        // add some space above and below the indicator, relative to the indicator size
        var padding = size / 3;
        var color = (_b = this.settings.color) !== null && _b !== void 0 ? _b : defaultSettings.color;
        var strokeWidth = (_c = this.settings.strokeWidth) !== null && _c !== void 0 ? _c : defaultSettings.strokeWidth;
        var hasEmpty = false;
        this.chordInternal.fingers
            .filter(function (_a) {
            var _b = __read(_a, 2), value = _b[1];
            return value === SILENT || value === OPEN;
        })
            .map(function (_a) {
            var _b = __read(_a, 3), index = _b[0], value = _b[1], textOrOptions = _b[2];
            return [
                _this.toArrayIndex(index),
                value,
                textOrOptions,
            ];
        })
            .forEach(function (_a) {
            var _b, _c, _d, _e, _f, _g;
            var _h = __read(_a, 3), stringIndex = _h[0], value = _h[1], textOrOptions = _h[2];
            hasEmpty = true;
            var fingerOptions = SVGuitarChord.getFingerOptions(textOrOptions);
            var effectiveStrokeWidth = (_b = fingerOptions.strokeWidth) !== null && _b !== void 0 ? _b : strokeWidth;
            var effectiveStrokeColor = (_c = fingerOptions.strokeColor) !== null && _c !== void 0 ? _c : color;
            if (fingerOptions.text) {
                var textColor = (_e = (_d = fingerOptions.textColor) !== null && _d !== void 0 ? _d : _this.settings.color) !== null && _e !== void 0 ? _e : defaultSettings.color;
                var textSize = (_f = _this.settings.nutTextSize) !== null && _f !== void 0 ? _f : defaultSettings.nutTextSize;
                var fontFamily = (_g = _this.settings.fontFamily) !== null && _g !== void 0 ? _g : defaultSettings.fontFamily;
                var classNames = [ElementType.STRING_TEXT, ElementType.STRING_TEXT + "-" + stringIndex];
                _this.renderer.text(fingerOptions.text, stringXPositions[stringIndex], y + padding + size / 2, textSize, textColor, fontFamily, Alignment.MIDDLE, classNames, true);
            }
            if (value === OPEN) {
                // draw an O
                var classNames = [ElementType.OPEN_STRING, ElementType.OPEN_STRING + "-" + stringIndex];
                var _j = _this.rectCoordinates(stringXPositions[stringIndex] - size / 2, y + padding, size, size), lineX1 = _j.x, lineY1 = _j.y;
                _this.renderer.circle(lineX1, lineY1, size, effectiveStrokeWidth, effectiveStrokeColor, undefined, classNames);
            }
            else {
                // draw an X
                var classNames = [
                    ElementType.SILENT_STRING,
                    ElementType.SILENT_STRING + "-" + stringIndex,
                ];
                var startX = stringXPositions[stringIndex] - size / 2;
                var endX = startX + size;
                var startY = y + padding;
                var endY = startY + size;
                var _k = _this.coordinates(startX, startY), line1X1 = _k.x, line1Y1 = _k.y;
                var _l = _this.coordinates(endX, endY), line1X2 = _l.x, line1Y2 = _l.y;
                _this.renderer.line(line1X1, line1Y1, line1X2, line1Y2, effectiveStrokeWidth, effectiveStrokeColor, classNames);
                var _m = _this.coordinates(startX, endY), line2X1 = _m.x, line2Y1 = _m.y;
                var _o = _this.coordinates(endX, startY), line2X2 = _o.x, line2Y2 = _o.y;
                _this.renderer.line(line2X1, line2Y1, line2X2, line2Y2, effectiveStrokeWidth, effectiveStrokeColor, classNames);
            }
        });
        return hasEmpty || this.settings.fixedDiagramPosition ? y + size + 2 * padding : y + padding;
    };
    SVGuitarChord.prototype.drawGrid = function (y) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        var frets = (_a = this.settings.frets) !== null && _a !== void 0 ? _a : defaultSettings.frets;
        var fretSize = (_b = this.settings.fretSize) !== null && _b !== void 0 ? _b : defaultSettings.fretSize;
        var relativeNutSize = (_c = this.settings.nutSize) !== null && _c !== void 0 ? _c : defaultSettings.nutSize;
        var stringXPositions = this.stringXPos();
        var fretYPositions = this.fretLinesYPos(y);
        var stringSpacing = this.stringSpacing();
        var fretSpacing = stringSpacing * fretSize;
        var height = fretSpacing * frets;
        var startX = stringXPositions[0];
        var endX = stringXPositions[stringXPositions.length - 1];
        var nutSize = relativeNutSize * stringSpacing;
        var nutColor = (_e = (_d = this.settings.nutColor) !== null && _d !== void 0 ? _d : this.settings.color) !== null && _e !== void 0 ? _e : defaultSettings.color;
        var fretColor = (_g = (_f = this.settings.fretColor) !== null && _f !== void 0 ? _f : this.settings.color) !== null && _g !== void 0 ? _g : defaultSettings.color;
        var barreChordRadius = (_h = this.settings.barreChordRadius) !== null && _h !== void 0 ? _h : defaultSettings.barreChordRadius;
        var strokeWidth = (_j = this.settings.strokeWidth) !== null && _j !== void 0 ? _j : defaultSettings.strokeWidth;
        var fontFamily = (_k = this.settings.fontFamily) !== null && _k !== void 0 ? _k : defaultSettings.fontFamily;
        var nutTextColor = (_l = this.settings.nutTextColor) !== null && _l !== void 0 ? _l : defaultSettings.nutTextColor;
        var nutTextSize = (_m = this.settings.nutTextSize) !== null && _m !== void 0 ? _m : defaultSettings.nutTextSize;
        // draw frets
        fretYPositions.forEach(function (fretY, i) {
            var classNames = [ElementType.FRET, ElementType.FRET + "-" + i];
            var _a = _this.coordinates(startX, fretY), lineX1 = _a.x, lineY1 = _a.y;
            var _b = _this.coordinates(endX, fretY), lineX2 = _b.x, lineY2 = _b.y;
            _this.renderer.line(lineX1, lineY1, lineX2, lineY2, strokeWidth, fretColor, classNames);
        });
        // draw strings
        stringXPositions.forEach(function (stringX, i) {
            var classNames = [ElementType.STRING, ElementType.STRING + "-" + i];
            var _a = _this.coordinates(stringX, y), lineX1 = _a.x, lineY1 = _a.y;
            var _b = _this.coordinates(stringX, y + height + strokeWidth / 2), lineX2 = _b.x, lineY2 = _b.y;
            _this.renderer.line(lineX1, lineY1, lineX2, lineY2, strokeWidth, fretColor, classNames);
        });
        // draw barre chords
        this.chordInternal.barres.forEach(function (_a) {
            var _b, _c, _d, _e;
            var fret = _a.fret, fromString = _a.fromString, toString = _a.toString, text = _a.text, color = _a.color, textColor = _a.textColor, strokeColor = _a.strokeColor, className = _a.className, individualBarreChordStrokeWidth = _a.strokeWidth;
            var barreCenterY = fretYPositions[fret - 1] - strokeWidth / 4 - fretSpacing / 2;
            var fromStringX = stringXPositions[_this.toArrayIndex(fromString)];
            var distance = Math.abs(toString - fromString) * stringSpacing;
            var barreChordStrokeColor = (_d = (_c = (_b = strokeColor !== null && strokeColor !== void 0 ? strokeColor : _this.settings.barreChordStrokeColor) !== null && _b !== void 0 ? _b : _this.settings.nutColor) !== null && _c !== void 0 ? _c : _this.settings.color) !== null && _d !== void 0 ? _d : defaultSettings.color;
            var barreChordStrokeWidth = (_e = individualBarreChordStrokeWidth !== null && individualBarreChordStrokeWidth !== void 0 ? individualBarreChordStrokeWidth : _this.settings.barreChordStrokeWidth) !== null && _e !== void 0 ? _e : defaultSettings.barreChordStrokeWidth;
            var classNames = __spread([
                ElementType.BARRE,
                ElementType.BARRE + "-fret-" + (fret - 1)
            ], (className ? [className] : []));
            var barreWidth = distance + stringSpacing / 2;
            var barreHeight = nutSize;
            var _f = _this.rectCoordinates(fromStringX - stringSpacing / 4, barreCenterY - nutSize / 2, barreWidth, barreHeight), rectX = _f.x, rectY = _f.y, rectHeight = _f.height, rectWidth = _f.width;
            _this.renderer.rect(rectX, rectY, rectWidth, rectHeight, barreChordStrokeWidth, barreChordStrokeColor, classNames, color !== null && color !== void 0 ? color : nutColor, nutSize * barreChordRadius);
            // draw text on the barre chord
            if (text) {
                var textClassNames = [ElementType.BARRE_TEXT, ElementType.BARRE_TEXT + "-" + fret];
                var _g = _this.coordinates(fromStringX + distance / 2, barreCenterY), textX = _g.x, textY = _g.y;
                _this.renderer.text(text, textX, textY, nutTextSize, textColor !== null && textColor !== void 0 ? textColor : nutTextColor, fontFamily, Alignment.MIDDLE, textClassNames, true);
            }
        });
        // draw fingers
        this.chordInternal.fingers
            .filter(function (_a) {
            var _b = __read(_a, 2), value = _b[1];
            return value !== SILENT && value !== OPEN;
        })
            .map(function (_a) {
            var _b = __read(_a, 3), stringIndex = _b[0], fretIndex = _b[1], text = _b[2];
            return [
                _this.toArrayIndex(stringIndex),
                fretIndex,
                text,
            ];
        })
            .forEach(function (_a) {
            var _b = __read(_a, 3), stringIndex = _b[0], fretIndex = _b[1], textOrOptions = _b[2];
            var nutCenterX = startX + stringIndex * stringSpacing;
            var nutCenterY = y + fretIndex * fretSpacing - fretSpacing / 2;
            var fingerOptions = SVGuitarChord.getFingerOptions(textOrOptions);
            var classNames = __spread([
                ElementType.FINGER,
                ElementType.FINGER + "-string-" + stringIndex,
                ElementType.FINGER + "-fret-" + (fretIndex - 1),
                ElementType.FINGER + "-string-" + stringIndex + "-fret-" + (fretIndex - 1)
            ], (fingerOptions.className ? [fingerOptions.className] : []));
            // const { x: x0, y: y0 } = this.coordinates(nutCenterX, nutCenterY)
            _this.drawNut(nutCenterX, nutCenterY, nutSize, nutColor, nutTextSize, fontFamily, fingerOptions, classNames);
        });
        return y + height;
    };
    SVGuitarChord.prototype.drawNut = function (x, y, size, color, textSize, fontFamily, fingerOptions, classNames) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        var shape = (_a = fingerOptions.shape) !== null && _a !== void 0 ? _a : defaultSettings.shape;
        var nutTextColor = (_c = (_b = fingerOptions.textColor) !== null && _b !== void 0 ? _b : this.settings.nutTextColor) !== null && _c !== void 0 ? _c : defaultSettings.nutTextColor;
        var nutStrokeColor = (_g = (_f = (_e = (_d = fingerOptions.strokeColor) !== null && _d !== void 0 ? _d : this.settings.nutStrokeColor) !== null && _e !== void 0 ? _e : this.settings.nutColor) !== null && _f !== void 0 ? _f : this.settings.color) !== null && _g !== void 0 ? _g : defaultSettings.color;
        var nutStrokeWidth = (_j = (_h = fingerOptions.strokeWidth) !== null && _h !== void 0 ? _h : this.settings.nutStrokeWidth) !== null && _j !== void 0 ? _j : defaultSettings.nutStrokeWidth;
        var startX = x - size / 2;
        var startY = y - size / 2;
        var classNamesWithShape = __spread(classNames, [ElementType.FINGER + "-" + shape]);
        var _q = this.rectCoordinates(startX, startY, size, size), x0 = _q.x, y0 = _q.y;
        switch (shape) {
            case Shape$1.CIRCLE:
                this.renderer.circle(x0, y0, size, nutStrokeWidth, nutStrokeColor, (_k = fingerOptions.color) !== null && _k !== void 0 ? _k : color, classNamesWithShape);
                break;
            case Shape$1.SQUARE:
                this.renderer.rect(x0, y0, size, size, nutStrokeWidth, nutStrokeColor, classNamesWithShape, (_l = fingerOptions.color) !== null && _l !== void 0 ? _l : color);
                break;
            case Shape$1.TRIANGLE:
                this.renderer.triangle(x0, y0, size, nutStrokeWidth, nutStrokeColor, classNamesWithShape, (_m = fingerOptions.color) !== null && _m !== void 0 ? _m : color);
                break;
            case Shape$1.PENTAGON:
                this.renderer.pentagon(x0, y0, size, nutStrokeWidth, nutStrokeColor, (_o = fingerOptions.color) !== null && _o !== void 0 ? _o : color, classNamesWithShape);
                break;
            default:
                throw new Error("Invalid shape \"" + fingerOptions.shape + "\". Valid shapes are: " + Object.values(Shape$1)
                    .map(function (val) { return "\"" + val + "\""; })
                    .join(', ') + ".");
        }
        // draw text on the nut
        var textClassNames = __spread(classNames, [ElementType.FINGER + "-text"]);
        if (fingerOptions.text) {
            var _r = this.coordinates(x, y), textX = _r.x, textY = _r.y;
            this.renderer.text(fingerOptions.text, textX, textY, textSize, (_p = fingerOptions.textColor) !== null && _p !== void 0 ? _p : nutTextColor, fontFamily, Alignment.MIDDLE, textClassNames, true);
        }
    };
    SVGuitarChord.prototype.drawTitle = function (size) {
        var _a, _b, _c, _d, _e;
        var color = (_a = this.settings.color) !== null && _a !== void 0 ? _a : defaultSettings.color;
        var titleBottomMargin = (_b = this.settings.titleBottomMargin) !== null && _b !== void 0 ? _b : defaultSettings.titleBottomMargin;
        var fontFamily = (_c = this.settings.fontFamily) !== null && _c !== void 0 ? _c : defaultSettings.fontFamily;
        // This is somewhat of a hack to get a steady diagram position: If no title is defined we initially
        // render an 'X' and later remove it again. That way we get the same y as if there was a title. I tried
        // just rendering a space but that doesn't work.
        var title = (_e = (_d = this.chordInternal.title) !== null && _d !== void 0 ? _d : this.settings.title) !== null && _e !== void 0 ? _e : (this.settings.fixedDiagramPosition ? 'X' : '');
        // draw the title
        if (this.orientation === Orientation.vertical) {
            var _f = this.renderer.text(title, constants.width / 2, 5, size, color, fontFamily, Alignment.MIDDLE, ElementType.TITLE), x = _f.x, y = _f.y, width_1 = _f.width, height_1 = _f.height, remove_1 = _f.remove;
            // check if the title fits. If not, try with a smaller size
            if (x < -0.0001) {
                remove_1();
                // try again with smaller font
                return this.drawTitle(size * (constants.width / width_1));
            }
            if (!this.settings.title && this.settings.fixedDiagramPosition) {
                remove_1();
            }
            return y + height_1 + titleBottomMargin;
        }
        // render temporary text to get the height of the title
        var _g = this.renderer.text(title, 0, 0, size, color, fontFamily, Alignment.LEFT, ElementType.TITLE), removeTempText = _g.remove; _g.height; var width = _g.width;
        removeTempText();
        var _h = this.rectCoordinates(constants.width / 2, 5, 0, 0), textX = _h.x, textY = _h.y;
        var remove = this.renderer.text(title, textX, textY, size, color, fontFamily, Alignment.LEFT, ElementType.TITLE, true).remove;
        if (!this.settings.title && this.settings.fixedDiagramPosition) {
            remove();
        }
        return width + titleBottomMargin;
    };
    SVGuitarChord.prototype.clear = function () {
        this.renderer.clear();
    };
    /**
     * Completely remove the diagram from the DOM
     */
    SVGuitarChord.prototype.remove = function () {
        this.renderer.remove();
    };
    /**
     * Helper method to get an options object from the 3rd array value for a finger, that can either
     * be undefined, a string or and options object. This method will return an options object in
     * any case, so it's easier to work with this third value.
     *
     * @param textOrOptions
     */
    SVGuitarChord.getFingerOptions = function (textOrOptions) {
        if (!textOrOptions) {
            return {};
        }
        if (typeof textOrOptions === 'string') {
            return {
                text: textOrOptions,
            };
        }
        return textOrOptions;
    };
    /**
     * rotates x value if orientation is horizontal
     *
     * @param x x in vertical orientation
     * @param y y in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.x = function (x, y) {
        return this.orientation === Orientation.vertical ? x : y;
    };
    /**
     * rotates y value if orientation is horizontal
     *
     * @param x x in vertical orientation
     * @param y y in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.y = function (x, y) {
        return this.orientation === Orientation.vertical ? y : Math.abs(x - constants.width);
    };
    /**
     * rotates coordinates if orientation is horizontal
     *
     * @param x x in vertical orientation
     * @param y y in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.coordinates = function (x, y) {
        return {
            x: this.x(x, y),
            y: this.y(x, y),
        };
    };
    /**
     * rotates coordinates of a rectangle if orientation is horizontal
     *
     * @param x x in vertical orientation
     * @param y y in vertical orientation
     * @param width width in vertical orientation
     * @param height height in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.rectCoordinates = function (x, y, width, height) {
        if (this.orientation === Orientation.vertical) {
            return {
                x: x,
                y: y,
                width: width,
                height: height,
            };
        }
        return {
            x: this.x(x, y),
            y: this.y(x, y) - width,
            width: this.width(width, height),
            height: this.height(height, width),
        };
    };
    /**
     * rotates height if orientation is horizontal
     *
     * @param height_ height in vertical orientation
     * @param width width in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.height = function (height_, width) {
        return this.orientation === Orientation.vertical ? height_ : width;
    };
    /**
     * rotates width if orientation is horizontal
     *
     * @param width_ width in vertical orientation
     * @param height height in vertical orientation
     * @returns
     */
    SVGuitarChord.prototype.width = function (width_, height) {
        return this.orientation === Orientation.horizontal ? height : width_;
    };
    Object.defineProperty(SVGuitarChord.prototype, "orientation", {
        get: function () {
            var _a;
            return (_a = this.settings.orientation) !== null && _a !== void 0 ? _a : defaultSettings.orientation;
        },
        enumerable: false,
        configurable: true
    });
    SVGuitarChord.plugins = [];
    return SVGuitarChord;
}());

var svguitar = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get ChordStyle () { return ChordStyle; },
    get ElementType () { return ElementType; },
    get FretLabelPosition () { return FretLabelPosition; },
    OPEN: OPEN,
    get Orientation () { return Orientation; },
    SILENT: SILENT,
    SVGuitarChord: SVGuitarChord,
    get Shape () { return Shape$1; }
});

export { to_number as $, create_component as A, claim_component as B, mount_component as C, group_outros as D, transition_out as E, check_outros as F, transition_in as G, destroy_component as H, run_all as I, set_data_dev as J, get_store_value as K, axios as L, validate_store as M, component_subscribe as N, wrap$1 as O, onMount as P, replace as Q, Router as R, SvelteComponentDev as S, globals$1 as T, prevent_default as U, empty as V, set_input_value as W, src_url_equal as X, onDestroy as Y, query_selector_all as Z, prop_dev as _, space as a, location as a0, svguitar as a1, bubble as a2, createEventDispatcher as a3, stop_propagation as a4, binding_callbacks as a5, bind$1 as a6, add_flush_callback as a7, children as b, claim_element as c, dispatch_dev as d, element as e, claim_text as f, detach_dev as g, claim_space as h, init as i, add_location as j, attr_dev as k, insert_hydration_dev as l, append_hydration_dev as m, noop$1 as n, toggle_class as o, listen_dev as p, is_function as q, validate_each_argument as r, safe_not_equal as s, text as t, null_to_empty as u, validate_slots as v, writable as w, destroy_each as x, add_render_callback as y, push as z };
//# sourceMappingURL=vendor-de6d5de2.js.map
