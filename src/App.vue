<script setup>
import { RouterView } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BlankLayout from '@/layouts/BlankLayout.vue';
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component
      :is="route.meta.layout === 'blank' ? BlankLayout : DefaultLayout"
    >
      <component :is="Component" />
    </component>
  </RouterView>
</template>
