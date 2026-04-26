const fs = require("fs");
const path = require("path");
const vm = require("vm");

const serverCatalogPath = path.join(__dirname, "xrayTypes.js");

const loadServerCatalog = () => {
  const source = fs.readFileSync(serverCatalogPath, "utf8");
  const transformed = source
    .replace(/export const /g, "const ")
    .replace(/export default DEFAULT_XRAY_TYPES;\s*$/m, "module.exports = { DEFAULT_XRAY_CATEGORIES, DEFAULT_XRAY_TYPES, mergeXrayTypes };");

  const sandbox = {
    module: { exports: {} },
    exports: {}
  };

  vm.runInNewContext(transformed, sandbox, {
    filename: serverCatalogPath,
    displayErrors: true
  });

  return sandbox.module.exports || {};
};

const catalog = loadServerCatalog();

module.exports = {
  DEFAULT_XRAY_CATEGORIES: Array.isArray(catalog.DEFAULT_XRAY_CATEGORIES) ? catalog.DEFAULT_XRAY_CATEGORIES : [],
  DEFAULT_XRAY_TYPES: Array.isArray(catalog.DEFAULT_XRAY_TYPES) ? catalog.DEFAULT_XRAY_TYPES : []
};
