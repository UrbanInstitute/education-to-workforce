// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// aliased: `hasMetricData` is also the name of the per-indicator accumulator below
import { hasMetricData as geoHasMetricData } from "$utils/disaggregates";

/**
 * Annotate indicators with the metrics that do and don't have data for a geography.
 *
 * Pure: returns new indicator objects rather than writing onto the shared
 * `metadata.indicators` entries. ToolState derives two lists (EQ-scoped and all-data) from
 * the same metadata, so in-place annotation had them overwriting each other's fields.
 * Consumers must key `{#each}` blocks by `indicator_number`, not object identity.
 *
 * @param {import("$utils/types/EssentialQuestionObject.js").EssentialQuestionObject | undefined} selectedEq - selected essential question id
 * @param {import("../../routes/$types").PageData} pageData - page data
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject | undefined} geoid1Data - The data for the first geography
 * @returns {import("$utils/types/IndicatorObject.js").IndicatorObject[]} - The selected indicators
 */
const getSelectedIndicators = (selectedEq, pageData, geoid1Data) => {
  /** @type {import("$utils/types/IndicatorObject.js").IndicatorObject[] | any} */
  let indicatorsInit;
  if (selectedEq) {
    // an EQ may reference an indicator that isn't in the metadata — drop it rather than throw
    indicatorsInit = selectedEq.indicator_list
      .map((/** @type {string} */ d) =>
        pageData.metadata.indicators.find((ind) => ind.indicator_number === +d)
      )
      .filter(Boolean);
  } else {
    indicatorsInit = pageData.metadata.indicators;
  }

  return indicatorsInit.map(
    (/** @type {import("$utils/types/IndicatorObject.js").IndicatorObject} */ ind) => {
      // metrics is a single string for single-metric indicators
      const metricIds = typeof ind?.metrics === "string" ? [ind.metrics] : (ind?.metrics ?? []);
      /** @type {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject[]} */
      const metricMetadataList = [];
      metricIds.forEach((/** @type {string | number} */ metricId) => {
        const metricMetadata = pageData.metadata.metrics.find(
          (metric) => +metricId === metric.metric_id
        );
        // @ts-ignore
        if (metricMetadata) metricMetadataList.push(metricMetadata);
      });

      /** @type {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject[]} */
      const hasMetricData = [];
      /** @type {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject[]} */
      const noMetricData = [];
      // without geography data, data presence is unknown rather than absent — leave both
      // lists empty so the grids keep their skeleton state instead of rendering a
      // "no data" bucket holding every metric
      if (geoid1Data) {
        metricMetadataList.forEach(
          (
            /** @type {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject} */ metric
          ) => {
            // data exists for the geoid, the metric is published at this level, and it's in the tool.
            // hasMetricData probes subgroup keys for disaggregate-only metrics (m190), which have
            // no base m{id} accessor and would otherwise never leave the no-data bucket (§11.4).
            const hasData =
              geoHasMetricData(geoid1Data.data, metric) &&
              // @ts-ignore
              metric["geo_" + pageData.slug] === true &&
              metric.in_tool === true;
            (hasData ? hasMetricData : noMetricData).push(metric);
          }
        );
      }

      return {
        ...ind,
        metricMetadataList,
        hasMetricData,
        noMetricData,
        hasMetricDataCount: hasMetricData.length > 0,
        noMetricDataCount: noMetricData.length > 0
      };
    }
  );
};

export default getSelectedIndicators;
