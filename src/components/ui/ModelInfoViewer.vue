<template>
  <div
    class="text-md relative flex w-full flex-col items-center rounded-lg bg-gray-100 py-4 shadow-md"
  >
    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      @click="toggleIsOpened"
      class="absolute right-0 top-0 m-2"
    />
    <h1 class="text-xl font-bold text-gray-800">Model Info</h1>
    <div v-show="isOpened" class="mt-4">
      <div
        v-for="(value, key) in model_info"
        :key="key"
        class="mb-2 flex w-full max-w-sm justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
      >
        <span class="font-medium text-gray-600">{{ key }}</span>
        <span
          class="break-words font-semibold text-blue-600"
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
import API from "@/API/api";

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
