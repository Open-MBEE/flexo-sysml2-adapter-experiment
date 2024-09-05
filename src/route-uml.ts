import type {Dict} from '@blake.regalia/belt';
import type {C3Node, RecursiveDict, WeakUintStr} from './common';
import type {Router, RouterContext, StrictRouterNode} from './router-context';

import assert from 'node:assert';

import {assign} from '@blake.regalia/belt';

// @ts-expect-error untyped import
import factory from '@graphy/core.data.factory';

import {optional_literal, remap_uml_spec_version, class_term} from './common';


export const H_UML_ELEMENT_COMMENTABLE: Router = {
	/**
	 * A comment optionally annotates a UML element
	 */
	ownedComment: {
		enter(h_attrs) {
			// set comment body from attribute if its defined
			this.commentBody = `@en"'${h_attrs['body'] || ''}`;

			// set the element being annotated
			this.subjectId = h_attrs['annotatedElement'];
		},

		exit() {
			this.write({
				[this.subject || this.parent.node]: {
					'rdfs:comment': this.commentBody,
				},
			});
		},

		children: {
			/**
			 * The optional body element of a comment
			 */
			body(h_attrs, s_text) {
				// set comment body from node using HTML
				this.parent.commentBody = `^rdf:HTML"${s_text}`;
			},

			/**
			 * Optional annotation
			 */
			annotatedElement(h_attrs) {
				// set the XMI ID of which element is being annotated by this comment
				this.parent.subjectId = h_attrs['xmi:idref'];
			},
		},
	},
};

export const H_UML_ELEMENT_RULABLE: Router = {
	/**
	 * A rule on an element
	 */
	ownedRule: {
		enter(h_attrs) {
			// set rule IRI
			this.rule = this.setElement(h_attrs);

			// set the element being constrained
			this.subjectId = h_attrs['constrainedElement'] || this.node;

			// set rule type
			this.ruleType = h_attrs['xmi:type'] || 'uml:Constraint';
		},

		exit() {
			this.write({
				[this.subject]: {
					'uml-model:rule': this.rule,
				},
			});
		},

		children: {
			...H_UML_ELEMENT_COMMENTABLE,

			/**
			 * Identifies the element being constrained
			 */
			constrainedElement(h_attrs) {
				// set the XMI ID of which element is being annotated by this rule
				this.parent.subjectId = h_attrs['xmi:idref'];
			},

			/**
			 * Specifies the function of the rule
			 */
			specification: {
				enter(h_attrs) {
					// create spec IRI
					this.spec = this.setElement(h_attrs);

					// set rule type
					this.specType = h_attrs['xmi:type'];
				},

				exit() {
					this.write({
						[this.parent.rule]: {
							a: this.parent.ruleType,
							'uml-model:specification': this.spec,
						},

						[this.spec]: {
							a: this.specType,
							'uml-model:body': (this.specLang || '"')+(this.specBody || '"'),
						},
					});
				},

				children: {
					/**
					 * Defines what language the specification body is in
					 */
					language(h_attrs, s_text) {
						// map language tag to c1 prefix
						this.parent.specLang = {
							'OCL': '^omg-ocl:',
							'OCL2.0': '^omg-ocl2:',
							'English': '@en',
						}[s_text] || '';
					},

					/**
					 * Declares the body of the specification
					 */
					body(h_attrs, s_text) {
						this.parent.specBody = `"${s_text}`;
					},
				},
			},
		},
	},
};


