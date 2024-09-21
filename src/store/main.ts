import { defineStore } from "pinia";
import { subsetType } from "@/components/utils/utils";

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    return {
      files: [[], []], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [10], // -1 means all months
      subsetType: subsetType.month,
      // subsetType: "month",
      yearsSelected: [-1], // -1 means all years
      hoveredFile: null,
      clusterOrders: [],
    };
  },
  getters: {
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
