import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import koMapping from 'knockout-mapping';
import L from 'leaflet';
import uuid from 'uuid';
import geojsonExtent from 'geojson-extent';
import IIIFViewerViewmodel from 'views/components/iiif-viewer';

export default class IIIFEditorViewModel extends IIIFViewerViewmodel {
    constructor(params) {
        super(params);
        const self = this;

        let drawControl;
        const drawFeatures = ko.observableArray();
        const editItems = new L.FeatureGroup();
        let tools;

        this.drawFeatures = drawFeatures;
        this.widgets = params.widgets || [];
        this.newNodeId = null;
        this.featureLookup = {};
        this.selectedFeatureIds = ko.observableArray();
        this.lineColor = ko.observable("#3388ff");
        this.fillColor = ko.observable("#3388ff");
        this.lineWidth = ko.observable(3);
        this.pointRadius = ko.observable(10);
        this.lineOpacity = ko.observable(1);
        this.fillOpacity = ko.observable(0.2);
        this.showStylingTools = ko.observable(false);

        this.hideEditorTab = params.hideEditorTab || ko.observable(false);

        this.cancelDrawing = function() {
            _.each(tools, function(tool) {
                tool.disable();
            });
        };

        this.setDrawTool = function(tool) {
            self.cancelDrawing();
            if (tool && tools) tools[tool].enable();
        };

        self.widgets.forEach(function(widget) {
            const id = ko.unwrap(widget.node_id);
            self.featureLookup[id] = {
                features: ko.computed(function() {
                    const value = koMapping.toJS(self.tile.data[id]);
                    if (value) return value.features;
                    else return [];
                }),
                selectedTool: ko.observable()
            };
            self.featureLookup[id].selectedTool.subscribe(function(tool) {
                if (drawControl) {
                    if (tool) {
                        _.each(self.featureLookup, function(value, key) {
                            if (key !== id) {
                                value.selectedTool(null);
                            }
                        });
                        self.newNodeId = id;
                    }
                    self.setDrawTool(tool);
                    disableEditing();
                }
            });
        });

        this.selectedTool = ko.pureComputed(function() {
            let tool;
            _.find(self.featureLookup, function(value) {
                const selectedTool = value.selectedTool();
                if (selectedTool) tool = selectedTool;
            });
            return tool;
        });

        this.editing = ko.pureComputed(function() {
            return !!(self.selectedFeatureIds().length > 0 || self.selectedTool());
        });

        this.updateTiles = function() {
            _.each(self.featureLookup, function(value) {
                value.selectedTool(null);
            });
            self.widgets.forEach(function(widget) {
                const id = ko.unwrap(widget.node_id);
                const features = [];
                drawFeatures().forEach(function(feature) {
                    if (feature.properties.nodeId === id) {
                        features.push(feature);
                    }
                });
                if (ko.isObservable(self.tile.data[id])) {
                    self.tile.data[id]({
                        type: 'FeatureCollection',
                        features: features
                    });
                } else {
                    self.tile.data[id].features(features);
                }
            });
        };

        const updateDrawFeatures = function() {
            drawFeatures([]);
            self.widgets.forEach(function(widget) {
                const id = ko.unwrap(widget.node_id);
                const featureCollection = koMapping.toJS(self.tile.data[id]);
                if (featureCollection && featureCollection.features) {
                    featureCollection.features.forEach(function(feature) {
                        if (feature.properties.manifest && !params.manifest)
                            params.manifest = feature.properties.manifest;
                        if (feature.properties.canvas && !params.canvas)
                            params.canvas = feature.properties.canvas;
                        feature.properties.nodeId = id;
                    });
                    drawFeatures(drawFeatures().concat(featureCollection.features));
                }
            });
        };
        updateDrawFeatures();

        IIIFViewerViewmodel.apply(this, [params]);

        const setTab = this.canvas.subscribe(function(val) {
            if (val) {
                self.expandGallery(false);
                self.activeTab(ko.unwrap(self.activeTab) || 'editor');
                setTab.dispose();
            }
        });

        this.expandGallery.subscribe(function(val) {
            if (val) {
                self.hideSidePanel();
            }
        });

        this.getAnnotationCount = function(canvas) {
            return drawFeatures().filter(function(feature) {
                return feature.properties.canvas === canvas;
            }).length;
        };

        let disableEditing = function() {
            if (editingFeature && editingFeature.editing) editingFeature.editing.disable();
            editingFeature = undefined;
            self.selectedFeatureIds([]);
        };
        let enableEditing = function(feature) {
            disableEditing();
            editingFeature = feature;
            editingFeature.options.editing || (editingFeature.options.editing = {});
            editingFeature.editing.enable();
            self.styleProperties(feature.feature.properties);
            self.selectedFeatureIds([feature.feature.id]);
        };

        this.styleProperties = ko.computed({
            read: function() {
                return {
                    color: self.lineColor(),
                    fillColor: self.fillColor(),
                    weight: self.lineWidth(),
                    radius: self.pointRadius(),
                    opacity: self.lineOpacity(),
                    fillOpacity: self.fillOpacity()
                };
            },
            write: function(style) {
                self.lineColor(style.color);
                self.fillColor(style.fillColor);
                self.lineWidth(style.weight);
                self.pointRadius(style.radius);
                self.lineOpacity(style.opacity);
                self.fillOpacity(style.fillOpacity);
            }
        });

        let featureClick;
        this.featureClick = featureClick;
        const drawLayer = ko.computed(function() {
            const selectedFeatureIds = self.selectedFeatureIds();
            const styleProperties = self.styleProperties();
            return L.geoJson({
                type: 'FeatureCollection',
                features: drawFeatures()
            }, {
                pointToLayer: function(feature, latlng) {
                    let style;
                    if (selectedFeatureIds.includes(feature.id)) style = styleProperties;
                    else style = {
                        color: feature.properties.color,
                        fillColor: feature.properties.fillColor,
                        weight: feature.properties.weight,
                        radius: feature.properties.radius,
                        opacity: feature.properties.opacity,
                        fillOpacity: feature.properties.fillOpacity
                    };
                    return L.circleMarker(latlng, style);
                },
                style: function(feature) {
                    let style;
                    if (selectedFeatureIds.includes(feature.id)) style = styleProperties;
                    else style = {
                        color: feature.properties.color,
                        fillColor: feature.properties.fillColor,
                        weight: feature.properties.weight,
                        radius: feature.properties.radius,
                        opacity: feature.properties.opacity,
                        fillOpacity: feature.properties.fillOpacity
                    };
                    return style;
                },
                filter: function(feature) {
                    return feature.properties.canvas === self.canvas();
                },
                onEachFeature: function(feature, layer) {
                    layer.on('click', function(e) {
                        enableEditing(e.target);
                        featureClick = true;
                    });
                }
            });
        });
        this.drawLayer = drawLayer;

        drawLayer.subscribe(function(newDrawLayer) {
            const map = self.map();
            const selectedFeatureIds = self.selectedFeatureIds();
            if (map) {
                editItems.clearLayers();
                editItems.addLayer(newDrawLayer);
                newDrawLayer.getLayers().forEach(function(layer) {
                    if (selectedFeatureIds.includes(layer.feature.id)) {
                        layer.options.editing || (layer.options.editing = {});
                        layer.editing.enable();
                    }
                });
            }
        });

        if (this.card) {
            this.card.triggerUpdate = updateDrawFeatures;
        }

        this.disableDrawing = ko.computed(function() {
            return !self.canvas();
        });

        this.showFeature = function(feature) {
            self.canvas(feature.properties.canvas);
            if (self.manifest() !== feature.properties.manifest) {
                self.manifest(feature.properties.manifest);
                self.getManifestData();
            }
            setTimeout(function() {
                if (feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    self.map().panTo([coords[1], coords[0]]);
                } else {
                    const extent = geojsonExtent(feature);
                    self.map().fitBounds([
                        [extent[1], extent[0]],
                        [extent[3], extent[2]]
                    ]);
                }
            }, 200);
        };

        let editingFeature;
        this.editFeature = function(feature) {
            const layers = editItems.getLayers()[0].getLayers();
            if (self.manifest() !== feature.properties.manifest) {
                self.manifest(feature.properties.manifest);
                self.getManifestData();
            }
            self.canvas(feature.properties.canvas);
            layers.forEach(function(layer) {
                if (layer.feature.id === feature.id) enableEditing(layer);
            });
        };

        this.deleteFeature = function(feature) {
            drawFeatures().forEach(function(drawFeature) {
                if (drawFeature.id === feature.id) drawFeatures.remove(drawFeature);
            });
            self.updateTiles();
        };

        this.canvas.subscribe(disableEditing);

        this.map.subscribe(function(map) {
            if (map && !drawControl) {
                map.addLayer(editItems);
                editItems.addLayer(drawLayer());

                drawControl = new L.Control.Draw({
                    edit: {
                        featureGroup: editItems
                    }
                });
                map.addControl(drawControl);

                tools = {
                    'draw_point': new L.Draw.CircleMarker(map, drawControl.options.circlemarker),
                    'draw_line_string': new L.Draw.Polyline(map, drawControl.options.polyline),
                    'draw_polygon': new L.Draw.Polygon(map, drawControl.options.polygon)
                };
                self.styleProperties.subscribe(function(styleProperties) {
                    _.each(tools, function(tool) {
                        if (tool.type === "circlemarker") tool.setOptions(styleProperties);
                        else tool.setOptions({ shapeOptions: styleProperties });
                    });
                    self.selectedFeatureIds().forEach(function(id) {
                        drawFeatures().forEach(function(drawFeature) {
                            if (drawFeature.id === id) {
                                drawFeature.properties = Object.assign(
                                    drawFeature.properties,
                                    styleProperties
                                );
                            }
                        });
                        self.updateTiles();
                    });
                });

                map.on('draw:created', function(e) {
                    let feature = e.layer.toGeoJSON();
                    feature.id = uuid.generate();
                    feature.properties = Object.assign({
                        nodeId: self.newNodeId,
                        canvas: self.canvas(),
                        manifest: self.manifest()
                    }, self.styleProperties());
                    drawFeatures.push(feature);
                    self.updateTiles();
                    self.editFeature(feature);
                });

                map.on('draw:editvertex draw:editmove', function() {
                    const layers = editItems.getLayers()[0].getLayers();
                    drawFeatures().forEach(function(drawFeature) {
                        layers.forEach(function(layer) {
                            if (drawFeature.id === layer.feature.id)
                                drawFeature.geometry = layer.toGeoJSON().geometry;
                        });
                    });
                    self.updateTiles();
                });

                map.on('click', function() {
                    if (!featureClick) disableEditing();
                    featureClick = false;
                });

                if (self.form) self.form.on('tile-reset', function() {
                    disableEditing();
                    updateDrawFeatures();
                    _.each(self.featureLookup, function(value) {
                        if (value.selectedTool()) value.selectedTool('');
                    });
                });
            }
        });

        this.disableDrawing.subscribe(updateDrawFeatures);

        this.showFeature = this.showFeature.bind(this);

        this.map.subscribe(function(map) {
            // nothing additional here
        });

        this.setSecondaryCanvas = (canvas) => {
            const service = self.getCanvasService(canvas);
            if (service) {
                self.secondaryCanvas(service);
            }
        };

        this.selectCanvas = function(canvas) {
            const service = self.getCanvasService(canvas);
            if (service && self.selectPrimaryPanel()) {
                self.canvas(service);
                self.canvasObject(canvas);
                self.canvasLabel(self.getManifestDataValue(canvas, 'label', true));
            } else {
                self.secondaryCanvas(service);
                self.secondaryCanvasObject(canvas);
                self.canvasLabel(self.getManifestDataValue(canvas, 'label', true));
            }
            self.origCanvasLabel(self.canvasLabel());
        };

        this.canvasClick = function(canvas) {
            self.selectCanvas(canvas);
            self.expandGallery(false);
        };

        this.getCanvasService = function(canvas) {
            if (canvas.images.length > 0) return canvas.images[0].resource.service['@id'];
        };

        this.updateCanvas = !self.canvas();
        this.manifestData.subscribe(function(manifestData) {
            if (manifestData) {
                if (manifestData.sequences.length > 0) {
                    const sequence = manifestData.sequences[0];
                    let canvasIndex = 0;
                    if (sequence.canvases.length > 0) {
                        if (!self.updateCanvas) {
                            canvasIndex = sequence.canvases.findIndex(function(c) {
                                return c.images[0].resource.service['@id'] === self.canvas();
                            });
                        }
                        const canvas = sequence.canvases[canvasIndex];

                        self.secondaryCanvasLayer = undefined;
                        self.canvasLayer = undefined;
                        const service = self.getCanvasService(canvas);
                        self.zoomToCanvas = true;
                        self.canvas(service);
                        self.canvasObject(canvas);

                        if (self.compareMode()) {
                            self.secondaryCanvas(service);
                            self.secondaryCanvasObject(canvas);
                        }
                    }
                }
                self.updateCanvas = true;
                self.origManifestName = self.getManifestDataValue(manifestData, 'label', true);
                self.manifestName(self.origManifestName);
                self.origManifestDescription = self.getManifestDataValue(manifestData, 'description', true);
                self.manifestDescription(self.origManifestDescription);
                self.origManifestAttribution = self.getManifestDataValue(manifestData, 'attribution', true);
                self.manifestAttribution(self.origManifestAttribution);
                self.origManifestLogo = self.getManifestDataValue(manifestData, 'logo', true);
                self.manifestLogo(self.origManifestLogo);
                self.origManifestMetadata = koMapping.toJSON(self.getManifestDataValue(manifestData, 'metadata'));
                self.manifestMetadata.removeAll();
                self.getManifestDataValue(manifestData, 'metadata').forEach(function(entry) {
                    self.manifestMetadata.push(koMapping.fromJS(entry));
                });
            }
        });

        this.toggleManifestEditor = function() {
            self.editManifest(!self.editManifest());
            if (abortFetchManifest) abortFetchManifest.abort();
        };

        this.getAnnotationCount = function() {
            return 0;
        };

        // Primary and secondary canvas layer updating
        const updatePrimaryCanvasLayer = function() {
            const map = self.map();
            const canvas = self.canvas();
            if (self.selectPrimaryPanel() && canvas && canvas != self.imageToolSelector()) {
                self.imageToolSelector(canvas);
            }
            if (map && canvas) {
                if (canvasLayer && map.hasLayer(canvasLayer)) {
                    try {
                        map.removeLayer(canvasLayer);
                    } catch (e) {}
                    canvasLayer = undefined;
                }
                if (canvas) {
                    const layerInfoUrl = canvas + '/info.json';
                    canvasLayer = getLayer(layerInfoUrl, layers);
                    if (!canvasLayer) {
                        canvasLayer = L.tileLayer.iiif(layerInfoUrl, {
                            fitBounds: false,
                            className: "iiif-layer-primary"
                        });
                        canvasLayer.on('load', () => {
                            if (self.compareMode()) {
                                loadComparison();
                            } else if (!self.compareMode() && self.zoomToCanvas && canvasLayer) {
                                zoomToBounds(map, canvasLayer);
                                self.zoomToCanvas = false;
                            }
                        });
                        layers.push(canvasLayer);
                    }
                    canvasLayer.addTo(map);
                    updateCanvasLayerFilter();
                }
            }
        };

        const getLayer = (url, layers) => {
            const match = layers.filter(layer => layer._infoUrl == url);
            if (match.length > 0) {
                return match[0];
            }
        };

        const updateSecondaryCanvasLayer = () => {
            const map = self.map();
            const primaryCanvas = self.canvas();
            const secondaryCanvas = self.secondaryCanvas();
            if (secondaryCanvas && secondaryCanvas != self.imageToolSelector()) {
                self.selectPrimaryPanel(false);
                self.imageToolSelector(secondaryCanvas);
            }
            if (map && primaryCanvas && secondaryCanvas) {
                if (secondaryCanvasLayer && map.hasLayer(secondaryCanvasLayer)) {
                    try {
                        map.removeLayer(secondaryCanvasLayer);
                    } catch (e) {}
                    secondaryCanvasLayer = undefined;
                }
                const layerInfoUrl = secondaryCanvas + '/info.json';
                secondaryCanvasLayer = getLayer(layerInfoUrl, secondaryLayers);
                if (!secondaryCanvasLayer) {
                    secondaryCanvasLayer = L.tileLayer.iiif(layerInfoUrl, {
                        fitBounds: false,
                        className: "iiif-layer-secondary"
                    });
                    secondaryCanvasLayer.on('load', () => {
                        if (self.compareMode()) {
                            loadComparison();
                        }
                    });
                    secondaryLayers.push(secondaryCanvasLayer);
                }
                secondaryCanvasLayer.addTo(map);
                updateCanvasLayerFilter();
            }
        };

        this.map.subscribe(function(map) {
            L.control.fullscreen({
                fullscreenElement: $(map.getContainer()).closest('.workbench-card-wrapper')[0]
            }).addTo(map);
            updatePrimaryCanvasLayer();
            map.addLayer(annotationFeatureGroup);
        });
        this.canvas.subscribe(updatePrimaryCanvasLayer);
        this.secondaryCanvas.subscribe(updateSecondaryCanvasLayer);

        this.setSecondaryCanvas = (canvas) => {
            const service = self.getCanvasService(canvas);
            if (service) {
                self.secondaryCanvas(service);
            }
        };

        this.selectCanvas = function(canvas) {
            const service = self.getCanvasService(canvas);
            if (service && self.selectPrimaryPanel()) {
                self.canvas(service);
                self.canvasObject(canvas);
                self.canvasLabel(self.getManifestDataValue(canvas, 'label', true));
            } else {
                self.secondaryCanvas(service);
                self.secondaryCanvasObject(canvas);
                self.canvasLabel(self.getManifestDataValue(canvas, 'label', true));
            }
            self.origCanvasLabel(self.canvasLabel());
        };

        this.canvasClick = function(canvas) {
            self.selectCanvas(canvas);
            self.expandGallery(false);
        };

        this.getCanvasService = function(canvas) {
            if (canvas.images.length > 0) return canvas.images[0].resource.service['@id'];
        };

        this.updateCanvas = !self.canvas();
        this.manifestData.subscribe(function(manifestData) {
            if (manifestData) {
                if (manifestData.sequences.length > 0) {
                    const sequence = manifestData.sequences[0];
                    let canvasIndex = 0;
                    if (sequence.canvases.length > 0) {
                        if (!self.updateCanvas) {
                            canvasIndex = sequence.canvases.findIndex(c => c.images[0].resource.service['@id'] === self.canvas());
                        }
                        const canvas = sequence.canvases[canvasIndex];

                        self.secondaryCanvasLayer = undefined;
                        self.canvasLayer = undefined;
                        const service = self.getCanvasService(canvas);
                        self.zoomToCanvas = true;
                        self.canvas(service);
                        self.canvasObject(canvas);

                        if (self.compareMode()) {
                            self.secondaryCanvas(service);
                            self.secondaryCanvasObject(canvas);
                        }
                    }
                }
                self.updateCanvas = true;
                self.origManifestName = self.getManifestDataValue(manifestData, 'label', true);
                self.manifestName(self.origManifestName);
                self.origManifestDescription = self.getManifestDataValue(manifestData, 'description', true);
                self.manifestDescription(self.origManifestDescription);
                self.origManifestAttribution = self.getManifestDataValue(manifestData, 'attribution', true);
                self.manifestAttribution(self.origManifestAttribution);
                self.origManifestLogo = self.getManifestDataValue(manifestData, 'logo', true);
                self.manifestLogo(self.origManifestLogo);
                self.origManifestMetadata = koMapping.toJSON(self.getManifestDataValue(manifestData, 'metadata'));
                self.manifestMetadata.removeAll();
                self.getManifestDataValue(manifestData, 'metadata').forEach(function(entry) {
                    self.manifestMetadata.push(koMapping.fromJS(entry));
                });
            }
        });

        this.toggleManifestEditor = function() {
            self.editManifest(!self.editManifest());
            if (abortFetchManifest) abortFetchManifest.abort();
        };

        this.getAnnotationCount = function() {
            return 0;
        };
    }
}
