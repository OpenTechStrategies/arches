import ko from 'knockout';
import arches from 'arches';
import WorkbenchViewmodel from 'views/components/workbench';
import relatedResourcesGraphTemplate from 'templates/views/components/related-resources-graph.htm';
import 'bindings/cytoscape';

class RelatedResourcesGraphViewModel extends WorkbenchViewmodel {
    constructor(params) {
        super(params);
        const self = this;
        const layout = {
            name: "cola",
            animate: true,
            directed: true,
            edgeLength: 200
        };

        this.viz = ko.observable();
        this.cytoscapeConfig = ko.observable();
        this.focusResourceId = ko.isObservable(params.resourceId) ?
            params.resourceId :
            ko.observable(params.resourceId);
        this.selection = ko.observable();
        this.selectionMode = ko.observable('information');
        this.elements = ko.observableArray();
        this.informationElement = ko.observable();

        // resourceTypeLookup holds node configuration details keyed by resource type id
        let resourceTypeLookup = {};

        this.informationGraph = ko.computed(() => {
            const informationElement = self.informationElement();
            if (informationElement && informationElement.graph_id) {
                return resourceTypeLookup[informationElement.graph_id];
            }
            return {};
        });

        this.viewInformationNodeReport = () => {
            const informationElement = self.informationElement();
            if (informationElement) {
                window.open(arches.urls.resource_report + informationElement.id);
            }
        };

        this.editInformationNode = () => {
            const informationElement = self.informationElement();
            if (informationElement) {
                window.open(arches.urls.resource_editor + informationElement.id);
            }
        };

        this.hoverElementId = ko.observable();

        this.legendEntries = ko.computed(() => {
            const elements = self.elements();
            const entries = [];
            for (let resourceTypeId in resourceTypeLookup) {
                if (elements.filter(element => element.data('graph_id') === resourceTypeId).length > 0) {
                    entries.push(resourceTypeLookup[resourceTypeId]);
                }
            }
            return entries;
        });

        this.nodeSearchFilter = ko.observable('');
        this.expandedSearchId = ko.observable();
        this.searchNodes = ko.computed(() => {
            const filter = self.nodeSearchFilter();
            const elements = self.elements();
            const viz = self.viz();
            const filteredNodes = [];
            if (viz) {
                elements.forEach(element => {
                    if (element.isNode()) {
                        const data = element.data();
                        if (!data.shownRelationsCount) {
                            data.shownRelationsCount = ko.observable();
                        }
                        if (data.displayname.toLowerCase().indexOf(filter) !== -1) {
                            data.graph = resourceTypeLookup[data.graph_id];
                            data.shownRelationsCount(
                                viz.edges('[source = "' + data.id + '"]').length +
                                viz.edges('[target = "' + data.id + '"][source != "' + data.id + '"]').length
                            );
                            filteredNodes.push(data);
                        }
                    }
                });
            }
            return filteredNodes;
        });

        const getRelationshipLabel = function (edgeData) {
            let label;
            try {
                const url = new window.URL(edgeData.relationshiptype_label);
                label = url.pathname.split('/').pop();
            } catch (e) {
                label = edgeData.relationshiptype_label;
            }
            return label;
        };

        this.informationElementRelationships = ko.computed(() => {
            const relationships = [];
            const informationElement = self.informationElement();
            const viz = self.viz();
            self.elements(); // ensure dependency
            if (informationElement && viz && !informationElement.source) {
                const sourceEdges = viz.edges('[source = "' + informationElement.id + '"]');
                const targetEdges = viz.edges('[target = "' + informationElement.id + '"]');
                const addRelationship = function (edge, nodeType) {
                    const edgeData = edge.data();
                    const nodeData = edge[nodeType]().data();
                    const label = getRelationshipLabel(edgeData);
                    relationships.push({
                        label: label,
                        node: nodeData,
                        edge: edgeData,
                        informationElement: self.informationElement,
                        hoverElementId: self.hoverElementId
                    });
                };
                sourceEdges.forEach(edge => addRelationship(edge, 'target'));
                targetEdges.forEach(edge => {
                    if (edge.source().id() !== edge.target().id()) {
                        addRelationship(edge, 'source');
                    }
                });
            }
            return relationships;
        });

        this.edgeInformation = ko.computed(() => {
            const informationElement = self.informationElement();
            const viz = self.viz();
            if (informationElement && viz && informationElement.source) {
                const sourceData = viz.getElementById(informationElement.source).data();
                const targetData = viz.getElementById(informationElement.target).data();
                return {
                    id: informationElement.id,
                    label: getRelationshipLabel(informationElement),
                    source: sourceData,
                    sourceGraph: resourceTypeLookup[sourceData['graph_id']],
                    target: targetData,
                    targetGraph: resourceTypeLookup[targetData['graph_id']]
                };
            }
        });

        // Fetch related resources for a given resourceId.
        const getResourceRelations = function (resourceId) {
            const url = `${arches.urls.related_resources}${resourceId}?paginate=false&lang=${arches.activeLanguage}`;
            return window.fetch(url);
        };

        const dataToElement = function (data) {
            data.source = data.resourceinstanceidfrom;
            data.target = data.resourceinstanceidto;
            if (data.source) {
                data.id = data.resourcexid;
            } else {
                data.id = data.resourceinstanceid;
                data.totalRelations = data.total_relations.value;
            }
            const classes = [];
            if (data.graph_id) {
                classes.push(resourceTypeLookup[data.graph_id].className);
            }
            if (data.focus) {
                classes.push('focus');
            }
            return {
                data: data,
                classes: classes,
                selected: data.focus
            };
        };

        this.refreshLayout = function () {
            const viz = self.viz();
            if (viz) {
                viz.elements().makeLayout(layout).run();
            }
        };

        this.addMissingNodes = function (elements) {
            const nodesReferencedByEdges = [];
            elements.forEach(ele => {
                if (ele.data.source) {
                    nodesReferencedByEdges.push(ele.data.source);
                }
                if (ele.data.target) {
                    nodesReferencedByEdges.push(ele.data.target);
                }
            });
            const relatedResourceIds = elements
                .filter(ele => !!ele.data.resourceinstanceid)
                .map(ele => ele.data.resourceinstanceid);
            nodesReferencedByEdges.forEach(resourceId => {
                if (!relatedResourceIds.includes(resourceId)) {
                    elements.push({
                        classes: [],
                        data: {
                            graph_id: 'undefined',
                            id: resourceId,
                            target: undefined,
                            source: undefined,
                            displayname: '',
                            totalRelations: 1
                        },
                        selected: undefined
                    });
                    relatedResourceIds.push(resourceId);
                }
            });
            return elements;
        };

        this.expandNode = function (node) {
            const viz = self.viz();
            let position;
            if (viz) {
                position = viz.getElementById(node.id).position();
            }
            if (node.id) {
                getResourceRelations(node.id)
                    .then(response => response.json())
                    .then(result => {
                        let elements = result.related_resources.concat(result.resource_relationships)
                            .map(data => {
                                const element = dataToElement(data);
                                if (!data.source && position) {
                                    element.position = { x: position.x, y: position.y };
                                }
                                return element;
                            });
                        elements = self.addMissingNodes(elements)
                            .filter(element => viz.getElementById(element.data.id).length === 0);
                        viz.getElementById(node.id).lock();
                        viz.add(elements);
                        self.elements(viz.elements());
                        const vizLayout = viz.elements().makeLayout(layout);
                        vizLayout.on("layoutstop", function () {
                            viz.nodes().unlock();
                        });
                        vizLayout.run();
                    });
            }
        };

        const getStyle = function () {
            const nodeSize = 60;
            const borderColor = '#115170';
            const borderHighlightColor = '#023047';
            const borderSelectedColor = '#000F16';
            const lineColor = '#BFBEBE';
            const selectedLineColor = '#023047';
            const borderWidth = 1;
            const hoverBorderWidth = 4;
            const selectedBorderWidth = 4;
            const styles = [{
                selector: "node",
                style: {
                    content: "data(displayname)",
                    "font-size": "18px",
                    width: nodeSize,
                    height: nodeSize,
                    "text-valign": "center",
                    "text-halign": "center",
                    "border-color": borderColor,
                    "border-width": borderWidth
                }
            }, {
                selector: "node.focus",
                style: {
                    "font-weight": "bold"
                }
            }, {
                selector: "node:selected",
                style: {
                    "border-width": selectedBorderWidth,
                    "border-color": borderSelectedColor
                }
            }, {
                selector: "node.hover",
                style: {
                    "border-width": hoverBorderWidth,
                    "border-color": borderHighlightColor
                }
            }, {
                selector: "edge",
                style: {
                    "line-color": lineColor,
                    "border-width": borderWidth
                }
            }, {
                selector: "edge:selected",
                style: {
                    width: selectedBorderWidth,
                    "line-color": selectedLineColor
                }
            }, {
                selector: "edge.hover",
                style: {
                    width: hoverBorderWidth,
                    "line-color": selectedLineColor
                }
            }];
            for (let resourceId in resourceTypeLookup) {
                const color = resourceTypeLookup[resourceId].fillColor || '#CCCCCC';
                const style = {
                    selector: "node." + resourceTypeLookup[resourceId].className,
                    style: {
                        "background-color": color
                    }
                };
                styles.push(style);
            }
            return styles;
        };

        const updateCytoscapeConfig = function (elements) {
            self.cytoscapeConfig({
                selectionType: 'single',
                elements: elements,
                layout: layout,
                style: getStyle()
            });
        };

        const updateFocusResource = function () {
            const resourceId = self.focusResourceId();
            if (resourceId) {
                const viz = self.viz();
                if (viz) {
                    const element = viz.getElementById(resourceId);
                    if (element) {
                        self.informationElement(element.data());
                    }
                }
                self.selection(null);
                getResourceRelations(resourceId)
                    .then(response => response.json())
                    .then(result => {
                        let i = 0;
                        const lookup = result['node_config_lookup'];
                        for (let resourceId in lookup) {
                            lookup[resourceId].className = 'resource-type-' + i;
                            i++;
                        }
                        lookup['undefined'] = { fillColor: '#CCCCCC' };
                        resourceTypeLookup = lookup;
                        result.resource_instance.focus = true;
                        result.resource_instance['total_relations'] = { value: result.resource_relationships.length };
                        let elements = [dataToElement(result.resource_instance)]
                            .concat(
                                result.related_resources.concat(result.resource_relationships)
                                    .map(dataToElement)
                            );
                        elements = self.addMissingNodes(elements);
                        self.selection(elements[0].data);
                        if (!viz) {
                            updateCytoscapeConfig(elements);
                        } else {
                            viz.remove('*');
                            viz.add(elements);
                            viz.style(getStyle());
                            viz.layout(layout).run();
                        }
                        self.elements(self.viz().elements());
                    });
            }
        };

        this.focusResourceId.subscribe(updateFocusResource);

        this.viz.subscribe(viz => {
            if (!viz) {
                self.cytoscapeConfig(null);
                self.selection(null);
            } else {
                viz.on('select', 'node, edge', function (e) {
                    viz.elements().not(e.target).unselect();
                    self.selection(e.target.data());
                });
                viz.on('unselect', 'node, edge', function () {
                    self.selection(null);
                });
                viz.on('mouseover', 'node, edge', function (e) {
                    self.hoverElementId(e.target.id());
                });
                viz.on('mouseout', 'node, edge', function () {
                    self.hoverElementId(null);
                });
            }
        });

        this.hoverElementId.subscribe(elementId => {
            const viz = self.viz();
            if (viz) {
                viz.elements().removeClass('hover');
                if (elementId) {
                    viz.getElementById(elementId).addClass('hover');
                }
            }
        });

        this.activeTab.subscribe(() => {
            const viz = self.viz();
            if (viz) {
                viz.resize();
            }
        });

        this.selection.subscribe(selection => {
            const mode = self.selectionMode();
            const viz = self.viz();
            if (selection) {
                switch (mode) {
                    case 'expand':
                        if (selection.source) {
                            viz.elements().unselect();
                        } else {
                            self.expandNode(selection);
                        }
                        break;
                    case 'delete': {
                        const element = viz.getElementById(selection.id);
                        const informationElement = self.informationElement();
                        const informationElementId = informationElement ? informationElement.id : null;
                        if (!selection.source) {
                            viz.edges().forEach(edge => {
                                if (edge.source().id() === selection.id || edge.target().id() === selection.id) {
                                    if (edge.id() === informationElementId) {
                                        self.informationElement(null);
                                    }
                                    viz.remove(edge);
                                    self.elements.remove(edge);
                                }
                            });
                        }
                        if (selection.id === informationElementId) {
                            self.informationElement(null);
                        }
                        viz.remove(element);
                        self.elements.remove(element);
                        break;
                    }
                    case 'focus':
                        if (selection.source) {
                            viz.elements().unselect();
                        } else {
                            self.focusResourceId(selection.id);
                        }
                        break;
                    default:
                        self.informationElement(selection);
                        break;
                }
            }
        });

        self.informationElement.subscribe(data => {
            const viz = self.viz();
            if (data) {
                if (viz) {
                    const element = viz.getElementById(data.id);
                    if (!element.selected()) {
                        self.selectionMode('information');
                        element.select();
                    }
                }
                self.activeTab('information');
            }
        });

        this.selectionMode.subscribe(() => {
            const viz = self.viz();
            viz.elements().unselect();
        });

        updateFocusResource();
    }
}

ko.components.register('related-resources-graph', {
    viewModel: RelatedResourcesGraphViewModel,
    template: relatedResourcesGraphTemplate,
});

export default RelatedResourcesGraphViewModel;
