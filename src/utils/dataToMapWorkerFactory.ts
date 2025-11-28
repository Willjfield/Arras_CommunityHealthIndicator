import { AreaDataToMap } from './areaDataToMap.ts'
import { PointDataToMap } from './pointDataToMap.ts'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import type maplibregl from 'maplibre-gl'
import type { Emitter } from 'mitt'

export function createDataToMapWorker(indicator: IndicatorConfig, map: maplibregl.Map | null, side: 'left' | 'right' | null = null, emitter?: Emitter<any | null>, arrasBranding?: any) : AreaDataToMap | PointDataToMap | null {
    if (!map) {
        return null
    }
    switch (indicator?.geolevel) {
        case 'area':
                return new AreaDataToMap(indicator, map, side, emitter, arrasBranding as any)
        case 'point':
            return new PointDataToMap(indicator, map, side, emitter, arrasBranding as any)
        default:
            return null
    }
}