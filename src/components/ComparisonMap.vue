<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container left"> </div>
    <TimelineVisualization side="left" />
    <ColorLegend
      v-if="leftIndicatorLevelStore.getCurrentIndicator() && leftIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
      :selected-indicator="leftIndicatorLevelStore.getCurrentIndicator()" side="left" />

    <div ref="mapContainerRight" class="map-container right"> </div>
    <TimelineVisualization side="right" />
    <ColorLegend
      v-if="rightIndicatorLevelStore.getCurrentIndicator() && rightIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
      :selected-indicator="rightIndicatorLevelStore.getCurrentIndicator()" side="right" />

  </div>
</template>

<script lang="ts" setup>
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css';
import { inject, onBeforeMount, onMounted, onUnmounted, ref, watch } from 'vue'
//import { indicators } from '../assets/indicators.json'
import Compare from '../assets/maplibre-gl-compare.js'
//import Compare from 'maplibre-gl-compare-plus';
import '../assets/maplibre-gl-compare.css';
import TimelineVisualization from './TimelineVisualization.vue'
//import '../assets/maplibre-gl-compare.css'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
import ColorLegend from './ColorLegend.vue'
import type { Emitter } from 'mitt'
import createArcGISStyle from '../utils/createArcGISStyle'

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
  _orientation?: 'left-right' | 'top-bottom'
}>()

const orientation = ref<'left-right' | 'top-bottom'>()
orientation.value = window.innerWidth > window.innerHeight ? 'left-right' : 'top-bottom'
//const orientation = ref('top-bottom')
const leftIndicatorLevelStore = useIndicatorLevelStore('left')
const rightIndicatorLevelStore = useIndicatorLevelStore('right')

const emitter = inject('mitt') as Emitter<any>

let leftMarker: maplibregl.Marker | null = null
let rightMarker: maplibregl.Marker | null = null

let _compare: Compare | null = null
// Watch for changes in props._type and execute function based on value
watch(() => props._type, (newType) => {
  if (_compare) _compare.switchType(newType)
})

onBeforeMount(() => { })
onMounted(async () => {
  console.log('mnt')
  // Ensure the container is properly initialized
  const sitePath = inject('sitePath') as string;

  const leftStyle = await createArcGISStyle(sitePath) as any
  const rightStyle = await createArcGISStyle(sitePath) as any

  if (mapContainerLeft.value) {

    leftMap = new maplibregl.Map({
      container: mapContainerLeft.value, // use ref instead of string id
      style: leftStyle,
      center: props._center,
      zoom: props._zoom,
      hash: true,
      transformRequest: (url: string) => {
        // Handle ArcGIS tile requests (no modification needed)
        if (url.includes('arcgisonline.com') || url.includes('arcgis.com')) {
          return { url }
        }
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
        // Handle ArcGIS tile requests (no modification needed)
        if (url.includes('arcgisonline.com') || url.includes('arcgis.com')) {
          return { url }
        }
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
    _compare = new Compare(leftMap, rightMap, comparisonContainer, { orientation: orientation.value, type: props._type, position:['top', 'horiz-center'] as any })
  }

  // Listen for location selection events
  emitter.on('location-selected', handleLocationSelected)
  emitter.on('location-cleared', handleLocationCleared)
})

const handleLocationSelected = (data: { coordinates: [number, number], text: string }) => {
  const [lng, lat] = data.coordinates

  // Center both maps on the location
  if (leftMap) {
    leftMap.flyTo({
      center: [lng, lat],
      zoom: Math.max(leftMap.getZoom(), 12),
      duration: 1000
    })
  }

  if (rightMap) {
    rightMap.flyTo({
      center: [lng, lat],
      zoom: Math.max(rightMap.getZoom(), 12),
      duration: 1000
    })
  }

  // Remove existing markers
  if (leftMarker) {
    leftMarker.remove()
    leftMarker = null
  }
  if (rightMarker) {
    rightMarker.remove()
    rightMarker = null
  }

  // Create marker element with close button
  const createMarkerElement = () => {
    const el = document.createElement('div')
    el.className = 'location-marker'

    // Create pin icon
    const pinIcon = document.createElement('div')
    pinIcon.className = 'pin-icon'
    pinIcon.innerHTML = `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#dc2626"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
      </svg>
    `

    // Create close button
    const closeBtn = document.createElement('button')
    closeBtn.className = 'marker-close-btn'
    closeBtn.innerHTML = '×'
    closeBtn.setAttribute('aria-label', 'Remove location')
    closeBtn.onclick = (e) => {
      e.stopPropagation()
      handleLocationCleared()
    }

    el.appendChild(pinIcon)
    el.appendChild(closeBtn)

    return el
  }

  // Add markers to both maps
  if (leftMap) {
    const leftMarkerEl = createMarkerElement()
    leftMarker = new maplibregl.Marker({
      element: leftMarkerEl,
      anchor: 'bottom'
    })
      .setLngLat([lng, lat])
      .addTo(leftMap)
  }

  if (rightMap) {
    const rightMarkerEl = createMarkerElement()
    rightMarker = new maplibregl.Marker({
      element: rightMarkerEl,
      anchor: 'bottom'
    })
      .setLngLat([lng, lat])
      .addTo(rightMap)
  }
}

const handleLocationCleared = () => {
  if (leftMarker) {
    leftMarker.remove()
    leftMarker = null
  }
  if (rightMarker) {
    rightMarker.remove()
    rightMarker = null
  }
}

onUnmounted(() => {
  emitter.off('location-selected', handleLocationSelected)
  emitter.off('location-cleared', handleLocationCleared)

  handleLocationCleared()

  leftIndicatorLevelStore.removeMap()
  rightIndicatorLevelStore.removeMap()
  if (leftMap) {
    leftMap.remove()
  }
  if (rightMap) {
    rightMap.remove()
  }
  const containerEl = document.querySelector(comparisonContainer) as HTMLElement | null
  containerEl?.classList.remove('orientation-left-right', 'orientation-top-bottom')
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
  overflow: visible;
}

.map-container.right {
  border-left: 1px solid black;
}

.slider .map-container.right .timeline-header {
  right: 0;
  left: unset;
}

.slider .map-container.right .timeline-visualization {
  right: 20px;
  left: unset;
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
  overflow: hidden;
}

.location-marker {
  position: relative;
  cursor: pointer;
}

.pin-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.2s;
}

.location-marker:hover .pin-icon {
  transform: scale(1.1);
}

.marker-close-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #dc2626;
  color: #dc2626;
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  z-index: 10;
}

.marker-close-btn:hover {
  background: #dc2626;
  color: white;
  transform: scale(1.1);
}

#comparison-container.orientation-top-bottom.sideBySide .map-container {
  position: relative;
  height: 50%;
  width: 100%;
  border-left: none;
}

#comparison-container.orientation-top-bottom.sideBySide .map-container.right {
  border-top: 1px solid black;
}

.orientation-top-bottom .timeline-visualization-container.left .timeline-header{
  right: 0px;

}

.orientation-top-bottom 
.timeline-visualization-container.left 
.timeline-visualization{
  top: 50%;
  bottom: auto;
  transform: translateY(-100%);
  right: 0px;
  left: unset;
  zoom: .7;
}

.orientation-top-bottom 
.timeline-visualization-container.right 
.timeline-header{
  right: 0px;
  top: 50%;
}

.orientation-top-bottom 
.timeline-visualization-container.right 
.timeline-visualization{
  zoom: .7;
  left: unset;
  right: 5px;
  bottom: 5px !important;
}
</style>
