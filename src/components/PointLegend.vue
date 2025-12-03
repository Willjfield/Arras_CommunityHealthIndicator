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
              <td style="text-align: left;"><span class="min-label">{{ minValue.toFixed(0) }} {{ indicatorDescription }}</span>
              </td>
              <td style="text-align: center;"><span class="mid-label">{{ (maxValue / 2).toFixed(0) }} {{
                  indicatorDescription }}</span></td>
              <td style="text-align: right;"><span class="max-label">{{ maxValue.toFixed(0) }} {{ indicatorDescription }}</span>
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
const arrasBranding = inject('arrasBranding') as any
interface Props {
  selectedIndicator: any
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorDescription = computed(() => {
  if (props.selectedIndicator?.ratePer) {
    return 'per ' + (+ props.selectedIndicator?.ratePer).toLocaleString('en-US') + ' people';
  }
  if (props.selectedIndicator?.totalAmntOf) {
    return props.selectedIndicator?.totalAmntOf;
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
