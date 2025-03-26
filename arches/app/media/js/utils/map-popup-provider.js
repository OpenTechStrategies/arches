import ko from 'knockout';
import popupTemplate from 'templates/views/components/map-popup.htm';

const findPopupFeatureById = (popupFeatureObject) => {
    const strippedFeatureId = popupFeatureObject.feature.properties.featureid.replace(/-/g, '');
    for (const geometry of popupFeatureObject.geometries()) {
        if (geometry.geom && Array.isArray(geometry.geom.features)) {
            const found = geometry.geom.features.find(
                feature => feature.id.replace(/-/g, '') === strippedFeatureId
            );
            if (found) return found;
        }
    }
    return null;
};

const provider = {
    isFeatureClickable: (feature, map) => {
        const selectedFeatureIds = ko.unwrap(map.selectedFeatureIds);
        const selectedTool = ko.unwrap(map.selectedTool);
        if ((selectedTool !== undefined && selectedTool !== null) || (selectedFeatureIds && selectedFeatureIds.length)) {
            return false;
        }
        return feature.properties.resourceinstanceid;
    },

    getPopupTemplate: () => {
        return popupTemplate;
    },

    processData: (features) => {
        return features;
    },

    sendFeatureToMapFilter: function (popupFeatureObject) {
        const foundFeature = findPopupFeatureById(popupFeatureObject);
        popupFeatureObject.mapCard.filterByFeatureGeom(foundFeature);
    },

    showFilterByFeature: function (popupFeatureObject) {
        const hasFeatureId = popupFeatureObject.feature?.properties?.featureid !== undefined;
        return hasFeatureId && findPopupFeatureById(popupFeatureObject) !== null;
    },

    findPopupFeatureById,
};

export default provider;
