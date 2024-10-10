import { defineStore } from "pinia";
import { subsetType, timeType, timeTypeMonths } from "@/components/utils/utils";
import API from "@/api/api";
import { dataset_name, months, sspAllLabels } from "@/components/utils/utils";
import { get } from "@vueuse/core";
import { reactive } from "vue";

const timeTypes = [timeType.AprSep, timeType.OctMar];
// const timeTypes = [timeType.OctMar];
// const timeTypes = [timeType.All];

async function getAllData() {
  console.log("DEBUG IN STORE MAIN");
  let mappingData: Record<timeType, SOMNode[]> = {};
  let classifyData: Record<timeType, { value: number }> = {};
  let pathData: Record<timeType, Record<string, BMUData[]>> = {};
  let contourData: Record<timeType, any> = {};
  let interpolatedSurfaceData: Record<timeType, any> = {};
  let hotspotPolygonsData: Record<timeType, any> = {};

  const gigaPromise = timeTypes.map(async (curTimeType) => {
    let map = await API.fetchData("mapping", true, {
      dataset_type: dataset_name,
      time_type: curTimeType,
    });
    map = map.map((d) => {
      return {
        ...d,
        coords: [d.coords[0], -d.coords[1]],
      };
    });
    mappingData[curTimeType] = map;

    let xMin = Math.min(...map.map((d) => d.coords[0]));
    let xMax = Math.max(...map.map((d) => d.coords[0]));
    let yMin = Math.min(...map.map((d) => d.coords[1]));
    let yMax = Math.max(...map.map((d) => d.coords[1]));

    let classify = await API.fetchData("node_means", true, {
      dataset_type: dataset_name,
      time_type: curTimeType,
    });

    classifyData[curTimeType] = classify;

    let paths = {} as Record<string, BMUData[]>;

    const pathPromises = sspAllLabels.map(async (d, i) => {
      let data: SOMPath = await API.fetchData("path", true, {
        dataset_type: dataset_name,
        time_type: curTimeType,
        model_type: d.model_name,
        data_type: d.ssp,
        // umap: true,
      });
      const resolveMonth = (index) => {
        if (curTimeType == timeType.All) return (index % 12) + 1;
        if (curTimeType == timeType.AprSep) return (index % 6) + 4;
        if (curTimeType == timeType.OctMar) {
          let temp = [1, 2, 3, 10, 11, 12];
          return temp[index % 6];
        }
        throw "error in resolveMonth";
      };
      const resolveYear = (index) => {
        if (curTimeType == timeType.All) return Math.floor(index / 12);
        if (curTimeType == timeType.AprSep) return Math.floor(index / 6);
        if (curTimeType == timeType.OctMar) return Math.floor(index / 6);
        throw "error in resolveYear";
      };
      paths[`${d.model_name}:${d.ssp}:${d.variant}`] = data.map((id, index) => {
        return {
          // id: key,
          name: d.model_name,
          // year: Math.floor(index / 12),
          year: resolveYear(index),
          // month: (index % 12) + 1,
          month: resolveMonth(index),
          coords: [map[id].coords[0], -map[id].coords[1]],
        };
      });
    });
    pathData[curTimeType] = paths;

    await Promise.all(pathPromises);

    let data = map.map((d) => {
      return { ...d, value: classify[d.id].value };
    });

    const contour = await API.fetchData("contours", true, { data: data });
    contourData[curTimeType] = contour;

    const { interpolatedSurface, resolution, x, y } = await API.fetchData(
      "interpolatedSurface",
      true,
      {
        data: data,
      }
    );
    interpolatedSurfaceData[curTimeType] = {
      interpolatedSurface,
      resolution,
      x,
      y,
    };

    let hotspotPolygons = {};

    const hotspotPromises = timeTypeMonths[curTimeType].map(async (month) => {
      let data = await API.fetchData("get_smoothed_alpha", true, {
        dataset_type: dataset_name,
        time_type: curTimeType,
        members: sspAllLabels,
        years: [-1],
        months: [month],
        kde_bounds: [xMin, xMax, yMin, yMax],
      });
      hotspotPolygons[month] = data;
    });
    hotspotPolygonsData[curTimeType] = hotspotPolygons;

    await Promise.all(hotspotPromises);
  });
  await Promise.all(gigaPromise);

  console.log("DEBUG DONE STORE MAIN");
  console.log(mappingData);
  return {
    nodeMap: mappingData,
    classifyData: classifyData,
    pathData: pathData,
    hotspotPolygons: hotspotPolygonsData,
    contourData: contourData,
    interpolatedSurfaceData: interpolatedSurfaceData,
  };
}

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
      clusterOrders: [],

      nodeMap: null,
      classifyData: null,
      pathData: null,
      hotspotPolygons: null,
      contourData: null,
      interpolatedSurfaceData: null,
    });
    getAllData().then((data) => {
      const {
        nodeMap,
        classifyData,
        pathData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
      } = data;
      state.nodeMap = nodeMap;
      state.classifyData = classifyData;
      state.pathData = pathData;
      state.hotspotPolygons = hotspotPolygons;
      state.contourData = contourData;
      state.interpolatedSurfaceData = interpolatedSurfaceData;
    });
    return state;
  },
  getters: {
    isDataReady() {
      return this.contourData;
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
  },
});
