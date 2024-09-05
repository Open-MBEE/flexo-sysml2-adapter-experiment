const p_flexo_base = 'https://flexo.openmbee.org/rdf';

export const GC_APP = {
	prefixes: {
		rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
		owl: 'http://www.w3.org/2002/07/owl#',
		xsd: 'http://www.w3.org/2001/XMLSchema#',
		xml: 'http://www.w3.org/XML/1998/namespace/',
		shacl: 'http://www.w3.org/ns/shacl#',

		// project-specific named graph IRIs
		'flexo-graph': `${p_flexo_base}/graph/`,

		// for creating optional ShEx shapes that reflect UML concepts
		'flexo-shape': `${p_flexo_base}/shape/`,

		// reserved for future use
		'flexo-artifact': `${p_flexo_base}/artifact/`,
		'flexo-index': `${p_flexo_base}/index/`,

		// namespaces taken directly from OMG XMI documents so that parsed data can be queried
		xmi: 'http://www.omg.org/spec/XMI/20131001#',
		uml: 'http://www.omg.org/spec/UML/20161101#',

		// directly mapped concepts from the UML 2.5.1 metamodel
		'uml-model': 'https://www.omg.org/spec/UML/20161101/UML.xmi#',

		// separate namespace for UML properties
		'uml-property': 'https://www.omg.org/spec/UML/20161101/UML.xmi#property/',

		// separate namespace for UML elements
		'uml-element': 'https://www.omg.org/spec/UML/20161101/UML.xmi#property/',

		// separate namespace for datatypes of RDF literals adapted from UML datatypes
		'uml-model-dt': 'https://www.omg.org/spec/UML/20161101/UML.xmi#datatype/',

		// namespace for UML primitive dataypes which are defined separately
		'uml-primitives': 'https://www.omg.org/spec/UML/20161101/PrimitiveTypes.xmi#',

		// representing UML concepts in RDF for creating safe TBox statements
		'element': `${p_flexo_base}/sysml2/element/`,
		'property': `${p_flexo_base}/sysml2/property/`,

      'uml-import': `${p_flexo_base}/uml-import/`,


      'omg-ocl': 'http://www.omg.org/spec/OCL',
      'omg-ocl2': 'http://www.omg.org/spec/OCL/2.0',
	},
};
