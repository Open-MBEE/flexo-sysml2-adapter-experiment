import type {Dict} from '@blake.regalia/belt';
import type {StrictRouterNode} from './router-context';

import {readFileSync} from 'node:fs'

// @ts-expect-error untyped import
import ttl_write from '@graphy/content.ttl.write';

import {is_function, is_object, __UNDEFINED} from '@blake.regalia/belt';
// @ts-expect-error untyped import
import xml_parser from 'node-xml-stream-parser';

import {H_UML_PACKAGED_ELEMENT_CONTAINER} from './route-uml';
import {GC_APP} from './config';
import {RouterContext} from './router-context';

function run(w_xml: string | Buffer, k_node: StrictRouterNode) {
	// create turtle writer instnce
	let k_writer = ttl_write({
		prefixes: GC_APP.prefixes,
		error(z_err) {
			debugger;
			console.error(z_err);
		},
	});

	// context object
	let k_context = RouterContext.root(k_writer);

	// stack
	let a_stack: {
		node: StrictRouterNode;
		context: RouterContext;
	}[] = [{
		node: {},
		context: k_context,
	}];

	// skip until this context is encountered again
	let k_skip_until: RouterContext | null = null;

	// event handler struct
	let h_events = {
		opentag(s_tag: string, h_attrs: Dict) {
			// add to stack
			a_stack.push({
				node: k_node,
				context: k_context,
			});

			// fork context
			k_context = k_context.push(s_tag, h_attrs);

			// no children defs or skip
			if(k_skip_until || is_function(k_node) || !k_node.children) {
				// skip until reaching back to this point if not already skipping
				k_skip_until ??= k_context;

				// continue parsing
				return;
			}

			// found element in children
			if(s_tag in k_node.children) {
				// ref child
				let z_child = k_node.children[s_tag];

				// normalize
				let k_child = is_function(z_child)? {
					text: z_child,
				} as StrictRouterNode: z_child;

				// traverse to child
				k_node = k_child;

				// enter handler defined; call it
				if(k_node.enter) k_node.enter.call(k_context, h_attrs);
			}
			// element was not found in children but it should be there
			else if(k_node.comprehensive) {
				throw new Error(`expected to encounter one of: [${Object.keys(k_node.children).map(s => `'${s}'`).join(', ')}]; instead found '${s_tag}'`);
			}
			// skip descendents
			else {
				k_skip_until = k_context;
			}
		},

		closetag(s_tag: string) {
			// text handler defined; call handler
			if(k_node.text) k_node.text.call(k_context, k_context.attrs, k_context.text);

			// ref current context
			const k_context_local = k_context;

			// not skipped; call exit handler if defined
			if(!k_skip_until) k_node.exit?.call(k_context);

			// pop off stack
			({
				node: k_node,
				context: k_context,
			} = a_stack.pop()!);

			// returned to skip node
			if(k_context_local === k_skip_until) k_skip_until = null;
		},

		text(s_text: string) {
			// save unescaped text context
			k_context.text = s_text.replace(/&([lg]t|quot|apos|amp);/g, (s_all, s_key: string) => (({
				lt: '<',
				gt: '>',
				quot: '"',
				apos: `'`,
				amp: '&',
			} as Dict)[s_key]));
		},

		error(e_parse: Error) {
			throw e_parse;
		},

		finish() {
			// // close output
			// k_writer.end();
		},
	};


	// create streaming xml parser
	let y_parser = new xml_parser();

	// bind events
	for(let [s_event, f_event] of Object.entries(h_events)) {
		y_parser.on(s_event, f_event);
	}

	// stream parse
	y_parser.write(w_xml);

	// return writer instance
	return k_writer;
}

const sr_file = process.argv[2] || './resource/UML.xmi';

// consume UML xmi
run(readFileSync(sr_file), {
	children: {
		'xmi:XMI': {
			enter(h_attrs) {
				// debugger;
			},

			children: {
				'uml:Package': {
					enter(h_attrs) {
						this.package = this.setElement(h_attrs);
					},

					children: {
						...H_UML_PACKAGED_ELEMENT_CONTAINER,
					},
				},
			},
		},

		'uml:Model': {
			enter(h_attrs) {
				this.package = this.setElement(h_attrs);
			},

			children: H_UML_PACKAGED_ELEMENT_CONTAINER,
		},
	},
})
	// pipe to stdout
	.pipe(process.stdout);
