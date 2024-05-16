import type {Dict} from '@blake.regalia/belt';

// @ts-expect-error untyped import
import ttl_write from '@graphy/content.ttl.write';

import assert from 'node:assert';

import {GC_APP} from './config';
import {__UNDEFINED, is_boolean, is_number, is_string} from '@blake.regalia/belt';

export type RecursiveDict = {
	[key: string]: RecursiveDict | string | number | boolean | undefined;
};

export type WeakUintStr = `${bigint}`;

export type C1String = `${string}:${string}` | `^${string}:${string}"${string}` | `@${string}"${string}` | `"${string}` | `>${string}`;

export type C3Node = string | number | boolean | {
   [key: string]: C3Node;
};

export type RouterNode = {
   tag?: string;
   exclusive?: boolean;
   test?: (this: RouterContext, h: Dict) => boolean;
   enter?: (this: RouterContext, h_attrs: Dict) => void;
   exit?: (this: RouterContext) => void;
   text?: (this: RouterContext, s_text: string) => void;
   children?: Router;
} | ((this: RouterContext, h_attrs: Dict, s_text: string) => void);

export type Router = Dict<RouterNode | RouterNode[]>;

// create global turtle writer instnce
let k_writer = ttl_write({
	prefixes: GC_APP.prefixes,
});

// write c3 shortcut
export const write_c3 = (hc3: RecursiveDict) => k_writer.write({type:'c3', value:hc3});

// creates a literal if the given value is defined
export const optional_literal = (z_lit?: boolean | number | string | undefined) => is_string(z_lit)
	? `"${z_lit}`
	: is_number(z_lit)
		? z_lit
		: is_boolean(z_lit)
			? z_lit
			: __UNDEFINED;

// asserts that the two values are equal
export const expect = (z_expected: unknown, z_actual: unknown) => assert.equal(z_actual, z_expected);

// remap the version of the UML spec used for IRIs
export const remap_uml_spec_version = (p_iri: string) => p_iri.replace(/^http:\/\/www\.omg\.org\/spec\/UML\/20131001/, 'https://www.omg.org/spec/UML/20161101');


export const class_term = (s_id: string) => `uml:${s_id.replace(/^uml:/, '')}`;

export class RouterContext {
	/**
	 * The locally scoped element
	 */
	node!: C1String;

	/**
	 * Global map of nodes by their IDs
	 */
	nodesByXmiId!: Dict<C1String>;

	
	package!: C1String;
	rule!: C1String;
	spec!: C1String;
	attribute!: C1String;
	operation!: C1String;

	/**
	 * Identifies the element being annotated by its XMI ID
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

	constructor(protected _k_parent: RouterContext|null=null) {
		if(_k_parent) {
			this.node = _k_parent.node;
			this.nodesByXmiId = _k_parent.nodesByXmiId;
		}
	}

	setElement({'xmi:id':s_xmi_id}: Dict): C1String {
		return this.nodesByXmiId[s_xmi_id] = this.node = `element:${s_xmi_id}`;
	}

	setProperty({'xmi:id':s_xmi_id}: Dict): C1String {
		return this.nodesByXmiId[s_xmi_id] = this.node = `property:${s_xmi_id}`;
	}

	pop() {
		return this._k_parent;
	}

	push() {
		return new RouterContext(this);
	}
}