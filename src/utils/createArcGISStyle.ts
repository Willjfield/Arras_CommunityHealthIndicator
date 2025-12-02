import { ARCGIS_TOKEN } from "./arcgisConfig";
import { sources, layers } from "./addedData.json";
export default async function createArcGISStyle(sitePath: string) {
  const _token = ARCGIS_TOKEN;
  const style = await fetch(
    `https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/open/navigation?token=${_token}`
  ).then((res) => res.json());
  
  style.sources = {
    ...style.sources,
    ...JSON.parse(
      JSON.stringify(sources)
      .replaceAll("${sitePath}", sitePath)
      .replaceAll("${_token}", _token)
    ) as any
  };
  console.log(style.sources);
  const indexOfPlacesLabel = style.layers.findIndex(
    (layer: any) => layer.id === "admin 2"
  );
  style.layers.splice(indexOfPlacesLabel, 0, ...(layers["under-labels"] as any));
  style.layers.push(...(layers["over-labels"] as any));
  return style;
}
