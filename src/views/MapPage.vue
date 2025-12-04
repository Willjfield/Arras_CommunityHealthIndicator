<template>
    <v-main class="d-flex align-center justify-center" style="padding-top: 0px;">
        <v-container style="padding-top: 0px; height: 100%;">
            <v-card class="theme-title mt-2">
                <v-card-title class="text-center pa-0 ma-0">
                    <v-img inline :src="currentThemeConfig.icon" width="24" height="24" class="mr-2 title-theme-icon"></v-img>
                    {{ currentThemeConfig.title }}
                </v-card-title>
            </v-card>
            <LocationSearch />
            <ComparisonMap :_center="[-80.46, 34.652]" :_zoom="8.57" :_type="'sideBySide'" />
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
.theme-title {
    max-width: 25%;
    margin: 0 auto;
    z-index: 999;
}

.title-theme-icon {
    vertical-align: sub;
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
        document.getElementById('loading').style.display = 'flex'
       await useThemeLevelStore().setCurrentTheme(to.query.theme)
        next()
    },
    mounted() {
        document.getElementById('loading').style.display = 'none'
    },
    computed: {
        currentThemeConfig() {
            return useThemeLevelStore().getMainConfigForCurrentTheme()
        }
    },
    methods: {}
}
</script>