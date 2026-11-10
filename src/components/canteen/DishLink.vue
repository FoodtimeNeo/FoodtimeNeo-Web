<script setup>
defineProps({ dish: { type: Object, required: true } });
</script>

<template>
  <RouterLink
    :to="{
      name: 'dishDetail',
      params: {
        canteenId: dish.diningHallId,
        stallId: dish.stallId,
        dishId: dish.id,
      },
    }"
  >
    <slot>{{ dish.name }}</slot>
  </RouterLink>
</template>
