import ko from 'knockout';
import $ from 'jquery';
import uuid from 'uuid';
import arches from 'arches';
import AlertViewModel from 'viewmodels/alert';
import JsonErrorAlertViewModel from 'viewmodels/alert-json';
import baseStringEditorTemplate from 'templates/views/components/etl_modules/bulk_edit_concept.htm';
import 'views/components/widgets/concept-select';
import 'select-woo';

const ViewModel = function (params) {
    const self = this;
    this.config = params.config;
    this.state = params.state;
    this.editHistoryUrl = `${arches.urls.edit_history}?transactionid=${ko.unwrap(params.selectedLoadEvent)?.loadid}`;
    this.load_details = params.load_details ?? {};
    this.loadId = params.loadId || uuid.generate();
    this.showStatusDetails = ko.observable(false);
    this.moduleId = params.etlmoduleid;
    this.previewing = ko.observable();
    this.formData = new window.FormData();
    this.searchUrl = ko.observable();
    this.dropdownnodes = ko.observableArray();
    this.selectedNode = ko.observable();
    this.dropdowngraph = ko.observableArray();
    this.selectedGraph = ko.observable();
    this.conceptOld = ko.observable();
    this.conceptNew = ko.observable();
    this.conceptOldLang = ko.observable();
    this.conceptNewLang = ko.observable();
    this.rdmCollection = null;
    this.rdmCollectionLanguages = ko.observableArray();
    this.showPreview = ko.observable(false);
    // paging
    this.currentPageIndex = ko.observable(0);
    this.tilesToRemove = ko.observableArray();
    // length table
    this.numberOfTiles = ko.observable();
    this.numberOfResources = ko.observable();
    this.previewLimit = ko.observable();
    // loading status
    this.formatTime = params.formatTime;
    this.selectedLoadEvent = params.selectedLoadEvent || ko.observable();
    this.statusDetails = this.selectedLoadEvent()?.load_description?.split("|");
    this.timeDifference = params.timeDifference;
    this.alert = params.alert || ko.observable();

    this.addAllFormData = () => {
        if (self.searchUrl()) {
            self.formData.append('search_url', self.searchUrl());
        }
        if (self.selectedNode()) {
            self.formData.append('selectedNode', JSON.stringify(self.selectedNode()));
        }
        if (self.selectedGraph()) {
            self.formData.append('graph_id', self.selectedGraph());
            self.formData.append('graph_name', self.getGraphName(self.selectedGraph()));
        }
        if (self.rdmCollection) {
            self.formData.append('rdmCollection', self.rdmCollection);
        }
        self.formData.append('currentPageIndex', self.currentPageIndex());
        self.formData.append('tilesToRemove', self.tilesToRemove());
    };

    // paging
    self.previousPage = function () {
        if (self.currentPageIndex() > 0) {
            self.currentPageIndex(self.currentPageIndex() - 1);
        }
    };

    self.nextPage = function () {
        if (self.currentPageIndex() < self.maxPageIndex()) {
            self.currentPageIndex(self.currentPageIndex() + 1);
        }
    };

    self.currentPageIndex.subscribe((pageIndex) => {
        self.getPreviewData();
    });

    self.maxPageIndex = ko.computed(function () {
        return Math.ceil(self.numberOfTiles() / 5) - 1;
    });

    self.paginatedRows = ko.observableArray();

    self.constructReportUrl = function (dataItem) {
        return arches.urls.reports + dataItem.resourceid;
    };

    this.ready = ko.computed(() => {
        self.showPreview(false);
        self.numberOfResources(null);
        self.numberOfTiles(null);
        return (self.searchUrl() && self.activeTab() === "DeletionBySearchUrl")
            || (self.selectedGraph() && self.activeTab() === "DeletionByGraph")
            || (self.selectedNode() && self.activeTab() === "TileDeletion");
    });

    this.clearResults = ko.computed(() => {
        self.showPreview(false);
        self.tilesToRemove.removeAll();
        self.currentPageIndex(0);
        let clearResults = '';
        [
            self.selectedGraph(),
            self.selectedNode(),
            self.conceptOldLang(),
            self.conceptNewLang(),
            self.conceptOld(),
            self.conceptNew()
        ].forEach(function (item) {
            clearResults += item?.toString();
        });
        return clearResults;
    });

    this.allowEditOperation = ko.computed(() => {
        return self.ready() && self.numberOfTiles() > 0 && self.showPreview();
    });

    this.inTileList = (tileToFind) => {
        const tile = self.tilesToRemove().find((tileid) => {
            return tileid === tileToFind.tileid;
        });
        return !!tile;
    };

    this.addToList = function (tileid) {
        const list = new Set([...self.tilesToRemove(), tileid]);
        self.tilesToRemove(list);
    };

    this.getPreviewData = function () {
        self.showPreview(true);
        self.submit('preview').then(data => {
            self.numberOfResources(data.result.number_of_resources);
            self.numberOfTiles(data.result.number_of_tiles);
            self.previewLimit(data.result.preview_limit);
            self.paginatedRows(data.result.values);
        }).fail(function (err) {
            self.alert(
                new JsonErrorAlertViewModel(
                    'ep-alert-red',
                    err.responseJSON["data"],
                    null,
                    function () { }
                )
            );
        }).always(function () {
            self.deleteAllFormData();
        });
    };

    this.selectedGraph.subscribe(function (graph) {
        if (graph) {
            self.loading(true);
            self.formData.append('graphid', graph);
            self.submit('get_nodegroups').then(function (response) {
                const nodegroups = response.result;
                self.selectedNode(null);
                self.nodegroups(nodegroups);
                self.loading(false);
            });
        } else {
            self.nodegroups(null);
        }
    });

    this.deleteAlert = function () {
        self.alert(
            new AlertViewModel(
                "ep-alert-blue",
                arches.translations.confirmBulkDelete.title,
                arches.translations.confirmBulkDelete.text,
                function () { },
                function () {
                    self.addAllFormData();
                    params.activeTab("import");
                    self.submit('delete');
                }
            )
        );
    };

    this.bulkDelete = function () {
        self.deleteAlert();
    };

    this.submit = function (action) {
        self.formData.append('action', action);
        self.formData.append('load_id', self.loadId);
        self.formData.append('module', self.moduleId);
        return $.ajax({
            type: "POST",
            url: arches.urls.etl_manager,
            data: self.formData,
            cache: false,
            processData: false,
            contentType: false,
        }).fail(function (err) {
            self.alert(
                new JsonErrorAlertViewModel(
                    'ep-alert-red',
                    err.responseJSON["data"],
                    null,
                    function () { }
                )
            );
        });
    };

    this.init = function () {
        this.getGraphs();
    };

    this.init();
};

ko.components.register('bulk_edit_concept', {
    viewModel: ViewModel,
    template: baseStringEditorTemplate,
});

export default ViewModel;
