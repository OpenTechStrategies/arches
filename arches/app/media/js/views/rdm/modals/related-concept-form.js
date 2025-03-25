import arches from 'arches';
import ConceptSearch from 'views/concept-search';
import ConceptModel from 'models/concept';

export default class RelatedConceptForm extends ConceptSearch {
    initialize() {
        super.initialize(...arguments);
        const self = this;
        this.modal = this.$el.find('form');
        this.relationshiptype = this.modal.find('#related-relation-type').select2({
            placeholder: arches.translations.selectAnOption,
            minimumResultsForSearch: 10,
            maximumSelectionSize: 1
        });
        this.modal.validate({
            ignore: null,
            rules: {
                concept_search_box: 'required',
                relationtype_dd: 'required'
            },
            submitHandler: function (form) {
                const relatedConcept = new ConceptModel({
                    id: self.searchbox.val(),
                    relationshiptype: self.relationshiptype.val()
                });
                self.model.set('relatedconcepts', [relatedConcept]);
                self.modal.on('hidden.bs.modal', function (e) {
                    self.model.save();
                });
                self.modal.modal('hide');
            }
        });
    }
}
