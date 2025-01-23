<template>
  <div
    v-if="props.characteristic.transition == null"
    class="w-full flex justify-between gap-x-4"
  >
    <span class="font-medium text-gray-600">{{
      props.characteristic.name
    }}</span>
    <span class="text-blue-600 font-semibold">
      {{
        Math.round(
          (props.characteristic.count / props.characteristic.total) * 100
        )
      }}% out of {{ props.characteristic.total }}
    </span>
  </div>
  <div v-else class="grid grid-cols-[1fr_auto_1fr] w-full gap-8">
    <div class="w-full flex justify-between items-center">
      <span class="font-medium text-gray-600"
        >{{ props.characteristic.name }}
      </span>
      <span class="text-blue-600 font-semibold">
        {{
          Math.round(
            (props.characteristic.count / props.characteristic.total) * 100
          )
        }}%
      </span>
    </div>
    <div class="flex items-center">
      <i class="pi pi-angle-double-right text-xl" />
    </div>

    <div class="flex flex-col gap-2 flex-grow">
      <div
        v-for="t in props.characteristic.transition"
        :key="t.name"
        class="flex justify-between gap-2"
      >
        <span class="font-medium text-gray-600 whitespace-nowrap">{{
          t.name
        }}</span>
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
    count: number;
    total: number;

    transition?: { name: string; percentage: number }[];
  };
}>();
</script>
