import $ from 'jquery';
import Backbone from 'backbone';
import arches from 'arches';

export default class ImportConceptForm extends Backbone.View {
    initialize() {
        const self = this;
        this.$el.find("#error_text").closest('.row').addClass('hidden');
        this.$el.find("[name=concept_identifiers]").val('');
        this.endpoint = this.$el.find('#sparql_endpoint').select2({
            minimumResultsForSearch: -1
        });
        this.$el.find('select.concept_import').select2({
            minimumInputLength: 2,
            id: function (result) {
                return result.Subject.value;
            },
            ajax: {
                url: arches.urls.search_sparql_endpoint,
                dataType: 'json',
                data: function (requestParams) {
                    return {
                        terms: requestParams.term,
                        endpoint: self.endpoint.val()
                    };
                },
                processResults: function (data) {
                    data.results.bindings.forEach(item => {
                        item.id = item.Subject.value;
                        return item;
                    });
                    return { results: data.results.bindings };
                }
            },
            templateResult: function (result) {
                if (result.loading || result.children) {
                    return result.text;
                }
                const formatedresult =
                    '<span class="concept_result">' +
                    result.Term.value +
                    '</span> - <a href="' +
                    result?.Subject?.value +
                    '" target="_blank">' +
                    result?.Subject?.value +
                    '</a><div><i class="concept_result_schemaname">(' +
                    result?.ScopeNote?.value +
                    ')</i></div>';
                return formatedresult;
            },
            escapeMarkup: function (m) {
                return m;
            }
        }).on("select2:selecting", function (e) {
            self.trigger("select2:selecting", e);
            self.$el.find("[name=concept_identifiers]").val(e.params.args.data.id);
        });
        this.modal = this.$el.find('form');
        this.modal.validate({
            ignore: null,
            rules: {
                concept_identifiers: "required"
            },
            submitHandler: function (form) {
                const dataObj = {
                    ids: self.$el.find("[name=concept_identifiers]").val(),
                    endpoint: self.endpoint.val(),
                    model: self.model.toJSON()
                };
                self.$el.find("#error_text").closest('.row').addClass('hidden');
                $.ajax({
                    type: "POST",
                    url: arches.urls.from_sparql_endpoint.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', self.model.get('id')),
                    data: JSON.stringify(dataObj),
                    processData: false,
                    contentType: false,
                    success: function () {
                        self.modal.on('hidden.bs.modal', function (e) {
                            self.trigger('conceptsImported');
                        });
                        self.modal.modal('hide');
                    },
                    error: function (response) {
                        const el = self.$el.find("#error_text");
                        el.closest('.row').removeClass('hidden');
                        el.html(response.responseText);
                    }
                });
                return false;
            }
        });
    }
}
