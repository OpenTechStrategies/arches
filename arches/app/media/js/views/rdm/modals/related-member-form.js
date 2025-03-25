import ConceptSearch from 'views/concept-search';
import ConceptModel from 'models/concept';

export default class RelatedMemberForm extends ConceptSearch {
    events = {
        'click .modal-footer .savebtn': 'save'
    };

    initialize() {
        super.initialize(...arguments);
        this.modal = this.$el.find('.modal');
        this.relationshiptype = this.modal.find('#related-relation-type').select2({
            minimumResultsForSearch: 10,
            maximumSelectionSize: 1
        });
    }

    save() {
        const self = this;
        if (this.searchbox.val() !== '') {
            const relatedConcept = new ConceptModel({
                id: this.searchbox.val(),
                relationshiptype: this.relationshiptype.val()
            });
            this.model.set('relatedconcepts', [relatedConcept]);
            this.modal.on('hidden.bs.modal', function (e) {
                self.model.save();
            });
            this.modal.modal('hide');
        }
    }
}
