import { AbstractLayerGenerator } from "./AbstractLayerGenerator";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { centroid } from "@turf/centroid";
import distance from "@turf/distance";
import bearing from "@turf/bearing";
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { DrawPolygonMode, ViewMode } from "@nebula.gl/edit-modes";
import { TextLayer } from "@deck.gl/layers";
import { useStore } from "@/store/main";
import { watch } from "vue";
import { isEqual } from "lodash";
import { timeType } from "./utils";

export class SpaceAnnotationLayer extends AbstractLayerGenerator {
  readonly store;

  currentStep: Ref<step>;

  featureCollection: any;

  constructor({ currentStep }) {
    super();
    this.store = useStore();
    this.currentStep = currentStep;

    watch(
      () => [
        this.store.mapAnnotation.features,
        this.store.mapMode,
        this.currentStep.value,
      ],
      () => {
        console.log("DEBUG: WATCHING MAP ANNOTATION FEATURES");
        this.needsToRedraw = true;
      },
      {
        deep: true,
      }
    );
  }

  getLayers() {
    if (this.layerList && !this.needsToRedraw) {
      return this.layerList;
    }
    // console.log("DEBUG: GETTING LAYERS FOR SPACE ANNOTATION");
    // let myFeatureCollection = {
    //   type: "FeatureCollection",
    //   features: [],
    // };
    const font = new FontFace(
      "Test",
      "url(https://fonts.gstatic.com/s/quantico/v17/rax4HiSdp9cPL3KIF7xuFD96nmDa-T4.woff2"
    );
    font.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
    });
    let textLayer = new TextLayer({
      id: "SpaceAnnotationTextLayer",
      data: this.store.mapAnnotation.features.filter(
        (d) => d.properties.name != undefined
      ),
      fontFamily: "Test",
      getPosition: (d) => {
        const lngLat = centroid(d).geometry.coordinates;
        const dist = distance([0, 0], lngLat, {
          units: "meters",
        });
        const a = bearing([0, 0], lngLat);
        const x = dist * Math.sin((a * Math.PI) / 180);
        const y = dist * Math.cos((a * Math.PI) / 180);
        return [x, y, 3];
      },
      // getPosition: [0, 0],
      getSize: 24,
      getText: (d) => d.properties.name,
      visible:
        this.currentStep.value == "Analyze" ||
        this.currentStep.value == "Annotate",
    });
    let layer = new EditableGeoJsonLayer({
      id: "nebula",
      data: [this.store.mapAnnotation.features].map((d) => {
        return {
          type: "FeatureCollection",
          features: d,
        };
      })[0],
      // data: this.store.mapAnnotation,
      selectedFeatureIndexes: [],
      mode: this.store.getMapMode == "Annotate" ? DrawPolygonMode : ViewMode,
      // Styles
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 2000,
      extruded: true,
      getElevation: 1000,
      getFillColor: [200, 0, 80, 0],

      // Interactive props
      pickable: true,
      autoHighlight: true,
      onClick: (info, event) => {
        if (event.rightButton) {
          const index = this.store.mapAnnotation.features.findIndex(
            (value) => value == info.object
          );
          console.log("DEBUG: EDITING ", index);
          this.store.mapAnnotationPopup.index = index;
          this.store.showMapAnnotationPopup = true;
          console.log("DEBUG: SHOWING MAP ANNOTATION POPUP", event);
          this.store.mapAnnotationPopup.coords = [
            event.center.x,
            event.center.y,
          ];
          this.store.mapMode = "Explore";
        }
      },
      onEdit: ({ updatedData, editType, featureIndexes, editContext }) => {
        this.store.mapAnnotation = updatedData;

        // Ready to commit so force the redraw
        if (editType == "addFeature") {
          this.store.redrawFlag = !this.store.redrawFlag;
        }
      },
      visible:
        this.currentStep.value == "Analyze" ||
        this.currentStep.value == "Annotate",
    });
    this.layerList = [layer, textLayer];
    this.needsToRedraw = false;
    return this.layerList;
  }
}
