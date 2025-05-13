import defaultGeoid from "./defaultGeoid";
import { queryParameters, ssp } from "sveltekit-search-params";

export const constructQueryParams = (/** @type {string} */ slug) => {
  return queryParameters(
    {
      eqid: ssp.number(1),
      geoid1: ssp.string(defaultGeoid(slug)), // geoid1 is required
      geoid2: false, // geoid2 is optional but can be a value
      timeframe: ssp.string("recent") // timeframe is required
    },
    {
      pushHistory: false
    }
  );
};

export const buildQueryString = (params) => {
  return (
    Object.keys(params)
      // iterate over keys and filter out any that are false, undefined, or null
      .filter((key) => params[key] !== false && params[key] !== undefined && params[key] !== null)
      // map over the remaining keys and encode them
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      // join with ampersands
      .join("&")
  );
};
