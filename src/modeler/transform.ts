import * as jsonld from 'jsonld';

const p_base_api = process.env['SYSML2_WEB_API_BASE'] || 'http://localhost:9000';

const p_base_element = `${p_base_api}/projects/stoplight/commits/12345/elements`;

import {readFileSync, writeFileSync} from 'fs';
import {collapse, type JsonObject} from '@blake.regalia/belt';

// await fetch(`${p_base}/proj`)

const sx_project = readFileSync('./resource/stoplight.jsonld', 'utf-8');

const a_elements = JSON.parse(sx_project) as JsonObject[];

const sx_context = readFileSync('./src/modeler/context.jsonld', 'utf-8');

const g_context = JSON.parse(sx_context);

// build output
let sx_out = '';

// each element
for(const g_element of a_elements) {
	const g_merged = Object.assign({}, g_context, g_element);

	// fix IRI
	g_merged['@id'] = `${p_base_element}/${g_merged['@id']}`;

	// emit
	sx_out += await jsonld.toRDF(g_merged as jsonld.JsonLdDocument, {format:'application/n-quads'});
}

// // merge with context
// const g_merged = Object.assign({}, g_context, collapse(a_elements, (g_value) => [
// 	g_value['@id'] as string,
// 	{
// 		...g_value,
// 		'@id': `${p_base_element}/${g_value['@id']}`,
// 	}
// ])) as jsonld.JsonLdDocument;

// const sx_out = await jsonld.toRDF(g_merged, {format:'application/n-quads'});

writeFileSync('./resource/stoplight.nt', sx_out+'', 'utf-8');

debugger;
console.log(sx_out);

// features.{}
