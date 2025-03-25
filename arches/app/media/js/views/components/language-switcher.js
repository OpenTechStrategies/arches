import ko from 'knockout';
import languageSwitcherTemplate from 'templates/views/components/language-switcher.htm';
import Cookies from 'js-cookie';
import 'bindings/select2-query';

class LanguageSwitcherViewModel {
    constructor(params) {
        this.formid = Math.random();
        this.value = ko.observable(params.current_language);
        this.csrfToken = Cookies.get('csrftoken');
        this.value.subscribe(val => {
            if (val) {
                document.getElementById(this.formid).submit();
            }
        });
    }
}

ko.components.register('views/components/language-switcher', {
    viewModel: LanguageSwitcherViewModel,
    template: languageSwitcherTemplate,
});

export default LanguageSwitcherViewModel;
