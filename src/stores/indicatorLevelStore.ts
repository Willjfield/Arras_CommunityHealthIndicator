import { defineStore } from 'pinia'
import { ref, inject } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'
import { createDataToMapWorker } from '../utils/dataToMapWorkerFactory.ts'
import type { PointDataToMap } from '../utils/pointDataToMap.ts'
import type { AreaDataToMap } from '../utils/areaDataToMap.ts'
import type { Emitter } from 'mitt'
import { DEFAULT_YEAR, DEFAULT_GEO_SELECTION } from '../constants'

/**
 * Store interface for indicator-level state management
 * Each map side (left/right) has its own instance of this store
 */
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
    const arrasBranding = ref<any>(inject('arrasBranding') as any)
    const sitePath = inject('sitePath') as string
    const currentThemeIndicators = themeLevelStore.getAllCurrentThemeIndicators()
    const currentIndicator = ref<IndicatorConfig | null>(null)
    const currentGeoSelection = ref<string | null>(null)
    let map: maplibregl.Map | null = null
    const currentYear = ref<number | null>(DEFAULT_YEAR)
    
    // Set the default indicator for this side (left or right)
    const defaultForSide = currentThemeIndicators?.find(
      (i: IndicatorConfig) => storeName.includes(i.default as string)
    ) || null

    function initializeMap(_map: maplibregl.Map, emitter?: Emitter<any>) {
        map = _map
        _map.on('load', async () => {
            await setIndicatorFromIndicatorShortName(defaultForSide?.short_name || '', emitter)
        })
    }

    let worker: AreaDataToMap | PointDataToMap | null = null;

   
    function removeMap() {
        if(worker) {
            worker.removeOldEvents();
            worker.hideLayers();
            worker = null;
        }
        map = null
    }

    async function setCurrentYear(year: number | string) {
    
        if(typeof year === 'string') {
            year = +(year.replace(/[^0-9]/g, ''))
        }

        currentYear.value = year
        if(worker) {
            await worker.setPaintAndLayoutProperties(year as number)
        }
    }
    function getCurrentYear(): number | null {
        return currentYear.value
    }
    /**
     * Gets the currently selected geography
     * @returns Lowercase geography identifier, defaults to DEFAULT_GEO_SELECTION
     */
    function getCurrentGeoSelection(): string | null {
        return currentGeoSelection.value?.toLowerCase() || DEFAULT_GEO_SELECTION
    }
    function setCurrentGeoSelection(geoSelection: string) {
        currentGeoSelection.value = geoSelection?.toLowerCase() || null
    }
    /**
     * Sets the current indicator by short name and initializes the map worker
     * Finds the latest available year from the data and sets it as default
     */
    async function setIndicatorFromIndicatorShortName(indicatorShortName: string, emitter?: Emitter<any>) {
        const indicator = currentThemeIndicators?.find(
            (i: IndicatorConfig) => i.short_name === indicatorShortName
        ) || null
        
        if (indicator) {
            currentIndicator.value = indicator

            // Clean up existing worker
            if (worker) {
                worker.removeOldEvents();
                worker.hideLayers();
                worker = null;
            }

            // Create new worker for this indicator
            worker = createDataToMapWorker(
                indicator,
                map,
                storeName as 'left' | 'right' | null,
                emitter,
                arrasBranding.value,
                sitePath
            );

            if (worker) {
                // Find available years - prefer 4-digit years, fallback to Count_ prefixed columns
                const headerShortNames = indicator.google_sheets_data.headerShortNames;
                let defaultYears = headerShortNames && headerShortNames.length > 0 
                    ? headerShortNames
                        .filter((year: string) => /^\d{4}$/.test(year))
                        .sort((a: string, b: string) => Number(a) - Number(b))
                    : null;
                    
                if (!defaultYears || defaultYears.length === 0) {
                    defaultYears = headerShortNames
                        .filter((year: string) => year.startsWith('Count_'))
                        .sort((a: string, b: string) => 
                            Number(a.replace('Count_', '')) - Number(b.replace('Count_', ''))
                        );
                }
                
                // Use the latest year as default
                let defaultYear = null;
                if (defaultYears !== null && defaultYears.length > 0) {
                    defaultYear = defaultYears[defaultYears.length - 1];
                    await worker.setupIndicator(defaultYear);
                }
                
                await setCurrentYear(defaultYear);
                setCurrentGeoSelection(DEFAULT_GEO_SELECTION);
                
                // Listen for geography selection events
                emitter?.on(`feature-${storeName}-clicked`, (feature: string | null) => {
                    setCurrentGeoSelection(feature || DEFAULT_GEO_SELECTION);
                });
            }
        } else {
            currentIndicator.value = null;
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


