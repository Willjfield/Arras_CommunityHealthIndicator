<template>
  <v-main>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <span class="text-h5">Configuration Editor</span>
              <v-spacer></v-spacer>
              <v-btn-toggle v-model="viewMode" mandatory density="compact" class="mr-4">
                <v-btn value="form" size="small">Form View</v-btn>
                <v-btn value="json" size="small">JSON View</v-btn>
              </v-btn-toggle>
              <v-btn color="primary" @click="loadConfigs" prepend-icon="mdi-refresh">
                Reload Configs
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-alert type="info" variant="tonal" class="mb-4">
                <strong>Note:</strong> This editor allows you to view and edit configuration files. 
                Since this is a client-side application, you can download edited files and manually replace them in the public/config folder.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Main Config Editor -->
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <span class="text-h6">Main Configuration (main.json)</span>
            </v-card-title>
            <v-card-text>
              <div v-if="viewMode === 'form'">
                <JsonFormField
                  v-model="mainConfigData"
                  :path="'main'"
                  @update:model-value="updateMainConfig"
                />
              </div>
              <div v-else>
                <v-textarea
                  v-model="mainConfigJson"
                  label="main.json"
                  rows="15"
                  variant="outlined"
                  :error="mainConfigError !== null"
                  :error-messages="mainConfigError"
                  @update:model-value="onMainJsonChange"
                ></v-textarea>
              </div>
              <div class="mt-4">
                <v-btn 
                  color="success" 
                  @click="validateAndDownload('main')" 
                  prepend-icon="mdi-download"
                  class="mr-2"
                >
                  Download main.json
                </v-btn>
                <v-btn 
                  color="primary" 
                  @click="validateJson('main')" 
                  prepend-icon="mdi-check"
                >
                  Validate JSON
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Category Configs Editor -->
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <span class="text-h6">Category Configurations</span>
              <v-spacer></v-spacer>
              <v-chip size="small" color="info" variant="tonal">
                {{ categoriesWithConfigs.length }} category{{ categoriesWithConfigs.length !== 1 ? 'ies' : 'y' }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                <strong>Category Configs:</strong> Each category config file contains an <code>indicators</code> array. 
                Each indicator can be for <code>area</code> (choropleth maps) or <code>point</code> (icon markers) geolevels.
              </v-alert>
              <v-tabs v-model="activeTab" color="primary">
                <v-tab
                  v-for="category in categoriesWithConfigs"
                  :key="category.query_str"
                  :value="category.query_str"
                >
                  {{ category.title }}
                </v-tab>
              </v-tabs>

              <v-window v-model="activeTab">
                <v-window-item
                  v-for="category in categoriesWithConfigs"
                  :key="category.query_str"
                  :value="category.query_str"
                >
                  <v-card variant="flat" class="mt-4">
                    <v-card-text>
                      <v-alert 
                        v-if="viewMode === 'form' && categoryConfigsData[category.query_str]?.indicators" 
                        type="info" 
                        variant="tonal" 
                        density="compact" 
                        class="mb-4"
                      >
                        <strong>{{ categoryConfigsData[category.query_str].indicators.length }} indicator(s)</strong> in this category.
                        Expand the indicators array below to edit individual indicators.
                      </v-alert>
                      <div v-if="viewMode === 'form'">
                        <JsonFormField
                          v-model="categoryConfigsData[category.query_str]"
                          :path="category.query_str"
                          @update:model-value="(val: any) => updateCategoryConfig(category.query_str, val)"
                        />
                      </div>
                      <div v-else>
                        <v-text-field
                          v-model="category.config"
                          label="Config File Path"
                          variant="outlined"
                          class="mb-4"
                        ></v-text-field>
                        <v-textarea
                          v-model="categoryConfigs[category.query_str]"
                          :label="`${category.title} Configuration`"
                          rows="20"
                          variant="outlined"
                          :error="categoryErrors[category.query_str] !== null"
                          :error-messages="categoryErrors[category.query_str]"
                          @update:model-value="(val: any) => onCategoryJsonChange(category.query_str, val)"
                        ></v-textarea>
                      </div>
                      <div class="mt-4">
                        <v-btn 
                          color="success" 
                          @click="validateAndDownload(category.query_str)" 
                          prepend-icon="mdi-download"
                          class="mr-2"
                        >
                          Download {{ getConfigFileName(category.config) }}
                        </v-btn>
                        <v-btn 
                          color="primary" 
                          @click="validateJson(category.query_str)" 
                          prepend-icon="mdi-check"
                        >
                          Validate JSON
                        </v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-window-item>
              </v-window>

              <v-card-text v-if="categoriesWithConfigs.length === 0" class="text-center py-8">
                <p class="text-body-1">No categories with config files found.</p>
                <p class="text-body-2 text-medium-emphasis">
                  Add a "config" property to categories in main.json to enable editing.
                </p>
              </v-card-text>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import axios from 'axios';
import JsonFormField from '../components/JsonFormField.vue';
const mainConfigJson = ref<string>('');
const mainConfigData = ref<any>({});
const mainConfigError = ref<string | null>(null);

const viewMode = ref<'form' | 'json'>('form');

const categoriesWithConfigs = ref<any[]>([]);
const categoryConfigs = ref<Record<string, string>>({});
const categoryConfigsData = ref<Record<string, any>>({});
const categoryErrors = ref<Record<string, string | null>>({});
const activeTab = ref<string | null>(null);

onMounted(async () => {
  await loadConfigs();
});

async function loadConfigs() {
  try {
    // Load main config
    const sitePath = inject('sitePath') as string;
    const mainConfigDataResponse = await axios.get(`${sitePath}/config/main.json`);
    mainConfigData.value = mainConfigDataResponse.data;
    mainConfigJson.value = JSON.stringify(mainConfigData.value, null, 2);

    // Get categories with config files
    const categories = mainConfigData.value.categories || [];
    categoriesWithConfigs.value = categories.filter((cat: any) => cat.config);

    // Load all category configs
    for (const category of categoriesWithConfigs.value) {
      try {
        const configData = await axios.get(`${sitePath}${category.config}`);
        categoryConfigsData.value[category.query_str] = configData.data;
        categoryConfigs.value[category.query_str] = JSON.stringify(configData.data, null, 2);
        categoryErrors.value[category.query_str] = null;
      } catch (error: any) {
        categoryConfigsData.value[category.query_str] = {};
        categoryConfigs.value[category.query_str] = '{}';
        categoryErrors.value[category.query_str] = `Failed to load: ${error.message}`;
      }
    }

    // Set first tab as active if available
    if (categoriesWithConfigs.value.length > 0) {
      activeTab.value = categoriesWithConfigs.value[0].query_str;
    }
  } catch (error: any) {
    mainConfigError.value = `Failed to load main config: ${error.message}`;
  }
}

function updateMainConfig(value: any) {
  mainConfigData.value = value;
  mainConfigJson.value = JSON.stringify(value, null, 2);
  mainConfigError.value = null;
}

function updateCategoryConfig(key: string, value: any) {
  categoryConfigsData.value[key] = value;
  categoryConfigs.value[key] = JSON.stringify(value, null, 2);
  categoryErrors.value[key] = null;
}

function onMainJsonChange(value: string) {
  try {
    mainConfigData.value = JSON.parse(value);
    mainConfigError.value = null;
  } catch (e) {
    // Error will be shown in the textarea
  }
}

function onCategoryJsonChange(key: string, value: string) {
  try {
    categoryConfigsData.value[key] = JSON.parse(value);
    categoryErrors.value[key] = null;
  } catch (e) {
    // Error will be shown in the textarea
  }
}

function validateJson(key: string) {
  try {
    if (key === 'main') {
      JSON.parse(mainConfigJson.value);
      mainConfigError.value = null;
      alert('✓ Valid JSON!');
    } else {
      JSON.parse(categoryConfigs.value[key]);
      categoryErrors.value[key] = null;
      alert('✓ Valid JSON!');
    }
  } catch (error: any) {
    const errorMsg = `Invalid JSON: ${error.message}`;
    if (key === 'main') {
      mainConfigError.value = errorMsg;
    } else {
      categoryErrors.value[key] = errorMsg;
    }
    alert(`✗ ${errorMsg}`);
  }
}

function validateAndDownload(key: string) {
  try {
    let jsonContent: string;
    let fileName: string;

    if (key === 'main') {
      const parsed = JSON.parse(mainConfigJson.value);
      jsonContent = JSON.stringify(parsed, null, 2);
      fileName = 'main.json';
      mainConfigError.value = null;
      mainConfigData.value = parsed;
    } else {
      const parsed = JSON.parse(categoryConfigs.value[key]);
      const category = categoriesWithConfigs.value.find(c => c.query_str === key);
      jsonContent = JSON.stringify(parsed, null, 2);
      fileName = getConfigFileName(category?.config || `${key}.json`);
      categoryErrors.value[key] = null;
      categoryConfigsData.value[key] = parsed;
    }

    // Download the file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✓ Downloaded ${fileName}`);
  } catch (error: any) {
    const errorMsg = `Invalid JSON: ${error.message}`;
    if (key === 'main') {
      mainConfigError.value = errorMsg;
    } else {
      categoryErrors.value[key] = errorMsg;
    }
    alert(`✗ ${errorMsg}`);
  }
}

function getConfigFileName(configPath: string): string {
  if (!configPath) return 'config.json';
  const parts = configPath.split('/');
  return parts[parts.length - 1] || 'config.json';
}
</script>

<style scoped>
.v-card {
  margin-bottom: 16px;
}
</style>
