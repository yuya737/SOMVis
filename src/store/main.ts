import { defineStore } from "pinia";
import { subsetType } from "@/components/utils/utils";
import API from "@/api/api";
import { dataset_name, months, sspAllLabels } from "@/components/utils/utils";
import { get } from "@vueuse/core";
import { reactive } from "vue";

async function getAllData() {
  console.log("DEBUG IN STORE MAIN");
  let mappingData: SOMNode[] = await API.fetchData(
    "mapping/CMIP6_pr_delta_historical_S5.00L0.02_30x30_umap",
    // "mapping/CMIP6_pr_delta_historicalNW_S5.00L0.02_30x30_umap",
    true,
    null
  );
  mappingData = mappingData.map((d, i) => {
    return { ...d, coords: d.coords.map((c) => c * 1) };
  });
  let xMin = Math.min(...mappingData.map((d) => d.coords[0]));
  let xMax = Math.max(...mappingData.map((d) => d.coords[0]));
  let yMin = Math.min(...mappingData.map((d) => d.coords[1]));
  let yMax = Math.max(...mappingData.map((d) => d.coords[1]));

  let classifyData = await API.fetchData("node_means", true, {
    dataset_type: dataset_name,
  });

  let pathData = {} as Record<string, BMUData[]>;
  const pathPromises = sspAllLabels.map(async (d, i) => {
    let data: SOMPath = await API.fetchData("path", true, {
      dataset_type: dataset_name,
      model_type: d.model_name,
      data_type: d.ssp,
      // umap: true,
    });
    pathData[`${d.model_name}:${d.ssp}:${d.variant}`] = data.map(
      (id, index) => {
        return {
          // id: key,
          name: d.model_name,
          year: Math.floor(index / 12),
          month: (index % 12) + 1,
          coords: [mappingData[id].coords[0], -mappingData[id].coords[1]],
        };
      }
    );
  });

  await Promise.all(pathPromises);

  let hotspotPolygons = {};
  const hotspotPromises = months.map(async (m, i) => {
    let data = await API.fetchData("get_smoothed_alpha", true, {
      dataset_type: dataset_name,
      members: sspAllLabels,
      years: [-1],
      months: [i + 1],
      kde_bounds: [xMin, xMax, yMin, yMax],
    });
    hotspotPolygons[i + 1] = data;
  });
  await Promise.all(hotspotPromises);
  // console.log("DEBUG: hotspotPolygons", hotspotPolygons);

  let data = mappingData.map((d) => {
    return { ...d, value: classifyData[d.id].value };
  });

  let contourData = await API.fetchData("contours", true, { data: data });
  console.log("DEBUG DONE STORE MAIN");
  console.log(mappingData);
  return {
    nodeMap: mappingData,
    classifyData: classifyData,
    pathData: pathData,
    hotspotPolygons: hotspotPolygons,
    contourData: contourData,
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
    });
    getAllData().then((data) => {
      const { nodeMap, classifyData, pathData, hotspotPolygons, contourData } =
        data;
      state.nodeMap = nodeMap;
      state.classifyData = classifyData;
      state.pathData = pathData;
      state.hotspotPolygons = hotspotPolygons;
      state.contourData = contourData;
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
