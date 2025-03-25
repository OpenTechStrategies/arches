import $ from 'jquery';
import Backbone from 'backbone';
import arches from 'arches';
import ConceptModel from 'models/concept';
import ValueModel from 'models/value';
import ConceptParentModel from 'models/concept-parents';
import ValueEditor from 'views/rdm/modals/value-form';
import RelatedConcept from 'views/rdm/modals/related-concept-form';
import RelatedMember from 'views/rdm/modals/related-member-form';
import ManageParentForm from 'views/rdm/modals/manage-parent-form';
import ImportConcept from 'views/rdm/modals/import-concept-form';
import AddChildForm from 'views/rdm/modals/add-child-form';
import AddImageForm from 'views/rdm/modals/add-image-form';
import AlertViewModel from 'viewmodels/alert';
import JsonErrorAlertViewModel from 'viewmodels/alert-json';

export default class ConceptReport extends Backbone.View {
    events = {
        'click .concept-report-content *[data-action="viewconcept"]': 'conceptSelected',
        'click .concept-report-content *[data-action="viewddconcept"]': 'dropdownConceptSelected',
        'click .concept-report-content *[data-action="delete-relationship"]': 'deleteClicked',
        'click .concept-report-content *[data-action="delete-value"]': 'deleteClicked',
        'click .concept-report-content *[data-action="delete-concept"]': 'deleteClicked',
        'click a.add-image-link': 'addImageClicked',
        'click a.edit-value': 'editValueClicked',
        'click .confirm-delete-yes': 'deleteConfirmed',
        'click a[data-toggle="#related-concept-form"]': 'addRelatedConceptClicked',
        'click a[data-toggle="#related-member-form"]': 'addRelatedMemberClicked',
        'click a[data-toggle="#add-concept-form"]': 'addChildConcept',
        'click a[data-toggle="#add-top-concept-form"]': 'addChildConcept',
        'click a[data-toggle="#manage-parent-form"]': 'manageParentConcepts',
        'click a[data-toggle="#import-concept-form"]': 'importConcept',
        'click a[data-toggle="#make-collection"]': 'makeCollection'
    };

    initialize(options) {
        this.viewModel = options.viewModel;
        this.render();
    }

    render() {
        const self = this;
        const conceptid = this.model.get('id');
        const showGraph = self.$el.find('.concept-graph').is(':visible');
        self.$el.find('.concept-report-loading').removeClass('hidden');
        self.$el.find('.concept-report-content').addClass('hidden');
        if (this.xhr) {
            this.xhr.abort();
        }
        this.xhr = $.ajax({
            url: arches.urls.concept.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', conceptid),
            data: { f: 'html', mode: this.mode },
            success: function (response) {
                self.$el.find('.concept-report-loading').addClass('hidden');
                self.$el.html(response);
                const data = self.$el.find('div[name="modeldata"]').data();
                self.model.set(data);
                if (self.model.get('id')) {
                    if (self.$el.find('.concept-graph').length > 0) {
                        self.$el.find('.graph-toggle').click(function () {
                            self.$el.find('.concept-tree').toggle(300);
                            self.$el.find('.concept-graph').toggle(300);
                            self.$el.find('.graph-toggle').toggle();
                        });
                        if (showGraph) {
                            self.$el.find('.graph-toggle').toggle();
                            self.$el.find('.concept-tree').toggle(0);
                            self.$el.find('.concept-graph').toggle(0);
                        }
                    }
                }
            }
        });
    }

    deleteClicked(e) {
        const self = this;
        const data = $(e.target).data();
        this.confirm_delete_modal = this.$el.find('.confirm-delete-modal');
        this.confirm_delete_modal_yes = this.confirm_delete_modal.find('.confirm-delete-yes');
        this.confirm_delete_modal_yes.removeAttr('disabled');
        this.confirm_delete_modal_yes.data('id', data.id);
        this.confirm_delete_modal_yes.data('nodetype', data.nodetype);
        this.confirm_delete_modal_yes.data('action', data.action);
        this.confirm_delete_modal_yes.data('category', data.category);
        this.confirm_delete_modal.find('.modal-title').text($(e.target).attr('title'));
        this.confirm_delete_modal.find('.modal-body [name="warning-text"]').text(data.message);
        this.confirm_delete_modal.find('.modal-body [name="additional-info"]').text('');
        this.confirm_delete_modal.modal('show');
        if (data.action === 'delete-concept') {
            this.confirm_delete_modal_yes.attr('disabled', 'disabled');
            $.ajax({
                url: arches.urls.confirm_delete.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', data.id),
                success: function (response) {
                    self.confirm_delete_modal_yes.removeAttr('disabled');
                    self.confirm_delete_modal.find('.modal-body [name="additional-info"]').html(response);
                }
            });
        }
    }

