import _ from 'underscore';
import ko from 'knockout';
import arches from 'arches';
import AbstractModel from 'models/abstract';

class NodeModel extends AbstractModel {
    constructor(options) {
        super();

        this.url = options.url || arches.urls.node;
        this.graph = options.graph;
        this.datatypelookup = options.datatypelookup;
        this.layer = options.layer;
        this.icons = options.icons || [];
        this.mapSource = options.mapSource;
        this.loading = options.loading;
        this.permissions = options.permissions;
        this.ontology_namespaces = options.ontology_namespaces || {};

        this._node = ko.observable('');
        this.selected = ko.observable(false);
        this.filtered = ko.observable(false);
        this.name = ko.observable('');
        this.description = ko.observable(null);
        this.slug = ko.observable(null);
        this.alias = ko.observable(null);
        this.hasCustomAlias = ko.observable(false);
        this.sourceIdentifierId = ko.observable(null);
        this.nodeGroupId = ko.observable('');
        this.fieldname = ko.observable();
        this.exportable = ko.observable(false);
        this.issearchable = ko.observable(true);
        this.isrequired = ko.observable(true);

        const datatype = ko.observable('');
        this.datatype = ko.pureComputed({
            read: () => datatype(),
            write: (value) => {
                if (datatype() !== value) {
                    const record = this.datatypelookup[value];
                    if (record) {
                        this.setupConfig(record.defaultconfig);
                    }
                    datatype(value);
                }
            }
        });

        this.datatypeDataBearing = ko.pureComputed(() => {
            const dt = this.datatype();
            return dt && this.datatypelookup[dt]?.defaultwidget_id;
        });

        this.datatypeIsSearchable = ko.pureComputed(() => {
            const record = this.datatypelookup[this.datatype()];
            return !!(record && record.configname && record.issearchable);
        });

        this.datatypeConfigComponent = ko.pureComputed(() => {
            return this.datatypelookup[this.datatype()]?.configname || null;
        });

        this.ontologyclass = ko.observable('');
        this.parentproperty = ko.observable('');
        this.ontology_cache = ko.observableArray().extend({ deferred: true });
        this.configKeys = ko.observableArray();
        this.config = {};

        this.parse(options.source);

        this.validclasses = ko.pureComputed(() => {
            const cache = this.ontology_cache();
            if (!this.parentproperty()) {
                return _.chain(cache).sortBy('class').uniq(false, i => i.class).pluck('class').value();
            } else {
                return _.chain(cache).sortBy('class').filter(i => i.property === this.parentproperty()).pluck('class').value();
            }
        });

        if (!this.istopnode) {
            this.validproperties = ko.pureComputed(() => {
                const cache = this.ontology_cache();
                if (!this.ontologyclass()) {
                    return _.chain(cache).sortBy('property').uniq(false, i => i.property).pluck('property').value();
                } else {
                    return _.chain(cache).sortBy('property').filter(i => i.class === this.ontologyclass()).pluck('property').value();
                }
            });
        }

        this.iconclass = ko.pureComputed(() => this.datatypelookup[this.datatype()]?.iconclass || '');

        this.json = ko.pureComputed(() => {
            const keys = this.configKeys();
            const config = keys.length > 0 ? Object.fromEntries(keys.map(k => [k, this.config[k]()])) : null;

            const jsObj = ko.toJS({
                name: this.name,
                datatype: this.datatype,
                nodegroup_id: this.nodeGroupId,
                description: this.description,
                slug: this.slug,
                ontologyclass: this.ontologyclass,
                parentproperty: this.parentproperty,
                config,
                issearchable: this.issearchable,
                isrequired: this.isrequired,
                is_immutable: this.is_immutable,
                fieldname: this.fieldname,
                exportable: this.exportable,
                alias: this.alias,
                hascustomalias: this.hasCustomAlias,
                sourcebranchpublication_id: this.sourceBranchPublicationId,
            });

            return JSON.stringify(_.extend(JSON.parse(this._node()), jsObj));
        });

        this.dirty = ko.pureComputed(() => this.json() !== this._node()).extend({ rateLimit: 100 });

        this.isCollector = ko.pureComputed(() => this.nodeid === this.nodeGroupId());

        this.selected.subscribe(selected => {
            if (selected) this.getValidNodesEdges();
        });

        this.ontologyclass_friendlyname = ko.pureComputed(() => this.getFriendlyOntolgyName(this.ontologyclass()));
        this.parentproperty_friendlyname = ko.pureComputed(() => this.getFriendlyOntolgyName(this.parentproperty()));
    }

