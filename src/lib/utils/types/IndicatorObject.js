/**
 * @typedef {Object} IndicatorObject
 * @property {string} cluster - Indicator cluster (not currently in use)
 * @property {number} domain - Indicator domain
 * @property {string | string[]} eq_id - The related essential question ID(s)
 * @property {import("./MetricMetadataObject").MetricMetadataObject[] | Array.<any>} [hasMetricData] - The metrics that have data for the indicator (can be empty)
 * @property {boolean} [hasMetricDataCount] - Whether the indicator has metrics with data
 * @property {boolean} in_tool - Whether the indicator should be represented in the tool
 * @property {string} indicator_name - The indicator name
 * @property {number} indicator_number - The indicator number (ID)
 * @property {import("./MetricMetadataObject").MetricMetadataObject[] | Array.<any>} [metricMetadataList] - The metadata for the metrics associated with the indicator
 * @property {string | string[]} metrics - The metric ID(s) associated with the indicator
 * @property {import("./MetricMetadataObject").MetricMetadataObject[] | Array.<any>} [noMetricData] - The metrics that do not have data for the indicator (can be empty)
 * @property {boolean} noMetricDataCount - Whether the indicator has metrics without data
 * @property {boolean} sector_k12 - Whether the indicator is related to K-12 education
 * @property {boolean} sector_postsec - Whether the indicator is related to postsecondary education
 * @property {boolean} sector_prek - Whether the indicator is related to pre-K education
 * @property {boolean} sector_work - Whether the indicator is related to workforce development
 * @property {number} type - The indicator type
 */
module.exports = {};
