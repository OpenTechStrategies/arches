import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import koMapping from 'knockout-mapping';
import PageView from 'views/graph/graph-page-view';
import data from 'views/graph/graph-settings-data';
import 'bindings/color-picker';
import NodeModel from 'models/node';

class GraphSettings {
    constructor() {
        /**
        * prep data for models
        */
        const resourceJSON = JSON.stringify(data.resources);
        data.resources.forEach(function (resource) {
            resource.isRelatable = ko.observable(resource.is_relatable);
        });
        const srcJSON = JSON.stringify(data.graph);

        /**
        * setting up page view model
        */
        const graph = koMapping.fromJS(data.graph);
        const iconFilter = ko.observable('');
        const rootNode = new NodeModel({
            source: data.node,
            datatypelookup: [],
            graph: graph,
            ontology_namespaces: data.ontology_namespaces
        });

        const ontologyClass = ko.observable(data.node.ontologyclass);
        const jsonData = ko.computed(function () {
            const relatableResourceIds = _.filter(data.resources, function (resource) {
                return resource.isRelatable();
            }).map(function (resource) {
                return resource.id;
            });
            if (graph.ontology_id() === undefined) {
                graph.ontology_id(null);
            }
            return JSON.stringify({
                graph: koMapping.toJS(graph),
                relatable_resource_ids: relatableResourceIds,
                ontology_class: ontologyClass()
            });
        });
        const jsonCache = ko.observable(jsonData());
        const dirty = ko.computed(function () {
            return jsonData() !== jsonCache();
        });
        this.viewModel = {
            dirty: dirty,
            iconFilter: iconFilter,
            icons: ko.computed(function () {
                return _.filter(data.icons, function (icon) {
                    return icon.name.indexOf(iconFilter()) >= 0;
                });
            }),
            graph: graph,
            relatable_resources: data.resources,
            ontologies: data.ontologies,
            ontologyClass: ontologyClass,
            ontologyClasses: ko.computed(function () {
                return _.filter(data.ontologyClasses, function (ontologyClass) {
                    ontologyClass.display = rootNode.getFriendlyOntolgyName(ontologyClass.source);
                    return ontologyClass.ontology_id === graph.ontology_id();
                });
            }),
            save: function () {
                pageView.viewModel.loading(true);
                $.ajax({
                    type: "POST",
                    url: '',
                    data: jsonData(),
                    success: function (response) {
                        jsonCache(jsonData());
                        pageView.viewModel.loading(false);
                    },
                    error: function (response) {
                        pageView.viewModel.loading(false);
                    }
                });
            },
            reset: function () {
                _.each(JSON.parse(srcJSON), function (value, key) {
                    if (ko.isObservable(graph[key])) {
                        graph[key](value);
                    }
                });
                JSON.parse(resourceJSON).forEach(function (jsonResource) {
                    const resource = _.find(data.resources, function (resource) {
                        return resource.id === jsonResource.id;
                    });
                    resource.isRelatable(jsonResource.is_relatable);
                });
                jsonCache(jsonData());
            }
        };

        /**
        * a GraphPageView representing the graph settings page
        */
        this.pageView = new PageView({
            viewModel: this.viewModel
        });
    }
}

export default new GraphSettings();
