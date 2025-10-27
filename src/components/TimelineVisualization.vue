<template>
  <div ref="container" class="timeline-visualization"
    style="height: 180px; bottom:20px;">
    <!-- <div class="timeline-header">
      <v-select :model-value="selectedIndicator" :items="availableIndicators" item-title="title" item-value="value"
        return-object density="compact" variant="outlined" hide-details class="indicator-select"
        @update:model-value="handleIndicatorChange" />

    </div> -->
    <div class="chart-label">
      <span class="selected-geo">{{'fill in label here'}}<span class="selected-color" :style="{ border: `1px solid ${selectedColorRef}` }"></span></span>
      <span v-show="hoveredGeo" class="hovered-geo mx-2">Tract: {{ hoveredGeo }}<span class="hovered-color" :style="{ border: `1px solid ${hoveredColorRef}` }"></span></span>
    </div>
    <svg ref="svg" class="timeline-chart"></svg>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import { ref, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import useIndicatorLevelStore from '../stores/indicatorLevelStore';
const emitter = inject('mitt') as any
interface Props {
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorStore = useIndicatorLevelStore(props.side)
const currentIndicator = indicatorStore.getCurrentIndicator()
const emit = defineEmits<{
  yearSelected: [year: number]
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
let margin = { top: 0, right: 5, bottom: 5, left: 20 }

const processData = (_tract: string | number | null) => {

  const indicator = indicatorStore.getCurrentIndicator()
  const raw_data = indicator?.google_sheets_data
  if (!raw_data) return []
  const headerShortNames = raw_data.headerShortNames
  const headerLabels = raw_data.headerLabels
  const rows = raw_data.data

  // Find year columns (numeric strings)
  const yearColumns = headerShortNames.filter((header: string) =>
    /^\d{4}$/.test(header) && !isNaN(Number(header))
  ).map((year: string) => Number(year)).sort((a: number, b: number) => a - b)

  const currentGeoSelection = indicatorStore.getCurrentGeoSelection() 

  // Find the row that matches both geography and indicator
  const matchingRow = rows.find((_row: Record<string, any>) =>
    '' + _row.geoid === '' + currentGeoSelection 
  )

  if (!matchingRow) return []

  // Extract data for this indicator
  const data: Array<{ year: number; value: number | null }> = []

  yearColumns.forEach((year: number) => {
    const yearValue = matchingRow[year.toString()]
    data.push({
      year,
      value: yearValue ? Number(yearValue) : null
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
  const validData = data.filter(d => d.value !== null && d.value > -1)
  console.log('validData', validData)
  if (validData.length === 0) {
    // Just show x-axis with years
    createAxisOnly(data)
    return
  }

  // Calculate scales
  const xScale = createXScale(data)
  const yScale = createYScale(validData)

  // Create axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d.toString())
    .tickSize(0)
    .tickPadding(8)

  const yAxis = d3.axisLeft(yScale)
    .tickSize(-width + margin.left + margin.right)
    .tickPadding(5)

  // Add axes
  svgElement.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
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
      emit('yearSelected', d.year)
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
const addTractLine = (tract: string) => {
  hoveredGeo.value = tract;
  if (!svg.value) return
  const data = processData(tract)
  if (data.length === 0) return
  //console.log(svg.value)
  svgElement = d3.select(svg.value)
    .attr('width', width)
    .attr('height', height)

  // Filter out null values for line chart
  const validData = data.filter(d => d.value !== null && d.value > -1)

  // Calculate scales
  const xScale = createXScale(data)
  const yScale = createYScale(validData)

  // Create line generator
  const line = d3.line<{ year: number; value: number | null }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value!))
    .curve(d3.curveMonotoneX)

  d3.selectAll('.timeline-tract-line').remove()
  d3.selectAll('.data-tract-point').remove()
  // Add line
  svgElement.append('path')
    .datum(validData)
    .attr('class', 'timeline-tract-line')
    .attr('d', line)
    .style('fill', 'none')
    .style('stroke', hoveredColor)
    .style('stroke-width', 1)

  // Add data points
  const circles = svgElement.selectAll('.data-tract-point')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'data-tract-point')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value!))
    .attr('r', 4)
    .style('fill', hoveredColor)
    .style('stroke', '#fff')
    .style('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (_, d) => {
      emit('yearSelected', d.year)
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
    .attr('transform', `translate(0, ${height - margin.bottom})`)
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
      const spacing = Math.sqrt(gap)*25 //<= 1 ? 25 : gap <= 10 ? 50 : 90
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

  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 1

  return d3.scaleLinear()
    .domain([min - padding, max + padding])
    .range([height - margin.bottom, margin.top])
}

const handleIndicatorChange = (indicator: any) => {
  emit('indicatorChanged', indicator, props.side)
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
   emitter.on('tract-left-hovered', (tract: string | null) => {
     if (props.side === 'left') {
       if (tract === null) {
         // Remove tract line when no tract is selected
         d3.selectAll('.timeline-tract-line').remove()
         d3.selectAll('.data-tract-point').remove()
         hoveredGeo.value = ''
       } else {
         addTractLine(tract)
       }
     }
    // console.log('tract-left-selected', tract)
   })
   emitter.on('tract-right-hovered', (tract: string | null) => {
     if (props.side === 'right') {
       if (tract === null) {
         // Remove tract line when no tract is selected
         d3.selectAll('.timeline-tract-line').remove()
         d3.selectAll('.data-tract-point').remove()
         hoveredGeo.value = ''
       } else {
         addTractLine(tract)
       }
     }
    //console.log('tract-right-selected', tract)
   })
})

onUnmounted(() => {
  emitter.off('tract-left-hovered', addTractLine)
  emitter.off('tract-right-hovered', addTractLine)
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px 8px 0 0;
}

.chart-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 0 8px;
  text-align: left;
  line-height: 1.1em;
}


.indicator-select {
  flex: 1;
}

.indicator-select :deep(.v-field) {
  font-size: 11px;
  min-height: 32px;
}

.indicator-select :deep(.v-field__input) {
  font-size: 11px;
  padding: 4px 8px;
}

.indicator-select :deep(.v-select__selection) {
  font-size: 11px;
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
  height: calc(100% - 40px);
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

:deep(.timeline-tract-line) {
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

:deep(.data-tract-point) {
  fill: #7d7d7d;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.data-point:hover) {
  fill: #1d4ed8;
}

:deep(.data-tract-point:hover) {
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
