import $ from 'jquery';
import arches from 'arches';
import reportLookup from 'report-templates';
import AbstractModel from 'models/abstract';
import ko from 'knockout';
import koMapping from 'knockout-mapping';
import _ from 'underscore';

class ReportModel extends AbstractModel {
    constructor(options) {
        super();

        this.templateId = ko.observable(options.graph.template_id);
        this.cards = options.cards || [];
        this.preview = options.preview;
        this.userisreviewer = options.userisreviewer;

        this.set('graphid', ko.observable());
        this.set('config', {});
        this.configKeys = ko.observableArray();

        this._data = ko.observable('{}');
        this.configJSON = ko.observable({});
        this.configState = {};
        this.relatedResourcesLookup = ko.observable({});

        if (options.related_resources) {
            this.updateRelatedResourcesLookup(options.related_resources);
        }

        this.graph = options.graph;
        this.parse(options.graph);

        this.configKeys.subscribe(val => {
            if (reportLookup[this.templateId()]) {
                this.defaultConfig = reportLookup[this.templateId()].defaultconfig;
            } else {
                this.defaultConfig = {};
            }

            if (val.length) {
                this.configState = {};
                const config = this.get('config');
                val.forEach(key => {
                    if (Object.prototype.hasOwnProperty.call(this.defaultConfig, key)) {
                        this.configState[key] = ko.unwrap(config[key]);
                    }
                });
                this.configState = koMapping.fromJS(this.configState);
            }
        });

        this.resetConfigs = (previousConfigs) => {
            this.configKeys().forEach(key => {
                if (Object.prototype.hasOwnProperty.call(this.defaultConfig, key)) {
                    if (JSON.stringify(this.configState[key]()) !== JSON.stringify(previousConfigs[key])) {
                        koMapping.fromJS(previousConfigs, this.configState);
                    }
                }
            });
        };
    }

    url = arches.urls.graph;

    parse(attributes) {
        this._attributes = attributes;

        _.each(attributes, (value, key) => {
            switch (key) {
                case 'graphid':
                    this.set('id', value);
                    this.get('graphid')(value);
                    break;
                case 'template_id':
                    this.templateId(value);
                    this.set(key, ko.computed({
                        read: () => this.templateId(),
                        write: newVal => {
                            const configKeys = [];
                            const defaultConfig = reportLookup[newVal].defaultconfig;
                            for (let k in defaultConfig) {
                                defaultConfig[k] = ko.observable(defaultConfig[k]);
                            }
                            const currentConfig = this.get('config');
                            this.set('config', _.defaults(currentConfig, defaultConfig));
                            for (let k in defaultConfig) {
                                if (!this.configKeys().includes(k)) {
                                    configKeys.push(k);
                                }
                            }
                            this.templateId(newVal);
                            this.configKeys(this.configKeys().concat(configKeys));
                        }
                    }));
                    break;
                case 'config':
                    const config = {};
                    const configKeys = [];
                    this.configKeys.removeAll();
                    _.each(value, (configVal, configKey) => {
                        config[configKey] = configVal;
                        configKeys.push(configKey);
                    });
                    this.set(key, config);
                    this.configKeys(configKeys);
                    break;
                default:
                    this.set(key, value);
            }
        });

        this._data(JSON.stringify(this.toJSON()));
    }

    updateRelatedResourcesLookup(json) {
        const relatedResourcesLookup = this.relatedResourcesLookup();

        for (let [graphId, value] of Object.entries(json)) {
            let relatedResources = ko.observableArray();
            let paginator = ko.observable();
            let remainingResources = ko.observable();
            let totalRelatedResources = 0;

            if (!relatedResourcesLookup[graphId]) {
                if (value['related_resources']) {
                    totalRelatedResources = value['related_resources']['total']['value'];
                } else if (value['resources']) {
                    totalRelatedResources = value['resources'].length;
                }

                relatedResourcesLookup[graphId] = {
                    graphId,
                    loadedRelatedResources: relatedResources,
                    name: value['name'] || value['related_resources']['node_config_lookup'][graphId]['name'],
                    paginator,
                    remainingResources,
                    totalRelatedResources,
                };
            } else {
                relatedResources = relatedResourcesLookup[graphId]['loadedRelatedResources'];
                paginator = relatedResourcesLookup[graphId]['paginator'];
                remainingResources = relatedResourcesLookup[graphId]['remainingResources'];
            }

            paginator(value['paginator']);

            if (!value['paginator']) relatedResources.removeAll();

            if (value['related_resources']) {
                for (let resourceRelationship of value['related_resources']['resource_relationships']) {
                    const relatedResource = value['related_resources']['related_resources'].find(resource => {
                        return (
                            resource.resourceinstanceid === resourceRelationship.resourceinstanceidto ||
                            resource.resourceinstanceid === resourceRelationship.resourceinstanceidfrom ||
                            this.attributes?.graph?.graphid === resource.resourceinstanceid
                        );
                    });
                    if (relatedResource) {
                        relatedResources.push({
                            displayName: relatedResource.displayname,
                            resourceinstanceid: relatedResource.resourceinstanceid,
                            relationship: resourceRelationship.relationshiptype_label,
                            link: arches.urls.resource_report + relatedResource.resourceinstanceid,
                        });
                    }
                }

                const resourceLimit = value['related_resources']['resource_relationships'].length;
                const remainingCount = value['related_resources']['total']['value'] - relatedResources().length;
                remainingResources(remainingCount < resourceLimit ? remainingCount : resourceLimit);
            } else if (value['resources']?.length > 0) {
                for (let relatedResource of value['resources']) {
                    relatedResources.push({
                        displayName: relatedResource.displayname,
                        relationship: relatedResource.relationships[0],
                        link: arches.urls.resource_report + relatedResource.resourceinstanceid,
                    });
                }
            }
        }

        this.relatedResourcesLookup(relatedResourcesLookup);
    }

    getRelatedResources(loadAll, resource) {
        return $.ajax({
            context: this,
            url: (
                arches.urls.related_resources +
                this.attributes.resourceid +
                `?resourceinstance_graphid=${resource.graphId}` +
                (loadAll ? '&paginate=false' : `&page=${resource.paginator().next_page_number}`)
            )
        }).done(function (json) {
            this.updateRelatedResourcesLookup({
                [resource.graphId]: json.paginator ? json : { related_resources: json, paginator: null }
            });
        });
    }

    reset() {
        this._attributes = JSON.parse(this._data());
        this.parse(this._attributes);
    }

    toJSON() {
        const ret = {};
        const keys = ['template_id', 'config'];
        keys.forEach(key => {
            if (ko.isObservable(this.attributes[key])) {
                ret[key] = this.attributes[key]();
            } else if (key === 'config') {
                const configKeys = this.configKeys();
                if (configKeys.length > 0) {
                    const config = {};
                    configKeys.forEach(configKey => {
                        config[configKey] = ko.unwrap(this.get('config')[configKey]);
                    });
                    ret[key] = config;
                } else {
                    ret[key] = null;
                }
            } else {
                ret[key] = this.attributes[key];
            }
        });
        return ret;
    }

    save() {
        return super.save(function (request, status) {
            if (status === 'success') {
                this._data(JSON.stringify(this.toJSON()));
            }
        }, this);
    }
}

export default ReportModel;
