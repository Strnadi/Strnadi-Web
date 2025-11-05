<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
import { authorizedPost } from '@/api/utils';
import { ref } from 'vue';
import { accountStore } from '@/state/AccountStore';

const fcmToken = ref<string>();
const titleCz = ref<string>();
const titleEn = ref<string>();
const titleDe = ref<string>();
const messageCz = ref<string>();
const messageEn = ref<string>();
const messageDe = ref<string>();

const sendNotification = async () => {
  if (!accountStore.token) {
    return;
  }
  authorizedPost(`/utils/send-notification`, accountStore.token, {
    fcmToken: fcmToken.value,
    titleCz: titleCz.value,
    titleEn: titleEn.value,
    titleDe: titleDe.value,
    bodyCz: messageCz.value,
    bodyEn: messageEn.value,
    bodyDe: messageDe.value
  });
};
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.notifications.title" />
  </h1>

  <div class="flex flex-col gap-y-2">
    <input type="text" v-model="fcmToken" placeholder="FCM Token" class="p-2" />
    <input type="text" v-model="titleCz" placeholder="Title CZ" class="p-2" />
    <input type="text" v-model="titleEn" placeholder="Title EN" class="p-2" />
    <input type="text" v-model="titleDe" placeholder="Title DE" class="p-2" />
    <input type="text" v-model="messageCz" placeholder="Message CZ" class="p-2" />
    <input type="text" v-model="messageEn" placeholder="Message EN" class="p-2" />
    <input type="text" v-model="messageDe" placeholder="Message DE" class="p-2" />
    <button @click="sendNotification" class="primary p-2">Send</button>
  </div>

  <div class="flex flex-col gap-y-2">
    <h2>
      Historie notifikací
    </h2>
    <div class="flex flex-col gap-y-2">
    </div>
  </div>
</template>
