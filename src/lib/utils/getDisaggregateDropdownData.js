import disaggregateMetadata from "$data/metadata/disaggregates.json";
import { includes } from "lodash";

/**
 * @param {string | string[]} disagAvailable
 * @returns {{ recent: { value: string; label: string }[], all: { value: string; label: string }[] }}
 */
const getDisaggregateDropdownData = (disagAvailable) => {
  // get the metadata for the metric's disaggregates
  let selectedDisaggregateMetadata;
  if (disagAvailable !== "FALSE" && disagAvailable) {
    selectedDisaggregateMetadata = disaggregateMetadata.filter((d) =>
      includes(disagAvailable, d.prefix.toString())
    );
  }

  // init the dropdown data object
  let disaggregateDropdownData = { recent: {}, all: {} };

  // if there's disaggregates metadata
  if (selectedDisaggregateMetadata) {
    // create the recent year formatted dropdown data (disagg categories)
    disaggregateDropdownData.recent = selectedDisaggregateMetadata.map((d) => {
      return { value: "d" + d.prefix, label: d.category_name };
    });

    // create the all years formatted dropdown data (disagg category/field combinations)
    disaggregateDropdownData.all = selectedDisaggregateMetadata.flatMap((d) => {
      return (
        d.fields
          .map((f) => {
            return { value: f.value, label: `${d.category_name}: ${f.label}` };
          })
          // alphabetize
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    });
  }

  return disaggregateDropdownData;
};

export default getDisaggregateDropdownData;
