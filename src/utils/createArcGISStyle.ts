export default async function createArcGISStyle(sitePath: string) {
    const _token = 'AAPTxy8BH1VEsoebNVZXo8HurIeMuENS73kZqZHjRkbmCmUqodq0aZ3k4LkzH1hNzZt_ByURd7Ag3XoF1eOr43EFk6RMAKLoCDShkeXEaATvQIvvvyJidHeLEHtMhKYFXz-yz1y9R0QSUSOLQ1CMFeeVvd4t1-rsB2LSsNLk0TdveE7yyURu2F7LTkgtYpR3vdEUtooxW_1GHUzZjrPmjIPMW43Vh0wI35F_QOda3QKzwFo.AT1_tCIPsJMe'
    const style = await fetch(`https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/open/navigation?token=${_token}`).then(res => res.json())
    console.log(style)
    style.sources = {
        ...style.sources, ...{
            'tracts-harmonized': {
                type: 'geojson',
                data: sitePath + '/ChestLanTractsHarmonized.geojson'
            },
            'points-source': {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 10
            }
        }
    }
    style.layers = [
        ...style.layers,
        ...[{
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
                id: 'point-data-circle',
                type: 'circle',
                source: 'points-source',
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'circle-color': '#fff',
                    'circle-radius': 8
                }
            },
            {
                id: 'point-data',
                type: 'symbol',
                source: 'points-source',
                layout: {
                    visibility: 'none',
                    'icon-size': 0.75,
                    'icon-allow-overlap': false,
                    'icon-overlap': 'cooperative',
                    'icon-ignore-placement': false
                },
                paint: {
                    'icon-halo-color': '#fff',
                    'icon-halo-width': 2,
                    'icon-color': '#888'
                }
            }
        ]
    ]
    return style
}