    parse(source) {
        this._node(JSON.stringify(source));
        this.name(ko.unwrap(source.name));
        this.nodeGroupId(source.nodegroup_id);
        this.datatype(source.datatype);
        this.description(source.description);
        this.slug(source.slug);
        this.ontologyclass(source.ontologyclass);
        this.parentproperty(source.parentproperty);
        this.issearchable(source.issearchable);
        this.isrequired(source.isrequired);
        this.fieldname(source.fieldname);
        this.exportable(source.exportable);
        this.alias(source.alias);
        this.hasCustomAlias(source.hascustomalias);
        this.sourceIdentifierId(source.source_identifier_id);

        if (source.config) this.setupConfig(source.config);

        this.nodeid = source.nodeid;
        this.istopnode = source.istopnode;
        this.is_immutable = source.is_immutable;
        this.sourceBranchPublicationId = source.sourcebranchpublication_id;

        this.set('id', this.nodeid);
        this.set('graph_id', source.graph_id);
    }

    setupConfig(config) {
        const keys = [];
        const record = this.datatypelookup[this.datatype()];
        if (record && record.defaultconfig && config) {
            const defaultConfig = record.defaultconfig;
            for (const [key, val] of Object.entries(defaultConfig)) {
                if (!Object.prototype.hasOwnProperty.call(config, key)) {
                    config[key] = val;
                }
            }
        }
        for (const [key, val] of Object.entries(config)) {
            this.config[key] = Array.isArray(val) ? ko.observableArray(val) : ko.observable(val);
            keys.push(key);
        }
        this.configKeys(keys);
    }

    reset() {
        this.parse(JSON.parse(this._node()));
    }

    save(userCallback, scope) {
        const callback = (request, status, model) => {
            if (typeof userCallback === 'function') {
                userCallback.call(this, request, status, model);
            }
            if (status === 'success') {
                this.alias(request.responseJSON.updated_values?.node.alias);
                this._node(this.json());
            }
        };

        document.dispatchEvent(new Event('nodeSave'));

        return this._doRequest({
            type: 'POST',
            url: this._getURL('POST'),
            data: JSON.stringify(this.toJSON())
        }, callback, scope, 'save');
    }

    toJSON() {
        return JSON.parse(this.json());
    }

    toggleIsCollector() {
        const newGroupId = this.isCollector()
            ? this.graph.getParentNode(this).nodeGroupId()
            : this.nodeid;

        const children = this.graph.getChildNodesAndEdges(this).nodes;
        children.forEach(child => {
            if (child.nodeGroupId() === this.nodeGroupId()) {
                child.nodeGroupId(newGroupId);
                child._node(child.json());
            }
        });
        this.nodeGroupId(newGroupId);
    }

    getValidNodesEdges() {
        this.graph.getValidNodesEdges(this.nodeid, (responseJSON) => {
            this.ontology_cache.removeAll();
            if (responseJSON) {
                responseJSON.forEach(item => {
                    item.ontology_classes.forEach(cls => {
                        this.ontology_cache.push({ property: item.ontology_property, class: cls });
                    });
                });
            }
        }, this);
    }

    getFriendlyOntolgyName(uri) {
        if (!uri) return '';
        const namespaceUri = Object.keys(this.ontology_namespaces).find(ns => uri.includes(ns));
        if (namespaceUri) {
            const prefix = this.ontology_namespaces[namespaceUri];
            return prefix ? uri.replace(namespaceUri, `${prefix}:`) : uri.replace(namespaceUri, '');
        }
        return uri;
    }

    _getURL(method) {
        const id = this.get('graph_id') || '';
        return this.url.includes('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
            ? this.url.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id)
            : this.url + id;
    }
}

export default NodeModel;
