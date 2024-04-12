import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    return {
      files: [[], []], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [7], // -1 means all months
      yearsSelected: [-1], // -1 means all years
      sspSelected: "historical",
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
  },
  actions: {
    updateElements({ files, monthsSelected, yearsSelected, sspSelected }) {
      this.files = files;
      this.monthsSelected = monthsSelected;
      this.yearsSelected = yearsSelected;
      this.sspSelected = sspSelected;
    },
  },
});
