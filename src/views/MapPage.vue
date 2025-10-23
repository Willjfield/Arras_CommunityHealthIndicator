<template>
    <v-main class="d-flex align-center justify-center" style="">
        <v-container>
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
import { useThemeLevelStore } from '../stores/themeLevelStore'

export default {
    name: 'Map',
    components: {
        ComparisonMap
    },
    data() {
        return {}
    },
    watch: {},
    async beforeRouteEnter(to, from, next) {
       await useThemeLevelStore().setCurrentTheme(to.query.theme)
        next()
    },
    mounted() { },
    methods: {}
}
</script>