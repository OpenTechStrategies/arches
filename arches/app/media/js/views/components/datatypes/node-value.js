import $ from 'jquery';
import ko from 'knockout';
import _ from 'underscore';
import arches from 'arches';
import nodeValueDatatypeTemplate from 'templates/views/components/datatypes/node-value.htm';

const name = 'node-value-datatype-config';
const viewModel = function (params) {
    const self = this;

    this.nodes = [{
        id: null,
        name: ko.observable('')
    }];
    if (params.graph) {
        this.nodes = this.nodes.concat(
            _.filter(params.graph.get('nodes')(), function (node) {
                return node.datatypelookup[node.datatype()].defaultwidget_id &&
                    node.datatype() !== 'node-value' &&
                    node.nodeid !== params.nodeid;
            })
        );
    }
    this.config = params.config;
    this.search = params.search;

    if (!this.search) {
        this.node = params;
        this.graph = params.graph;
        this.properties = ko.observableArray();
        const updateProperties = function () {
            const properties = [{
                name: '',
                id: null
            }];
            if (self.config.nodeid() && self.graph) {
                const node = _.find(params.graph.get('nodes')(), function (node) {
                    return node.id === self.config.nodeid();
                });
                if (node) {
                    $.ajax({
                        dataType: "json",
                        url: arches.urls.graph + node.graph.get('graphid') + '/get_related_nodes/' + node.id,
                        data: {
                            parent_nodeid: params.id
                        },
                        success: function (response) {
                            self.properties(
                                properties.concat(
                                    _.map(response, function (prop) {
                                        return {
                                            name: node.getFriendlyOntolgyName(prop.ontology_property),
                                            id: prop.ontology_property
                                        };
                                    })
                                )
                            );
                        }
                    });
                }
            } else {
                self.properties(properties);
            }
        };
        updateProperties();
        this.config.nodeid.subscribe(updateProperties);
        if (params.graph) {
            this.propertyName = ko.computed(function () {
                const propertyId = self.config.property();
                const selectedProperty = _.find(self.properties(), function (property) {
                    return property.id === propertyId;
                });
                return selectedProperty ? selectedProperty.name : '';
            });
            this.relatedNodeName = ko.computed(function () {
                const nodeid = self.config.nodeid();
                const relatedNode = _.find(params.graph.get('nodes')(), function (node) {
                    return node.id === nodeid;
                });
                return relatedNode ? relatedNode.name() : '';
            });
        }
    } else {
        const filter = params.filterValue();
        this.node = params.node;
        this.op = ko.observable(filter.op || '');
        this.searchValue = ko.observable(filter.val || '');
        this.filterValue = ko.computed(function () {
            return {
                op: self.op(),
                val: self.searchValue() || ''
            };
        }).extend({ throttle: 750 });
        params.filterValue(this.filterValue());
        this.filterValue.subscribe(function (val) {
            params.filterValue(val);
        });
    }
};

ko.components.register(name, {
    viewModel,
    template: nodeValueDatatypeTemplate,
});

export default name;
