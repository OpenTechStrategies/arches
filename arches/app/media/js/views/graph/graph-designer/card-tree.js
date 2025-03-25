import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import arches from 'arches';
import data from 'views/graph-designer-data';
import CardViewModel from 'viewmodels/card';
import CardWidgetModel from 'models/card-widget';
import uuid from 'uuid';
import 'bindings/sortable';
import 'bindings/scrollTo';

export default class CardTree {
    constructor(params) {
        const self = this;
        const filter = ko.observable('');
        const loading = ko.observable(false);
        this.multiselect = params.multiselect || false;
        let selection;
        if (this.multiselect) {
            selection = ko.observableArray([]);
        } else {
            selection = ko.observable();
        }
        const hover = ko.observable();
        const scrollTo = ko.observable();
        let cachedFlatTree;
        let cardList = data.cards;

        const getBlankConstraint = card => {
            return [{
                uniquetoallinstances: false,
                nodes: [],
                cardid: card.cardid,
                constraintid: uuid.generate()
            }];
        };

        this.flattenTree = (parents, flatList) => {
            _.each(ko.unwrap(parents), parent => {
                flatList.push(parent);
                self.flattenTree(ko.unwrap(parent.cards), flatList);
            });
            return flatList;
        };

        this.updateNodeList = () => {
            if (self.cachedFlatTree === undefined) {
                self.cachedFlatTree = self.flattenTree(self.topCards(), []);
            }
        };

        const toggleAll = state => {
            self.updateNodeList();
            _.each(self.cachedFlatTree, node => {
                node.expanded(state);
            });
            if (state) {
                self.rootExpanded(true);
            }
        };

        const selectAll = state => {
            self.updateNodeList();
            _.each(self.cachedFlatTree, node => {
                if (node.selected() !== state) {
                    node.selected(state);
                }
            });
        };

        const expandToRoot = node => {
            self.updateNodeList();
            if (node.parent) {
                node.parent.expanded(true);
                expandToRoot(node.parent);
            } else {
                node.expanded(true);
                _.each(self.cachedFlatTree, n => {
                    if (node.parentnodegroup_id !== null && node.parentnodegroup_id === n.nodegroupid) {
                        expandToRoot(n);
                    }
                });
            }
        };

        const removeCard = (cards, nodegroupid) => {
            let removed;
            _.each(cards(), card => {
                if (card) {
                    if (card.nodegroupid === nodegroupid) {
                        cards.remove(card);
                        removed = card;
                    } else {
                        removeCard(card.cards, nodegroupid);
                    }
                }
            });
            return removed;
        };

        const createLookup = (list, idKey) => {
            return _.reduce(list, (lookup, item) => {
                lookup[ko.unwrap(item[idKey])] = item;
                return lookup;
            }, {});
        };

        _.extend(this, {
            filterEnterKeyHandler: (context, e) => {
                if (e.keyCode === 13) {
                    const highlightedItems = _.filter(self.flattenTree(self.topCards(), []), item => {
                        return item.highlight && item.highlight();
                    });
                    const previousItem = scrollTo();
                    scrollTo(null);
                    if (highlightedItems.length > 0) {
                        let scrollIndex = 0;
                        const previousIndex = highlightedItems.indexOf(previousItem);
                        if (previousItem && highlightedItems[previousIndex + 1]) {
                            scrollIndex = previousIndex + 1;
                        }
                        scrollTo(highlightedItems[scrollIndex]);
                    }
                    return false;
                }
                return true;
            },
            loading: loading,
            showIds: ko.observable(false),
            showGrid: ko.observable(false),
            cachedFlatTree: cachedFlatTree,
            widgetLookup: createLookup(data.widgets, 'widgetid'),
            cardComponentLookup: createLookup(data.cardComponents, 'componentid'),
            nodeLookup: createLookup(params.graphModel.get('nodes')(), 'nodeid'),
            graphid: params.graph.graphid,
            graphname: params.graph.name(),
            graphiconclass: params.graph.iconclass,
            graph: params.graph,
            graphModel: params.graphModel,
            appliedFunctions: params.appliedFunctions(),
            primaryDescriptorFunction: params.primaryDescriptorFunction(),
            toggleIds: () => {
                self.showIds(!self.showIds());
            },
            expandAll: () => {
                toggleAll(true);
            },
            collapseAll: () => {
                toggleAll(false);
            },
            toggleGrid: () => {
                self.showGrid(!self.showGrid());
            },
            selectAllCards: () => {
                selectAll(true);
            },
            clearSelection: () => {
                selectAll(false);
            },
            expandToRoot: expandToRoot,
            rootExpanded: ko.observable(true),
            on: () => { return; },
            beforeMove: e => {
                e.cancelDrop = (e.sourceParent !== e.targetParent);
            },
            updateCard: (parents, card, updatedData) => {
                _.each(ko.unwrap(parents), parent => {
                    if (parent.nodegroupid === card.parentnodegroupId) {
                        const newcard = {
                            card: card,
                            nodegroup: _.filter(updatedData.nodegroups, ng => updatedData.updated_values.card.nodegroup_id === ng.nodegroupid)[0]
                        };
                        self.addCard(newcard, parent.cards, parent);
                    } else {
                        self.updateCard(ko.unwrap(parent.cards), card, updatedData);
                    }
                });
            },
            updateNode: (parents, node) => {
                _.each(ko.unwrap(parents), parent => {
                    if (parent.nodegroupid === node.nodegroup_id) {
                        const attributes = parent.model.attributes;
                        _.each(parent.model.nodes(), modelnode => {
                            if (modelnode.nodeid === node.nodeid) {
                                const datatype = attributes.datatypelookup[ko.unwrap(modelnode.datatype)];
                                if (!modelnode.nodeDatatypeSubscription) {
                                    modelnode.nodeDatatypeSubscription = modelnode.datatype.subscribe(() => {
                                        parent.model._card(JSON.stringify(parent.model.toJSON()));
                                    });
                                }
                                if (datatype.defaultwidget_id) {
                                    const cardWidgetData = _.find(attributes.data.widgets, widget => widget.node_id === node.nodeid);
                                    const widget = new CardWidgetModel(cardWidgetData, {
                                        node: modelnode,
                                        card: parent.model,
                                        datatype: datatype,
                                        disabled: attributes.data.disabled
                                    });
                                    let widgetIndex;
                                    _.each(parent.widgets(), (pw, i) => {
                                        if (pw.node_id() === widget.node_id()) {
                                            widgetIndex = i;
                                        }
                                    });
                                    if (widgetIndex !== undefined) {
                                        parent.widgets.splice(widgetIndex, 1, widget);
                                    } else {
                                        parent.widgets.push(widget);
                                    }
                                }
                            }
                        });
                        parent.model._card(JSON.stringify(parent.model.toJSON()));
                    } else {
                        self.updateNode(ko.unwrap(parent.cards), node);
                    }
                });
            },
            updateCards: (selectedNodegroupId, updatedData) => {
                self.updateNode(self.topCards(), updatedData.updated_values.node);
                if (updatedData.updated_values.card) {
                    const card = updatedData.updated_values.card;
                    const defaultCardName = updatedData.default_card_name;
                    if (self.cachedFlatTree) {
                        self.cachedFlatTree.forEach(c => {
                            if (c.model.name().startsWith(defaultCardName) && c.model.cardid() === card.cardid) {
                                if (updatedData.updated_values.node) {
                                    c.model.name(updatedData.updated_values.node.name);
                                    card.name = c.model.name;
                                    c.model.save();
                                }
                            }
                        });
                    }
                    card.parentnodegroupId = _.filter(updatedData.nodegroups, ng => updatedData.updated_values.card.nodegroup_id === ng.nodegroupid)[0].parentnodegroup_id;
                    self.updateCard(self.topCards(), card, updatedData);
                } else {
                    if (updatedData.updated_values.node.nodegroup_id !== updatedData.updated_values.node.nodeid) {
                        const oldCard = _.find(self.flattenTree(self.topCards(), []), card => {
                            return card.nodegroupid === updatedData.updated_values.node.nodeid;
                        });
                        if (oldCard) {
                            const parentCards = oldCard.parentCard ? oldCard.parentCard.cards : self.topCards;
                            parentCards.remove(oldCard);
                            parentCards(parentCards().concat(oldCard.cards()));
                        }
                    }
                }
                _.each(self.cachedFlatTree, cardViewModel => {
                    cardViewModel.dispose();
                });
                self.cachedFlatTree = self.flattenTree(self.topCards(), []);
                _.each(self.cachedFlatTree, node => {
                    if (node.nodegroupid === selectedNodegroupId) {
                        self.collapseAll();
                        if (self.multiselect) {
                            self.selection([node]);
                        } else {
                            self.selection(node);
                        }
                        self.expandToRoot(node);
                    }
                });
            },
            deleteCard: selectedNodegroupId => {
                removeCard(self.topCards, selectedNodegroupId);
                if (self.topCards().length) { self.topCards()[0].selected(true); }
            },
            addCard: (cardData, parentcards, parent) => {
                if (!parentcards) {
                    parentcards = self.topCards;
                }
                self.graphModel.set('nodegroups', self.graphModel.get('nodegroups').concat([cardData.nodegroup]));
                const newCardViewModel = new CardViewModel({
                    card: cardData.card,
                    graphModel: self.graphModel,
                    tile: null,
                    resourceId: ko.observable(),
                    displayname: ko.observable(),
                    handlers: {},
                    cards: cardList,
                    tiles: [],
                    selection: selection,
                    hover: hover,
                    scrollTo: scrollTo,
                    multiselect: self.multiselect,
                    loading: loading,
                    filter: filter,
                    provisionalTileViewModel: null,
                    cardwidgets: cardData.cardwidgets,
                    userisreviewer: true,
                    perms: ko.observableArray(),
                    permsLiteral: ko.observableArray(),
                    parentCard: parent,
                    constraints: getBlankConstraint(cardData.card),
                    topCards: self.topCards
                });
                parentcards.push(newCardViewModel);
                const node = _.find(self.graphModel.get('nodes')(), n => n.nodeid === cardData.card.nodegroup_id);
                self.graphModel.getChildNodesAndEdges(node).nodes.forEach(n => {
                    const card = _.find(ko.unwrap(parentcards), c => {
                        return c.nodegroupid === (ko.unwrap(n.nodeGroupId) || ko.unwrap(n.nodegroup_id)) &&
                            c.model.cardid() !== newCardViewModel.model.cardid();
                    });
                    if (card) {
                        parentcards.remove(card);
                        const cardIDs = newCardViewModel.cards().map(c => c.cardid);
                        if (!_.contains(cardIDs, card.cardid)) {
                            newCardViewModel.cards.push(card);
                        }
                    }
                });
                if (!this.nodeLookup[node.nodeid]) {
                    this.nodeLookup[node.nodeid] = node;
                }
                self.cachedFlatTree = self.flattenTree(self.topCards(), []);
                return newCardViewModel;
            },
            reorderCards: () => {
                loading(true);
                const cards = _.map(self.topCards(), (card, i) => {
                    card.model.get('sortorder')(i);
                    return {
                        id: card.model.id,
                        name: card.model.get('name')(),
                        sortorder: i
                    };
                });
                $.ajax({
                    type: 'POST',
                    data: JSON.stringify({ cards: cards }),
                    url: arches.urls.reorder_cards,
                    complete: () => {
                        document.dispatchEvent(new Event('reorderCards'));
                        loading(false);
                    }
                });
            },
            selection: selection,
            filter: filter,
            isFuncNode: () => {
                let nodegroupId = null;
                const pdFunction = self.primaryDescriptorFunction;
                if (params.card && pdFunction) {
                    nodegroupId = params.card.nodegroup_id;
                    for (let descriptor of ['name', 'description']) {
                        try {
                            if (nodegroupId === pdFunction['config']['descriptor_types'][descriptor]['nodegroup_id']) {
                                return true;
                            }
                        } catch (e) {
                            console.log("No descriptor configuration for " + descriptor);
                        }
                    }
                    return false;
                }
            }
        });

        this.topCards = ko.observableArray();
        const tc = _.filter(params.isPermissionTree ? data.source_graph.cards : data.cards, card => {
            const nodegroup = _.find(ko.unwrap(params.graphModel.get('nodegroups')), group => {
                return ko.unwrap(group.nodegroupid) === card.nodegroup_id;
            });
            return !nodegroup || !ko.unwrap(nodegroup.parentnodegroup_id);
        }).sort((firstEl, secondEl) => {
            if (firstEl.sortorder < secondEl.sortorder) {
                return -1;
            }
            if (firstEl.sortorder === secondEl.sortorder) {
                return 0;
            }
            return 1;
        });
        this.topCards(tc.map(card => {
            let constraints = data.constraints.filter(ct => ct.card_id === card.cardid);
            if (constraints.length === 0) {
                constraints = getBlankConstraint(card);
            }
            return new CardViewModel({
                card: card,
                appliedFunctions: params.appliedFunctions(),
                primaryDescriptorFunction: params.primaryDescriptorFunction(),
                graphModel: params.graphModel,
                tile: null,
                resourceId: ko.observable(),
                displayname: ko.observable(),
                handlers: {},
                cards: data.cards,
                constraints: constraints,
                tiles: [],
                selection: selection,
                hover: hover,
                scrollTo: scrollTo,
                multiselect: self.multiselect,
                loading: loading,
                filter: filter,
                provisionalTileViewModel: null,
                cardwidgets: data.cardwidgets,
                userisreviewer: true,
                perms: ko.observableArray(),
                permsLiteral: ko.observableArray(),
                topCards: self.topCards
            });
        }));
        const topCard = self.topCards()[0];
        if (topCard != null) {
            if (self.multiselect === true) {
                selection.push(topCard.tiles().length > 0 ? topCard.tiles()[0] : topCard);
            } else {
                selection(topCard.tiles().length > 0 ? topCard.tiles()[0] : topCard);
            }
        }
        self.graphModel.get('cards').subscribe(graphCards => {
            const currentCards = self.flattenTree(self.topCards(), []);
            const cardIds = currentCards.map(card => card.model.cardid());
            const newCards = graphCards.filter(card => !_.contains(cardIds, card.cardid));
            cardList = cardList.concat(newCards);
            newCards.forEach(card => {
                const nodegroup = _.find(ko.unwrap(params.graphModel.get('nodegroups')), group => {
                    return ko.unwrap(group.nodegroupid) === card.nodegroup_id;
                });
                const parent = _.find(currentCards, currentCard => {
                    return currentCard.nodegroupid === nodegroup.parentnodegroup_id;
                });
                if (parent || !nodegroup.parentnodegroup_id) {
                    self.addCard({
                        nodegroup: nodegroup,
                        card: card,
                        cardwidgets: self.graphModel.get('cardwidgets')
                    }, parent ? parent.cards : self.topCards, parent);
                }
            });
        });
    }
}
