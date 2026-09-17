// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Fire a single browser download for a Blob via a temporary anchor + object URL.
 * Shared by the per-card PNG export and the download-all zip flow.
 *
 * @param {Blob} blob
 * @param {string} filename - full filename including extension
 */
export const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
