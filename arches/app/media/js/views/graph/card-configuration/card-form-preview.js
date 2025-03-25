import Backbone from 'backbone';
import _ from 'underscore';
import ko from 'knockout';
import widgets from 'widgets';
import 'bindings/sortable';

export default class CardFormPreview extends Backbone.View {
    /**
    * A backbone view representing a card form preview
    * @augments Backbone.View
    * @constructor
    * @name CardFormPreview
    */
    constructor(options) {
        super(options);
        const self = this;
        this.card = options.card;
        this.graph = options.graphModel;
        this.selection = options.selection || ko.observable(this.card);
        this.helpPreviewActive = options.helpPreviewActive || ko.observable(false);
        this.widgetLookup = widgets;
        this.currentTabIndex = ko.computed(function () {
            if (!self.card.isContainer() || self.selection() === self.card) {
                return 0;
            }
            let card = self.selection();
            if (card.node) {
                card = card.card;
            }
            const index = self.card.get('cards')().indexOf(card);
            return index;
        });
        this.currentTabCard = ko.computed(function () {
            if (this.card.get('cards')().length === 0) {
                return this.card;
            } else {
                return this.card.get('cards')()[this.currentTabIndex()];
            }
        }, this);
    }

    beforeMove(e) {
        e.cancelDrop = (e.sourceParent !== e.targetParent);
    }
}
