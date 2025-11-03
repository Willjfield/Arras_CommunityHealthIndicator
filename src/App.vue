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
      <div id="loading" style="position:absolute; left: 0; width: 100%; height: 100%;" > 
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

#loading {
  z-index: 1000;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: white;
  color: gray;
  font-size: 2em;
  text-align: center;
  justify-content: center;
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1em;
  border-radius: 1em;
  padding: 1em;
  border: 1px solid gray;
  padding-top: 15%;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: none;
  transition: opacity 0.3s ease-in-out;
}
</style>
