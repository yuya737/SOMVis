<template>
  <div
    style="
      box-shadow:
        0 0 #0000,
        0 0 #0000,
        0 1px 2px 0 rgb(0 0 0 / 0.05);
    "
    class="relative z-[5] h-auto w-full rounded-lg border bg-gray-100 px-4"
  >
    <div
      class="group absolute right-0 top-0 z-[5] -translate-x-1/2 translate-y-1/2 transform"
    >
      <i class="pi pi-question-circle cursor-pointer text-xl"></i>

      <div
        class="help-text absolute right-0 top-0 hidden h-fit min-w-[250px] flex-col items-center justify-center rounded-md p-2 group-hover:block"
      >
        <span>
          Your interactions with the LLM (large language models) will be tracked
          here. <br />
          If you ask a question about the SOM Node space, the LLM will query the
          SOM Node space and highlight the region for which the query is true.
          <br />
          Asking the LLM to summarize a SOM Node region will generate an
          explanation.
        </span>
        <div
          id="somNodeViewerLegend"
          class="my-2 flex w-full flex-col items-center justify-evenly font-normal"
        />
      </div>
    </div>
    <!-- Heading -->
    <div class="sticky top-0 z-[2] flex flex-col space-y-1.5 bg-gray-100 py-4">
      <h1 class="text-xl font-bold text-gray-800">LLM Exploration History</h1>

      <!-- <h2 class="text-lg font-semibold tracking-tight">Chatbot</h2> -->
      <!-- <p class="text-sm leading-3 text-[#6b7280]">
        Given a query, the LLM will first resolve any queried region to a list
        of counties.
      </p> -->
    </div>

    <!-- Chat Container -->
    <div class="z-[1] mt-4 h-fit w-full pb-2">
      <component
        :is="chat['type'] == 'User' ? UserMessage : AIMessage"
        v-for="(chat, index) in store.chatBotHistory"
        :key="index"
        :payload="{
          message: chat['text'],
          typeDetail: chat?.['typeDetail'],
          zoneID: chat?.['zoneID'],
        }"
        :time_type="props.time_type"
        :messageIndex="Math.floor(index / 2)"
      />

      <!-- Input box  -->
      <form class="flex w-full items-center justify-center gap-2">
        <!-- <input
          class="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Show me the nodes such that..."
          value=""
        /> -->
        <!-- <InputText -->
        <Textarea
          class="h-10 flex-grow rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          type="text"
          placeholder="Show me the nodes such that..."
          v-model="currentQuery"
        />
        <!-- <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none"
            @click="sendQuery"
          >
            Send
          </button> -->
        <Button
          class="w-fit rounded bg-blue-500 px-1 py-2 text-white hover:bg-blue-600"
          @click="sendQuery"
          label="Send"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useStore } from "@/store/main";
import API from "@/API/api";
import InputText from "primevue/inputtext";
import AIMessage from "./AIMessage.vue";
import UserMessage from "./UserMessage.vue";
import Textarea from "primevue/textarea";
import { timeType } from "../utils/utils";

const store = useStore();
const props = defineProps<{
  time_type: timeType;
}>();

const currentQuery = ref("");

async function sendQuery() {
  // const query = query.value
  store.chatBotHistory.push({ text: currentQuery.value, type: "User" });

  const llm_generated_query = API.fetchData("/get_LLM_query", true, {
    // { SQLQuery: str, description: str }
    query: currentQuery.value,
  });

  store.chatBotHistory.push({
    // text: new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve({
    //       SQLQuery:
    //         "SELECT grid_id FROM spatial_data GROUP BY grid_id HAVING AVG(value) > 0;",
    //       description: {
    //         NA: ["No specific region in query - queried the whole region."],
    //       },
    //     });
    //   }, 3000); // 3000 ms = 3 seconds
    // }),
    text: llm_generated_query,
    type: "AI",
    typeDetail: "forward",
  });
}
</script>
