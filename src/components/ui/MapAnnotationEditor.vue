<template>
  <form class="max-w-sm mx-auto bg-slate-100 px-3 py-2 rounded-lg">
    <div class="mb-3">
      <label
        for="small-input"
        class="block mb-2 text-lg font-medium text-gray-900"
        >Name this Region</label
      >
      <input
        type="text"
        id="small-input"
        v-model="text"
        :placeholder="prevName"
        class="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-md focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    <button
      type="button"
      class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1 me-2 mb-2"
      @click="saveAnnotation"
    >
      Save
    </button>
    <button
      type="button"
      class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1 me-2 mb-2"
      @click="deleteAnnotation"
    >
      Delete
    </button>
    <button
      type="button"
      class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1 me-2 mb-2"
      @click="closeAnnotation"
    >
      Close
    </button>
  </form>
</template>

<script setup lang="ts">
import InputText from "primevue/inputtext";
import { ref } from "vue";
import { useStore } from "@/store/main";

const store = useStore();
const text = ref("");

const props = defineProps({
  annotationProps: Object,
});

const prevName = store.mapAnnotation.features[props.annotationProps.index]
  .properties["name"]
  ? store.mapAnnotation.features[props.annotationProps.index].properties["name"]
  : "Enter Name";

function saveAnnotation() {
  store.mapAnnotation.features[props.annotationProps.index].properties["name"] =
    text.value;
  store.redrawFlag = !store.redrawFlag;
  store.showMapAnnotationPopup = false;
}

function deleteAnnotation() {
  store.mapAnnotation.features.splice(props.annotationProps.index, 1);
  store.redrawFlag = !store.redrawFlag;
  store.showMapAnnotationPopup = false;
}

function closeAnnotation() {
  store.showMapAnnotationPopup = false;
}
</script>
