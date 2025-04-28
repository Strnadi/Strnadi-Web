<script setup lang="ts">
import Dropdown from '@/features/Dropdown/components/Dropdown.vue'
import InfoDropdownItems from '@/features/Navbar/components/InfoDropdownItems.vue'
import Rights from '@/features/Navbar/components/Rights.vue'

import Info from '@/icons/icon-info.svg'
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
