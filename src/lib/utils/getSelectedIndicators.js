/**
 * @param {import("./types/EssentialQuestionObject.js").EssentialQuestionObject | undefined} selectedEq - selected essential question id
 * @param {import("../../routes/indicators/[slug]/$types").PageData | import("../../routes/map/[slug]/$types").PageData | import("../../routes/$types").PageData} pageData - page data (from indicators or map)
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject | undefined} geoid1Data - The data for the first geography
 * @returns {import("./types/IndicatorObject.js").IndicatorObject[]} - The selected indicators
 */
const getSelectedIndicators = (selectedEq, pageData, geoid1Data) => {
  // get indicators based on selected eq
  /** @type {import("./types/IndicatorObject.js").IndicatorObject[] | any} */
  let indicatorsInit;
  if (selectedEq) {
    // if there's an eq selected, get the indicators based on the selected eq
    indicatorsInit = selectedEq.indicator_list.map((/** @type {string} */ d) =>
      pageData.metadata.indicators.find((ind) => ind.indicator_number === +d)
    );
  } else {
    // if there's no eq selected, get all indicators
    indicatorsInit = pageData.metadata.indicators;
  }

  // filter metrics based on in_tool === true
  // for each indicator
  return indicatorsInit.map(
    (/** @type {import("../utils/types/IndicatorObject.js").IndicatorObject} */ ind) => {
      // initialize list
      ind.metricMetadataList = [];
      // if single string, convert string to a single array
      if (typeof ind?.metrics === "string") ind.metrics = [ind.metrics];
      // for each metric in the indicator
      ind?.metrics.forEach((/** @type {string | number} */ metricId) => {
        // get the actual metadata based on the metric ID
        let metricMetadata = pageData.metadata.metrics.find(
          // filter metrics to indicator and in_tool is true
          (metric) => +metricId === metric.metric_id
        );
        // if metricMetadata exists, push to indicator's metricMetadataList
        // @ts-ignore
        if (metricMetadata) ind.metricMetadataList.push(metricMetadata);
      });

      ind.hasMetricData = [];
      ind.noMetricData = [];
      // check if there are metrics to iterate through and geoid1Data exists
      if (ind.metricMetadataList.length > 0 && geoid1Data) {
        ind.metricMetadataList.forEach(
          (
            /** @type {import("../utils/types/MetricMetadataObject.js").MetricMetadataObject} */ metric
          ) => {
            // if geoid data exists, metric data exists for the geoid, geo level is true, and in_tool is true
            if (
              geoid1Data &&
              geoid1Data?.data?.hasOwnProperty("m" + metric.metric_id) &&
              // @ts-ignore
              metric["geo_" + pageData.slug] === true &&
              metric.in_tool === true
            ) {
              // @ts-ignore
              ind.hasMetricData.push(metric);
            } else {
              // @ts-ignore
              ind.noMetricData.push(metric);
            }
          }
        );
        ind.hasMetricDataCount = ind.hasMetricData.length > 0;
        ind.noMetricDataCount = ind.noMetricData.length > 0;
      }

      return ind;
    }
  );
};

export default getSelectedIndicators;
