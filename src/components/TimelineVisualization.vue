<template>
  <div class="timeline-visualization-container" :class="side === 'left' ? 'left' : 'right'">
    <div class="timeline-header">
      <IndicatorSelector :side="side" @indicator-changed="handleIndicatorChange" />
    </div>
    <v-select v-if="availableYears.length > 0" v-model="selectedYear" :items="availableYears" label="Year"
      density="compact" variant="solo" elevation="0" hide-details class="year-selector"
      @update:model-value="handleYearChange"></v-select>
    <div ref="container" class="timeline-visualization">

      <div class="chart-label">
        <div v-html="headerHTML" class="header-html">
        </div>

        <v-divider></v-divider>
        <span v-show="!hoveredGeo" class="hovered-geo mx-0 font-italic font-weight-medium">Hover over a feature to see
          the
          timeline</span>
        <span v-show="hoveredGeo" class="hovered-geo mx-0">{{ indicatorStore?.getCurrentIndicator()?.geotype === 'tract'
          ? 'Census Tract Number' : indicatorStore?.getCurrentIndicator()?.geotype === 'county' ? 'County FIPS code' :
          indicatorStore?.getCurrentIndicator()?.geotype === 'school' ? 'School' : 'ID' }}: {{ hoveredGeoName && hoveredGeoName.length > 0 ? hoveredGeoName : hoveredGeo }}<span class="hovered-color"
            :style="{ border: `2px solid ${hoveredColorRef}` }"></span></span>
      </div>
      <svg ref="svg" class="timeline-chart"></svg>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import { ref, onMounted, onUnmounted, watch, nextTick, inject, computed } from 'vue'
import useIndicatorLevelStore from '../stores/indicatorLevelStore';
import IndicatorSelector from './IndicatorSelector.vue';

const emitter = inject('mitt') as any
interface Props {
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorStore = useIndicatorLevelStore(props.side)
const useRateForOverall = computed(() => {
  if (!indicatorStore?.getCurrentIndicator()) return false;
  if (indicatorStore?.getCurrentIndicator()?.short_name === 'childcare') return false;
  return !indicatorStore?.getCurrentIndicator()?.has_pct && indicatorStore?.getCurrentIndicator()?.has_count && indicatorStore?.getCurrentIndicator()?.totalAmntOf !== 'dollars'
})
defineEmits<{
  indicatorChanged: [indicator: any, side: 'left' | 'right']
  close: []
}>()

const selectedColor = '#2563eb';
const hoveredColor = '#f80';
const statewideColor = '#7d7d7d';
const selectedColorRef = ref(selectedColor);
const hoveredColorRef = ref(hoveredColor);

const headerHTML = computed(() => {
  const indicator = indicatorStore?.getCurrentIndicator()
  const title = indicator?.title || ''
  const geoSelection = indicatorStore.getCurrentGeoSelection() || ''
  const geotype = indicator?.geotype || ''

  const titleSize = title.length > 40 ? 'font-size: .8em;' : 'font-size: 1em;';
  const line1 = `
  <div class="selected-geo" style="${titleSize}">${title}</div>
  `
  const line2 = geoSelection.toLowerCase().includes("overall") ?
    `<div class="selected-geo">Overall by ${geotype.charAt(0).toUpperCase() + geotype.slice(1)}</div>`
    :
    `<div class="selected-geo">(${geotype.charAt(0).toUpperCase() + geotype.slice(1)}: ${geoSelection})</div>`

  const data = indicator?.google_sheets_data;
  const statewide = data?.data.find((feature: any) => feature?.geoid.toLowerCase() === "statewide");
  let line2b = '';
  if (statewide) {
    line2b = `<div class="selected-geo">Statewide</div><span class="selected-color" style="border: 2px solid #7d7d7d"></span>`
  }
  const swatch = `<span class="selected-color" style="border: 2px solid ${selectedColorRef.value}"></span>`

  return `${line1}<br>${line2}${swatch} ${line2b}`
})

//const container = ref<HTMLElement>()
const svg = ref<SVGElement>()

let svgElement: d3.Selection<SVGElement, unknown, null, undefined>
let width = 450
let height = 100
let margin = { top: 15, right: 5, bottom: 15, left: 30 }
let yScale: d3.ScaleLinear<number, number> = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])

