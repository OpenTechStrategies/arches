import ListView from 'views/list';

export default class IdentityList extends ListView {
    /**
    * A backbone view to manage a list of graph nodes
    * @augments ListView
    * @constructor
    * @name IdentityList
    */
    singleSelect = true;

    /**
    * initializes the view with optional parameters
    * @memberof IdentityList.prototype
    * @param {object} options
    * @param {boolean} options.permissions - a list of allowable permissions
    * @param {boolean} options.card - a reference to the selected {@link CardModel}
    */
    constructor(options) {
        super(options);
        this.items = options.items;
    }
}
