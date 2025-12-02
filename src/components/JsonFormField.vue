<template>
  <div class="json-form-field">
    <template v-if="typeof modelValue === 'object' && modelValue !== null && !Array.isArray(modelValue)">
      <!-- Object fields -->
      <v-expansion-panels v-if="isNested" variant="accordion" class="mb-2 outer-expansion-panel">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <strong>{{ fieldLabel }}</strong>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="(_value, key) in modelValue" :key="key" class="mb-4">
              <JsonFormField v-model="modelValue[key]" :field-name="String(key)" :parent-path="path" :is-nested="true"
                @update:model-value="(val) => updateNestedValue(String(key), val)" />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <div v-else>
        <div v-for="(_value, key) in modelValue" :key="key" class="mb-4">
          <JsonFormField v-model="modelValue[key]" :field-name="String(key)" :parent-path="path" :is-nested="true"
            @update:model-value="(val) => updateNestedValue(String(key), val)" />
        </div>
      </div>
    </template>

    <template v-else-if="Array.isArray(modelValue)">
      <!-- Array fields -->
      <!-- MapLibre expressions should be shown as JSON strings -->
      <div v-if="isMapLibreExpression" class="mb-4 maplibre-expression-textarea">
        <v-textarea 
          :model-value="JSON.stringify(modelValue, null, 2)" 
          :label="fieldLabel" 
          variant="outlined" 
          rows="4"
          :hint="'MapLibre expression array - edit as JSON'" 
          persistent-hint
          @update:model-value="(val) => updateMapLibreExpression(val)"
        ></v-textarea>
      </div>
      <!-- Regular array of objects -->
      <v-expansion-panels v-else-if="isNested" variant="accordion" class="mb-2">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <strong>{{ fieldLabel }}</strong>
            <v-chip size="x-small" class="ml-2">{{ modelValue.length }} items</v-chip>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="(item, index) in modelValue" :key="index" class="mb-4">
              <v-card variant="outlined" class="pa-3" style="position: relative;">
                <JsonFormField 
                  v-model="modelValue[index]" 
                  :field-name="getArrayItemLabel(item, index)" 
                  :parent-path="path"
                  :is-nested="true" 
                  @update:model-value="(val) => updateArrayItem(index, val)" 
                />
                <v-btn 
                  icon="mdi-delete" 
                  size="x-small" 
                  variant="text" 
                  color="error" 
                  inline
                  style="position: absolute; bottom: 8px; right: 8px;"
                  @click="removeArrayItem(index)"
                ></v-btn>
              </v-card>
            </div>
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="addArrayItem" class="mt-2">
              Add Item
            </v-btn>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <div v-else>
        <v-text-field :model-value="JSON.stringify(modelValue)" :label="fieldLabel" variant="outlined" readonly
          hint="Array - use JSON view to edit" persistent-hint></v-text-field>
      </div>
    </template>

    <template v-else>
      <!-- Primitive fields -->
      <div v-if="isBoolean" class="mb-4">
        <v-checkbox :model-value="modelValue" :label="fieldLabel" :hint="hint" persistent-hint
          @update:model-value="updateValue" hide-details="auto"></v-checkbox>
      </div>

      <div v-else-if="isColor" class="mb-4">
        <v-text-field :model-value="modelValue" :label="fieldLabel" variant="outlined" :hint="hint" persistent-hint
          @update:model-value="updateValue">
          <template v-slot:append>
            <v-menu location="bottom" max-width="300">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" :style="{ backgroundColor: getColorValue(modelValue) }" icon size="small"
                  variant="flat">
                  <v-icon>mdi-palette</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-color-picker v-model="colorPickerValue" @update:model-value="onColorPickerChange" mode="hex"
                  show-swatches></v-color-picker>
              </v-card>
            </v-menu>
          </template>
        </v-text-field>
      </div>

      <div v-else-if="isNumber" class="mb-4">
        <v-text-field :model-value="modelValue" :label="fieldLabel" type="number" variant="outlined" :hint="hint"
          persistent-hint @update:model-value="updateValue"></v-text-field>
      </div>

      <div v-else-if="isUrl" class="mb-4">
        <v-text-field :model-value="modelValue" :label="fieldLabel" type="url" variant="outlined" :hint="hint"
          persistent-hint @update:model-value="updateValue"></v-text-field>
      </div>

      <div v-else-if="isSelectField" class="mb-4">
        <v-select 
          :model-value="modelValue" 
          :label="fieldLabel" 
          :items="selectOptions" 
          variant="outlined" 
          :hint="hint"
          persistent-hint 
          @update:model-value="updateValue"
        ></v-select>
      </div>

      <div v-else class="mb-4">
        <v-textarea v-if="isLongText" :model-value="modelValue" :label="fieldLabel" variant="outlined" rows="3"
          :hint="hint" persistent-hint @update:model-value="updateValue"></v-textarea>
        <v-text-field v-else :model-value="modelValue" :label="fieldLabel" variant="outlined" :hint="hint"
          persistent-hint @update:model-value="updateValue"></v-text-field>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';

