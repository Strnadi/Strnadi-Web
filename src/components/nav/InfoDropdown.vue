<script setup lang="ts">
import Dropdown from '@/components/generic/Dropdown.vue'
import InfoDropdownItems from './InfoDropdownItems.vue'
import Rights from './Rights.vue'

import Info from '@/assets/icon-info.svg'
</script>

<template>
  <Dropdown>
    <template v-slot:title class="flex flex-row items-center">
      <img :src="Info" />
      Informace
    </template>
    <InfoDropdownItems />
    <Rights />
  </Dropdown>
</template>
