import _ from 'underscore';
import $ from 'jquery';
import ko from 'knockout';
import arches from 'arches';
import GraphModel from 'models/graph';
import CardViewModel from 'viewmodels/card';
import ProvisionalTileViewModel from 'viewmodels/provisional-tile';
import relatedInstanceCreatorTemplate from 'templates/views/components/related-instance-creator.htm';

class RelatedInstanceCreator {
    constructor(params) {
        this.params = params;
        this.resourceId = ko.observable(ko.unwrap(params.resourceid));
        this.resourceId.subscribe(id => {
            params.resourceid(id);
        });
        this.getCardResourceIdOrGraphId = () => {
            return ko.unwrap(this.resourceId) || ko.unwrap(params.graphid);
        };
        this.card = ko.observable();
        this.tile = ko.observable();
        this.tile.subscribe(tile => {
            if (tile && params.hasDirtyTile) {
                tile.dirty.subscribe(val => {
                    ((this.card() && this.card().isDirty()) || val) ? params.hasDirtyTile(true) : params.hasDirtyTile(false);
                });
            }
        });
        this.loading = params.loading || ko.observable(false);
        this.alert = params.alert || ko.observable(null);
        this.complete = params.complete || ko.observable();
        this.graphName = params.graphName;
        this.loading(true);
        this.customCardLabel = params.customCardLabel || false;
        this.topCards = ko.observableArray();

        this.getJSON = () => {
            let url = arches.urls.api_card + this.getCardResourceIdOrGraphId();
            $.getJSON(url, data => {
                const handlers = {
                    'after-update': [],
                    'tile-reset': []
                };
                const displayname = ko.observable(data.displayname);
                const createLookup = (list, idKey) =>
                    _.reduce(list, (lookup, item) => {
                        lookup[item[idKey]] = item;
                        return lookup;
                    }, {});
                this.reviewer = data.userisreviewer;
                this.provisionalTileViewModel = new ProvisionalTileViewModel({
                    tile: this.tile,
                    reviewer: data.userisreviewer
                });
                const graphModel = new GraphModel({
                    data: {
                        nodes: data.nodes,
                        nodegroups: data.nodegroups,
                        edges: []
                    },
                    datatypes: data.datatypes
                });
                data.cards.sort((a, b) => a.sortorder - b.sortorder);
                const topCards = _.filter(data.cards, card => {
                    const selectedNodegroup = _.find(data.nodegroups, nodegroup => nodegroup.nodegroupid === card.nodegroup_id);
                    const selectedNodes = _.filter(data.nodes, node =>
                        node.nodegroup_id === card.nodegroup_id && node.datatype !== 'semantic'
                    );
                    const isVisible = _.some(selectedNodes, node => {
                        const cardwidget = _.find(data.cardwidgets, cardwidget => node.nodeid === cardwidget.node_id);
                        return cardwidget ? cardwidget.visible : false;
                    });
                    return !(selectedNodegroup && selectedNodegroup.parentnodegroup_id) && isVisible;
                }).map(card => {
                    params.nodegroupid = params.nodegroupid || card.nodegroup_id;
                    return new CardViewModel({
                        card: card,
                        graphModel: graphModel,
                        tile: null,
                        resourceId: this.resourceId,
                        displayname: displayname,
                        handlers: handlers,
                        cards: data.cards,
                        tiles: data.tiles,
                        provisionalTileViewModel: this.provisionalTileViewModel,
                        cardwidgets: data.cardwidgets,
                        userisreviewer: data.userisreviewer,
                        loading: this.loading
                    });
                });
                topCards.forEach(topCard => {
                    topCard.topCards = this.topCards;
                });
                this.topCards(topCards);
                this.widgetLookup = createLookup(data.widgets, 'widgetid');
                this.cardComponentLookup = createLookup(data['card_components'], 'componentid');
                this.nodeLookup = createLookup(graphModel.get('nodes')(), 'nodeid');
                this.on = (eventName, handler) => {
                    if (handlers[eventName]) {
                        handlers[eventName].push(handler);
                    }
                };
                this.assignTile();
                this.loading(false);
            });
        };

        this.assignTile = () => {
            this.topCards().forEach(item => {
                if (item.constructor.name === 'CardViewModel' && item.nodegroupid === params.nodegroupid) {
                    if (ko.unwrap(params.parenttileid) && item.parent && ko.unwrap(params.parenttileid) !== item.parent.tileid) {
                        return;
                    }
                    if (this.customCardLabel) {
                        item.model.name(ko.unwrap(this.customCardLabel));
                    }
                    this.card(item);
                    if (ko.unwrap(this.resourceId) && item.tiles().length > 0) {
                        item.tiles().forEach(tile => {
                            if (tile.nodegroup_id === params.nodegroupid) {
                                this.tile(tile);
                            }
                        });
                    } else if (ko.unwrap(params.createTile) !== false) {
                        this.tile(item.getNewTile());
                        if (this.resourceId()) {
                            this.tile().resourceinstance_id = this.resourceId();
                        }
                    }
                }
            });
        };

        params.tile = this.tile;

        if (ko.unwrap(params.getJSONOnLoad) !== false) {
            this.getJSON();
        }

        this.loadCard = card => {
            this.card(card);
            params.nodegroupid = this.card().nodegroupid;
            this.assignTile();
        };

        this.close = () => {
            this.complete(true);
        };

        this.onDeleteSuccess = () => {
            this.tile(this.card().getNewTile());
        };

        this.onSaveSuccess = tiles => {
            let tile;
            if (tiles.length > 0 || typeof tiles === 'object') {
                tile = tiles[0] || tiles;
                this.tile(tile);
                this.resourceId(tile.resourceinstance_id);
            }
            if (this.completeOnSave === true) {
                this.complete(true);
            }
        };
    }
}

ko.components.register('related-instance-creator', {
    viewModel: RelatedInstanceCreator,
    template: relatedInstanceCreatorTemplate,
});

export default RelatedInstanceCreator;
