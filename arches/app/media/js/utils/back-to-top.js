const scrollToTopHandler = () => {
    const mybutton = document.getElementById("backToTopBtn");

    const scrollFunction = () => {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            mybutton.style.opacity = "0.5";
        } else {
            mybutton.style.opacity = "0";
        }
    };

    window.onscroll = scrollFunction;
};

const backToTopHandler = () => {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For other browsers
};

export default {
    scrollToTopHandler,
    backToTopHandler,
};
