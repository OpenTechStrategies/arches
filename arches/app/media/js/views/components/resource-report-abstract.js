import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import arches from 'arches';
import reportLookup from 'report-templates';
import ReportModel from 'models/report';
import GraphModel from 'models/graph';
import AlertViewmodel from 'viewmodels/alert';
import resourceReportAbstractTemplate from 'templates/views/components/resource-report-abstract.htm';
import CardViewModel from 'viewmodels/card';

class ResourceReportAbstract {
    constructor(params) {
        this.params = params;
        this.loading = ko.observable(true);
        this.version = arches.version;
        this.resourceid = ko.unwrap(params.resourceid);
        this.summary = Boolean(params.summary);
        this.configForm = params.configForm;
        this.configType = params.configType;
        this.graphHasDifferentPublication = ko.observable(params.graph_has_different_publication === "True");
        this.graphHasUnpublishedChanges = ko.observable(params.graph_has_unpublished_changes === "True");
        this.graphHasDifferentPublicationAndUserHasInsufficientPermissions = ko.observable(
            params.graph_has_different_publication_and_user_has_insufficient_permissions === "True"
        );
        const urlSearchParams = new URLSearchParams(window.location.search);
        this.userHasBeenRedirected = urlSearchParams.get('redirected');
        this.resourceInstanceLifecycleStatePermitsEditing = (params.resource_instance_lifecycle_state_permits_editing === "True");
        this.userCanEditResource = (params.user_can_edit_resource === "True");
        this.template = ko.observable();
        this.report = ko.observable();
        this.initialize();
    }

    initialize() {
        const params = this.params;
        let url;
        params.cache = (params.cache === undefined) ? true : params.cache;

        if (params.view) {
            if (this.userHasBeenRedirected && !this.resourceInstanceLifecycleStatePermitsEditing) {
                params.view.alert(new AlertViewmodel(
                    'ep-alert-blue',
                    arches.translations.resourceReportRedirectFromResourceEditorLifecycleState.title,
                    arches.translations.resourceReportRedirectFromResourceEditorLifecycleState.text,
                    null,
                    function () { }
                ));
            } else if (this.userHasBeenRedirected && !this.userCanEditResource) {
                params.view.alert(new AlertViewmodel(
                    'ep-alert-red',
                    arches.translations.resourceReportRedirectFromResourceEditorNotPermissioned.title,
                    arches.translations.resourceReportRedirectFromResourceEditorNotPermissioned.text,
                    null,
                    function () { }
                ));
            } else if (this.graphHasDifferentPublication()) {
                if (this.graphHasDifferentPublicationAndUserHasInsufficientPermissions()) {
                    params.view.alert(new AlertViewmodel(
                        'ep-alert-red',
                        arches.translations.resourceGraphHasDifferentPublicationUserIsNotPermissioned.title,
                        arches.translations.resourceGraphHasDifferentPublicationUserIsNotPermissioned.text,
                        null,
                        function () { }
                    ));
                } else {
                    params.view.alert(new AlertViewmodel(
                        'ep-alert-red',
                        arches.translations.resourceGraphHasDifferentPublication.title,
                        arches.translations.resourceGraphHasDifferentPublication.text,
                        null,
                        function () { }
                    ));
                }
            }
        }

        if (params.report) {
            if (
                ((!params.disableDisambiguatedReport && !params.report.report_json && params?.report?.attributes?.resourceid) || !params.cache)
            ) {
                url = arches.urls.api_bulk_disambiguated_resource_instance + `?v=beta&resource_ids=${params.report.attributes.resourceid !== '' ? params.report.attributes.resourceid : window.location.pathname.split("/").reverse()[0]}`;
                if (params.report.defaultConfig?.uncompacted_reporting) {
                    url += '&uncompacted=true';
                }
                $.getJSON(url, (resp) => {
                    const resourceId = params.report.attributes.resourceid !== '' ? params.report.attributes.resourceid : window.location.pathname.split("/").reverse()[0];
                    params.report.report_json = resp?.[resourceId];
                    this.template(reportLookup[params.report.templateId()]);
                    this.report(params.report);
                    this.loading(false);
                });
            } else {
                this.template(reportLookup[params.report.templateId()]);
                this.report(params.report);
                this.loading(false);
            }
        } else if (this.resourceid) {
            url = arches.urls.api_resource_report(this.resourceid) + "?v=beta&uncompacted=true";
            this.fetchResourceData(url)
                .then((responseJson) => {
                    const template = responseJson.template;
                    this.template(template);
                    if (template.preload_resource_data) {
                        this.preloadResourceData(responseJson);
                    } else {
                        this.report({
                            'template': responseJson.template,
                            'report_json': responseJson.report_json,
                        });
                        this.loading(false);
                    }
                });
        }
    }

    fetchResourceData(url) {
        return window.fetch(url).then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(arches.translations.reNetworkReponseError);
            }
        });
    }

    preloadResourceData(responseJson) {
        const displayName = (() => {
            try {
                return JSON.parse(responseJson.displayname)?.[arches.activeLanguage]?.value;
            } catch (e) {
                return responseJson.displayname;
            }
        })();
        responseJson.displayname = displayName;
        const graphModel = new GraphModel({
            data: responseJson.graph,
            datatypes: responseJson.datatypes,
        });
        const graph = {
            graphModel: graphModel,
            cards: responseJson.cards,
            graph: responseJson.graph,
            datatypes: responseJson.datatypes,
            cardwidgets: responseJson.cardwidgets
        };
        responseJson.cards = _.filter(graph.cards, function (card) {
            const nodegroup = _.find(graph.graph.nodegroups, function (group) {
                return group.nodegroupid === card.nodegroup_id;
            });
            return !nodegroup || !nodegroup.parentnodegroup_id;
        }).map(function (card) {
            return new CardViewModel({
                card: card,
                graphModel: graph.graphModel,
                resourceId: this.resourceid,
                displayname: responseJson.displayname,
                cards: graph.cards,
                tiles: responseJson.tiles,
                cardwidgets: graph.cardwidgets
            });
        }, this);
        const report = new ReportModel(_.extend(responseJson, {
            resourceid: this.resourceid,
            graphModel: graph.graphModel,
            graph: graph.graph,
            datatypes: graph.datatypes
        }));
        report['hideEmptyNodes'] = responseJson.hide_empty_nodes;
        report['report_json'] = responseJson.report_json;
        this.report(report);
        this.loading(false);
    }
}

ko.components.register('resource-report-abstract', {
    viewModel: ResourceReportAbstract,
    template: resourceReportAbstractTemplate,
});

export default ResourceReportAbstract;
