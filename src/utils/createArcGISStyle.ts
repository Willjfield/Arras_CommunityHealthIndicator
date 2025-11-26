import { ARCGIS_TOKEN } from './arcgisConfig'

export default async function createArcGISStyle(sitePath: string) {
    const _token = ARCGIS_TOKEN
    const style = await fetch(`https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/open/navigation?token=${_token}`).then(res => res.json())
    console.log(style)
    style.sources = {
        ...style.sources, ...{
            'places-source': {
                    type: 'geojson',
                    data: `https://services8.arcgis.com/Md1Xw98rMGIJNURK/ArcGIS/rest/services/ArrasIncorporatedPlaces/FeatureServer/0/query?where=OBJECTID%3E-1&objectIds=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=${_token}`,
            },
            'tracts-harmonized': {
                type: 'geojson',
                data: sitePath + 'ChestLanTractsHarmonized.geojson'
            },
            'points-source': {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                // cluster: true,
                // clusterMaxZoom: 14,
                // clusterRadius: 10
            }
        }
    }
    const indexOfPlacesLabel = style.layers.findIndex((layer: any) => layer.id === 'admin 2')
    console.log(indexOfPlacesLabel)
    style.layers.splice(indexOfPlacesLabel, 0, {
        id: 'places-fill',
        type: 'fill',
        source: 'places-source',
        layout: {
            visibility: 'visible'
        },
        paint: {
            'fill-color': '#3388ff',
            'fill-opacity': 0.5
        }
    })
    style.layers.splice(indexOfPlacesLabel + 1, 0, {
        id: 'places-outline',
        type: 'line',
        source: 'places-source',
        paint:{
            'line-opacity': 0.25
        },
        layout: {
            visibility: 'visible'
        },
    })
    style.layers = [
        ...style.layers,
        ...[
        {
                id: 'tracts-harmonized-fill',
                type: 'fill',
                source: 'tracts-harmonized',
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'fill-color': '#3388ff',
                    'fill-opacity': {
                        stops: [
                            [10, 1],
                            [12, 0.65]
                        ]
                    }
                }
            },
            {
                id: 'tracts-harmonized-outline',
                type: 'line',
                source: 'tracts-harmonized',
                layout: {
                    visibility: 'visible'
                },
                paint: {
                    'line-width': 2,
                    'line-color': '#0000'
                }
            },
            {
                id: 'places-label',
                type: 'symbol',
                source: 'places-source',
                layout: {
                    visibility: 'none',
                    'text-anchor': 'center',
                    'text-field': '{NAME}',
                    'text-font': ['Noto Sans Bold'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#000'
                }
            },
            {
                id: 'point-data-circle',
                type: 'circle',
                source: 'points-source',
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'circle-color': '#fff',
                    'circle-radius': [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9, 1,
                        15, 4
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#000',
                    'circle-stroke-opacity': 0.5
                }
            },
            {
                id: 'point-data',
                type: 'symbol',
                source: 'points-source',
                layout: {
                    visibility: 'none',
                    'icon-size': [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9, 0.25,
                        15, 1
                    ],
                    'icon-allow-overlap': false,
                    'icon-overlap': 'cooperative',
                    'icon-ignore-placement': false
                },
                paint: {
                    // 'icon-halo-color': '#fff',
                    // 'icon-halo-width': 2,
                    'icon-color': '#000'
                }
            }
        ]
    ]
    return style
}
