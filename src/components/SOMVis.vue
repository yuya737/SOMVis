<template>
  <Splitter style="height: 100%" layout="horizontal">
    <SplitterPanel style="height: 100%" :size="50">
      <ProjectionViewer class="h-full" />
    </SplitterPanel>

    <SplitterPanel class="h-full w-full" :size="50">
      <!-- <ProjectionViewer class="h-full" /> -->
      <Splitter class="h-full w-full" layout="vertical">
        <SplitterPanel class="h-full">
          <MapViewer class="h-full" />
        </SplitterPanel>
        <SplitterPanel style="height: 50%">
          <HeatmapViewer class="h-full" />
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
import ForceGraph from "./ForceGraph.vue";
</script>
