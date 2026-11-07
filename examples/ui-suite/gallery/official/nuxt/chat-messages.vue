<script setup>
const example = {
  "messages": [
    {
      "id": "6045235a-a435-46b8-989d-2df38ca2eb47",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Hello, how are you?"
        }
      ]
    },
    {
      "id": "7a92b3c1-d5f8-4e76-b8a9-3c1e5fb2e0d8",
      "role": "assistant",
      "parts": [
        {
          "type": "text",
          "text": "I am doing well, thank you for asking! How can I assist you today?"
        }
      ]
    },
    {
      "id": "9c84d6a7-8b23-4f12-a1d5-e7f3b9c05e2a",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "What is the current weather in Tokyo?"
        }
      ]
    },
    {
      "id": "b2e5f8c3-a1d9-4e67-b3f2-c9d8e7a6b5f4",
      "role": "assistant",
      "parts": [
        {
          "type": "text",
          "text": "Based on the latest data, Tokyo is currently experiencing sunny weather with temperatures around 24°C (75°F). It's a beautiful day with clear skies."
        }
      ]
    }
  ],
  "shouldScrollToBottom": false
};
</script>

<template>
  <UChatMessages v-bind="example" />
</template>
