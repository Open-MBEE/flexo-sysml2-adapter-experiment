import type {Dict} from '@blake.regalia/belt';
import type {RouterNode, C1String, Router, C3Node, WeakUintStr} from './common';

// @ts-expect-error untyped import
import factory from '@graphy/core.data.factory';

import {optional_literal, write_c3, expect, remap_uml_spec_version, class_term} from './common';


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

		children: {
			/**
			 * The optional body element of a comment
			 */
			body(h_attrs, s_text) {
				// set comment body from node using HTML
				this.commentBody = `^rdf:HTML"${s_text}`;
			},

			/**
			 * Optional annotation
			 */
			annotatedElement(h_attrs) {
				// set the XMI ID of which element is being annotated by this comment
				this.subjectId = h_attrs['xmi:idref'];
			},
		},

		exit() {
			write_c3({
				[this.nodesByXmiId[this.subjectId]]: {
					'rdfs:comment': this.commentBody,
				},
			});
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
			this.subjectId = h_attrs['constrainedElement'];

			// set rule type
			this.ruleType = h_attrs['xmi:type'] || 'uml:Constraint';
		},

		exit() {
			write_c3({
				[this.nodesByXmiId[this.subjectId]]: {
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
				this.subjectId = h_attrs['xmi:idref'];
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
					write_c3({
						[this.rule]: {
							a: this.ruleType,
							'uml-model:specification': this.spec,
						},

						[this.spec]: {
							a: this.specType,
							'uml-model:body': this.specLang!+this.specBody!,
						},
					});
				},

				children: {
					/**
					 * Defines what language the specification body is in
					 */
					language(h_attrs, s_text) {
						// map language tag to c1 prefix
						this.specLang = {
							'OCL': '^omg-ocl:',
							'OCL2.0': '^omg-ocl2:',
							'English': '@en',
						}[s_text] || '';
					},

					/**
					 * Declares the body of the specification
					 */
					body(h_attrs, s_text) {
						this.specBody = `"${s_text}`;
					},
				},
			},
		},
	},
};


export const H_UML_ELEMENT_OPERATABLE = {
	/**
	 * An operation for a given 
	 */
	ownedOperation: {
		children: {
			...H_UML_ELEMENT_COMMENTABLE,
			...H_UML_ELEMENT_RULABLE,

			/**
			 * Rules can optional contain parameters
			 */
			ownedParameter: {

			},
		},
	},
};

export const H_UML_ELEMENT_ATTRIBUTABLE: Router = {
	/**
	 * An operation for a given 
	 */
	ownedAttribute: {
		enter(h_attrs) {
			const g_multiplicity = this.multiplicity = {
				lowerValue: '1',
				upperValue: '1',
			};

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

			// 'type of owned attribute' describes range of relation to an object
			if(h_attrs['type']) {
				h_pairs['rdfs:range'] = 'element:'+h_attrs['type'];
			}

			// set the element being annotated
			this.subjectId = h_attrs['annotatedElement'];

			// add triples about property
			write_c3({
				[this.attribute]: {
					a: h_attrs['type']? 'owl:ObjectProperty': 'owl:DatatypeProperty',
					'xmi:type': 'uml:Property',
					'xmi:id': '"'+h_attrs['xmi:id'],
					'rdfs:label': '"'+h_attrs['xmi:id'],
					'uml-model:name': '"'+h_attrs['name'],
					...h_pairs,
				},
			});
		},

		exit() {
			write_c3({
				[this.attribute]: {
					'uml-model:multiplicity': `^uml-model-dt:multiplicityRange"${this.multiplicity!.lowerValue}..${this.multiplicity!.upperValue}`,
					'uml-model:ownedAttributeOf': this.nodesByXmiId[this.subjectId],
					'rdfs:domain': this.nodesByXmiId[this.subjectId],
				},
			});
		},

		children: {
			...H_UML_ELEMENT_COMMENTABLE,

			type(h_attrs) {
				// add range restriction to property
				write_c3({
					[this.attribute]: {
						'rdfs:range': '>'+remap_uml_spec_version(h_attrs['href']),
					},
				});
			},

			subsettedProperty(h_attrs) {
				write_c3({
					[this.attribute]: {
						'uml-model:subsettedProperty': `uml-property:${h_attrs['xmi:idref']}`,
					},
				});
			},

			/**
			 * Optional lower bounds of multiplicty
			 */
			lowerValue(h_attrs) {
				this.multiplicity!.lowerValue = (h_attrs['value'] || '0') as WeakUintStr;
			},

			/**
			 * Optional upper bounds of multiplicty
			 */
			upperValue(h_attrs) {
				this.multiplicity!.upperValue = (h_attrs['value'] || '0') as WeakUintStr;
			},

			/**
			 * Optional default value for the attribute
			 */
			defaultValue(h_attrs) {
				// create default value IRI
				let sc1_default_value = 'element:'+h_attrs['xmi:id'];

				write_c3({
					[sc1_default_value]: {
						'xmi:type': class_term(h_attrs['xmi:type']),
						'xmi:id': '"'+h_attrs['xmi:id'],
						...('value' in h_attrs
							? {'uml-model:value':'"'+h_attrs['value']}
							: {}),
					},

					[this.attribute]: {
						'xmi:defaultValue': sc1_default_value,
					},
				});
			},
		},
	},
};

export const H_UML_PACKAGED_ELEMENT_CONTAINER: Router = {
	/**
	 * The base UML element
	 */
	packagedElement: {
		enter(h_attrs) {
			expect(h_attrs['xmi:type'], 'uml:Package');

			write_c3({
				[this.package=this.setElement(h_attrs)]: {
					'xmi:type': 'uml:Package',
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

			},

			/**
			 * Defines class hierarchy
			 */
			generalization: {
				enter(h_attrs) {
					write_c3({
						[this.node]: {
							'rdfs:subClassOf': `element:${h_attrs['general']}`,
						},
					});
				},
			},
		},
	},
	
	packageImport(h_attrs) {
		write_c3({
			[`uml-import:${h_attrs['xmi:id']}`]: {
				'xmi:type': h_attrs['xmi:type'],
				'xmi:id': '"'+h_attrs['xmi:id'],
				'uml-model:packagedElement': this.package,
				'uml-model:importedPackage': `element:${h_attrs['importedPackage']}`,
			},
		});
	},
};