// Year selector - get available years from the indicator data
const availableYears = computed(() => {
  const indicator = indicatorStore.getCurrentIndicator()
  const raw_data = indicator?.google_sheets_data

  if (!raw_data) return []

  const headerShortNames = raw_data.headerShortNames
  let yearColumns: number[] = []

  if (indicator?.has_pct) {
    // Find year columns (numeric strings)
    yearColumns = headerShortNames.filter((header: string) =>
      /^\d{4}$/.test(header) && !isNaN(Number(header))
    ).map((year: string) => Number(year)).sort((a: number, b: number) => a - b)
  } else {
    yearColumns = headerShortNames
      .filter((header: string) =>
        header.startsWith('Count_')
      )
      .map((year: string) => Number(year.replace('Count_', '')))
      .sort((a: number, b: number) => a - b)
  }
  if (yearColumns.length === 0) {
    yearColumns = headerShortNames.filter((header: string) =>
      /^\d{4}$/.test(header) && !isNaN(Number(header))
    ).map((year: string) => Number(year)).sort((a: number, b: number) => a - b)
  }
  return yearColumns
})

const selectedYear = computed({
  get: () => indicatorStore.getCurrentYear(),
  set: (value: number | null) => {
    if (value !== null) {
      indicatorStore.setCurrentYear(value)
    }
  }
})

const handleYearChange = (year: number) => {
  indicatorStore.setCurrentYear(year)
}

const processData = (_feature: string | number | null) => {

  const indicator = indicatorStore.getCurrentIndicator()

  const raw_data = indicator?.google_sheets_data

  if (!raw_data) return []
  const headerShortNames = raw_data.headerShortNames
  const rows = raw_data.data

  //SET CURRENTGEO SELECTION TO HOVERED
  const currentGeoSelection = _feature || indicatorStore.getCurrentGeoSelection()

  let matchingRow: Record<string, any> | undefined = undefined;
  const data: Array<{ year: number; value: number | null }> = []
  let yearColumns: number[] = []
  //actual difference is totals or pcts. Is this always area vs point?
  if (indicator.has_pct) {
    // Find year columns (numeric strings)
    yearColumns = headerShortNames.filter((header: string) =>
      /^\d{4}$/.test(header) && !isNaN(Number(header))
    ).map((year: string) => Number(year)).sort((a: number, b: number) => a - b)
  } else {
    yearColumns = headerShortNames
      .filter((header: string) =>
        header.startsWith('Count_')
      )
      .map((year: string) => Number(year.replace('Count_', '')))
      .sort((a: number, b: number) => a - b)
  }
  matchingRow = rows.find((_row: Record<string, any>) =>
    '' + _row.geoid === '' + currentGeoSelection
  )
  if (!matchingRow) return []
  yearColumns.forEach((year: number) => {
    let yearValue = matchingRow?.[year.toString()]
    if (indicator?.has_count && !indicator?.has_pct) {
      yearValue = matchingRow?.['Count_' + year.toString()]
    }

    data.push({
      year,
      value: yearValue != null && yearValue !== "" ? Number(yearValue) : null
    })
  })

  return data
}