export const H_UML_ELEMENT_OPERATABLE: Router = {
	/**
	 * An operation for a given 
	 */
	ownedOperation: {
		enter(h_attrs) {
			// set operation IRI
			this.operation = this.setElement(h_attrs);
		},

		exit() {
			this.write({
				[this.parent.node]: {
					'uml-model:operation': this.operation,
				},
			});
		},

		children: {
			...H_UML_ELEMENT_COMMENTABLE,
			...H_UML_ELEMENT_RULABLE,

			/**
			 * Rules can optionally contain parameters
			 */
			ownedParameter: {
				enter(h_attrs) {
					// set parameter IRI
					this.param = this.setElement(h_attrs);

					// prep c3 output
					const h_c3: RecursiveDict = {};

					// is the return value
					if('return' === h_attrs['direction']) {
						assert.ok(this.parent.operation);

						assign(h_c3, {
							[this.parent.operation]: {
								'uml-model:returns': this.param,
							},
						});
					}
					else {
						// debugger;
					}

					assign(h_c3, {
						[this.param]: {
							a: h_attrs['xmi:type'],
							'uml-model:name': '"'+(h_attrs['name'] || ''),
							'uml-model:parameterType': h_attrs['type']? `element:${h_attrs['type']}`: [],
						},
					});

					this.write(h_c3);
				},

				children: {
					/**
					 * Parameter's type
					 */
					type(h_attrs) {
						this.write({
							[this.parent.param]: {
								'uml-model:parameterType': '>'+h_attrs['href'],
							},
						});
					},

					/**
					 * Lower and upper bounds
					 */
					...['lower', 'upper'].reduce((h_out, s_end) => ({
						[`${s_end}Value`](this:RouterContext, h_attrs: Dict) {
							const sc1_bound = this.setElement(h_attrs);

							this.write({
								[this.parent.param]: {
									[`uml-model:${s_end}Value`]: sc1_bound,
								},

								[sc1_bound]: {
									a: h_attrs['xmi:type'],
								},
							});
						},
					}), {}),
				},
			},

			/**
			 * Redefined operation
			 */
			redefinedOperation(h_attrs) {
				this.write({
					[this.parent.node]: {
						'uml-model:redefines': 'element:'+h_attrs['xmi:idref'],
					},
				});
			},
		},
	},
};

export const router_element_valuable = (si_parent_type: 'node' | 'attribute' | 'end'): Router => ({
	...H_UML_ELEMENT_COMMENTABLE,

	type(h_attrs) {
		// add range restriction to property
		this.write({
			[this.parent[si_parent_type]]: {
				'rdfs:range': '>'+remap_uml_spec_version(h_attrs['href']),
			},
		});
	},

	subsettedProperty(h_attrs) {
		this.write({
			[this.parent[si_parent_type]]: {
				'uml-model:subsettedProperty': `uml-property:${h_attrs['xmi:idref']}`,
			},
		});
	},

	/**
	 * Optional lower bounds of multiplicty
	 */
	lowerValue(h_attrs) {
		this.parent.multiplicity!.lowerValue = (h_attrs['value'] || '0') as WeakUintStr;
	},

	/**
	 * Optional upper bounds of multiplicty
	 */
	upperValue(h_attrs) {
		this.parent.multiplicity!.upperValue = (h_attrs['value'] || '0') as WeakUintStr;
	},

	/**
	 * Optional default value for the attribute
	 */
	defaultValue(h_attrs) {
		// create default value IRI
		let sc1_default_value = 'element:'+h_attrs['xmi:id'];

		this.write({
			[sc1_default_value]: {
				'xmi:type': class_term(h_attrs['xmi:type']),
				'xmi:id': '"'+h_attrs['xmi:id'],
				...('value' in h_attrs
					? {'uml-model:value':'"'+h_attrs['value']}
					: {}),
			},

			[this.parent.attribute]: {
				'xmi:defaultValue': sc1_default_value,
			},
		});
	},
});

