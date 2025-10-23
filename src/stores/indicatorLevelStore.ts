import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'
import { createDataToMapWorker } from '../utils/dataToMapWorkerFactory.ts'
export interface IndicatorLevelStore {
    currentIndicator: IndicatorConfig | null
    currentIndicatorData: any
    setIndicatorFromIndicatorShortName: (indicatorShortName: string) => void
    getCurrentIndicator: () => IndicatorConfig | null
    initializeMap: (_map: maplibregl.Map) => void
    removeMap: () => void
}

const themeLevelStore = useThemeLevelStore()

const indicatorLevelStore = (storeName: 'left' | 'right') => {

    const currentThemeIndicators = themeLevelStore.getAllCurrentThemeIndicators()
    const currentIndicator = ref<IndicatorConfig | null>(null)
    let map: maplibregl.Map | null = null

    // Set the default indicator for the side
    const defaultForSide = currentThemeIndicators?.find((i: IndicatorConfig) => storeName.includes(i.default as string)) || null

    function initializeMap(_map: maplibregl.Map) {
        map = _map
        _map.on('load', async () => {
            await setIndicatorFromIndicatorShortName(defaultForSide?.short_name || '')
        })
    }
    function removeMap() {
        map = null
    }

    async function setIndicatorFromIndicatorShortName(indicatorShortName: string) {

        const indicator = currentThemeIndicators?.find((i: IndicatorConfig) => i.short_name === indicatorShortName) || null
        if (indicator) {
            currentIndicator.value = indicator
            const worker = createDataToMapWorker(indicator, map)
            if (worker) {
                await worker.setupIndicator()
            }
        } else {
            currentIndicator.value = null
        }

    }

    function getCurrentIndicator(): IndicatorConfig | null {
        return currentIndicator.value || null
    }

    return { setIndicatorFromIndicatorShortName, getCurrentIndicator, initializeMap, removeMap }
}

// This is where the difference is to make unique stores:
export const useIndicatorLevelStore = (storeName: 'left' | 'right') => {
    const store = defineStore(`${storeName}-indicator`, () => indicatorLevelStore(storeName))
    return store()
}

export default useIndicatorLevelStore


