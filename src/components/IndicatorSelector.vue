<template>
  <v-select 
    :model-value="indicatorStore?.getCurrentIndicator()"
    :items="themeLevelStore?.getAllCurrentThemeIndicators() || []" 
    item-title="title" 
    item-value="value" 
    return-object
    density="compact" 
    variant="outlined" 
    hide-details 
    class="indicator-select"
    @update:model-value="handleIndicatorChange" 
  />
</template>

<script lang="ts" setup>
import { inject } from 'vue'
import useIndicatorLevelStore from '../stores/indicatorLevelStore'
import { useThemeLevelStore } from '../stores/themeLevelStore'

interface Props {
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorStore = useIndicatorLevelStore(props.side)
const themeLevelStore = useThemeLevelStore()
const emitter = inject('mitt') as any

const emit = defineEmits<{
  indicatorChanged: [indicator: any]
}>()

const handleIndicatorChange = async (indicator: any) => {
  await indicatorStore.setIndicatorFromIndicatorShortName(indicator.short_name, emitter)
  
  // Emit event for parent component
  emit('indicatorChanged', indicator)
}

// Expose the indicatorStore so parent can access it if needed
defineExpose({
  indicatorStore
})
</script>

<style scoped>
.indicator-select {
  max-width: 60%;
    margin: 0 auto;
    border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px 8px 0 0;
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
</style>