const createChart = () => {
  if (!svg.value) return

  const data = processData(null)

  if (data.length === 0) return

  // Clear previous chart
  d3.select(svg.value).selectAll('*').remove()

  svgElement = d3.select(svg.value)
    .attr('width', width)
    .attr('height', height)

  // Filter out null values for line chart
  const validData: Array<{ year: number; value: number | null }> = data.filter(d => d.value !== null && d.value > -1).map(d => ({
    year: d.year,
    value: d.value?.toFixed(2) ? Number(d.value?.toFixed(2)) : null
  }))

  if (validData.length === 0) {
    // Just show x-axis with years
    createAxisOnly(data)
    return
  }

  // Calculate scales
  const xScale = createXScale(data)
  yScale = createYScale(validData)

  // Create axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d.toString())
    .tickSize(0)
    .tickPadding(8)

  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => {
      return d.toLocaleString().replace(',000', 'K');
    })
    .tickSize(-width + margin.left + margin.right)
    .tickPadding(2)
    .ticks(5)

  // Add axes
  svgElement.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height + margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  svgElement.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  // Style grid lines
  svgElement.selectAll('.y-axis .tick line')
    .style('stroke', '#e0e0e0')
    .style('stroke-width', 1)

  // Add vertical line for current year
  const currentYear = indicatorStore.getCurrentYear()
  if (currentYear && data.some(d => d.year === currentYear)) {
    const currentYearX = xScale(currentYear)
    svgElement.append('line')
      .attr('class', 'current-year-line')
      .attr('x1', currentYearX)
      .attr('x2', currentYearX)
      .attr('y1', margin.top)
      .attr('y2', height + margin.bottom)
      .style('stroke', '#dc2626')
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.7)
  }

  // Create line generator
  const line = d3.line<{ year: number; value: number | null }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value!))
    .curve(d3.curveMonotoneX)

  // Add line
  svgElement.append('path')
    .datum(validData)
    .attr('class', 'timeline-line')
    .attr('d', line)
    .style('fill', 'none')
    .style('stroke', selectedColor)
    .style('stroke-width', 2)

  // Add data points
  const circles = svgElement.selectAll('.data-point')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value!))
    .attr('r', 4)
    .style('fill', selectedColor)
    .style('stroke', '#fff')
    .style('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (_, d) => {
      //emit('yearSelected', d.year)
      indicatorStore.setCurrentYear(d.year)
    })
    .on('mouseover', function (_, d) {
      if (d.year !== indicatorStore.getCurrentYear()) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .style('fill', '#1d4ed8')
      }
    })
    .on('mouseout', function (_, d) {
      if (d.year !== indicatorStore.getCurrentYear()) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .style('fill', '#2563eb')


      }
    })
  // Highlight selected year
  circles.filter(d => d.year === indicatorStore.getCurrentYear())
    .style('fill', '#dc2626')
    .attr('r', 5)

  // Add text labels next to circles
  svgElement.selectAll('.data-point-label')
    .data(validData)
    .enter()
    .append('text')
    .attr('class', 'data-point-label')
    .attr('x', d => xScale(d.year) + 4)
    .attr('y', d => yScale(d.value!) + 12)
    .attr('text-anchor', 'left')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#08f')
    .style('pointer-events', 'none')
    .text((d) => {
      if (useRateForOverall.value) {
        return d?.value?.toLocaleString()
          + ' '
          + indicatorStore?.getCurrentIndicator()?.totalAmntOf === 'dollars' ? '$' : ''
          + ' per ' + indicatorStore?.getCurrentIndicator()?.ratePer?.toLocaleString() || indicatorStore?.getCurrentIndicator()?.geotype || ''
        + ' avg.';
      }
      return (indicatorStore?.getCurrentIndicator()?.totalAmntOf === 'dollars' ? '$' : '') + (d?.value?.toLocaleString() || '') +  (indicatorStore?.getCurrentIndicator()?.has_pct && !indicatorStore?.getCurrentIndicator()?.totalAmntOf ? '%' : '');
    })


}
const hoveredGeo = ref('');
const hoveredGeoName = ref('');
const addFeatureLine = (feature: string) => {
  const statewide = feature.toLowerCase().includes("statewide")

  hoveredGeo.value = statewide ? hoveredGeo.value : feature;
  if (!svg.value) return
  const data = processData(feature)

  if (data.length === 0) return

  svgElement = d3.select(svg.value)
    .attr('width', width)
    .attr('height', height)

  // Filter out null values for line chart
  const validData = data.filter(d => d.value !== null && d.value > -1)

  // Calculate scales
  const xScale = createXScale(data)

  // Create line generator
  const line = d3.line<{ year: number; value: number | null }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value!))
    .curve(d3.curveMonotoneX)

  d3.selectAll(`.${props.side} .data-feature-point`).remove()
  d3.selectAll(`.${props.side} .data-feature-point-label`).remove()
  d3.selectAll(`.${props.side} .data-feature-point-label-background`).remove()
  d3.selectAll(`.${props.side} .timeline-feature-line`).remove()
  if (statewide) {
    d3.selectAll(`.${props.side} ${statewide ? 'statewide-' : ''}timeline-feature-line`).remove()
  }

  // Add line
  svgElement.append('path')
    .datum(validData)
    .attr('class', `${statewide ? 'statewide-' : ''}timeline-feature-line`)
    .attr('d', line)
    .style('fill', 'none')
    .style('stroke', statewide ? statewideColor : hoveredColor)
    .style('stroke-width', 1)

  // Add data points
  const circles = svgElement.selectAll(`.${statewide ? 'statewide-' : ''}data-feature-point`)
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', `${statewide ? 'statewide-' : ''}data-feature-point`)
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value!))
    .attr('r', 4)
    .style('fill', statewide ? statewideColor : hoveredColor)
    .style('stroke', '#fff')
    .style('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (_, d) => {
      //emit('yearSelected', d.year)
      indicatorStore.setCurrentYear(d.year)
    })
    .on('mouseover', function (_, d) {
      if (d.year !== indicatorStore.getCurrentYear()) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
      }
    })
    .on('mouseout', function (_, d) {
      if (d.year !== indicatorStore.getCurrentYear()) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)

      }
    })
  // Highlight selected year
  circles.filter(d => d.year === indicatorStore.getCurrentYear())
    .style('fill', '#dc2626')
    .attr('r', 5)

  // Add text labels next to feature circles
  svgElement.selectAll(`.${statewide ? 'statewide-' : ''}data-feature-point-label`)
    .data(validData)
    .enter()
    .append('rect')
    .attr('class', `${statewide ? 'statewide-' : ''}data-feature-point-label-background`)
    .attr('x', d => xScale(d.year) - 6)
    .attr('y', d => yScale(d.value!) - 24)
    .attr('width', 40)
    .attr('height', 12)
    .style('fill', '#fff')
    .style('opacity', 0.75)

    svgElement.selectAll(`.${statewide ? 'statewide-' : ''}data-feature-point-label`)
    .data(validData)
    .enter()
    .append('text')
    .attr('class', `${statewide ? 'statewide-' : ''}data-feature-point-label`)
    .attr('x', d => xScale(d.year))
    .attr('y', d => yScale(d.value!) - 12)
    .attr('text-anchor', 'left')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', `${statewide ? '#7d7d7d' : '#f80'}`)
    .style('pointer-events', 'none')
    .text((d) => {
      if (useRateForOverall.value) {
        return d?.value?.toLocaleString()
          + ' '
          + indicatorStore?.getCurrentIndicator()?.totalAmntOf === 'dollars' ? '$' : ''
          + ' per ' + indicatorStore?.getCurrentIndicator()?.ratePer?.toLocaleString() || indicatorStore?.getCurrentIndicator()?.geotype || ''
        + ' avg.';
      }
      return (indicatorStore?.getCurrentIndicator()?.totalAmntOf === 'dollars' ? '$' : '') + (d?.value?.toLocaleString() || '') +  (indicatorStore?.getCurrentIndicator()?.has_pct && !indicatorStore?.getCurrentIndicator()?.totalAmntOf ? '%' : '');
    })
}
const createAxisOnly = (data: Array<{ year: number; value: number | null }>) => {
  const xScale = createXScale(data)

  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d.toString())
    .tickSize(0)
    .tickPadding(8)

  svgElement.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height + margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  // Add vertical line for current year
  const currentYear = indicatorStore.getCurrentYear()
  if (currentYear && data.some(d => d.year === currentYear)) {
    const currentYearX = xScale(currentYear)
    svgElement.append('line')
      .attr('class', 'current-year-line')
      .attr('x1', currentYearX)
      .attr('x2', currentYearX)
      .attr('y1', margin.top)
      .attr('y2', height + margin.bottom)
      .style('stroke', '#dc2626')
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.7)
  }

  // Add "No data" text
  svgElement.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#999')
    .text('No data available')
}

