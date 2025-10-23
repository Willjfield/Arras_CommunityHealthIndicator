<template>
  <main id="main" class="full-screen-main" tabindex="-1">
    <v-app>
      <v-app-bar :elevation="2">
        <template v-slot:prepend>
          <v-img width="100px" src="ArrasFoundation.png" />
        </template>
        <template v-slot:append>
          <RouterLink v-slot="{ href, navigate }" to="/">
            <v-btn v-show="$route?.name!=='landing'" :href="href" @click="navigate">Home</v-btn>
          </RouterLink>
        </template>
      </v-app-bar>
      <div style="position:fixed; top: 50%; left: 0; width: 100%; height: 100%;"> 
          <h1>LOADING...</h1>
          <v-progress-circular indeterminate color="primary" size="100" width="10" />
      </div>
      <router-view></router-view>
    </v-app>
  </main>
</template>
<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
const $route = useRoute()


</script>
<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
