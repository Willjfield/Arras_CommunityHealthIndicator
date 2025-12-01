<template>
    <v-main class="d-flex align-center justify-center" style="">
        <v-container>
            <LocationSearch />
            <ComparisonMap :_center="[-80.3, 34.7963]" :_zoom="8.57" :_type="'sideBySide'" />
        </v-container>
    </v-main>
</template>
<style>
.full-screen-main{
    display: block;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    /* width: 100%; */
    position: absolute;
}
</style>
<script>
import ComparisonMap from '../components/ComparisonMap.vue';
import LocationSearch from '../components/LocationSearch.vue';
import { useThemeLevelStore } from '../stores/themeLevelStore'

export default {
    name: 'Map',
    components: {
        ComparisonMap,
        LocationSearch
    },
    data() {
        return {}
    },
    watch: {},
    async beforeRouteEnter(to, from, next) {
        console.log(to,from)
        document.getElementById('loading').style.display = 'flex'
       await useThemeLevelStore().setCurrentTheme(to.query.theme)
        next()
    },
    mounted() {
        document.getElementById('loading').style.display = 'none'
    },
    methods: {}
}
</script>