<template>
  <span v-html="svgHTML" />
</template>

<script lang="ts" setup>
import { useStore } from "@/store/main";
import { makeAnnotationGlyph } from "../utils/utils";
import { watch, ref } from "vue";

const store = useStore();
const hasMapChanged = ref(false);

const props = defineProps<{
  indexToHighlight: number;
  justIndex: boolean;
  time_type: timeType;
  width: number;
}>();

const svgHTML = makeAnnotationGlyphWithBG({
  indexToHighlight: props.indexToHighlight,
  width: props.width,
});

function makeAnnotationGlyphWithBG({ indexToHighlight, width }) {
  if (indexToHighlight == -1) {
    return;
  }
  let svg = makeAnnotationGlyph(
    store.mapAnnotation,
    store.nodeMap[props.time_type],
    indexToHighlight,
    props.justIndex,
    width
  );

  const scaledCanvas = document.createElement("canvas");
  const scaleFactor = width / store.nodeMapCanvas.width;

  scaledCanvas.width = store.nodeMapCanvas.width * scaleFactor;
  scaledCanvas.height = store.nodeMapCanvas.height * scaleFactor;

  const ctx = scaledCanvas.getContext("2d");
  ctx.scale(scaleFactor, scaleFactor); // Apply scaling transformation
  ctx.drawImage(store.nodeMapCanvas, 0, 0); // Draw the original canvas content
  const img = document.createElementNS(svg, "image");
  img.setAttribute("href", scaledCanvas.toDataURL());
  img.setAttribute("width", scaledCanvas.width);
  img.setAttribute("height", scaledCanvas.height);

  const svgNode = svg.node();
  const firstChild = svgNode.firstChild; // Get the first child of the SVG
  svgNode.insertBefore(img, firstChild);

  return svgNode.outerHTML;
}
</script>
