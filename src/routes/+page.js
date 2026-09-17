// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import national from "$data/metrics/national.json";
import nationalContext from "$data/context/national.json";
// @ts-ignore
import page from "$archie/page-tool.aml";
// @ts-ignore
import eqData from "$archie/essential-questions.aml";
// @ts-ignore
import timeframeData from "$archie/timeframe.aml";

import eqDataExcel from "$data/metadata/essential-questions.json";
import indicators from "$data/metadata/indicators.json";
import metrics from "$data/metadata/metrics.json";
import contextVars from "$data/metadata/context.json";

// join Excel-derived availability counts + indicator lists onto each EQ (union of the
// old landing and indicators-page joins)
eqData.data.forEach((/** @type {*} */ d) => {
  let item = eqDataExcel.find((e) => e.essential_question_id === +d.id);
  d.total_indicators = item?.total_indicators;
  d.geo_tracts = item?.geo_tracts;
  d.geo_counties = item?.geo_counties;
  d.geo_school_districts = item?.geo_school_districts;
  d.geo_states = item?.geo_states;
  d.indicator_list = item?.indicator_list;
});

function parseContextData(/** @type {*} */ d) {
  let result = { ...d };
  if (result.disaggregate) {
    result.disaggregate = result.disaggregate.replaceAll(", ", ",").split(",").map(Number);
  }
  if (result.geo_levels) {
    result.geo_levels = result.geo_levels.replaceAll(", ", ",").split(",");
  }
  return result;
}

const contextLookup = contextVars.map(parseContextData).reduce((acc, curr) => {
  acc.set(curr.geo_id, curr);
  return acc;
}, new Map());

/** @type {import('./$types').PageLoad} */
export function load() {
  return {
    national: national["00"],
    // single bundled row (see preprocess-metadata.R): the national view needs it on first
    // paint, so unlike every other level's context it isn't a runtime fetch
    nationalContext: nationalContext[0],
    metadata: {
      indicators,
      metrics,
      context: contextLookup
    },
    archie: {
      page,
      eqData,
      timeframeData
    }
  };
}
