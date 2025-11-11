<template>
  <div class="timeline-header">
    <IndicatorSelector :side="side" @indicator-changed="handleIndicatorChange" />
  </div>
  <div ref="container" class="timeline-visualization" style="height: 180px; bottom:20px;">
    <div class="chart-label">
      <span class="selected-geo">{{ `${indicatorStore?.getCurrentIndicator()?.title || ''}
        (${indicatorStore.getCurrentGeoSelection()})` }}<span class="selected-color"
          :style="{ border: `1px solid ${selectedColorRef}` }"></span></span>
      <br />
      <span v-show="!hoveredGeo" class="hovered-geo mx-2 font-italic font-weight-medium">Hover over a feature to see the
        timeline</span>
      <span v-show="hoveredGeo" class="hovered-geo mx-2">Feature: {{ hoveredGeo }}<span class="hovered-color"
          :style="{ border: `1px solid ${hoveredColorRef}` }"></span></span>
    </div>
    <svg ref="svg" class="timeline-chart"></svg>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import { ref, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import useIndicatorLevelStore from '../stores/indicatorLevelStore';
import IndicatorSelector from './IndicatorSelector.vue';

const emitter = inject('mitt') as any
interface Props {
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorStore = useIndicatorLevelStore(props.side)
defineEmits<{
  indicatorChanged: [indicator: any, side: 'left' | 'right']
  close: []
}>()

const selectedColor = '#2563eb';
const hoveredColor = '#8888';
const selectedColorRef = ref(selectedColor);
const hoveredColorRef = ref(hoveredColor);

const container = ref<HTMLElement>()
const svg = ref<SVGElement>()

let svgElement: d3.Selection<SVGElement, unknown, null, undefined>
let width = 450
let height = 100
let margin = { top: 15, right: 5, bottom: 15, left: 30 }
let yScale: d3.ScaleLinear<number, number> = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])

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
  // Exfeature data for this indicator

  yearColumns.forEach((year: number) => {
    let yearValue = matchingRow?.[year.toString()]
    if(indicator?.has_count && !indicator?.has_pct) {
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
  const validData = data.filter(d => d.value !== null && d.value > -1).map(d => ({
    year: d.year,
    value: Math.round(d.value!)
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
    .tickFormat(d => d.toLocaleString())
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
}
const hoveredGeo = ref('');
const addFeatureLine = (feature: string) => {
  hoveredGeo.value = feature;
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
  //const yScale = createYScale(validData)
  //console.log(yScale)

  // Create line generator
  const line = d3.line<{ year: number; value: number | null }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value!))
    .curve(d3.curveMonotoneX)

  d3.selectAll('.timeline-feature-line').remove()
  d3.selectAll('.data-feature-point').remove()
  // Add line
  svgElement.append('path')
    .datum(validData)
    .attr('class', 'timeline-feature-line')
    .attr('d', line)
    .style('fill', 'none')
    .style('stroke', hoveredColor)
    .style('stroke-width', 1)

  // Add data points
  const circles = svgElement.selectAll('.data-feature-point')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'data-feature-point')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value!))
    .attr('r', 4)
    .style('fill', hoveredColor)
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
  let currentPos = margin.left

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

const createYScale = (data: Array<{ year: number; value: number | null }>) => {
  const values = data.map(d => d.value!).filter(v => v !== null && !isNaN(v))
  if (values.length === 0) return d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])

  const min = 0//Math.min(...values) - (10 * (indicatorStore.getCurrentIndicator()?.geolevel === 'area' ? 0 : 1))
  const max = Math.max(100,Math.max(...values)) || 100;
   //+ (10 * (indicatorStore.getCurrentIndicator()?.geolevel === 'area' ? 0 : 1))
  const padding = (max - min) || 1

  return d3.scaleLinear()
    .domain([Math.max(min - padding, 0), max])
    .range([height + margin.bottom, margin.top])
}

const handleIndicatorChange = async () => {
  // Indicator is already set by IndicatorSelector component
  // Just recreate the chart
  nextTick(() => {
    createChart()
  })
}

// Watch for data changes
watch([() => indicatorStore.getCurrentIndicator(), () => indicatorStore.getCurrentYear(), () => indicatorStore.getCurrentGeoSelection()],
  () => {
    nextTick(() => {
      createChart()
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    createChart()
  })
  emitter.on('feature-left-hovered', (feature: string | null) => {
    if (props.side === 'left') {
      d3.selectAll('.timeline-feature-line').remove()
      d3.selectAll('.data-feature-point').remove()
      if (feature === null) {
        hoveredGeo.value = ''
      } else {
        addFeatureLine(feature)
      }
    }
  })
  emitter.on('feature-right-hovered', (feature: string | null) => {
    if (props.side === 'right') {
      d3.selectAll('.timeline-feature-line').remove()
      d3.selectAll('.data-feature-point').remove()
      if (feature === null) {
        hoveredGeo.value = ''
      } else {
        addFeatureLine(feature)
      }
    }
  })
})

onUnmounted(() => {
  emitter.off('feature-left-hovered', addFeatureLine)
  emitter.off('feature-right-hovered', addFeatureLine)
})
</script>

<style scoped>
.timeline-visualization {
  position: absolute;
  left: 20px;
  width: 450px;

  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: move;
  z-index: 1000;
  user-select: none;
}

.timeline-header {
  position: absolute;
  top: 0px;
  width: 50%;
  left: 0px;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;

}

.chart-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 0 8px;
  text-align: left;
  line-height: 1.1em;
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
  width: 100%;
  height: 100%;
  /* bottom: 0; */
  position: absolute;
  left: 0;
  top: 35px;
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

:deep(.data-feature-point) {
  fill: #7d7d7d;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.data-point:hover) {
  fill: #1d4ed8;
}

:deep(.data-feature-point:hover) {
  fill: #d1d1d1;
}

.selected-color {
  display: inline-block;
  width: 20px;
  height: 0;
  margin-bottom: 2.5px;
  margin-left: 5px;
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

.left {
  left: 20px;
}
</style>
