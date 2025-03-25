import Backbone from 'backbone';
import _ from 'underscore';
import ko from 'knockout';
import 'bindings/sortable';

export default class CardComponentsTree extends Backbone.View {
    /**
    * A backbone view representing a card components tree
    * @augments Backbone.View
    * @constructor
    * @name CardComponentsTree
    */
    constructor(options) {
        super(options);
        _.extend(this, _.pick(options, 'card'));
        this.selection = options.selection || ko.observable(this.card);
    }

    /**
    * beforeMove - prevents dropping of tree nodes into other lists
    * this provides for sorting within cards and card containers, but
    * prevents moving of cards/widgets between containers/cards
    * @memberof CardComponentsTree.prototype
    * @param  {object} e - the ko.sortable event object
    */
    beforeMove(e) {
        e.cancelDrop = (e.sourceParent !== e.targetParent);
    }
}
