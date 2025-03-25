import Backbone from 'backbone';
import 'select-woo';

class CustomView extends Backbone.View {
    initialize() {
        this.$el.find('.arches_simple_search').select2({
            minimumResultsForSearch: 10
        });
    }
}

export default CustomView;
