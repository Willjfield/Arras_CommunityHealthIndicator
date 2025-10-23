import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig'
import axios from 'axios'
import { formatGoogleSheetData } from '../utils/data-transformations'
export interface ThemeConfig {
    title: string
    query_str: string
    enabled?: boolean
    description: string
}

export const useThemeLevelStore = defineStore('themeLevel', () => {
    const currentThemeConfig = ref<ThemeConfig | null>(null)
    const currentThemeShortName = ref<string | null>(null)
    const categoryConfigs = inject('categoryConfigs') as any

    async function setCurrentTheme(shortName: string) {
        currentThemeShortName.value = shortName
        currentThemeConfig.value = categoryConfigs[shortName] as any
        //Get data from google sheets and store along with all the indicators in categoryConfigs
        //const categoryConfigs: Record<string, any> = {};
        const currentIndicatorConfigs: IndicatorConfig[] | null = getAllCurrentThemeIndicators()
        if (currentIndicatorConfigs) {
            await Promise.all(currentIndicatorConfigs.map(async (indicator: IndicatorConfig) => {
                indicator.google_sheets_data = formatGoogleSheetData((await axios.get(indicator.google_sheets_url)).data as any)
            }));
        }
    }

    function getCurrentThemeConfig() {
        return currentThemeConfig.value
    }

    function getAllCurrentThemeIndicators(): IndicatorConfig[] | null {
        const shortName = currentThemeShortName.value
        if (shortName) {
            return categoryConfigs[shortName]?.indicators as IndicatorConfig[] || []
        }
        return null
    }
    return { setCurrentTheme, getCurrentThemeConfig, getAllCurrentThemeIndicators }
})

