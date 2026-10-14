<script setup>
import { RouterView } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BlankLayout from '@/layouts/BlankLayout.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';

const layouts = {
  blank: BlankLayout,
  admin: AdminLayout,
  default: DefaultLayout,
};
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="layouts[route.meta.layout] ?? DefaultLayout">
      <component :is="Component" />
    </component>
  </RouterView>
</template>
