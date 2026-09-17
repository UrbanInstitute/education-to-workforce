// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { zip } from "fflate";

/**
 * Zip helper for the EQ section's "download all chart images" (requirements §3.10,
 * §4.10): the per-card a.click() loop it replaces fired N downloads from one gesture,
 * which Chrome permission-gates and iOS Safari blocks. Cards are rendered to PNG blobs
 * sequentially (bounded memory), zipped in store mode — PNGs are already compressed —
 * and downloaded with a single click on the zip.
 */

/**
 * Make a filename safe as a zip member: strip path separators and other reserved
 * characters, collapse whitespace.
 * @param {string} name
 * @returns {string}
 */
export const sanitizeFilename = (name) =>
  name
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Sanitize every entry name and dedupe collisions with " (2)"-style suffixes,
 * preserving the ".png" extension.
 * @param {{ filename: string, blob: Blob }[]} entries
 * @returns {{ filename: string, blob: Blob }[]}
 */
export const dedupeFilenames = (entries) => {
  /** @type {Set<string>} */
  const taken = new Set();
  return entries.map(({ filename, blob }) => {
    const clean = sanitizeFilename(filename) || "chart";
    const match = clean.match(/^(.*?)(\.[a-z0-9]+)?$/i);
    const stem = match?.[1] || "chart";
    const extension = match?.[2] ?? "";
    // probe generated names too: counting occurrences of the original alone lets a
    // generated suffix collide with a later original ("a", "a", "a (2)"), and fflate
    // would silently drop one of the two blobs
    let candidate = clean;
    let suffix = 1;
    while (taken.has(candidate)) {
      suffix += 1;
      candidate = `${stem} (${suffix})${extension}`;
    }
    taken.add(candidate);
    return { filename: candidate, blob };
  });
};

/**
 * Bundle `[{ filename, blob }]` into a single zip Blob (store mode, level 0).
 * @param {{ filename: string, blob: Blob }[]} entries
 * @returns {Promise<Blob>}
 */
export async function createZip(entries) {
  const deduped = dedupeFilenames(entries);
  /** @type {Object<string, [Uint8Array, { level: 0 }]>} */
  const files = {};
  for (const { filename, blob } of deduped) {
    files[filename] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }
  const data = await new Promise((resolve, reject) =>
    zip(files, { level: 0 }, (error, result) => (error ? reject(error) : resolve(result)))
  );
  return new Blob([data], { type: "application/zip" });
}
