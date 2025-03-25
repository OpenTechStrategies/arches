import $ from 'jquery';
import ko from 'knockout';
import _ from 'underscore';
import arches from 'arches';
import TreeView from 'views/tree-view';
import 'bindings/clipboard';

const loading = ko.observable(false);

export default class GraphTree extends TreeView {
    /**
    * A backbone view to manage a list of graph nodes
    * @augments TreeView
    * @constructor
    * @name GraphTree
    */
    constructor(options) {
        super(options);
        this.graphModel = options.graphModel;
        this.graphSettings = options.graphSettings;
        this.cardTree = options.cardTree;
        this.appliedFunctions = options.appliedFunctions;
        this.primaryDescriptorFunction = options.primaryDescriptorFunction;
        this.permissionTree = options.permissionTree;
        this.items = this.graphModel.get('nodes');
        this.branchListVisible = ko.observable(false);
        this.scrollTo = ko.observable();
        this.restrictedNodegroups = options.restrictedNodegroups;
        this.showIds = ko.observable(false);
        this.toggleIds = () => {
            this.showIds(!this.showIds());
        };
        this.translations = arches.translations;
        this.showGrid = ko.observable(false);
        this.activeLanguageDir = ko.observable(arches.activeLanguageDir);
    }

    filterFunction() {
        const filter = this.filter().toLowerCase();
        this.items().forEach(item => {
            item.filtered(true);
            if (filter.length > 2) {
                if (
                    item.name().toLowerCase().indexOf(filter) !== -1 ||
                    item.datatype().toLowerCase().indexOf(filter) !== -1 ||
                    (item.ontologyclass() ? item.ontologyclass().toLowerCase().indexOf(filter) !== -1 : false)
                ) {
                    item.filtered(false);
                    this.expandParentNode(item);
                }
            }
        });
    }

    filterEnterKeyHandler(context, e) {
        if (e.keyCode === 13) {
            const highlightedItems = _.filter(this.items(), item => !item.filtered());
            const previousItem = this.scrollTo();
            this.scrollTo(null);
            if (highlightedItems.length > 0) {
                let scrollIndex = 0;
                const previousIndex = highlightedItems.indexOf(previousItem);
                if (previousItem && highlightedItems[previousIndex + 1]) {
                    scrollIndex = previousIndex + 1;
                }
                this.scrollTo(highlightedItems[scrollIndex]);
            }
            return false;
        }
        return true;
    }

    getDisplayName(node) {
        return ko.computed(() => {
            let name = node.name();
            if (node.ontologyclass_friendlyname() !== "") {
                name = name + ' (' + node.ontologyclass_friendlyname().split('_')[0] + ')';
            }
            return name;
        }, this);
    }

    getNodeIdentifier(node) {
        return node.sourceIdentifierId() ? node.sourceIdentifierId() : node.nodeid;
    }

    isFuncNode(node) {
        let primaryDescriptorNodes = {}, descriptorType;
        const pdFunction = this.primaryDescriptorFunction;
        if (!this.primaryDescriptorFunction())
            return null;
        ['name', 'description'].forEach(descriptor => {
            try {
                primaryDescriptorNodes[pdFunction()['config']['descriptor_types'][descriptor]['nodegroup_id']] = descriptor;
            } catch (e) {
                console.log("No descriptor configuration for " + descriptor);
            }
        });
        [node].concat(!!node['childNodes']() ? node['childNodes']() : [])
            .find(nodeToCheck => !!(descriptorType = primaryDescriptorNodes[nodeToCheck['id']]));
        return !!descriptorType;
    }

    isChildSelected(node) {
        const isChildSelectedRecursive = parent => {
            let childSelected = false;
            if (!parent.istopnode) {
                parent.childNodes().forEach(child => {
                    if ((child && child.selected()) || isChildSelectedRecursive(child)) {
                        childSelected = true;
                    }
                });
                return childSelected;
            }
        };
        return ko.computed(() => {
            return isChildSelectedRecursive(node);
        }, this);
    }

    expandParentNode(node) {
        if (node.parent) {
            node.parent.expanded(true);
            this.expandParentNode(node.parent);
        }
    }

    selectItem(node) {
        if (!this.graphSettings.dirty()) {
            this.graphModel.selectNode(node);
            this.trigger('node-selected', node);
        }
    }

    toggleBranchList(node, e) {
        e.stopImmediatePropagation();
        this.branchListVisible(!this.branchListVisible());
        if (this.branchListVisible()) {
            node.expanded(true);
        }
        this.trigger('toggle-branch-list');
    }

    addChildNode(node, e) {
        e.stopImmediatePropagation();
        this.graphModel.appendNode(node, (response, status) => {
            if (status === 'success') {
                node.expanded(true);
                if (node.istopnode && this.graphModel.get('isresource')) {
                    this.cardTree.addCard(response.responseJSON);
                    this.permissionTree.addCard(response.responseJSON);
                }
                document.dispatchEvent(new Event('addChildNode'));
            }
        }, this);
    }

    deleteNode(node, e) {
        e.stopImmediatePropagation();
        $(e.target).tooltip('destroy');
        this.graphModel.deleteNode(node, (_response, status) => {
            if (status === 'success') {
                if (node.isCollector()) {
                    this.cardTree.deleteCard(node.nodeGroupId());
                    this.permissionTree.deleteCard(node.nodeGroupId());
                }
            }
        }, this);
    }

    exportBranch(node, e) {
        e.stopImmediatePropagation();
        this.graphModel.exportBranch(node, response => {
            const url = arches.urls.graph_designer(response.responseJSON.graphid);
            window.open(url);
        });
    }

    beforeMove(e) {
        if (
            e.sourceParent !== e.targetParent ||
            (e.item.is_immutable && !e.item.isCollector()) ||
            !Boolean(e.item.graph.attributes.source_identifier_id)
        ) {
            e.cancelDrop = true;
        }
    }

    reorderNodes(e) {
        loading(true);
        const nodes = _.map(e.sourceParent(), node => node.attributes.source);
        $.ajax({
            type: "POST",
            data: JSON.stringify({ nodes: nodes }),
            url: arches.urls.reorder_nodes,
            complete: () => {
                document.dispatchEvent(new Event('reorderNodes'));
                loading(false);
            }
        });
    }

    _initializeItem(item) {
        if (!item.expanded) {
            item.expanded = ko.observable(item.istopnode);
        }
        super._initializeItem(item);
    }

    collapseAll() {
        this.items().forEach(item => {
            if (!item.istopnode) {
                item.expanded(false);
            }
        });
    }

    toggleGrid() {
        this.showGrid(!this.showGrid());
    }
}
