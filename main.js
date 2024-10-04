import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj.js';
import MousePosition from 'ol/control/MousePosition.js';
import { createStringXY } from 'ol/coordinate.js';
import { defaults as defaultControls } from 'ol/control.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Overlay from 'ol/Overlay.js';
import * as olSphere from 'ol/sphere';
import Draw from 'ol/interaction/Draw.js';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector.js';
import Circle from 'ol/style/Circle.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';

const officeCoords = [33.5066, 44.6019];  // Office coordinates in Sevastopol

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:4326',
});

const map = new Map({
  controls: defaultControls().extend([mousePositionControl]),
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat(officeCoords),
    zoom: 16,
  }),
});

document.getElementById('zoom-out').onclick = function () {
  map.getView().setZoom(map.getView().getZoom() - 1);
};

document.getElementById('zoom-in').onclick = function () {
  map.getView().setZoom(map.getView().getZoom() + 1);
};

// Load GeoJSON data from local file
fetch('./polygon.json').then(res => res.json()).then(data => {
  addPolygonsToMap(data);
});

function addPolygonsToMap(geojsonData) {
  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(geojsonData, {
      featureProjection: 'EPSG:3857',
    }),
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: new Style({
      fill: new Fill({
        color: 'rgba(0, 150, 255, 0.5)',
      }),
      stroke: new Stroke({
        color: '#0000ff',
        width: 2,
      }),
    }),
  });

  map.addLayer(vectorLayer);
}

// Popup handling
const popupElement = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupCloser = document.getElementById('popup-closer');

const popupOverlay = new Overlay({
  element: popupElement,
  autoPan: true,
  autoPanAnimation: {
    duration: 250,
  },
});

map.addOverlay(popupOverlay);

popupCloser.onclick = function () {
  popupOverlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

map.on('singleclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  if (feature) {
    const coordinates = evt.coordinate;
    const properties = feature.getProperties();

    popupContent.innerHTML = `
      <p><strong>Name:</strong> ${properties.name || 'Unnamed'}</p>
      <p><strong>Description:</strong> ${properties.description || 'No description'}</p>
    `;
    popupOverlay.setPosition(coordinates);
  }
});

// Ruler (measure) functionality
let draw;
let measureTooltipElement;
let measureTooltip;

function formatLength(line) {
  const length = olSphere.getLength(line);
  return length > 1000 ? (length / 1000).toFixed(2) + ' km' : length.toFixed(2) + ' m';
}

function formatArea(polygon) {
  const area = olSphere.getArea(polygon);
  return area > 10000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
}

function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
  });
  map.addOverlay(measureTooltip);
}

function addInteraction(type) {

  if (draw) {
    map.removeInteraction(draw);
  }

  const source = new VectorSource();
  const vectorLayer = new VectorLayer({
    source: source,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });

  map.addLayer(vectorLayer);

  draw = new Draw({
    source: source,
    type: type,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        width: 2,
      }),
    }),
  });

  map.addInteraction(draw);
  createMeasureTooltip();

  let listener;
  draw.on('drawstart', function (evt) {
    const sketch = evt.feature;

    listener = sketch.getGeometry().on('change', function (evt) {
      const geom = evt.target;
      let output;
      let tooltipCoord;

      if (geom instanceof Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }

      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', function () {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    unByKey(listener);
    createMeasureTooltip();
  });
}

const drawingTypeSelect = document.getElementById('drawing-type');
const startDrawingButton = document.getElementById('start-drawing');

startDrawingButton.onclick = function () {
  const selectedType = drawingTypeSelect.value;
  addInteraction(selectedType);
};

addInteraction('Polygon');



