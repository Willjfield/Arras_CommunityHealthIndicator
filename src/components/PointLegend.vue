<template>
  <div class="color-legend" :class="{ 'left': side === 'left', 'right': side === 'right' }">
    <div class="legend-container">
      <div class="legend-header">
        <span class="legend-title">{{ selectedIndicator?.title || 'Indicator' }}</span>
      </div>
      <div class="legend-content">
    
        <table class="legend-icon-container">
          <tbody>
            <tr>
              <td style="text-align: left;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }"></span>
              </td>
              <td style="text-align: center;">
                <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }"></span>
              </td>
              <td style="text-align: right;"><span
                  style="display: inline-block; width: 32px; height: 32px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }" /></td>
            </tr>
            
            <tr class="legend-labels">
              <td style="text-align: left;"><span class="min-label">{{minMaxCohortValues.minCohortValue.toFixed(0) }} {{ selectedIndicator?.cohort_type }} total</span>
              </td>
              <td style="text-align: center;"><span class="mid-label">{{ (minMaxCohortValues.maxCohortValue / 2).toFixed(0) }} {{ selectedIndicator?.cohort_type }} total</span></td>
              <td style="text-align: right;"><span class="max-label"> {{ minMaxCohortValues.maxCohortValue.toFixed(0) }} or more {{ selectedIndicator?.cohort_type }} total</span>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-if="selectedIndicator?.geotype !== 'facility' && selectedIndicator?.has_pct" class="legend-icon-container">
          <tbody>
            <tr>
              <td style="text-align: left;">
                <span style="border: 1px solid #000; display: inline-block; width: 12px; height: 12px; border-radius: 50%;"
                  :style="{ backgroundColor: minColor}"></span>
              </td>
              <td style="text-align: center;">
                <span style="border: 1px solid #000;display: inline-block; width: 12px; height: 12px; border-radius: 50%;"
                  :style="{ backgroundColor: middleColor }"></span>
              </td>
              <td style="text-align: right;"><span
                  style="border: 1px solid #000;display: inline-block; width: 12px; height: 12px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }" /></td>
            </tr>
            <tr class="legend-labels">
              <td style="text-align: left;"><span class="min-label">{{ minValue.toFixed(0) }} {{minValue === 0 ? '' : 'or less'}} {{ indicatorDescription }}</span>
              </td>
              <td style="text-align: center;"><span class="mid-label">{{ (maxValue / 2).toFixed(0) }} {{
                  indicatorDescription }}</span></td>
              <td style="text-align: right;"><span class="max-label">{{ maxValue.toFixed(0) }} {{maxValue === 100 ? '' : 'or more'}} {{ indicatorDescription }}</span>
              </td>
            </tr>
          </tbody>
          
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, inject } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
const arrasBranding = inject('arrasBranding') as any

interface Props {
  selectedIndicator: any
  side: 'left' | 'right'
}

const props = defineProps<Props>()
  const indicatorLevelStore = useIndicatorLevelStore(props.side as 'left' | 'right')
const currentIndicator = computed(() => {
  return indicatorLevelStore.getCurrentIndicator()
})
const minMaxCohortValues = computed(() => {
let cohortKeys = currentIndicator?.value?.google_sheets_data.headerShortNames.filter((n: string) => n.startsWith('Cohort'));
if(cohortKeys.length === 0) {
  cohortKeys = currentIndicator?.value?.google_sheets_data.headerShortNames.filter((n: string) => n.startsWith('Count_'));
}
const allFeatures = currentIndicator?.value?.google_sheets_data.data;
let minCohortValue = 9999999999999;
let maxCohortValue = 0;
for(let i=0; i<cohortKeys.length; i++) {
  const key = cohortKeys[i];
  const values = allFeatures
  .filter((feature: any) => feature[key] !== null && feature[key] !== undefined && feature[key] !== '' && !isNaN(Number(feature[key])) && !feature?.geoid.toLowerCase().includes("overall") && !feature?.geoid?.toLowerCase().includes("statewide") && !feature?.name?.toLowerCase().includes("school district"))
  .map((feature: any) => +feature[key])
  .filter((value: number) => !isNaN(value))
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  if(min < minCohortValue) {
    minCohortValue = min;
  }
  if(max > maxCohortValue) {
    maxCohortValue = max;
  }
}
return { minCohortValue, maxCohortValue };
})
const indicatorDescription = computed(() => {
  if (props.selectedIndicator?.ratePer) {
    return 'per ' + (+ props.selectedIndicator?.ratePer).toLocaleString('en-US') + ' people';
  }
  if (props.selectedIndicator?.totalAmntOf) {
    return props.selectedIndicator?.totalAmntOf;
  }
  if(props.selectedIndicator?.geotype === 'school') {
    return '% of students ready';
  }
  return '%';
})
const minValue = computed(() => {
  return (+props.selectedIndicator?.style?.min?.value > +props.selectedIndicator?.style?.max?.value ? 0 : +props.selectedIndicator?.style?.min?.value) || 0
})

const maxValue = computed(() => {
  return props.selectedIndicator?.style?.max?.value || 100
})

const maxColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.max?.color;
  if (colorName) {
    return arrasBranding.colors[colorName];
  }
  return '#000000';
})

const middleColor = computed(() => {
  // Helper to convert hex to rgb
  function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    // Remove "#" if present
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
      // e.g. #03f -> #0033ff
      hex = hex.split("").map(c => c + c).join("");
    }
    if (hex.length !== 6) return null;
    const num = parseInt(hex, 16);
    return { 
      r: (num >> 16) & 255, 
      g: (num >> 8) & 255, 
      b: num & 255 
    };
  }

  // Helper to convert rgb to hex
  function rgbToHex({ r, g, b }: { r: number, g: number, b: number }): string {
    return (
      "#" +
      [r, g, b]
        .map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  return computed(() => {
    const min = minColor.value;
    const max = maxColor.value;
    const rgbMin = hexToRgb(min);
    const rgbMax = hexToRgb(max);
    if (!rgbMin || !rgbMax) return "#000000";

    const midwayRgb = {
      r: Math.round((rgbMin.r + rgbMax.r) / 2),
      g: Math.round((rgbMin.g + rgbMax.g) / 2),
      b: Math.round((rgbMin.b + rgbMax.b) / 2),
    };
    return rgbToHex(midwayRgb);
  }).value;
})

const minColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.min?.color;
  if (colorName) {
    return arrasBranding.colors[colorName];
  }
  return '#000000';
})

</script>

<style scoped>
.color-legend {
  position: absolute;
  top: 5px;
  width: 50%;
  height: 80px;

  z-index: 1000;
  user-select: none;
}

.color-legend.left {
  /* right: 20px; */
}

.color-legend.right {
  right: 0px;
}

.legend-header {
  padding: 8px 12px 4px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 5px 5px 0 0;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.legend-content {
  padding: 2px 12px;
}

.legend-gradient {
  /* margin-bottom: 6px; */
}

.gradient-bar {
  width: 100%;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #d1d5db;
}

.legend-labels {
  /* display: flex;
  justify-content: space-between; */
  /* align-items: center; */
  font-size: 10px;
  color: #6b7280;
  font-weight: bold;
}

.min-label,
.max-label {}

.legend-container {
  width: 50%;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.legend-icon-container {
  width: 100%;
  margin: 0 auto;
  border-collapse: collapse;
  vertical-align: middle;
  justify-content: space-around;
}

.legend-icon-container td {
  padding: 0;
  margin: 0;
  width: 33%;
  text-align: center;
}
</style>
