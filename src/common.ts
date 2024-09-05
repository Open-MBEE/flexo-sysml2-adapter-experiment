import assert from 'node:assert';

import {__UNDEFINED, is_boolean, is_number, is_string, assign} from '@blake.regalia/belt';

export type RecursiveDict = {
	[key: string]: RecursiveDict | string | number | boolean | undefined;
};

export type WeakUintStr = `${bigint}`;

export type C1String = `${string}:${string}` | `^${string}:${string}"${string}` | `@${string}"${string}` | `"${string}` | `>${string}`;

export type C3Node = string | number | boolean | {
   [key: string]: C3Node;
};

export type GraphyWriter = {
	write(g_data: {type: 'c3', value: RecursiveDict}): void;
};

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

