import {readFileSync, writeFileSync} from 'node:fs';
import {collapse, entries, is_array, try_async, type JsonObject} from '@blake.regalia/belt';
import * as jsonld from 'jsonld';

// SysML2 Web Services API
const p_base_api = process.env['SYSML2_WEB_API_BASE'] || 'http://localhost:9000';

// read and parse merged context JSON-LD vocabulary
const sx_context = readFileSync('./src/modeler/context.jsonld', 'utf-8');
const g_context = JSON.parse(sx_context);

// const si_project = '75f80406-f8f7-403d-8af0-f19c122685c1';
// const si_branch = '456821b5-7a88-4e26-8cf8-35fe94d41bd1';

// const si_project = '557fca3e-bf8e-4f18-8bf5-5ea49982fac8';
// const si_commit = 'fcd114ca-5764-455b-a295-9173ffeac15c';

// // SimpleQuadcopter
// const si_project = '75f80406-f8f7-403d-8af0-f19c122685c1';
// const si_commit = '6e76734a-137e-4473-9182-9eb0dee5c790';

// VehicleDefinitions
const si_project = '3d0b30e4-3f4e-4672-beb7-630c7f4335c3';
const si_commit = '88cfec2f-2dad-4687-a1c1-c33abfed3791';

const p_base_elements = `${p_base_api}/projects/${si_project}/commits/${si_commit}/elements`;

// await fetch(`${p_base_api}/projects/${si_project}`)

const fetchjsonld = async(p_req: string) => {
	console.warn(`> ${p_req}`);
	return await fetch(p_req);
};

// fetch all elements from commit
const d_res_all = await fetchjsonld(`${p_base_elements}`);

// parse response elements
const a_elements = await d_res_all.json() as JsonObject[];


// build output
let sx_out = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix sysml2: <http://omg.org/ns/sysml/v2/metamodel#> .
@prefix elmt: <${p_base_elements}/> .
@prefix rltn: <${p_base_elements}/relationships/> .
`;

const as_seen_retionships = new Set<string>();
const as_seen_elements = new Set<string>();
let as_unknown_elements = new Set<string>();

const RT_IRI = /^(http|ws|ftp|file:urn)s?:/;

async function serialize(g_node: JsonObject, p_base: string): Promise<string> {
	// prep merged object
	const g_merged = Object.assign({}, g_context, g_node);

	// node ID
	const si_node = g_node['@id'] as string;

	// add to known
	as_seen_elements.add(si_node);

	// fix root IRI
	g_merged['@id'] = RT_IRI.test(si_node)? si_node: `${p_base}/${si_node}`;

	// expand
	const a_expanded = await jsonld.expand(g_merged as jsonld.JsonLdDocument);

	// normalize all IRI references
	for(const g_expanded of a_expanded) {
		for(const [si_key, a_attrs] of entries(g_expanded)) {
			if('@' === si_key[0] || !is_array(a_attrs)) continue;

			for(const g_attr of a_attrs as JsonObject[]) {
				if(g_attr['@id'] && !RT_IRI.test(g_attr['@id'] as string)) {
					// relationship
					if(['http://omg.org/ns/sysml/v2/metamodel#owningRelationship'].includes(si_key)) {
						as_seen_retionships.add(g_attr['@id'] = `${p_base_elements}/${si_node}/relationships/${g_attr['@id']}`);
					}
					// element
					else {
						const si_element = g_attr['@id'] as string;

						g_attr['@id'] = `${p_base_elements}/${si_element}`;

						if(!as_seen_elements.has(si_element)) {
							as_unknown_elements.add(si_element);
						}
					}
				}
			}
		}
	}

	// emit
	return await jsonld.toRDF(a_expanded as jsonld.JsonLdDocument, {format:'application/n-quads'}) as string;
}

// each element
for(const g_element of a_elements) {
	// node ID
	const si_element = g_element['@id'] as string;

	// mark as seen
	as_seen_elements.add(si_element);

	// concatenate to output
	sx_out += await serialize(g_element, p_base_elements);

	// query for relationships
	const d_res = await fetchjsonld(`${p_base_elements}/${si_element}/relationships`);

	// parse
	const a_relationships = await d_res.json() as JsonObject[];

	// valid result
	if(is_array(a_relationships)) {
		// each relationship
		for(const g_relationship of a_relationships) {
			// concatenate to output
			sx_out += await serialize(g_relationship, `${p_base_elements}/relationships`);
		}
	}
	else {
		console.warn(a_relationships);
	}
}


for(;;) {
	for(const si_seen of as_seen_elements) {
		as_unknown_elements.delete(si_seen);
	}

	if(!as_unknown_elements.size) break;

	for(const si_unknown of as_unknown_elements) {
		// fetch element
		const d_res = await fetchjsonld(`${p_base_elements}/${si_unknown}`);

		// mark as seen
		as_seen_elements.add(si_unknown);

		//
		const [g_element] = await try_async<Error, JsonObject>(() => d_res.json() as any);

		if(!g_element || g_element['error']) continue;

		// concatenate to output
		sx_out += await serialize(g_element, p_base_elements);

		// query for relationships
		const d_res_rltn = await fetchjsonld(`${p_base_elements}/${si_unknown}/relationships`);

		// parse
		const a_relationships = await d_res_rltn.json() as JsonObject[];

		// valid result
		if(is_array(a_relationships)) {
			// each relationship
			for(const g_relationship of a_relationships) {
				// concatenate to output
				sx_out += await serialize(g_relationship, `${p_base_elements}/relationships`);
			}
		}
		else {
			console.warn(a_relationships);
		}
	}

	console.warn('*\n* RELOOPING\n*');
}

// write to stdout
console.log(sx_out);
