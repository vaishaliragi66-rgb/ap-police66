const fs = require("fs");
const path = require("path");
const vm = require("vm");

const clientCatalogPath = path.join(__dirname, "..", "..", "client", "src", "data", "xrayTypes.js");

const loadClientCatalog = () => {
  const source = fs.readFileSync(clientCatalogPath, "utf8");
  const transformed = source
    .replace(/export const /g, "const ")
    .replace(/export default DEFAULT_XRAY_TYPES;\s*$/m, "module.exports = { DEFAULT_XRAY_CATEGORIES, DEFAULT_XRAY_TYPES, mergeXrayTypes };");

  const sandbox = {
    module: { exports: {} },
    exports: {}
  };

  vm.runInNewContext(transformed, sandbox, {
    filename: clientCatalogPath,
    displayErrors: true
  });

  return sandbox.module.exports || {};
};

const catalog = loadClientCatalog();

module.exports = {
  DEFAULT_XRAY_CATEGORIES: Array.isArray(catalog.DEFAULT_XRAY_CATEGORIES) ? catalog.DEFAULT_XRAY_CATEGORIES : [],
  DEFAULT_XRAY_TYPES: Array.isArray(catalog.DEFAULT_XRAY_TYPES) ? catalog.DEFAULT_XRAY_TYPES : []
};
