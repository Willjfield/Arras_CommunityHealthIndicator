<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container">
      <TimelineVisualization side="left" />
      <ColorLegend
        v-if="leftIndicatorLevelStore.getCurrentIndicator() && leftIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
        :selected-indicator="leftIndicatorLevelStore.getCurrentIndicator()" side="left" />
    </div>
    <div ref="mapContainerRight" class="map-container">
      <TimelineVisualization side="right" />
      <ColorLegend
        v-if="rightIndicatorLevelStore.getCurrentIndicator() && rightIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
        :selected-indicator="rightIndicatorLevelStore.getCurrentIndicator()" side="right" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css';
import { inject, onBeforeMount, onMounted, onUnmounted, ref, watch } from 'vue'
import * as mapStyle from '../assets/style.json'
//import { indicators } from '../assets/indicators.json'
import Compare from '../assets/maplibre-gl-compare.js'
import TimelineVisualization from './TimelineVisualization.vue'
import '../assets/maplibre-gl-compare.css'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
import ColorLegend from './ColorLegend.vue'
import type { Emitter } from 'mitt'
const mapContainerLeft = ref<HTMLElement>()
let leftMap: maplibregl.Map | null = null

const mapContainerRight = ref<HTMLElement>()
let rightMap: maplibregl.Map | null = null

const comparisonContainer = '#comparison-container'

// Define props with default values if needed
const props = defineProps<{
  _center: [number, number]
  _zoom: number
  _type: string
}>()

const leftIndicatorLevelStore = useIndicatorLevelStore('left')
const rightIndicatorLevelStore = useIndicatorLevelStore('right')

const leftStyle: any = JSON.parse(JSON.stringify(mapStyle))

const rightStyle: any = JSON.parse(JSON.stringify(mapStyle))

let _compare: Compare | null = null
// Watch for changes in props._type and execute function based on value
watch(() => props._type, (newType) => {
  if (_compare) _compare.switchType(newType)
})

onBeforeMount(() => { })
onMounted(() => {
  console.log('mnt')
  const emitter = inject('mitt') as Emitter<any>
  // Ensure the container is properly initialized
  const sitePath = inject('sitePath') as string;

  if (mapContainerLeft.value) {

    leftMap = new maplibregl.Map({
      container: mapContainerLeft.value, // use ref instead of string id
      style: leftStyle,
      center: props._center,
      zoom: props._zoom,
      hash: true,
      transformRequest: (url: string) => {
        // If this is a local resource (starts with '/'), prepend sitePath
        if (url.startsWith('/')) {
          return {
            url: sitePath + url
          }
        }
        // If this is an absolute URL on the same origin, insert the base path
        if (sitePath && typeof window !== 'undefined') {
          const origin = window.location.origin;
          if (url.startsWith(origin + '/') && !url.includes(sitePath)) {
            // Insert the base path after the origin
            const path = url.substring(origin.length);
            // Ensure proper path joining (avoid double slashes)
            const basePath = sitePath.endsWith('/') ? sitePath.slice(0, -1) : sitePath;
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            return {
              url: origin + basePath + cleanPath
            }
          }
        }
        return { url }
      }
    })

    leftIndicatorLevelStore.initializeMap(leftMap, emitter)
    leftMap.on('mousemove', (e: any) => {
      if (!leftMap) return
      const features = leftMap.queryRenderedFeatures(e.point, {})
      if (features.length === 0) return
    })
  }

  if (mapContainerRight.value) {
    rightMap = new maplibregl.Map({
      container: mapContainerRight.value, // use ref instead of string id
      style: rightStyle,
      center: props._center,
      zoom: props._zoom,
      hash: true,
      transformRequest: (url: string) => {
        // If this is a local resource (starts with '/'), prepend sitePath
        if (url.startsWith('/')) {
          return {
            url: sitePath + url
          }
        }
        // If this is an absolute URL on the same origin, insert the base path
        if (sitePath && typeof window !== 'undefined') {
          const origin = window.location.origin;
          if (url.startsWith(origin + '/') && !url.includes(sitePath)) {
            // Insert the base path after the origin
            const path = url.substring(origin.length);
            // Ensure proper path joining (avoid double slashes)
            const basePath = sitePath.endsWith('/') ? sitePath.slice(0, -1) : sitePath;
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            return {
              url: origin + basePath + cleanPath
            }
          }
        }
        return { url }
      }
    })
    rightIndicatorLevelStore.initializeMap(rightMap, emitter)
    rightMap.on('mousemove', (e: any) => {
      if (!rightMap) return
      const features = rightMap.queryRenderedFeatures(e.point, {})
      if (features.length === 0) return
    })
  }

  if (leftMap && rightMap) {
    _compare = new Compare(leftMap, rightMap, comparisonContainer, { type: props._type })
  }
})

onUnmounted(() => {
  if (leftMap) {
    leftMap.remove()
  }
  if (rightMap) {
    rightMap.remove()
  }
})
</script>
<style>
.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: crosshair !important;
  width: 100%;
  transition: width .3s ease-in-out;
  border-left: 1px solid black;
}

.map-container.collapsed {
  width: calc(100% + 8px);
}

.maplibregl-canvas-container.maplibregl-interactive {
  cursor: crosshair !important;
}

#comparison-container {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
</style>