interface Props {
  modelValue: any;
  fieldName?: string;
  parentPath?: string;
  isNested?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fieldName: '',
  parentPath: '',
  isNested: false
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const path = computed(() => {
  return props.parentPath ? `${props.parentPath}.${props.fieldName}` : props.fieldName;
});

const fieldLabel = computed(() => {
  // For indicators array items, use title or short_name if available
  if (props.parentPath?.includes('indicators') && typeof props.modelValue === 'object' && props.modelValue !== null) {
    if (props.modelValue.title) return props.modelValue.title;
    if (props.modelValue.short_name) return props.modelValue.short_name;
  }
  return props.fieldName || 'Root';
});

const hint = computed(() => {
  const type = typeof props.modelValue;
  if (type === 'object' && props.modelValue !== null) {
    return Array.isArray(props.modelValue) ? 'Array' : 'Object';
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
});

const isBoolean = computed(() => {
  return typeof props.modelValue === 'boolean';
});

const isNumber = computed(() => {
  return typeof props.modelValue === 'number';
});

const isColor = computed(() => {
  if (typeof props.modelValue !== 'string') return false;
  const fieldNameLower = props.fieldName?.toLowerCase() || '';
  const value = props.modelValue.toString().toLowerCase().trim();

  // Check if field name suggests it's a color
  if (fieldNameLower.includes('color') || fieldNameLower.includes('colour')) {
    return true;
  }

  // Check if value matches color patterns
  return /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgb\(/i.test(value) ||
    /^rgba\(/i.test(value) ||
    /^hsl\(/i.test(value) ||
    /^hsla\(/i.test(value);
});

const isUrl = computed(() => {
  if (typeof props.modelValue !== 'string') return false;
  const fieldNameLower = props.fieldName?.toLowerCase() || '';
  const value = props.modelValue.toString().trim();

  return fieldNameLower.includes('url') ||
    fieldNameLower.includes('link') ||
    /^https?:\/\//.test(value);
});

const isLongText = computed(() => {
  if (typeof props.modelValue !== 'string') return false;
  return props.modelValue.length > 50 || (props.fieldName?.toLowerCase().includes('description') ?? false);
});

const isMapLibreExpression = computed(() => {
  // Check if this is a MapLibre expression array (like fill_color)
  if (!Array.isArray(props.modelValue)) return false;
  if (props.modelValue.length === 0) return false;
  // MapLibre expressions typically start with strings like "interpolate", "get", etc.
  const firstElement = props.modelValue[0];
  if (typeof firstElement === 'string') {
    const mapLibreKeywords = ['interpolate', 'linear', 'exponential', 'get', 'to-number', 'step', 'match', 'case'];
    return mapLibreKeywords.includes(firstElement.toLowerCase());
  }
  return false;
});

const isSelectField = computed(() => {
  // Handle fields that should be dropdowns
  const fieldNameLower = props.fieldName?.toLowerCase() || '';
  
  // Default field can be 'left', 'right', or false
  if (fieldNameLower === 'default') {
    return true;
  }
  
  // Geolevel can be 'area' or 'point'
  if (fieldNameLower === 'geolevel') {
    return true;
  }
  
  return false;
});

const selectOptions = computed(() => {
  const fieldNameLower = props.fieldName?.toLowerCase() || '';
  
  if (fieldNameLower === 'default') {
    return [
      { title: 'Left', value: 'left' },
      { title: 'Right', value: 'right' },
      { title: 'None (false)', value: false }
    ];
  }
  
  if (fieldNameLower === 'geolevel') {
    return [
      { title: 'Area (choropleth)', value: 'area' },
      { title: 'Point (markers)', value: 'point' }
    ];
  }
  
  return [];
});

const colorPickerValue = ref<string>('#000000');

// Watch for changes to modelValue to update color picker
watch(() => props.modelValue, (newVal) => {
  if (isColor.value && typeof newVal === 'string') {
    colorPickerValue.value = parseColorToHex(newVal);
  }
}, { immediate: true });

function updateValue(value: any) {
  // Convert string numbers to actual numbers
  if (isNumber.value && typeof value === 'string' && value !== '') {
    const num = Number(value);
    if (!isNaN(num)) {
      emit('update:modelValue', num);
      return;
    }
  }
  emit('update:modelValue', value);
}

function updateNestedValue(key: string, value: any) {
  const newValue = { ...props.modelValue };
  newValue[key] = value;
  emit('update:modelValue', newValue);
}

function updateArrayItem(index: number, value: any) {
  const newArray = [...props.modelValue];
  newArray[index] = value;
  emit('update:modelValue', newArray);
}

function addArrayItem() {
  const newArray = [...props.modelValue];
  // Determine what type of item to add based on existing items
  if (newArray.length > 0) {
    const firstItem = newArray[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      newArray.push({ ...firstItem });
    } else if (typeof firstItem === 'string') {
      newArray.push('');
    } else if (typeof firstItem === 'number') {
      newArray.push(0);
    } else if (typeof firstItem === 'boolean') {
      newArray.push(false);
    } else {
      newArray.push(null);
    }
  } else {
    newArray.push({});
  }
  emit('update:modelValue', newArray);
}

function removeArrayItem(index: number) {
  const newArray = [...props.modelValue];
  newArray.splice(index, 1);
  emit('update:modelValue', newArray);
}

function getColorValue(colorStr: string): string {
  if (!colorStr) return '#000000';
  // Try to parse various color formats
  if (colorStr.startsWith('#')) return colorStr;
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]);
      const g = parseInt(match[1]);
      const b = parseInt(match[2]);
      return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  if (colorStr.startsWith('hsla') || colorStr.startsWith('hsl')) {
    // For HSL, we'll just return a default for now
    // Full HSL to RGB conversion would be more complex
    return '#000000';
  }
  return colorStr;
}

function parseColorToHex(colorStr: string): string {
  if (!colorStr) return '#000000';
  if (colorStr.startsWith('#')) return colorStr;
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]);
      const g = parseInt(match[1]);
      const b = parseInt(match[2]);
      return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  if (colorStr.startsWith('hsla') || colorStr.startsWith('hsl')) {
    // For HSL, return a default - full conversion would require more complex logic
    return '#000000';
  }
  return '#000000';
}


function onColorPickerChange(value: any) {
  colorPickerValue.value = typeof value === 'string' ? value : value?.hex || '#000000';
  updateValue(colorPickerValue.value);
}

function getArrayItemLabel(item: any, index: number): string {
  // For indicators array, use title or short_name
  if (props.fieldName === 'indicators' || props.parentPath?.includes('indicators')) {
    if (item?.title) return item.title;
    if (item?.short_name) return item.short_name;
  }
  // For icons array, use name or filename
  if (props.fieldName === 'icons' || props.parentPath?.includes('icons')) {
    if (item?.name) return item.name;
    if (item?.filename) return item.filename.split('/').pop() || `Icon ${index + 1}`;
  }
  // For other arrays, try common fields
  if (item?.title) return item.title;
  if (item?.name) return item.name;
  if (item?.label) return item.label;
  return `Item ${index + 1}`;
}

function updateMapLibreExpression(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      emit('update:modelValue', parsed);
    }
  } catch (e) {
    // Invalid JSON, don't update
  }
}
</script>

<style scoped>
.json-form-field {
  width: 100%;
}

.outer-expansion-panel {
  width: 98%;
  display: inline-block;
  float: left;
}

.maplibre-expression-textarea {
  width: 98%;
  display: inline-block;
  float: left;
}
</style>
