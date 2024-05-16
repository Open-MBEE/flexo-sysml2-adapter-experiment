import {readFileSync} from 'node:fs'
// import xml_parser from 'node-xml-stream-parser';

import {XMLParser} from 'fast-xml-parser';

const sx_uml = readFileSync(0, 'utf-8') || readFileSync('./resource/SysML.uml', 'utf-8');

const y_parser = new XMLParser({
   ignoreAttributes: false,
});

const g_parsed = y_parser.parse(sx_uml);

debugger;

console.log(g_parsed);
