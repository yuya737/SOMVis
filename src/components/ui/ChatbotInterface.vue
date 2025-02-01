<template>
  <div
    style="
      box-shadow:
        0 0 #0000,
        0 0 #0000,
        0 1px 2px 0 rgb(0 0 0 / 0.05);
    "
    class="bg-gray-100 p-4 rounded-lg border border-[#e5e7eb] w-full h-fit relative"
  >
    <Button
      :icon="isOpened ? 'pi pi-minus' : 'pi pi-plus'"
      class="absolute top-0 right-0 m-2"
      @click="toggleIsOpened"
    />
    <!-- Heading -->
    <div class="flex flex-col space-y-1.5">
      <h1 class="text-xl font-bold text-gray-800">LLM Exploration History</h1>

      <!-- <h2 class="font-semibold text-lg tracking-tight">Chatbot</h2> -->
      <p class="text-sm text-[#6b7280] leading-3">
        Given a query, the LLM will first resolve any queried region to a list
        of counties.
      </p>
    </div>

    <!-- Chat Container -->
    <div v-show="isOpened" class="h-fit w-full mt-4">
      <component
        :is="message['type'] == 'User' ? UserMessage : AIMessage"
        v-for="(message, index) in messages"
        :key="index"
        :message="message.text"
        :messageIndex="Math.floor(index / 2)"
      />

      <!-- Input box  -->
      <div class="flex items-center pt-0">
        <form class="flex items-center justify-center w-full space-x-2">
          <!-- <input
          class="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50 text-[#030712] focus-visible:ring-offset-2"
          placeholder="Show me the nodes such that..."
          value=""
        /> -->
          <!-- <InputText -->
          <Textarea
            class="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50 text-[#030712] focus-visible:ring-offset-2"
            type="text"
            placeholder="Show me the nodes such that..."
            v-model="query"
          />
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 focus:outline-none h-10 px-4 py-2"
            @click="sendQuery"
          >
            Send
          </button>
        </form>
      </div>
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

const store = useStore();

const isOpened = ref(true);
const toggleIsOpened = () => (isOpened.value = !isOpened.value);

const messages = ref([]);

const query = ref("");

async function sendQuery() {
  messages.value.push({ text: query.value, type: "User" });

  const llm_generated_query = API.fetchData("/get_LLM_query", true, {
    // { SQLQuery: str, description: str }
    query: query.value,
  });

  messages.value.push({ text: llm_generated_query, type: "AI" });

  llm_generated_query.then(async (res) => {
    const { result } = await API.fetchData("/run_sqlquery", true, {
      sqlquery: res["SQLQuery"],
    });
    console.log("DEBUG CHATBOT result", result);
    store.highlightedNodes = result;
    store.LLMQueries.push({
      query: query.value,
      description: res["description"],
      result: result,
    });
    store.LLMQueriedRegionIndex = Math.floor(messages.value.length / 2) - 1;
  });
}
</script>
