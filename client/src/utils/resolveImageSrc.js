export const resolveImageSrc = (value, backendUrl = "") => {
  if (!value) {
    return "";
  }

  const source = String(value).trim();
  if (!source) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(source) || source.startsWith("data:")) {
    return source;
  }

  const normalizedBackendUrl = String(backendUrl || "").replace(/\/$/, "");
  const normalizedSource = source.startsWith("/") ? source : `/${source}`;
  return normalizedBackendUrl ? `${normalizedBackendUrl}${normalizedSource}` : normalizedSource;
};