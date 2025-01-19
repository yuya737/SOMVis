<template>
  <div
    v-if="props.characteristic.transition == null"
    class="w-full flex justify-between"
  >
    <span class="font-medium text-gray-600">{{
      props.characteristic.name
    }}</span>
    <span class="text-blue-600 font-semibold">
      {{ Math.round(props.characteristic.percentage * 100) }}%
    </span>
  </div>
  <div v-else class="flex flex-row justify-between items-center w-full gap-8">
    <div class="w-full flex justify-center flex-grow">
      <span class="font-medium text-gray-600"
        >{{ props.characteristic.name }}
      </span>
      <span class="text-blue-600 font-semibold">
        {{ Math.round(props.characteristic.percentage * 100) }}%
      </span>
    </div>

    <div class="flex flex-col gap-2 flex-grow">
      <div
        v-for="t in props.characteristic.transition"
        :key="t.name"
        class="flex justify-between gap-2"
      >
        <span class="font-medium text-gray-600">{{ t.name }}</span>
        <span class="text-blue-600 font-semibold">
          {{ Math.round(t.percentage * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  characteristic: {
    name: string;
    percentage: number;
    transition?: { name: string; percentage: number }[];
  };
}>();
</script>
