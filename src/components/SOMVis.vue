<template>
  <Splitter style="height: 100%" layout="vertical" @resizeend="splitterResized">
    <SplitterPanel style="height: 100%" :size="40">
      <ProjectionViewer class="h-full" isHistorical />
    </SplitterPanel>

    <SplitterPanel class="h-full w-full" :size="60">
      <Splitter
        class="h-full w-full"
        layout="horizontal"
        @resizeend="splitterResized"
      >
        <SplitterPanel class="h-full">
          <!-- <MapViewer class="h-full" /> -->
          <TimelineViewer class="h-full" />
          <!-- <ForceGraph class="h-full" /> -->
        </SplitterPanel>
        <SplitterPanel style="height: 100%" :size="40">
          <!-- <HeatmapViewer class="h-full" /> -->
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>
</template>

<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import ProjectionViewer from "./ProjectionViewer.vue";
import MapViewer from "./MapViewer.vue";
import HeatmapViewer from "./HeatmapViewer.vue";
import TimelineViewer from "./TimelineViewer.vue";

import { provide, ref } from "vue";

let resizeFlag = ref(false);
provide("splitterResized", resizeFlag);

const splitterResized = () => {
  console.log("Splitter resized");
  resizeFlag.value = !resizeFlag.value;
};
</script>
