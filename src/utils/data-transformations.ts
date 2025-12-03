function formatGoogleSheetData(csvString: string) {
  const rows = csvString.split("\n");
  const shortNameRowIdx = rows.findIndex(
    (row) => !row.includes("-") && row.includes("geoid")
  );

  const headerShortNames = rows[shortNameRowIdx]
    .split(",")
    .map((header) => header.trim());
  const labelRowIdx = 1 - shortNameRowIdx; //If shortNameRowIdx is 0, then labelRowIdx is 1, if shortNameRowIdx is 1, then labelRowIdx is 0
  const headerLabels = rows[labelRowIdx]
    .split(",")
    .map((header) => header.trim());

  const data = rows.slice(2).map((row) => {
    const values = row
      .split(",")
      .map((value, index) =>
        index !== headerShortNames.indexOf("geoid")
          ? value.trim()
          : value.trim().toLowerCase()
      )
      .map((value: string) =>
        !isNaN(Number(value)) && value.includes(".")
          ? Number(value).toFixed(2)
          : value
      );

    // console.log(values)
    return headerShortNames.reduce(
      (acc: Record<string, string>, header: string, index: number) => {
        acc[header] = values[index];
        return acc;
      },
      {} as Record<string, string>
    );
  });
  //IPUMS data has extra zeros in the geoid, we need to remove them
  data.forEach((row) => {
    if (
      row.geoid &&
      (row.geoid.includes("005700") || row.geoid.includes("002300"))
    ) {
      row.geoid = row.geoid
        .replace("G", "")
        .replace("g", "")
        .replace("005700", "0570")
        .replace("002300", "0230");
    }
    //Some data should be percentages but is not formatted correctly
    Object.keys(row).forEach((key) => {
      if (
        !key.includes("Count_") &&
        row[key] &&
        !isNaN(Number(row[key])) &&
        Number(row[key]) > 0 &&
        Number(row[key]) < 1
      ) {
        row[key] = (Number(row[key]) * 100).toString();
      }
    });
  });

  return {
    headerLabels,
    headerShortNames,
    data,
  };
}

const svgToPng = async (
  svg: string,
  invertColors: boolean = false,
  arrasBranding: any,
  data: any
): Promise<HTMLImageElement> => {
  const SCALE_FACTOR = 0.667;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const circle = doc.getElementsByClassName("bg-circle")[0] as HTMLElement;
  const circleTransform = `translate(${SCALE_FACTOR * 25}%, ${
    SCALE_FACTOR * 25
  }%) scale(${SCALE_FACTOR})`;
  const paths = doc.getElementsByTagName(
    "path"
  ) as HTMLCollectionOf<SVGPathElement>;

  const pngColors = {
    icon: arrasBranding.colors[data.style.colors.icon],
    circle: arrasBranding.colors[data.style.colors.circle] + "cc",
  };
  if (invertColors) {
    pngColors.icon = arrasBranding.colors[data.style.colors.icon];
    pngColors.circle = arrasBranding.colors[data.style.colors.icon] + "70";
  }

  for (let path = 1; path < paths.length; path++) {
    paths[path].setAttribute("fill", pngColors.icon);
  }
  if (circle) {
    circle.style.transform = circleTransform;
    circle.setAttribute("fill", pngColors.circle);
  }
  svg = doc.documentElement.outerHTML;

  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const iconSize = 64;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create a canvas to rasterize the SVG to PNG
      const canvas = document.createElement("canvas");
      // Use natural dimensions if available, otherwise default to 16x16
      const width = iconSize; //img.naturalWidth || img.width || 16;
      const height = iconSize; //img.naturalHeight || img.height || 16;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw the SVG image to the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Create a new image element from the canvas PNG data URL
      const pngImg = new Image();
      pngImg.onload = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(pngImg);
      };
      pngImg.onerror = (error) => {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      };
      // Convert canvas to PNG data URL
      pngImg.src = canvas.toDataURL("image/png");
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(svgUrl);
      reject(error);
    };
    img.src = svgUrl;
  });
};

export { formatGoogleSheetData, svgToPng };
