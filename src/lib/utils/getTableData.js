import disaggregateMetadata from "$data/metadata/disaggregates.json";
import { formatFun } from "./formatFun";

/**
 *
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject} data - geoid object
 * @param {string[]} metrics - array of metric names
 * @param {string | number} year - year of data to get
 * @param {string} formatType - format type for the data (uses $utils/formatFun)
 */
const getLatestYearRow = (data, metrics, year, formatType) => {
  return [
    data.short_name || data.name,
    ...metrics.map((metric) => {
      return data.data && data.data.hasOwnProperty(metric) && data.data[metric].hasOwnProperty(year)
        ? formatFun(data.data[metric][year.toString()], formatType)
        : "N/A";
    })
  ];
};

/**
 *
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject} data - geoid object
 * @param {string} metric - metric name to fetch
 * @param {number[]} years - years of data to get
 * @param {string} formatType - format type for the data (uses $utils/formatFun)
 */
const getTrendRow = (data, metric, years, formatType) => {
  return [
    data.short_name || data.name,
    ...years.map((year) => {
      return data.data && data.data.hasOwnProperty(metric) && data.data[metric].hasOwnProperty(year)
        ? formatFun(data.data[metric][year], formatType)
        : "N/A";
    })
  ];
};

/**
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject[]} data - geoid object array
 * @param {string} timeframe - timeframe to get data for
 * @param {string} metricId - metric id in string form (ie: "m1")
 * @param {string[]} years - years to get data for
 * @param {string} recentYear - most recent year as calculated at parent
 * @param {string} dropdownValue - disaggregate dropdown value (ie: "d1" or "d1_white")
 * @param {string} formatType - format type for the data (uses $utils/formatFun)
 */
const getTableData = (
  data,
  timeframe,
  metricId,
  years,
  recentYear,
  dropdownValue,
  formatType = "percent"
) => {
  let metricsRecentValues = disaggregateMetadata
    // find the disaggregate metadata object that matches the dropdown value
    .find((d) => "d" + d.prefix === dropdownValue)
    // get the fields array from the disaggregate metadata
    ?.fields.map((d) => d.value)
    // add the metric id to the beginning of each field value
    .map((d) => metricId + "_" + d);
  let metricsRecent = metricsRecentValues ?? [];
  let trendYears = years.map((d) => +d);
  let metricTrend = metricId + "_" + dropdownValue;

  let metricLabelsValues = disaggregateMetadata
    // find the disaggregate metadata object that matches the dropdown value
    .find((d) => "d" + d.prefix === dropdownValue)
    // get the fields array from the disaggregate metadata
    ?.fields.map((d) => d.label);
  let metricLabels = metricLabelsValues ?? [""];

  let headerRecent = ["Geography", ...metricLabels];
  let headerTrend = ["Geography", ...trendYears];

  /** @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject} d */
  const getRowData = (d) => {
    if (timeframe === "recent") {
      return getLatestYearRow(d, metricsRecent, recentYear, formatType);
    } else if (timeframe === "all") {
      return getTrendRow(d, metricTrend, trendYears, formatType);
    } else {
      return [];
    }
  };

  return {
    header: timeframe === "recent" ? headerRecent : headerTrend,
    rows: data.map(getRowData)
  };
};

export default getTableData;
