import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    return {
      files: [
        ["ACCESS-CM2_ssp370_r2i1p1f1_pr.nc"],
        ["KACE-1-0-G_ssp370_r1i1p1f1_pr.nc"],
      ], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [7],
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
