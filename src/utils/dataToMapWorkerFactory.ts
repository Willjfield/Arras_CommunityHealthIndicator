import { TractTimeSeriesToMap } from './tractTimeSeriesToMap.ts'
import { PointStaticTimeToMap } from './pointStaticTimeToMap.ts'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import type { DataToMap } from './dataToMap.ts'

export function createDataToMapWorker(indicator: IndicatorConfig) : DataToMap | null {
    switch (indicator?.geolevel) {
        case 'tract':
            if(indicator?.timeseries) {
                return new TractTimeSeriesToMap(indicator)
            } else {
                //TODO return new TractStaticTimeToMap(indicator)
                return null
            }
        case 'point':
            if(indicator?.timeseries) {
                //TODO return new PointTimeSeriesToMap(indicator)
                return null
            } else {
                return new PointStaticTimeToMap(indicator)
            }
        default:
            return null
    }
}