import type {Dict, JsonObject} from '@blake.regalia/belt';
import type {C1String, WeakUintStr, GraphyWriter, RecursiveDict} from './common';

import {__UNDEFINED, assign, entries, is_dict_es, is_object, is_undefined} from '@blake.regalia/belt';

export type StrictRouterNode = {
   tag?: string;
   comprehensive?: boolean;
   test?: (this: RouterContext, h: Dict) => boolean;
   enter?: (this: RouterContext, h_attrs: Dict) => void;
   exit?: (this: RouterContext) => void;
   text?: (this: RouterContext, h_attrs: Dict, s_text?: string) => void;
   children?: Router;
};

export type RouterNodeDef = StrictRouterNode | ((this: RouterContext, h_attrs: Dict, s_text: string) => void);

export type Router = Dict<RouterNodeDef>;

export const remove_undefineds = (h_dict: RecursiveDict) => {
	for(const [si_key, z_value] of entries(h_dict)) {
		if(is_undefined(z_value)) {
			delete h_dict[si_key];
		}
		else if(is_dict_es(z_value)) {
			remove_undefineds(z_value);
		}
	}

	return h_dict;
};

export class RouterContext {
	/**
	 * The locally scoped element
	 */
	node!: C1String;

	/**
	 * The XML node's text content
	 */
	text = '';

	/**
	 * Global map of nodes by their IDs
	 */
	nodesByXmiId: Dict<C1String> = {};
	
	package!: C1String;
	rule!: C1String;
	spec!: C1String;
	attribute!: C1String;
	operation!: C1String;
	param!: C1String;
	end!: C1String;

	/**
	 * Identifies the element being annotated by its XMI ID or IRI
	 */
	subjectId!: string;

	ruleType: string | undefined;
	specType: string | undefined;
	specBody: C1String | undefined;
	specLang: string | undefined;
	attributeType: string | undefined;


	commentBody: C1String | undefined;

	multiplicity: {
		lowerValue: WeakUintStr;
		upperValue: WeakUintStr;
	} | undefined;

	protected _k_writer?: GraphyWriter;

	static root(k_writer: GraphyWriter): RouterContext {
		return assign(new RouterContext(), {
			_k_writer: k_writer,
		});
	}

	constructor(
		protected _k_parent: RouterContext|null=null,
		protected _s_tag?: string,
		protected _h_attrs?: Dict
	) {
		if(_k_parent) {
			this.node = _k_parent.node;
			this.nodesByXmiId = _k_parent.nodesByXmiId;
			this._k_writer = _k_parent._k_writer!;
		}
	}

	get parent(): RouterContext {
		return this._k_parent!;
	}

	get attrs(): Dict {
		return this._h_attrs || {};
	}

	write(g_node: RecursiveDict) {
		this._k_writer?.write({
			type: 'c3',
			value: remove_undefineds(g_node),
		});
	}

	setElement({'xmi:id':s_xmi_id}: Dict): C1String {
		return this.nodesByXmiId[s_xmi_id] = this.node = `element:${s_xmi_id}`;
	}

	setProperty({'xmi:id':s_xmi_id}: Dict): C1String {
		return this.nodesByXmiId[s_xmi_id] = this.node = `property:${s_xmi_id}`;
	}

	push(s_tag?: string, h_attrs?: Dict) {
		return new RouterContext(this, s_tag, h_attrs);
	}

	pop() {
		return this._k_parent;
	}

	get subject() {
		return this.nodesByXmiId[this.subjectId] || this.subjectId;
	}
}