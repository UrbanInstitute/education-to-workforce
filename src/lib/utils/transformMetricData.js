// @ts-nocheck
import fs from "fs";
import path from "path";

/**
 * @param {string} pathToFile
 */
export function localFileRead(pathToFile) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(pathToFile), "utf8"));
  } catch (error) {
    throw new Error("Error reading or parsing file:", error);
  }
}

/**
 * @param {string} pathToFile
 * @param {Object} data
 */
export function localFileWrite(data, pathToFile) {
  try {
    fs.writeFileSync(path.resolve(pathToFile), JSON.stringify(data), "utf8");
  } catch (error) {
    throw new Error("Error writing file:", error);
  }
}

/**
 * @param {string} pathToFile
 * @param {Object[]} data
 */
export function transformMetricData(data, pathToFile) {
  let output = {};
  // for each array value + key in the object, transform to nested object
  data.forEach((d) => {
    Object.keys(d)
      // filter out keys that start with "data"
      .filter((str) => str.startsWith("data"))
      .forEach((key) => {
        // split out the field name (ie: data.m11.2010)
        const split = key.split(".");
        // convert value to a number
        const value = +d[key];
        // remove the key
        delete d[key];
        // make sure each level of the nested object is created if it doesn't exist
        if (!d[split[0]]) d[split[0]] = {};
        if (!d[split[0]][split[1]]) d[split[0]][split[1]] = {};
        // set the new nested value
        d[split[0]][split[1]][split[2]] = value;
      });
    // get geoid and remove it from the object
    const geoid = d.geoid;
    delete d.geoid;
    // set the object in the output
    output[geoid] = d;
  });

  // write to file
  localFileWrite(output, pathToFile);
}
