<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div>
      <img src="/quapp.png" class="logo" alt="Vite logo" />
  </div>
  <HelloWorld msg="Quapp" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #ff6200aa);
}
</style>