const createXScale = (data: Array<{ year: number; value: number | null }>) => {
  const years = data.map(d => d.year)

  // Create custom scale with variable spacing
  const yearPositions: number[] = []
  let currentPos = margin.left + 5

  for (let i = 0; i < years.length; i++) {
    yearPositions.push(currentPos)

    if (i < years.length - 1) {
      const currentYear = years[i]
      const nextYear = years[i + 1]
      const gap = nextYear - currentYear

      // Larger spacing for decade gaps, smaller for consecutive years
      const spacing = Math.sqrt(gap) * 25 //<= 1 ? 25 : gap <= 10 ? 50 : 90
      currentPos += spacing
    }
  }

  return d3.scaleOrdinal<number, number>()
    .domain(years)
    .range(yearPositions)
}
const getMinMaxValues = () => {
  const indicator = indicatorStore.getCurrentIndicator()
  const data = indicator?.google_sheets_data;
  if (!data) return { minValue: 0, maxValue: 100 }
  //todo: this has to get min and max from all the  years, not just this year
  let years = data.headerShortNames.filter((year: string) => /^\d{4}$/.test(year) && !isNaN(Number(year)));
  if (years.length === 0) {
    years = data.headerShortNames.filter((year: string) => year.startsWith('Count_')).sort((a: string, b: string) => Number(a.replace('Count_', '')) - Number(b.replace('Count_', '')));
  }
  let minValue = 9999999999999;
  let maxValue = 0;

  for (let year = 0; year < years.length; year++) {
    const yearValues = data.data
    .filter((feature: any) => !feature?.name?.toLowerCase().includes("school district"))

      //.filter((feature: any) => feature?.geoid.toLowerCase() !== "overall" && !feature?.geoid.toLowerCase().includes("statewide") && !feature?.name?.toLowerCase().includes("school district"))
      .map((feature: any) => feature[years[year] as string])
      .filter((value: any) => value !== null && value !== undefined && !isNaN(Number(value)))
      .map((value: any) => Number(value));
    //console.log(years[year], yearValues);
    const thisyearMinValue = Math.min(...yearValues);
    const thisyearMaxValue = Math.max(...yearValues);
    if (+thisyearMinValue < minValue) {
      minValue = +thisyearMinValue;
    }
    if (+thisyearMaxValue > maxValue) {
      maxValue = +thisyearMaxValue;
    }
    // if(maxValue > 100){
    //   console.log(years[year], maxValue);
    // }
  }
  if (indicator?.has_pct && !indicator?.totalAmntOf) {
    minValue = Math.max(minValue, 0);
    maxValue = Math.min(maxValue, 100);
    return { minValue, maxValue };
  }

  return { minValue: Math.floor(minValue * .95), maxValue: Math.ceil(maxValue * 1.05) };
}

