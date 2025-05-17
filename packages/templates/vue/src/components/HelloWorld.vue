<script setup>
defineProps({
  msg: String,
})

</script>

<template>
  <h1>{{ msg }}</h1>
  <div><p>Make apps with a Snap of a Finger!</p></div>

  <div class="card">
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test your App
    </p>
  </div>
  
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