    conceptSelected(e) {
        const data = $(e.target).data();
        this.trigger('conceptSelected', data.conceptid);
    }

    dropdownConceptSelected(e) {
        const data = $(e.target).data();
        this.trigger('dropdownConceptSelected', data.conceptid);
    }

    addChildConcept(e) {
        this.model.reset();
        const form = new AddChildForm({
            el: $('#add-child-form')[0],
            model: this.model
        });
        form.modal.modal('show');
    }

    addRelatedConceptClicked(e) {
        this.model.reset();
        const modal = new RelatedConcept({
            el: $('#related-concept-form')[0],
            model: this.model
        });
        modal.modal.modal('show');
    }

    addRelatedMemberClicked(e) {
        this.model.reset();
        const modal = new RelatedMember({
            el: $('#related-member-form')[0],
            model: this.model
        });
        modal.modal.modal('show');
    }

    manageParentConcepts(e) {
        const self = this;
        const parentmodel = new ConceptParentModel();
        parentmodel.set('id', this.model.get('id'));
        const modal = new ManageParentForm({
            el: $('#manage-parent-form')[0],
            model: parentmodel
        });
        modal.modal.modal('show');
        parentmodel.on({
            'save': function () {
                self.trigger('parentsChanged');
            }
        });
    }

    makeCollection(e) {
        this.model.makeCollection(function (response, status) {
            if (status === 'success') {
                this.viewModel.alert(new AlertViewModel('ep-alert-blue', response.responseJSON.title, response.responseJSON.message));
            }
            if (status === 'error') {
                this.viewModel.alert(new JsonErrorAlertViewModel('ep-alert-red', response.responseJSON));
            }
        }, this);
    }

    importConcept(e) {
        this.model.reset();
        const modal = new ImportConcept({
            el: $('#import-concept-form')[0],
            model: this.model
        });
        modal.modal.modal('show');
        modal.on({
            'conceptsImported': () => {
                this.trigger('conceptsImported');
            }
        });
    }

    addImageClicked(e) {
        this.model.reset();
        const self = this;
        const form = new AddImageForm({
            el: this.$el.find('#add-image-form')[0],
            model: this.model
        });
        form.on('dataChanged', function () {
            self.render();
        });
    }

    editValueClicked(e) {
        this.model.reset();
        const data = $.extend({ conceptid: this.model.get('id') }, $(e.target).data());
        this.model.set('values', [new ValueModel(data)]);
        const editor = new ValueEditor({
            el: this.$el.find('#value-form')[0],
            model: this.model
        });
    }

    deleteConfirmed(e) {
        const self = this;
        const data = $(e.target).data();
        const modal = self.$el.find('.confirm-delete-modal');
        const title = modal.find('.modal-title').text();
        this.model.reset();
        if (data.action === 'delete-concept') {
            modal.find('h4').text(' ' + title);
            modal.find('.modal-title').addClass('loading');
            const model = new ConceptModel(data);
            self.model.set('subconcepts', [model]);
            self.model.delete(function (response, status) {
                modal.find('h4').text(title);
                modal.find('.modal-title').removeClass('loading');
                modal.modal('hide');
                $('.modal-backdrop.fade.in').remove();
                if (!!response.responseJSON.in_use) {
                    self.viewModel.alert(new AlertViewModel('ep-alert-blue', response.responseJSON.title, response.responseJSON.message));
                }
            }, self);
        } else {
            modal.on('hidden.bs.modal', function () {
                let model;
                if (data.action === 'delete-value') {
                    model = new ValueModel(data);
                    model.delete(self.render, self);
                }
                if (data.action === 'delete-relationship') {
                    model = new ConceptModel(data);
                    self.model.set('relatedconcepts', [model]);
                    self.model.delete();
                }
            });
            modal.modal('hide');
        }
    }
}
