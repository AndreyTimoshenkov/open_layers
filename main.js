import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj.js';
import MousePosition from 'ol/control/MousePosition.js';
import {createStringXY} from 'ol/coordinate.js';
import {defaults as defaultControls} from 'ol/control.js';
import * as olSource from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Overlay from 'ol/Overlay.js';

const officeCoords = [33.5066, 44.6019];

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:4326',
});

const map = new Map({
  controls: defaultControls().extend([mousePositionControl]),
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: fromLonLat(officeCoords),
    zoom: 16,
  })
});

document.getElementById('zoom-out').onclick = function () {
  map.getView().setZoom(map.getView().getZoom() - 1);
};

document.getElementById('zoom-in').onclick = function () {
  map.getView().setZoom(map.getView().getZoom() + 1);
};

fetch('./polygon.json').then(res => res.json()).then(data => {
  addPolygonsToMap(data);
});

function addPolygonsToMap(geojsonData) {
  const vectorSource = new olSource.Vector({
      features: new GeoJSON().readFeatures(geojsonData, {
          featureProjection: 'EPSG:3857'
      })
  });

  const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
          fill: new Fill({
              color: 'rgba(0, 150, 255, 0.5)'
          }),
          stroke: new Stroke({
              color: '#0000ff',
              width: 2
          })
      })
  });

  map.addLayer(vectorLayer);
}

const popupElement = document.getElementById('popup');
    const popupContent = document.getElementById('popup-content');
    const popupCloser = document.getElementById('popup-closer');

    const popupOverlay = new Overlay({
        element: popupElement,
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });

    map.addOverlay(popupOverlay);

    popupCloser.onclick = function() {
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