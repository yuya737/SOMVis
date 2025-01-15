<template>
  <div
    class="flex flex-col items-center py-4 bg-gray-100 rounded-lg shadow-md text-md w-full"
  >
    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute top-0 right-0 m-2"
    />
    <h1 class="text-xl font-bold text-gray-800">Model Info</h1>
    <div v-show="isOpened" class="mt-4">
      <div
        v-for="(value, key) in model_info"
        :key="key"
        class="flex justify-between w-full max-w-sm bg-white p-3 mb-2 rounded-lg shadow-sm border border-gray-200"
      >
        <span class="font-medium text-gray-600">{{ key }}</span>
        <span
          class="text-blue-600 font-semibold break-words"
          :class="{ 'code-font': key === 'file' }"
          >{{ value }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, onMounted } from "vue";
import { useStore } from "@/store/main";
import { timeType, dataset_name } from "../utils/utils";
import API from "@/api/api";

const props = defineProps<{
  time_type: timeType;
}>();

const store = useStore();
const msg = ref("");
const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

const model_info: Ref<{
  file: string;
  dim: string;
  explained_variances: string;
  smoothness: string;
}> = ref({});

async function getModelInfo() {
  const ret = await API.fetchData("/get_model_info", true, {
    dataset_type: dataset_name,
    time_type: props.time_type,
  });
  const { file, dim, explained_variances, smoothness } = ret;
  model_info.value = { file, dim, explained_variances, smoothness };
  console.log("DEBUG getModelInfo", model_info.value);
}

onMounted(() => {
  getModelInfo();
});
</script>
<style scoped>
.code-font {
  font-family: monospace;
  overflow-wrap: anywhere;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
}
</style>
