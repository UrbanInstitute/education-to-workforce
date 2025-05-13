/**
 * @typedef {Object} MetricMetadataObject
 * @property {string | string[]} [disag_available] - The disaggregate IDs available
 * @property {boolean} [five_year] - Whether the metric is available for five-year estimates
 * @property {boolean} [geo_counties] - Whether the metric is available for counties
 * @property {boolean} [geo_states] - Whether the metric is available for states
 * @property {boolean} [geo_tracts] - Whether the metric is available for tracts
 * @property {boolean} [geo_usa] - Whether the metric is available for the national level
 * @property {boolean} in_tool - Whether the metric should be represented in the tool
 * @property {number} indicator_number - The indicator number (ID) the metric is associated with
 * @property {string} metric_full_name - The full metric name
 * @property {number} metric_id - The metric ID
 * @property {string} [metric_type] - The metric type ("percent", "number", "currency")
 * @property {string} [source_label] - The source label
 * @property {string} [notes_label] - The notes label
 * @property {string | string[]} [years_available] - The years of data available for the metric
 */
module.exports = {};
