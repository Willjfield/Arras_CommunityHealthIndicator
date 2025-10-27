import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'
import { createDataToMapWorker } from '../utils/dataToMapWorkerFactory.ts'
import type { PointDataToMap } from '../utils/pointDataToMap.ts'
import type { AreaDataToMap } from '../utils/areaDataToMap.ts'
import type { Emitter } from 'mitt'
export interface IndicatorLevelStore {
    currentIndicator: IndicatorConfig | null
    currentIndicatorData: any
    currentYear: number | null
    setIndicatorFromIndicatorShortName: (indicatorShortName: string, emitter?: Emitter<any>) => void
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

    function initializeMap(_map: maplibregl.Map, emitter?: Emitter<any>) {
        console.log('initializeMap', emitter)
        map = _map
        _map.on('load', async () => {
            await setIndicatorFromIndicatorShortName(defaultForSide?.short_name || '', emitter)
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
    async function setIndicatorFromIndicatorShortName(indicatorShortName: string, emitter?: Emitter<any>) {
        const indicator = currentThemeIndicators?.find((i: IndicatorConfig) => i.short_name === indicatorShortName) || null
        if (indicator) {
            currentIndicator.value = indicator

            if(worker) {
                worker.removeOldEvents();
                worker=null;
            }

            // Pass storeName only as 'left' or 'right'
            console.log(emitter)
            worker = createDataToMapWorker(indicator, map, storeName as 'left' | 'right' | null, emitter);
            console.log('worker', worker)
            if (worker) {
                const headerShortNames = indicator.google_sheets_data.headerShortNames;
                const defaultYear = headerShortNames && headerShortNames.length > 0 
                    ? headerShortNames[headerShortNames.length - 1]
                    : null;
                if (defaultYear !== null) {
                    await worker.setupIndicator(defaultYear);
                }
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


