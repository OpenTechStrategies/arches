import $ from 'jquery';
import Backbone from 'backbone';
import arches from 'arches';
import 'jqtree';

export default class ConceptTree extends Backbone.View {
    events = {
        'tree.click': 'treeClick',
        'tree.move': 'moveNode'
    };

    initialize(options) {
        const self = this;
        this.model = options.model;
        this.tree = this.$el.tree({
            dragAndDrop: true,
            dataUrl: options.url,
            data: [],
            autoOpen: false,
            rtl: $("body").attr("dir") === "rtl"
        });
        this.render();
    }

    render() {
        if (this._doNotRender) return;
        const self = this;
        const node = this.$el.tree('getNodeById', this.model.get('id'));
        if (node) {
            if (!node.load_on_demand) {
                this.$el.tree('toggle', node);
            }
            $(node.element).addClass('jqtree-loading');
        }
        this.$el.tree('loadDataFromUrl', null, function () {
            let node;
            if (self.model.get('id') !== '') {
                node = self.$el.tree('getNodeById', self.model.get('id'));
                if (node) {
                    self.$el.tree('selectNode', node);
                    self.$el.tree('scrollToNode', node);
                }
            }
        });
    }

    treeClick(event) {
        const node = event.node;
        if (!node.load_on_demand) {
            this.$el.tree('toggle', node);
        }
        if (this.model.get('id') !== node.id) {
            this.trigger('conceptSelected', node.id);
        } else {
            event.preventDefault();
        }
    }

    moveNode(event) {
        const self = this;
        const move_info = event.move_info;
        if (
            (move_info.position !== 'inside' &&
                move_info.previous_parent.id === move_info.target_node.parent.id) ||
            (move_info.position === 'inside' &&
                move_info.previous_parent.id === move_info.target_node.id)
        ) {
            // re-ordering nodes; no AJAX call
        } else {
            event.preventDefault();
            $.ajax({
                type: "POST",
                url: arches.urls.concept_relation.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', move_info.moved_node.id),
                data: JSON.stringify({
                    'target_parent_conceptid': move_info.position === 'inside' ? move_info.target_node.id : move_info.target_node.parent.id,
                    'current_parent_conceptid': move_info.previous_parent.id
                }),
                success: function () {
                    const data = JSON.parse(this.data);
                    event.move_info.do_move();
                    self.trigger('conceptMoved', data.conceptid);
                }
            });
        }
    }
}
