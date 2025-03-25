import $ from 'jquery';
import Backbone from 'backbone';
import ko from 'knockout';
import ListView from 'views/list';

class TreeView extends ListView {
    /**
    * A list view to manage a hierarchical lists of things
    * @augments ListView
    * @constructor
    * @name TreeView
    */
    _initializeItem(item) {
        if (!item.filtered) {
            item.filtered = ko.observable(false);
        }
        if (!('selectable' in item)) {
            item.selectable = true;
        }
        if (!item.selected) {
            item.selected = ko.observable(false);
        }
        if (!item.expanded) {
            item.expanded = ko.observable(false);
        }
    }

    /**
    * Reset the search string to blank
    * @memberof TreeView.prototype
    */
    expandAll() {
        this.items().forEach(function (item) {
            item.expanded(true);
        }, this);
    }

    /**
    * Reset the search string to blank
    * @memberof TreeView.prototype
    */
    collapseAll() {
        this.items().forEach(function (item) {
            item.expanded(false);
        }, this);
    }
}

export default TreeView;
