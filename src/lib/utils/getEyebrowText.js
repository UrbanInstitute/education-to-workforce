/**
 * @param {import("../../routes/map/[slug]/$types").PageData} data - page data to use archie metadata
 * @param {*} indicator - indicator metadata, containing relevant fields
 * @param {string} selectedFilter - selected filter based on dropdown (type, domain, sector)
 * @returns {string | null} - eyebrow text to display
 */
const getEyebrowText = (data, indicator, selectedFilter) => {
  let filterMetadata = data.archie.page.filters.find(
    (
      /** @type {{ value: string; label: string; selections: Array<{ value: string; label: string; }> }} */ d
    ) => d.value === selectedFilter
  ).selections;

  if (selectedFilter === "type") {
    // find the label that matches the type
    return filterMetadata.find(
      (/** @type {{ value: string; label: string; }} */ d) => indicator.type.toString() === d.value
    ).label;
  } else if (selectedFilter === "domain") {
    // if domain is null, return null
    if (!indicator.hasOwnProperty("domain")) return null;
    return filterMetadata.find(
      (/** @type {{ value: string; label: string; }} */ d) =>
        indicator.domain.toString() === d.value
    ).label;
  } else if (selectedFilter === "sector") {
    // iterate through filter values and join with pipe
    return filterMetadata
      .filter(
        (/** @type {{ value: string; label: string; }} */ d) =>
          indicator[`sector_${d.value}`] == true
      )
      .map((/** @type {{ value: string; label: string; }} */ d) => d.label)
      .join(" <span class=\"divider\">|</span> ");
  } else {
    return null;
  }
};

export default getEyebrowText;
