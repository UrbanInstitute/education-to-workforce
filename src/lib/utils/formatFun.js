import { format } from "d3-format";


const FORMATS = {
  percent: ".1%",
  percent_hundredths: ".2%",
  currency: "$,.0f",
  integer: ",.0f",
  numeric: ",.1f",
  hundredths: ",.2f",
  percent_axis: ".0%",
  percent_hundredths_axis: ".2%",
  currency_axis: "$,.2s",
  numeric_axis: ",.0f",
  hundredths_axis: ",.2f",
}
/**
 * @param {number} d - The number to format
 * @param {string | undefined} formatType - The format type to use. Currently supports "percent","percent negative", "currency", and undefined for "numeric"
 * @returns {string} The formatted number as a string
 */
export const formatFun = (d, formatType) => {
  if (d === null || d === undefined) {
    return "N/A";
  }
  const formatString = FORMATS[formatType] || FORMATS.numeric;
  return format(formatString)(d);
};

/**
 * @param {number} d - The number to format
 * @param {string | undefined} formatType - The format type to use. Currently supports "percent","percent negative", "currency", and undefined for "numeric"
 * @returns {string} The formatted number as a string
 */
export const formatFunAxis = (d, formatType) => {
  if (d === null || d === undefined) {
    return "N/A";
  }
  const formatKey = formatType + "_axis";
  const formatString = FORMATS[formatKey] || FORMATS.numeric;
  return format(formatString)(d);
};
