<template>
  <div v-show="orientation === 'left-right'" class="location-search-container">
    <v-autocomplete
      v-model="selectedLocation"
      :items="suggestions"
      :loading="loading"
      :search="searchQuery"
      item-title="text"
      return-object
      placeholder="Search for a location..."
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="location-search-input"
      @update:search="handleSearch"
      @update:model-value="handleLocationSelect"
    >
      <template v-slot:prepend-inner>
        <v-icon icon="mdi-magnify" size="20"></v-icon>
      </template>
      <template v-slot:no-data>
        <div class="pa-2 text-center">
          <div v-if="searchQuery && !loading">No locations found</div>
          <div v-else>Start typing to search...</div>
        </div>
      </template>
    </v-autocomplete>
    <v-btn
      v-if="selectedLocation"
      icon
      size="small"
      variant="text"
      class="clear-btn"
      @click="clearLocation"
    >
      <v-icon icon="mdi-close" size="20"></v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { ref, inject } from 'vue'
import { ARCGIS_TOKEN } from '../utils/arcgisConfig'
import type { Emitter } from 'mitt'

interface GeocodeSuggestion {
  text: string
  location: {
    x: number
    y: number
  }
  magicKey?: string
}

const searchQuery = ref('')
const suggestions = ref<GeocodeSuggestion[]>([])
const loading = ref(false)
const selectedLocation = ref<GeocodeSuggestion | null>(null)
const emitter = inject('mitt') as Emitter<any>

let searchTimeout: ReturnType<typeof setTimeout> | null = null
const orientation = window.innerWidth > window.innerHeight ? 'left-right' : 'top-bottom'
const handleSearch = (query: string | null) => {
  searchQuery.value = query || ''
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (!query || query.length < 3) {
    suggestions.value = []
    return
  }

  loading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?countryCode=USA&text=${encodeURIComponent(query)}&f=json&token=${ARCGIS_TOKEN}`
      )
      const data = await response.json()
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Store suggestions with magicKey for later geocoding
        suggestions.value = data.suggestions.slice(0, 8).map((suggestion: any) => ({
          text: suggestion.text,
          magicKey: suggestion.magicKey,
          location: { x: 0, y: 0 } // Will be populated on selection
        }))
      } else {
        suggestions.value = []
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      suggestions.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

const handleLocationSelect = async (location: GeocodeSuggestion | null) => {
  if (!location) {
    // Location was cleared
    clearLocation()
    return
  }

  // Geocode the selected suggestion
  try {
    const geocodeUrl = location.magicKey
      ? `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?magicKey=${encodeURIComponent(location.magicKey)}&f=json&token=${ARCGIS_TOKEN}`
      : `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(location.text)}&f=json&token=${ARCGIS_TOKEN}`
    
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    
    if (geocodeData.candidates && geocodeData.candidates.length > 0) {
      const candidate = geocodeData.candidates[0]
      // Emit event with location coordinates [longitude, latitude]
      emitter.emit('location-selected', {
        coordinates: [candidate.location.x, candidate.location.y],
        text: location.text
      })
    }
  } catch (error) {
    console.error('Error geocoding location:', error)
  }
}

const clearLocation = () => {
  selectedLocation.value = null
  searchQuery.value = ''
  suggestions.value = []
  emitter.emit('location-cleared')
}
</script>

<style scoped>
.location-search-container {
  position: absolute;
    /* bottom: 205px; */
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 232px;
    z-index: 9999;
}

.location-search-input {
  flex: 1;
}

.location-search-input :deep(.v-field) {
  font-size: 14px;
  min-height: 40px;
}

.clear-btn {
  flex-shrink: 0;
}
</style>

