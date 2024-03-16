import { defineStore } from "pinia";

// You can name the return value of `defineStore()` anything you want,
// but it's best to use the name of the store and surround it with `use`
// and `Store` (e.g. `useUserStore`, `useCartStore`, `useProductStore`)
// the first argument is a unique id of the store across your application
export const useStore = defineStore("main", {
    // other options...
    state: () => {
        return {
            // file_name
            spatial_file_name: "",
            temporal_file_name: "",

            spatial_col_name: "",
            temporal_col_name: "",
        };
    },
    getters: {
        getSpatialData() {
            return {
                spatial_file_name: this.spatial_file_name,
                spatial_col_name: this.spatial_col_name,
            };
        },
        getTemporalData() {
            return {
                temporal_file_name: this.temporal_file_name,
                temporal_col_name: this.temporal_col_name,
            };
        },
    },
    actions: {
        updateSpatialID(spatial_file_name: string, spatial_col_name: string) {
            this.spatial_file_name = spatial_file_name;
            this.spatial_col_name = spatial_col_name;
        },
        updateTemporalID(
            temporal_file_name: string,
            temporal_col_name: string,
        ) {
            this.temporal_file_name = temporal_file_name;
            this.temporal_col_name = temporal_col_name;
        },
    },
});
