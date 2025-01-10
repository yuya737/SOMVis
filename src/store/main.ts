import { defineStore } from "pinia";
import API from "@/api/api";
import {
  dataset_name,
  sspAllLabels,
  subsetType,
  timeType,
  timeTypeMonths,
} from "@/components/utils/utils";
import { reactive } from "vue";
import { getVectorFieldData, getPaths, getNodeData } from "./storeHelper";

// const timeTypes = [timeType.AprSep, timeType.OctMar];
// const timeTypes = [timeType.OctMay];
// const timeTypes = [timeType.OctMar];
const timeTypes = [timeType.All];

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    const state = reactive({
      files: [[], []], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [10], // -1 means all months
      subsetType: subsetType.month,
      // subsetType: "month",
      yearsSelected: [-1], // -1 means all years
      hoveredFile: null,
      clusterOrders: {},

      mapEditFlag: false, // Will flip when new MDE is calculated
      anchors: { ids: [], coords: [] },

      nodeMap: null as PartialRecord<timeType, SOMNode[]>,
      classifyData: null as PartialRecord<timeType, any>,
      pathData: null as PartialRecord<timeType, Record<string, BMUData[]>>,
      hotspotPolygons: null as PartialRecord<timeType, any>,
      contourData: null as PartialRecord<timeType, any>,
      interpolatedSurfaceData: null as PartialRecord<timeType, any>,
      vectorFieldData: null as PartialRecord<timeType, any>,
      vectorFieldSetting: [
        null as string,
        null as string,
        null as timeType,
        [] as string[],
        [] as number[],
      ],
      // [dataset_Type, model_type, time_type, data_type_cmp, month]

      redrawFlag: false,
      explainablityPoints: null as [Coords, Coords], // start and end point

      mapMode: "Explore" as MapMode,
      mapAnnotation: {
        type: "FeatureCollection",
        features: [],
      },
      showMapAnnotationPopup: false,
      mapAnnotationPopup: {
        index: -1,
        coords: [0, 0],
      },
    });
    getNodeData().then((data) => {
      const {
        nodeMap,
        classifyData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
        vectorFieldData,
      } = data;
      state.nodeMap = nodeMap;
      state.classifyData = classifyData;
      state.hotspotPolygons = hotspotPolygons;
      state.contourData = contourData;
      state.interpolatedSurfaceData = interpolatedSurfaceData;
      state.vectorFieldData = vectorFieldData;
      state.explainablityPoints = [
        [5, 5],
        [-5, -5],
      ];
    });
    getPaths().then((pathData) => {
      state.pathData = pathData;
    });
    return state;
  },
  getters: {
    isDataReady() {
      return this.contourData != null && this.pathData != null;
    },
    getFiles(): [EnsembleMember[], EnsembleMember[]] {
      return this.files;
    },
    getMonthsSelected() {
      return this.monthsSelected;
    },
    getYearsSelected() {
      return this.yearsSelected;
    },
    getSubsetType() {
      return this.subsetType;
    },
    getHoveredFile() {
      return this.hoveredFile;
    },
    getNodeMap: (state) => {
      return (timeType: timeType) => state.nodeMap[timeType];
    },
    getPathData: (state) => {
      return (timeType: timeType) => state.pathData[timeType];
    },
    getHotspotPolygons: (state) => {
      return (timeType: timeType) => state.hotspotPolygons[timeType];
    },
    getClassifyData: (state) => {
      return (timeType: timeType) => state.classifyData[timeType];
    },
    getContourData: (state) => {
      return (timeType: timeType) => state.contourData[timeType];
    },
    getInterpolatedSurfaceData: (state) => {
      return (timeType: timeType) => state.interpolatedSurfaceData[timeType];
    },
    getVectorFieldData: (state) => {
      return (timeType: timeType) => state.vectorFieldData[timeType];
    },
    getMapEditFlag() {
      return this.mapEditFlag;
    },
    getRedrawFlag() {
      return this.redrawFlag;
    },
    getExlainablityPoints() {
      return this.explainablityPoints;
    },
    getMapMode() {
      return this.mapMode;
    },
  },
  actions: {
    setFiles({ group1, group2 }: { group1: any[]; group2?: any[] }) {
      this.files = [group1, group2 || []];
    },
    updateElements({ files, monthsSelected, yearsSelected, subsetType }) {
      this.files = files;
      this.monthsSelected = monthsSelected;
      this.yearsSelected = yearsSelected;
      this.subsetType = subsetType;
    },
    setHoveredFile(file) {
      this.hoveredFile = file;
    },
    updateMapping(time_type, id, coords) {
      this.nodeMap[time_type][id].coords = coords;
    },
    async updateMDE(anchors) {
      const data = await getNodeData(anchors);
      const {
        nodeMap,
        classifyData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
      } = data;
      this.nodeMap = nodeMap;
      this.classifyData = classifyData;
      this.hotspotPolygons = hotspotPolygons;
      this.contourData = contourData;
      this.interpolatedSurfaceData = interpolatedSurfaceData;
      this.mapEditFlag = !this.mapEditFlag;
    },
    async updateVectorFieldSetting(setting) {
      const vectorFieldData = await getVectorFieldData(setting);
      this.vectorFieldData = vectorFieldData;
    },
  },
});
