/**
 * URL 地址组装函数
 */
export function buildUrl(originalUrl, params = {}, isOverride = false, isRemoveEmpty = true) {
  if (!originalUrl) return "";

  const url = new URL(originalUrl, window.location.origin);
  const existingParams = Object.fromEntries(new URLSearchParams(url.search).entries());
  const mergedParams = isOverride ? { ...params } : { ...existingParams, ...params };

  if (isRemoveEmpty) {
    Object.keys(mergedParams).forEach((key) => {
      const v = mergedParams[key];
      if (v === null || v === undefined || v === "") {
        delete mergedParams[key];
      }
    });
  }

  const sp = new URLSearchParams();
  Object.entries(mergedParams).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") {
      sp.set(k, String(v));
    }
  });
  url.search = sp.toString();

  return url.toString();
}
