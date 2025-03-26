import ko from 'knockout';

/**
 * from http://www.knockmeout.net/2014/10/knockout-cleaning-up.html
 * little helper that handles being given a value or prop + value
 *
 * @param  {any} propOrValue
 * @param  {any} [value]
 */
const disposeOne = (propOrValue, value) => {
    const disposable = value || propOrValue;
    if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
    }
};

/**
 * Disposes of Knockout subscriptions or computed observables.
 *
 * @param  {object} obj
 */
const dispose = (obj) => {
    if (obj?.disposables) {
        ko.utils.arrayForEach(obj.disposables, disposeOne);
    } else {
        ko.utils.objectForEach(obj, disposeOne);
    }
};

export default dispose;
