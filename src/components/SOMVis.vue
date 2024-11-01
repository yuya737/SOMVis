<template>
  <Splitter style="height: 100%" layout="vertical" @resizeend="splitterResized">
    <SplitterPanel style="height: 100%" :size="60">
      <!-- <ProjectionViewer class="h-full" v-if="store.isDataReady" /> -->
      <ProjectionViewer
        v-if="store.isDataReady"
        class="h-full"
        :time_type="timeType.OctMay"
      />
      <!-- <Splitter
        class="h-full w-full"
        layout="horizontal"
        v-if="store.isDataReady"
        @resizeend="splitterResized"
      > -->
      <!-- <ProjectionViewer class="h-full" :time_type="timeType.OctMay" /> -->
      <!-- <SplitterPanel class="h-full">
          <ProjectionViewer class="h-full" :time_type="timeType.AprSep" />
        </SplitterPanel>
        <SplitterPanel style="height: 100%" :size="50">
          <ProjectionViewer class="h-full" :time_type="timeType.OctMar" />
        <!-- </SplitterPanel> -->
      -->
      <!-- </Splitter> -->
    </SplitterPanel>

    <SplitterPanel class="h-full w-full" :size="40">
      <Splitter
        class="h-full w-full"
        layout="horizontal"
        @resizeend="splitterResized"
      >
        <SplitterPanel class="h-full">
          <!-- <MapViewer class="h-full" /> -->
          <!-- <TimelineViewer class="h-full" v-if="store.isDataReady" /> -->
          <!-- <TimelineViewerTemporal class="h-full" /> -->
          <!-- <ForceGraph class="h-full" /> -->
        </SplitterPanel>
        <SplitterPanel style="height: 100%" :size="40">
          <!-- <HeatmapViewer class="h-full" v-if="store.isDataReady" /> -->
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>
</template>

<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { useStore } from "@/store/main";
import ProjectionViewer from "./ProjectionViewer.vue";
import MapViewer from "./MapViewer.vue";
import HeatmapViewer from "./HeatmapViewer.vue";
import TimelineViewer from "./TimelineViewer.vue";
import TimelineViewerTemporal from "./TimelineViewerTemporal.vue";
import { provide, ref, watch } from "vue";
import { timeType } from "./utils/utils";

const store = useStore();
watch(
  () => store.isDataReady,
  () => {
    console.log("Data ready");
  }
);

let resizeFlag = ref(false);
provide("splitterResized", resizeFlag);

const splitterResized = () => {
  console.log("Splitter resized");
  resizeFlag.value = !resizeFlag.value;
};
</script>
