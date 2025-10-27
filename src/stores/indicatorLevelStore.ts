import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'
import { createDataToMapWorker } from '../utils/dataToMapWorkerFactory.ts'
import type { PointDataToMap } from '../utils/pointDataToMap.ts'
import type { AreaDataToMap } from '../utils/areaDataToMap.ts'
export interface IndicatorLevelStore {
    currentIndicator: IndicatorConfig | null
    currentIndicatorData: any
    currentYear: number | null
    setIndicatorFromIndicatorShortName: (indicatorShortName: string) => void
    getCurrentIndicator: () => IndicatorConfig | null
    initializeMap: (_map: maplibregl.Map) => void
    removeMap: () => void
    worker: PointDataToMap | AreaDataToMap | null
}

const themeLevelStore = useThemeLevelStore()

const indicatorLevelStore = (storeName: 'left' | 'right') => {

    const currentThemeIndicators = themeLevelStore.getAllCurrentThemeIndicators()
    const currentIndicator = ref<IndicatorConfig | null>(null)
    const currentGeoSelection = ref<string | null>(null)
    let map: maplibregl.Map | null = null
    const currentYear = ref<number | null>(null)
    currentYear.value = 2023; //TODO get year from google sheets
    // Set the default indicator for the side
    const defaultForSide = currentThemeIndicators?.find((i: IndicatorConfig) => storeName.includes(i.default as string)) || null

    function initializeMap(_map: maplibregl.Map) {
        map = _map
        _map.on('load', async () => {
            await setIndicatorFromIndicatorShortName(defaultForSide?.short_name || '')
        })
    }

    let worker: AreaDataToMap | PointDataToMap | null = null;
    function removeMap() {
        map = null
    }

    async function setCurrentYear(year: number) {
        currentYear.value = year
        if(worker) {
            await worker.setPaintAndLayoutProperties(year)
        }
    }
    function getCurrentYear(): number | null {
        return currentYear.value
    }
    function getCurrentGeoSelection(): string | null {
        return currentGeoSelection.value
    }
    function setCurrentGeoSelection(geoSelection: string) {
        currentGeoSelection.value = geoSelection
    }
    async function setIndicatorFromIndicatorShortName(indicatorShortName: string) {
        const indicator = currentThemeIndicators?.find((i: IndicatorConfig) => i.short_name === indicatorShortName) || null
        if (indicator) {
            currentIndicator.value = indicator

            if(worker) {
                worker.removeOldEvents();
                worker=null;
            }

            worker = createDataToMapWorker(indicator, map);

            if (worker) {
                await worker.setupIndicator()
                const defaultYear = indicator.google_sheets_data.headerShortNames[ indicator.google_sheets_data.headerShortNames.length - 1];
                await setCurrentYear(defaultYear)
                setCurrentGeoSelection('Overall')
            }
        } else {
            currentIndicator.value = null
        }

    }

    function getCurrentIndicator(): IndicatorConfig | null {
        return currentIndicator.value || null
    }

    return { setIndicatorFromIndicatorShortName, getCurrentIndicator, initializeMap, removeMap, setCurrentYear, getCurrentYear, getCurrentGeoSelection, setCurrentGeoSelection }
}

// This is where the difference is to make unique stores:
export const useIndicatorLevelStore = (storeName: 'left' | 'right') => {
    const store = defineStore(`${storeName}-indicator`, () => indicatorLevelStore(storeName))
    return store()
}

export default useIndicatorLevelStore


