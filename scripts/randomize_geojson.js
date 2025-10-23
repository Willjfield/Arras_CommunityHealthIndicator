#!/usr/bin/env node
/*
  Randomize specific numeric fields in GeoJSON FeatureCollection properties by up to ±15%.
  - Only modifies listed fields
  - Leaves geometry and identifying fields untouched
  - If a field value is null or missing, imputes using the median of non-null values across features
  - Preserves JSON formatting with 2-space indentation
*/

import fs from 'fs';
import path from 'path';

const TARGET_FILES = [
  path.resolve('public/ChestLanTracts2000.geojson'),
  path.resolve('public/ChestLanTracts2010.geojson'),
];

// Fields to randomize (exact property keys)
const FIELDS = [
  "Population 25 Years and Over whose Highest Education Completed is Less Than High School",
  "Percent of Population 25 Years and Over whose Highest Education Completed is Less Than High School",
  "Population 25 Years and Over whose Highest Education Completed is High School (includes equivalency)",
  "Percent of Population 25 Years and Over whose Highest Education Completed is High School (includes equivalency)",
  "Percent of Population 25 Years and Over whose Highest Education Completed is Associate's Degree",
  "Population 25 Years and Over whose Highest Education Completed is Bachelor's Degree or Higher",
  "Percent of Population 25 Years and Over whose Highest Education Completed is Bachelor's Degree or Higher",
  "age 3 to 4 years",
  "age 3 to 4 years_MoE",
  "age 3 to 4 years_enrolled in school",
  "MoE_age 3 to 4 years_enrolled in school",
  "Child Population (under 18 years) whose income in the past 12 months is below poverty level",
  "Percent of Children (under 18 years) whose income in the past 12 months is below poverty level",
  "Total Disconnected Youth (not in school & not in labor force)",
  "Percent of Total Youth who are Disconnected (not in school & not in labor force)",
  "Total Population 25 Years and Over",
];

// Identify fields (do not change). We won't enumerate all; we simply never touch non-target fields.

const MAX_PCT = 0.15; // ±15%

function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function formatLikeOriginal(original, num) {
  // If original looked like an integer string, keep integer; if numeric string with decimals, keep one decimal if present; if number, follow same
  if (typeof original === 'string') {
    if (/^\d+$/.test(original.trim())) {
      return String(Math.round(num));
    }
    if (/^\d+\.\d+$/.test(original.trim())) {
      // preserve one decimal place length
      const decimals = original.trim().split('.')[1].length;
      return num.toFixed(decimals);
    }
    // fallback to as-is string formatting without commas
    return String(num);
  }
  if (typeof original === 'number') {
    // If original is integer-like, keep integer, else keep one decimal where applicable
    if (Number.isInteger(original)) return Math.round(num);
    return Number(Number(num.toFixed(2)));
  }
  // default: number with sensible formatting
  return Number.isInteger(num) ? Math.round(num) : Number(num.toFixed(2));
}

function median(values) {
  const arr = values.filter(v => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2;
  return arr[mid];
}

function randomize(value) {
  const factor = 1 + (Math.random() * 2 * MAX_PCT - MAX_PCT); // in [0.85, 1.15]
  return value * factor;
}

function clampPercentIfNeeded(fieldName, value) {
  if (/Percent/i.test(fieldName)) {
    // Percent fields should be between 0 and 100
    if (!Number.isFinite(value)) return value;
    if (value < 0) return 0;
    if (value > 100) return 100;
  }
  return value;
}

function imputeNulls(features) {
  // For each target field, compute median across features where available
  const medians = {};
  for (const field of FIELDS) {
    const vals = [];
    for (const f of features) {
      const original = f.properties?.[field];
      const num = parseNumber(original);
      if (num !== null) vals.push(num);
    }
    medians[field] = median(vals);
  }
  // Fill nulls with medians
  for (const f of features) {
    if (!f.properties) continue;
    for (const field of FIELDS) {
      const original = f.properties[field];
      const num = parseNumber(original);
      if (num === null && medians[field] !== null) {
        // Keep original type (string vs number) when imputing
        const formatted = formatLikeOriginal(original, medians[field]);
        f.properties[field] = formatted;
      }
    }
  }
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`Unsupported GeoJSON format in ${filePath}`);
  }

  // Impute nulls first so all have values prior to randomization
  imputeNulls(data.features);

  for (const feature of data.features) {
    const props = feature.properties || {};
    for (const field of FIELDS) {
      if (!(field in props)) continue; // don't create fields that don't exist
      const original = props[field];
      const num = parseNumber(original);
      if (num === null) continue; // if still null after imputation, skip
      let randomized = randomize(num);
      randomized = clampPercentIfNeeded(field, randomized);
      const formatted = formatLikeOriginal(original, randomized);
      props[field] = formatted;
    }
  }

  // Write back compact to avoid altering indentation/spacing patterns significantly
  fs.writeFileSync(filePath, JSON.stringify(data) + '\n', 'utf8');
  console.log(`Updated: ${filePath}`);
}

function main() {
  for (const file of TARGET_FILES) {
    processFile(file);
  }
}

main();


