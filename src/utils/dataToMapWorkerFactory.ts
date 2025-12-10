import { AreaDataToMap } from './areaDataToMap.ts'
import { PointDataToMap } from './pointDataToMap.ts'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import type maplibregl from 'maplibre-gl'
import type { Emitter } from 'mitt'

/**
 * Factory function to create the appropriate data-to-map worker based on indicator geolevel
 * Returns AreaDataToMap for polygon/area data, PointDataToMap for point data
 * @param indicator - The indicator configuration
 * @param map - MapLibre GL map instance
 * @param side - Which map side ('left' or 'right') for side-by-side comparison
 * @param emitter - Event emitter for cross-component communication
 * @param arrasBranding - Branding configuration with colors
 * @param sitePath - Base path for the application
 * @returns Appropriate DataToMap instance or null if map/invalid geolevel
 */
export function createDataToMapWorker(
    indicator: IndicatorConfig,
    map: maplibregl.Map | null,
    side: 'left' | 'right' | null = null,
    emitter?: Emitter<any | null>,
    arrasBranding?: any,
    sitePath?: string
): AreaDataToMap | PointDataToMap | null {
    if (!map) {
        return null;
    }
    
    switch (indicator?.geolevel) {
        case 'area':
            return new AreaDataToMap(indicator, map, side, emitter, arrasBranding, sitePath);
        case 'point':
            return new PointDataToMap(indicator, map, side, emitter, arrasBranding, sitePath);
        default:
            console.warn(`Unknown geolevel: ${indicator?.geolevel}`);
            return null;
    }
}