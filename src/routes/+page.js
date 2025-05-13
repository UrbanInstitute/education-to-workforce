// @ts-ignore
import page from "$archie/page-1.aml";
// @ts-ignore
import eqData from "$archie/essential-questions.aml";
import eqDataExcel from "$data/metadata/essential-questions.json";

import indicators from "$data/metadata/indicators.json";
import metrics from "$data/metadata/metrics.json";

eqData.data.forEach((d) => {
  let item = eqDataExcel.find((e) => e.essential_question_id === +d.id);
  d.total_indicators = item?.total_indicators;
  d.geo_tracts = item?.geo_tracts;
  d.geo_counties = item?.geo_counties;
  d.geo_states = item?.geo_states;
  d.indicator_list = item?.indicator_list;
});

/** @type {import('./$types').PageLoad} */
export async function load() {
  return { archie: { page, eqData }, metadata: { indicators, metrics } };
}
