import $ from 'jquery';
import ko from 'knockout';
import 'ckeditor4';
import 'ckeditor-jquery';

const initialize = function (element, valueAccessor, allBindings) {
    var modelValue = valueAccessor();
    var value = ko.utils.unwrapObservable(valueAccessor());
    const language = allBindings.get('language') || ko.observable(arches.activeLanguage);
    const direction = allBindings.get('direction') || ko.observable(arches.activeLanguageDir);
    var $element = $(element);
    var options = { bodyId: 'ckeditor' };
    const languageList = [];

    for (const lang of Object.keys(arches.languages)) {
        languageList.push(`${lang}:${arches.languages[lang]}`);
    }

    CKEDITOR.config.language_list = languageList;
    CKEDITOR.config.language = language();
    CKEDITOR.config.contentsLangDirection = direction();
    CKEDITOR.config.autoParagraph = false;
    CKEDITOR.config.toolbar = [
        { name: 'clipboard', groups: ['clipboard', 'undo'], items: ['Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo'] },
        { name: 'editing', groups: ['spellchecker'], items: ['Scayt'] },
        { name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
        { name: 'insert', items: ['Image', 'Table', 'HorizontalRule', 'SpecialChar', 'PageBreak'] },
        { name: 'tools', items: ['Maximize'] },
        '/',
        { name: 'basicstyles', groups: ['basicstyles', 'cleanup'], items: ['Bold', 'Italic', 'Underline', 'Strike', '-', 'RemoveFormat'] },
        { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi'], items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote'] },
        { name: 'styles', items: ['Styles', 'Format'] },
        { name: 'document', groups: ['mode', 'document', 'doctools'], items: ['Source'] },
        { name: 'about', items: ['About'] }
    ];

    direction.subscribe(newValue => {
        CKEDITOR.config.contentsLangDirection = newValue;
        CKEDITOR.replace('ckeditor', CKEDITOR.config);
    });

    language.subscribe(newValue => {
        CKEDITOR.config.language = newValue;
    });

    if (allBindings.has('ckeditorOptions')) {
        var opts = allBindings.get('ckeditorOptions');
        options = (typeof opts === 'object') ? opts : {};
    }

    // Set initial value and create the CKEditor
    $element.html(value);
    var editor = $element.ckeditor(options).editor;

    const placeholder = allBindings.get('placeholder');
    if (placeholder) {
        editor.config.editorplaceholder = ko.unwrap(placeholder);

        if (allBindings.get('isConfigForm')) {
            $element[0].defaultValue = ko.unwrap(placeholder);
        }
    }

    allBindings()?.attr?.disabled?.subscribe(disabled => {
        if (editor?.editable() && (disabled === true || disabled === false)) {
            editor?.setReadOnly(disabled);
        }
    });

    // bind to change events and link it to the observable
    var onChange = function (e) {
        var self = this;

        if (ko.isWriteableObservable(self)) {
            var newValue = $(e.listenerData).val();
            if (!((self() === null || self() === "") && (newValue === null || newValue === ""))) {
                self(newValue);
            }
        }
        return true;
    };
    editor.on('change', onChange, modelValue, element);
    editor.on('afterCommandExec', (event => {
        if (event.data.name == 'language') {
            language(event.data.commandData);
        }
    }), modelValue, element);

    modelValue.subscribe(function (value) {
        var self = this;
        var newValue = ko.utils.unwrapObservable(valueAccessor());
        if (editor.getData() != newValue) {
            // remove the listener and then add back to prevent `setData`
            // from triggering the onChange event
            editor.removeListener('change', onChange);
            editor.setData(newValue);
            editor.on('change', onChange, modelValue, element);
        }
    }, this);

    // Handle disposal if KO removes an editor through template binding
    ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        editor.updateElement();
        editor.destroy();
    });
};

ko.bindingHandlers.ckeditor = {
    init: (element, valueAccessor, allBindings) => {
        window.jQuery = $;
        initialize(element, valueAccessor, allBindings);
    }
};

export default ko.bindingHandlers.ckeditor;
