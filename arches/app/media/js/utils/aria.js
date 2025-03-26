const toggleAriaExpanded = (id) => {
    const ele = document.getElementById(id);
    const expanded = ele.getAttribute("aria-expanded");
    ele.setAttribute("aria-expanded", expanded === "true" ? "false" : "true");
};

const handleEscKey = (openElement, escListenerScope, closeElement) => {
    const attachListener = (evt) => {
        const isEscape = evt.key === "Escape" || evt.key === "Esc" || evt.keyCode === 27;

        if (isEscape) {
            if (closeElement) {
                closeElement.click();
            } else {
                openElement.click();
            }
            openElement.focus();
        }
    };

    escListenerScope.removeEventListener('keydown', attachListener);
    escListenerScope.addEventListener('keydown', attachListener);

    const focusable = escListenerScope.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) {
        focusable[0].focus();
    }
};

const shiftFocus = (focusTarget) => {
    focusTarget.focus();
};

export default {
    toggleAriaExpanded,
    handleEscKey,
    shiftFocus,
};
