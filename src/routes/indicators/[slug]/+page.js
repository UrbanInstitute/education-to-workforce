import national from "$data/metrics/national.json";
import states from "$data/metrics/states.json";
// @ts-ignore
import eqData from "$archie/essential-questions.aml";
// @ts-ignore
import timeframeData from "$archie/timeframe.aml";
// @ts-ignore
import page from "$archie/page-2.aml";
import { SLUG_ENTRIES } from "$utils/consts";

import eqDataExcel from "$data/metadata/essential-questions.json";
import indicators from "$data/metadata/indicators.json";
import metrics from "$data/metadata/metrics.json";
import contextVars from "$data/metadata/context.json";

eqData.data.forEach((d) => {
  let item = eqDataExcel.find((e) => e.essential_question_id === +d.id);
  if (item.hasOwnProperty("indicator_list")) {
    d.indicator_list = item.indicator_list;
  }
});

function parseContextData(d) {
  if (Object.keys(d).includes("disaggregate")) {
    const disaggregate = d.disaggregate.replaceAll(", ", ",").split(",").map(Number);
    return Object.assign({}, d, { disaggregate });
  }
  return d;
}

const contextLookup = contextVars
  .map(parseContextData)
  .reduce((acc, curr) => {
    acc.set(curr.geo_id, curr);
    return acc;
  }, new Map());

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
  return {
    national: national["00"],
    states,
    slug: params.slug,
    // archie-ml related data
    metadata: {
      indicators,
      metrics,
      context: contextLookup
    },
    archie: {
      eqData,
      timeframeData,
      page
    }
  };
}

/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return SLUG_ENTRIES;
}
