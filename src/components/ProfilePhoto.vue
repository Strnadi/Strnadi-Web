<script setup lang="ts">
import axios from 'axios';
import { computedAsync } from '@vueuse/core'
import type { Numeric } from '@/types/basic';
import { extensionToMime } from '@/utils/files';
import { accountStore } from '@/state/AccountStore';

const props = defineProps<{
  userId: Numeric;
}>();

const photoSource = computedAsync(async () => {

  try {
    const response = await axios.get(`/users/${props.userId}/get-profile-photo`, {
        headers: {
        Authorization: accountStore.token ? `Bearer ${accountStore.token}` : undefined
        }
    });
    return "data:image/" + extensionToMime[(response.data.format as string).substring(response.data.format.lastIndexOf('.'))] + ";base64," + response.data.photoBase64;
    
  } catch (error) {
    return null;
  }

});
</script>

<template>
    <img v-if="photoSource" :src="photoSource" alt="Profile photo" />
</template>
