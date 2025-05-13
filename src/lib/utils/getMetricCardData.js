/**
 *
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject | undefined} geoid1Data
 * @param {import("$utils/types/GeoidDataObject.js").GeoidDataObject | undefined} geoid2Data
 * @param {import("../../routes/indicators/[slug]/$types").PageData | import("../../routes/map/[slug]/$types").PageData} data
 * @returns
 */
export const getMetricCardData = (geoid1Data, geoid2Data, data) => {
  let state1Data;
  let state2Data;
  if (
    geoid1Data &&
    geoid1Data.hasOwnProperty("s_id") &&
    data.states.hasOwnProperty(geoid1Data.s_id)
  ) {
    state1Data = data.states[geoid1Data.s_id];
  }
  if (
    geoid2Data &&
    geoid2Data.hasOwnProperty("s_id") &&
    data.states.hasOwnProperty(geoid2Data.s_id)
  ) {
    state2Data = data.states[geoid2Data.s_id];
  }

  // if page has loaded and there is data
  if (data.slug && geoid1Data) {
    // if state is the main geography
    if (data.slug === "states") {
      return geoid2Data ? [geoid1Data, geoid2Data, data.national] : [geoid1Data, data.national];
      // county/tract: if states are the same, remove from duplicating
    } else if (geoid2Data && geoid1Data.s_id == geoid2Data.s_id) {
      return [geoid1Data, geoid2Data, state1Data, data.national];
      // county/tract is the main geography
    } else {
      return geoid2Data
        ? [geoid1Data, state1Data, geoid2Data, state2Data, data.national]
        : [geoid1Data, state1Data, data.national];
    }
  } else {
    return undefined;
  }
};

export const getBarData = (
  /** @type {import("$utils/types/GeoidDataObject.js").GeoidDataObject[]} */ data,
  /** @type {string | number} */ metricAccessor,
  /** @type {string | number} */ recentYear
) => {
  return data.map((d) => {
    return {
      name: d.short_name || d.name,
      // check if the data has the metricAccessor and year
      value: d.data?.[metricAccessor]?.[recentYear] ?? null
    };
  });
};

export const getTrendData = (
  /** @type {import("$utils/types/GeoidDataObject.js").GeoidDataObject[]} */ data,
  /** @type {string} */ metricAccessor,
  /** @type {string[] | number[]} */ yearsAvailable
) => {
  return data.map((d) => {
    return {
      name: d.short_name || d.name,
      data: yearsAvailable.map((year) => {
        return {
          year,
          // check if the data has the metricAccessor and year
          value: d.data?.[metricAccessor]?.[year] ?? null
        };
      })
    };
  });
};