export const H_UML_ELEMENT_ATTRIBUTABLE: Router = {
	/**
	 * An operation for a given 
	 */
	ownedAttribute: {
		enter(h_attrs) {
			// initialize multiplicty to defaults
			this.multiplicity = {
				lowerValue: '1',
				upperValue: '1',
			};

			// owner node
			const sc1_owner = this.node;

			// set property term
			this.attribute = this.setProperty(h_attrs);

			// pairs to append
			let h_pairs: C3Node = {};

			// composite aggretation
			if('composite' === h_attrs['aggregation']) {
				h_pairs['uml-model:compositeAggregation'] = true;
			}

			// ordered
			if(h_attrs['isOrdered']) {
				h_pairs['uml-model:ordered'] = factory.boolean(h_attrs['isOrdered']);
			}

			// derived
			if(h_attrs['isDerived']) {
				h_pairs['uml-model:derived'] = factory.boolean(h_attrs['isDerived']);
			}

			// subsetted property
			if(h_attrs['subsettedProperty']) {
				h_pairs['uml-model:subsettedProperty'] = `uml-property:${h_attrs['subsettedProperty'].replace(/\s/g, '_')}`;
			}

			// association
			if(h_attrs['association']) {
				h_pairs['uml-model:association'] = `uml-element:${h_attrs['association']}`;
			}

			// 'type of owned attribute' describes range of relation to an object
			if(h_attrs['type']) {
				h_pairs['rdfs:range'] = 'element:'+h_attrs['type'];
			}

			// set the element being annotated
			this.subjectId = h_attrs['annotatedElement'];
			// this.subjectIri = this.node;

			// add triples about property
			this.write({
				[sc1_owner]: {
					'uml-model:ownedAttribute': this.attribute,
				},

				[this.attribute]: {
					a: h_attrs['type']? 'owl:ObjectProperty': 'owl:DatatypeProperty',
					'xmi:type': 'uml:Property',
					'xmi:id': '"'+h_attrs['xmi:id'],
					'rdfs:label': '"'+h_attrs['xmi:id'],
					'uml-model:name': '"'+(h_attrs['name'] || ''),
					...h_pairs,
				},
			});
		},

		exit() {
			this.write({
				[this.attribute]: {
					'uml-model:multiplicity': `^uml-model-dt:multiplicityRange"${this.multiplicity!.lowerValue}..${this.multiplicity!.upperValue}`,
					// 'uml-model:ownedAttributeOf': this.nodesByXmiId[this.subjectId] || this.subjectIri,
					// 'rdfs:domain': this.nodesByXmiId[this.subjectId] || this.subjectIri,
				},
			});
		},

		children: router_element_valuable('attribute'),
	},
};


export const H_UML_PACKAGED_ELEMENT_CONTAINER: Router = {
	/**
	 * The base UML element
	 */
	packagedElement: {
		enter(h_attrs) {

			// expect(h_attrs['xmi:type'], 'uml:Package');

			this.write({
				[this.package=this.setElement(h_attrs)]: {
					'xmi:type': h_attrs['xmi:type'],
					'xmi:id': '"'+h_attrs['xmi:id'],
					'uml-model:name': optional_literal(h_attrs['name']),
				},
			});
		},

		children: {
			...H_UML_ELEMENT_COMMENTABLE,
			...H_UML_ELEMENT_RULABLE,
			...H_UML_ELEMENT_ATTRIBUTABLE,
			...H_UML_ELEMENT_OPERATABLE,

			ownedEnd: {
				enter(h_attrs) {
					// initialize multiplicty to defaults
					this.multiplicity = {
						lowerValue: '1',
						upperValue: '1',
					};

					this.write({
						[this.end=this.setElement(h_attrs)]: {
							'xmi:type': h_attrs['xmi:type'],
							'xmi:id': '"'+h_attrs['xmi:id'],
							'uml-model:name': optional_literal(h_attrs['name']),
							'uml-model:type': optional_literal(h_attrs['type']),
							'uml-model:association': `uml-element:${h_attrs['association']}`,
						},
					});
				},

				children: router_element_valuable('end'),
			},

			/**
			 * Defines class hierarchy
			 */
			generalization: {
				enter(h_attrs) {
					this.write({
						[this.parent.package]: {
							'rdfs:subClassOf': `element:${h_attrs['general']}`,
						},
					});
				},
			},
		},
	},
	
	/**
	 * Imported package declaration
	 */
	packageImport(h_attrs) {
		this.write({
			[`uml-import:${h_attrs['xmi:id']}`]: {
				'xmi:type': h_attrs['xmi:type'],
				'xmi:id': '"'+h_attrs['xmi:id'],
				'uml-model:packagedElement': this.parent.package,
				'uml-model:importedPackage': `element:${h_attrs['importedPackage']}`,
			},
		});
	},
};

// create self-referential loop
assign((H_UML_PACKAGED_ELEMENT_CONTAINER['packagedElement'] as StrictRouterNode).children!, H_UML_PACKAGED_ELEMENT_CONTAINER);
