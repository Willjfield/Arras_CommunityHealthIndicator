import { AreaDataToMap } from './areaDataToMap.ts'
import { PointDataToMap } from './pointDataToMap.ts'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import type maplibregl from 'maplibre-gl'
import type { Emitter } from 'mitt'

export function createDataToMapWorker(indicator: IndicatorConfig, map: maplibregl.Map | null, side: 'left' | 'right' | null = null, emitter?: Emitter<any | null>) : AreaDataToMap | PointDataToMap | null {
    if (!map) {
        return null
    }
   // console.log('createDataToMapWorker', indicator, map, side, emitter)
    switch (indicator?.geolevel) {
        case 'area':
                return new AreaDataToMap(indicator, map, side, emitter)
        case 'point':
            return new PointDataToMap(indicator, map, side, emitter)
        default:
            return null
    }
}