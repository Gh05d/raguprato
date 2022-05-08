
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
import { S as SvelteComponentDev, i as init, s as safe_not_equal, d as dispatch_dev, v as validate_slots, e as element, t as text, a as space, c as claim_element, b as children, f as claim_text, g as detach_dev, h as claim_space, j as add_location, k as attr_dev, l as insert_hydration_dev, m as append_hydration_dev, n as noop } from './main-7ace8c10.js';

/* src/pages/Links/index.svelte generated by Svelte v3.47.0 */

const file = "src/pages/Links/index.svelte";

function create_fragment(ctx) {
	let h1;
	let t0;
	let t1;
	let ul;
	let li0;
	let t2;
	let a0;
	let t3;
	let t4;
	let t5;
	let li1;
	let t6;
	let a1;
	let t7;
	let t8;
	let t9;
	let li2;
	let a2;
	let t10;
	let t11;
	let t12;
	let li3;
	let a3;
	let t13;
	let t14;
	let t15;
	let li4;
	let a4;
	let t16;
	let t17;
	let t18;
	let li5;
	let t19;
	let em;
	let t20;
	let t21;
	let a5;
	let t22;
	let t23;
	let t24;
	let li6;
	let t25;
	let a6;
	let t26;
	let t27;

	const block = {
		c: function create() {
			h1 = element("h1");
			t0 = text("Links to great guitar learning resources");
			t1 = space();
			ul = element("ul");
			li0 = element("li");
			t2 = text("Marty Schwartz is an awesome teacher and also has some fun non-educational videos. ");
			a0 = element("a");
			t3 = text("Here");
			t4 = text(" is his Youtube channel.");
			t5 = space();
			li1 = element("li");
			t6 = text("Justin Sandercoe is another great teacher and is especially helpful if you are a\n    beginner guitarist. Check out his ");
			a1 = element("a");
			t7 = text("channel");
			t8 = text(".");
			t9 = space();
			li2 = element("li");
			a2 = element("a");
			t10 = text("Paul Davids");
			t11 = text(" is more for entertainment\n    than for learning, but he often breaks down stuff for his viewers and is a great player.");
			t12 = space();
			li3 = element("li");
			a3 = element("a");
			t13 = text("Epic Guitar Instruction");
			t14 = text(" is\n    also a great channel for beginners. Tons of easy to follow tutorials for the beginning\n    and intermediate guitar player.");
			t15 = space();
			li4 = element("li");
			a4 = element("a");
			t16 = text("Rick Beato");
			t17 = text(" is like Paul Davids more for\n    entertainment than for learning, but he offers some great content, like breaking down song\n    structures and explaining why they work.");
			t18 = space();
			li5 = element("li");
			t19 = text("If you are from ");
			em = element("em");
			t20 = text("Germany");
			t21 = text(", make sure to check out Till from\n    ");
			a5 = element("a");
			t22 = text("GitarrenTunes");
			t23 = text(", probably the\n    best youtube teacher who speaks German.");
			t24 = space();
			li6 = element("li");
			t25 = text("The same goes for the spanish speaking crowd, check out ");
			a6 = element("a");
			t26 = text("Cifra Club");
			t27 = text(".");
			this.h();
		},
		l: function claim(nodes) {
			h1 = claim_element(nodes, "H1", {});
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, "Links to great guitar learning resources");
			h1_nodes.forEach(detach_dev);
			t1 = claim_space(nodes);
			ul = claim_element(nodes, "UL", {});
			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", { class: true });
			var li0_nodes = children(li0);
			t2 = claim_text(li0_nodes, "Marty Schwartz is an awesome teacher and also has some fun non-educational videos. ");
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t3 = claim_text(a0_nodes, "Here");
			a0_nodes.forEach(detach_dev);
			t4 = claim_text(li0_nodes, " is his Youtube channel.");
			li0_nodes.forEach(detach_dev);
			t5 = claim_space(ul_nodes);
			li1 = claim_element(ul_nodes, "LI", { class: true });
			var li1_nodes = children(li1);
			t6 = claim_text(li1_nodes, "Justin Sandercoe is another great teacher and is especially helpful if you are a\n    beginner guitarist. Check out his ");
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t7 = claim_text(a1_nodes, "channel");
			a1_nodes.forEach(detach_dev);
			t8 = claim_text(li1_nodes, ".");
			li1_nodes.forEach(detach_dev);
			t9 = claim_space(ul_nodes);
			li2 = claim_element(ul_nodes, "LI", { class: true });
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t10 = claim_text(a2_nodes, "Paul Davids");
			a2_nodes.forEach(detach_dev);
			t11 = claim_text(li2_nodes, " is more for entertainment\n    than for learning, but he often breaks down stuff for his viewers and is a great player.");
			li2_nodes.forEach(detach_dev);
			t12 = claim_space(ul_nodes);
			li3 = claim_element(ul_nodes, "LI", { class: true });
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t13 = claim_text(a3_nodes, "Epic Guitar Instruction");
			a3_nodes.forEach(detach_dev);
			t14 = claim_text(li3_nodes, " is\n    also a great channel for beginners. Tons of easy to follow tutorials for the beginning\n    and intermediate guitar player.");
			li3_nodes.forEach(detach_dev);
			t15 = claim_space(ul_nodes);
			li4 = claim_element(ul_nodes, "LI", { class: true });
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t16 = claim_text(a4_nodes, "Rick Beato");
			a4_nodes.forEach(detach_dev);
			t17 = claim_text(li4_nodes, " is like Paul Davids more for\n    entertainment than for learning, but he offers some great content, like breaking down song\n    structures and explaining why they work.");
			li4_nodes.forEach(detach_dev);
			t18 = claim_space(ul_nodes);
			li5 = claim_element(ul_nodes, "LI", { class: true });
			var li5_nodes = children(li5);
			t19 = claim_text(li5_nodes, "If you are from ");
			em = claim_element(li5_nodes, "EM", {});
			var em_nodes = children(em);
			t20 = claim_text(em_nodes, "Germany");
			em_nodes.forEach(detach_dev);
			t21 = claim_text(li5_nodes, ", make sure to check out Till from\n    ");
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t22 = claim_text(a5_nodes, "GitarrenTunes");
			a5_nodes.forEach(detach_dev);
			t23 = claim_text(li5_nodes, ", probably the\n    best youtube teacher who speaks German.");
			li5_nodes.forEach(detach_dev);
			t24 = claim_space(ul_nodes);
			li6 = claim_element(ul_nodes, "LI", { class: true });
			var li6_nodes = children(li6);
			t25 = claim_text(li6_nodes, "The same goes for the spanish speaking crowd, check out ");
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t26 = claim_text(a6_nodes, "Cifra Club");
			a6_nodes.forEach(detach_dev);
			t27 = claim_text(li6_nodes, ".");
			li6_nodes.forEach(detach_dev);
			ul_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h1, file, 0, 0, 0);
			attr_dev(a0, "href", "https://www.youtube.com/c/martymusic");
			add_location(a0, file, 4, 87, 150);
			attr_dev(li0, "class", "svelte-1lsadx0");
			add_location(li0, file, 3, 2, 58);
			attr_dev(a1, "href", "https://www.youtube.com/c/justinguitar");
			add_location(a1, file, 10, 38, 375);
			attr_dev(li1, "class", "svelte-1lsadx0");
			add_location(li1, file, 8, 2, 247);
			attr_dev(a2, "href", "https://www.youtube.com/c/PaulDavids");
			add_location(a2, file, 16, 4, 469);
			attr_dev(li2, "class", "svelte-1lsadx0");
			add_location(li2, file, 15, 2, 460);
			attr_dev(a3, "href", "https://www.youtube.com/c/EpicGuitarInstruction");
			add_location(a3, file, 21, 4, 671);
			attr_dev(li3, "class", "svelte-1lsadx0");
			add_location(li3, file, 20, 2, 662);
			attr_dev(a4, "href", "https://www.youtube.com/c/RickBeato");
			add_location(a4, file, 27, 4, 907);
			attr_dev(li4, "class", "svelte-1lsadx0");
			add_location(li4, file, 26, 2, 898);
			add_location(em, file, 33, 20, 1173);
			attr_dev(a5, "href", "https://www.youtube.com/c/GitarrentunesDe");
			add_location(a5, file, 34, 4, 1228);
			attr_dev(li5, "class", "svelte-1lsadx0");
			add_location(li5, file, 32, 2, 1148);
			attr_dev(a6, "href", "https://www.youtube.com/c/cifraclub");
			add_location(a6, file, 39, 60, 1432);
			attr_dev(li6, "class", "svelte-1lsadx0");
			add_location(li6, file, 38, 2, 1367);
			add_location(ul, file, 2, 0, 51);
		},
		m: function mount(target, anchor) {
			insert_hydration_dev(target, h1, anchor);
			append_hydration_dev(h1, t0);
			insert_hydration_dev(target, t1, anchor);
			insert_hydration_dev(target, ul, anchor);
			append_hydration_dev(ul, li0);
			append_hydration_dev(li0, t2);
			append_hydration_dev(li0, a0);
			append_hydration_dev(a0, t3);
			append_hydration_dev(li0, t4);
			append_hydration_dev(ul, t5);
			append_hydration_dev(ul, li1);
			append_hydration_dev(li1, t6);
			append_hydration_dev(li1, a1);
			append_hydration_dev(a1, t7);
			append_hydration_dev(li1, t8);
			append_hydration_dev(ul, t9);
			append_hydration_dev(ul, li2);
			append_hydration_dev(li2, a2);
			append_hydration_dev(a2, t10);
			append_hydration_dev(li2, t11);
			append_hydration_dev(ul, t12);
			append_hydration_dev(ul, li3);
			append_hydration_dev(li3, a3);
			append_hydration_dev(a3, t13);
			append_hydration_dev(li3, t14);
			append_hydration_dev(ul, t15);
			append_hydration_dev(ul, li4);
			append_hydration_dev(li4, a4);
			append_hydration_dev(a4, t16);
			append_hydration_dev(li4, t17);
			append_hydration_dev(ul, t18);
			append_hydration_dev(ul, li5);
			append_hydration_dev(li5, t19);
			append_hydration_dev(li5, em);
			append_hydration_dev(em, t20);
			append_hydration_dev(li5, t21);
			append_hydration_dev(li5, a5);
			append_hydration_dev(a5, t22);
			append_hydration_dev(li5, t23);
			append_hydration_dev(ul, t24);
			append_hydration_dev(ul, li6);
			append_hydration_dev(li6, t25);
			append_hydration_dev(li6, a6);
			append_hydration_dev(a6, t26);
			append_hydration_dev(li6, t27);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(h1);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(ul);
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

function instance($$self, $$props) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Links', slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Links> was created with unknown prop '${key}'`);
	});

	return [];
}

class Links extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Links",
			options,
			id: create_fragment.name
		});
	}
}

export { Links as default };
//# sourceMappingURL=index-4314f49d.js.map