const createYScale = (data: Array<{ year: number; value: number | null }>) => {
  const values = data.map(d => d.value!).filter(v => v !== null && v !== undefined && !isNaN(+v))
  if (values.length === 0) return d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])

  const { minValue, maxValue } = getMinMaxValues()
  //const padding = (maxValue - minValue) || 1
  //todo: Math.max(minValue - padding, 0)
  return d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([height + margin.bottom, margin.top])
}

const handleIndicatorChange = async () => {
  // Indicator is already set by IndicatorSelector component
  // Just recreate the chart
  nextTick(() => {
    createChart()
    addFeatureLine('statewide')
  })
}

// Watch for data changes
watch([() => indicatorStore.getCurrentIndicator(), () => indicatorStore.getCurrentYear(), () => indicatorStore.getCurrentGeoSelection()],
  () => {
    nextTick(() => {
      createChart()
      addFeatureLine('statewide')
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    createChart()
  })
  emitter.on(`feature-${props.side}-hovered`, (feature: string | null) => {
    //if (props.side === 'left') {
      d3.selectAll('.timeline-feature-line').remove()
      d3.selectAll('.data-feature-point').remove()
      d3.selectAll('.data-feature-point-label').remove()
      d3.selectAll('.data-feature-point-label-background').remove()
      if (feature === null) {
        hoveredGeo.value = ''
      } else {
        hoveredGeo.value = feature;
        addFeatureLine(feature)
      }
   // }
  })
  emitter.on(`feature-name-${props.side}-hovered`, (feature: string | null) => {
    if (feature === null) {
        hoveredGeoName.value = ''
      } else {
        hoveredGeoName.value = feature;
      }
  })
  // emitter.on('feature-right-hovered', (feature: string | null) => {
  //   if (props.side === 'right') {
  //     d3.selectAll('.timeline-feature-line').remove()
  //     d3.selectAll('.data-feature-point').remove()
  //     d3.selectAll('.data-feature-point-label').remove()
  //     if (feature === null) {
  //       hoveredGeo.value = ''
  //     } else {
  //       addFeatureLine(feature)
  //     }
  //   }
  // })
})

