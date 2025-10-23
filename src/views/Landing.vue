<template>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col>
            <v-card>
              <v-carousel cycle show-arrows="hover">
                <v-carousel-item src="slideshow/S1.jpg" cover></v-carousel-item>
                <v-carousel-item src="slideshow/S2.jpg" cover></v-carousel-item>
                <v-carousel-item src="slideshow/S4.jpg" cover></v-carousel-item>

              </v-carousel>
            </v-card>
          </v-col>
          <v-col>
            <v-sheet class="d-flex align-content-start flex-wrap" min-height="3em">
              <v-btn
                :to="`/map?theme=${cat.query_str}`"
                :disabled="!cat.enabled"
                stacked
                size="small"
                class="ma-2"
                width="45%"
                v-for="cat in categories"
                :key="cat.title"
                :text="cat.title"
              >{{ cat.title }}</v-btn>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
 
</template>
<script>
import { useTheme } from 'vuetify';
import { inject } from 'vue';

export default {
  name: 'Landing',
  components: {
  },
  data: () => ({
    categories: inject('mainConfig').categories
  }),
  watch: {},
  async mounted() {

  },
  methods: {
  }
}
</script>

<style></style>