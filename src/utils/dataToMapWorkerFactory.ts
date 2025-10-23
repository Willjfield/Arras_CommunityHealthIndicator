import { AreaDataToMap } from './areaDataToMap.ts'
import { PointDataToMap } from './pointDataToMap.ts'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import type maplibregl from 'maplibre-gl'
export function createDataToMapWorker(indicator: IndicatorConfig, map: maplibregl.Map | null) : AreaDataToMap | PointDataToMap | null {
    if (!map) {
        return null
    }
    switch (indicator?.geolevel) {
        case 'area':
            return new AreaDataToMap(indicator, map)
        case 'point':
            return new PointDataToMap(indicator, map)
        default:
            return null
    }
}