onUnmounted(() => {
  emitter.off('feature-left-hovered', addFeatureLine)
  emitter.off('feature-right-hovered', addFeatureLine)
})
</script>

<style scoped>
.timeline-visualization-container {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.timeline-visualization-container * {
  pointer-events: all;
}

.timeline-visualization-container.left {
  left: 0;
}

.orientation-top-bottom .timeline-visualization-container.right {
  left: unset;
}



.timeline-visualization {
  position: absolute;
  right: 20px;
  left: auto;
  top: auto;
  width: 450px;
  max-width: 33%;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: move;
  z-index: 1000;
  user-select: none;
  /* zoom: .9; */
  height: 200px;
  bottom: 5px;
}

.timeline-header {
  position: absolute;
  bottom: 3em;
  width: 15%;
  left: 0px;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  max-width: 25%;
}

.right .timeline-header {
  left: calc(50% + 5px);
}

.left .timeline-header {
  left: 5px;
}

.left .timeline-visualization {
  left: 50%;
  transform: translateX(-101%);
}

.right .timeline-visualization {
  right: 5px;
}

.chart-label {
  font-weight: 600;
  font-size: larger;
  /* color: #6b7280; */
  padding: 4px 8px;
  padding-bottom: 0px;
  text-align: left;
  line-height: .9em;
  max-width: 95%;
}



.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.timeline-chart {
  width: 95%;
  height: 100%;
  /* bottom: 0; */
  position: absolute;
  left: 2.5%;
  /* top: 1.1em; */
}

/* D3 styles */
:deep(.x-axis .tick text) {
  font-size: 10px;
  fill: #6b7280;
}

:deep(.y-axis .tick text) {
  font-size: 10px;
  fill: #6b7280;
}

:deep(.y-axis .tick line) {
  stroke: #e5e7eb;
  stroke-width: 1;
}

:deep(.timeline-line) {
  fill: none;
  stroke: #2563eb;
  stroke-width: 2;
}

:deep(.statewide-timeline-feature-line),
:deep(.timeline-feature-line) {
  fill: none;
  stroke: #7d7d7d;
  stroke-width: 2;
}

:deep(.data-point) {
  fill: #2563eb;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.statewide-data-feature-point) {
  fill: #7d7d7d;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.data-feature-point) {
  fill: #7d7d7d;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.data-point:hover) {
  fill: #1d4ed8;
}

:deep(.statewide-data-feature-point:hover) {
  fill: #7d7d7d;
}

:deep(.data-feature-point:hover) {
  fill: #d1d1d1;
}



/* .hovered-geo {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-bottom: 2.5px;
  margin-left: 5px;
} */

.hovered-color {
  display: inline-block;
  width: 20px;
  height: 0;
  margin-bottom: 2.5px;
  margin-left: 5px;
}

.year-selector {
  width: 15%;
  position: absolute;
  bottom: 5px;
}

.left .year-selector {
  left: 5px;
}

.right .year-selector {
  left: calc(50% + 5px);
}
</style>
<style>
 
.orientation-top-bottom .color-legend.right {
  top: calc(50% + 3rem);
}

.orientation-top-bottom .color-legend {
  right: 0;
}

.orientation-top-bottom .legend-container {
  right: 0;
  left: unset;
  width: 100% !important;
}

.selected-color {
  display: inline-block;
  width: 20px;
  height: 0;
  margin-bottom: 2.5px;
  margin-left: 5px;
}

.selected-geo {
  display: inline-block;
  font-weight: bold;
  font-size: .9em;
}
</style>