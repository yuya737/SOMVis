import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    return {
      files: [[], []], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [10], // -1 means all months
      yearsSelected: [-1], // -1 means all years
      sspSelected: "historical",
      hoveredFile: null,
    };
  },
  getters: {
    getFiles() {
      return this.files;
    },
    getMonthsSelected() {
      return this.monthsSelected;
    },
    getYearsSelected() {
      return this.yearsSelected;
    },
    getSSPSelected() {
      return this.sspSelected;
    },
    getHoveredFile() {
      return this.hoveredFile;
    },
  },
  actions: {
    setFiles(files) {
      this.files = files;
    },
    updateElements({ files, monthsSelected, yearsSelected, sspSelected }) {
      this.files = files;
      this.monthsSelected = monthsSelected;
      this.yearsSelected = yearsSelected;
      this.sspSelected = sspSelected;
    },
    setHoveredFile(file) {
      this.hoveredFile = file;
    },
  },
});
