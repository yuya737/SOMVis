<template>
    <div class="text-sm text-black">{{ props.scale.variable }}</div>
    <div :style="{ 'align-items': 'center' }">
        <div
            v-for="(color, index) in props.scale.colorRange"
            :key="index"
            class="InfoPanelScale-legend text-sm"
            :style="{ 'background-color': colorRamp[index], width: width }"
        />
    </div>
    <div
        v-for="(label, index) in props.scale.labels"
        :key="index"
        class="InfoPanelScale-labels text-sm"
        :style="{ width: widthLabels }"
    >
        <div class="text-sm text-black">{{ props.scale.labels[index] }}</div>
    </div>
</template>

<script setup lang="ts">
import { watch, ref, onMounted } from "vue";
const props = defineProps({
    scale: { type: Object, required: true },
});

const colorRamp = props.scale.colorRange.map(
    (color) => `rgb(${color.join(",")})`,
);
const width = 80 / props.scale.colorRange.length.toString() + "%";
const widthLabels = 100 / props.scale.labels.length.toString() + "%";
</script>
<style scoped>
.InfoPanelScale-legend {
    display: inline-block;
    height: 20px;
}
.InfoPanelScale-labels {
    display: inline-block;
    height: 20px;
    margin-top: 5px;
    text-align: center;
}
</style>
