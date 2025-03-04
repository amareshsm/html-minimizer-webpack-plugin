/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").InternalResult} InternalResult */

/**
 * @template T
 * @param {import("./index.js").InternalOptions<T>} options
 * @returns {Promise<InternalResult>}
 */
const minify = async (options) => {
  /** @type {InternalResult} */
  const result = {
    code: options.input,
    warnings: [],
    errors: [],
  };

  const transformers = Array.isArray(options.minimizer)
    ? options.minimizer
    : [options.minimizer];

  for (let i = 0; i <= transformers.length - 1; i++) {
    const { implementation } = transformers[i];
    // eslint-disable-next-line no-await-in-loop
    const minifyResult = await implementation(
      { [options.name]: result.code },
      transformers[i].options
    );

    if (
      Object.prototype.toString.call(minifyResult) === "[object Object]" &&
      minifyResult !== null &&
      "code" in minifyResult
    ) {
      result.code = minifyResult.code;
      result.warnings = result.warnings.concat(minifyResult.warnings || []);
      result.errors = result.errors.concat(minifyResult.errors || []);
    } else {
      // @ts-ignore
      result.code = minifyResult;
    }
  }

  return result;
};

/**
 * @param {string} options
 * @returns {Promise<InternalResult>}
 */
async function transform(options) {
  // 'use strict' => this === undefined (Clean Scope)
  // Safer for possible security issues, albeit not critical at all here
  // eslint-disable-next-line no-new-func, no-param-reassign
  const evaluatedOptions = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    `'use strict'\nreturn ${options}`
  )(exports, require, module, __filename, __dirname);

  return minify(evaluatedOptions);
}

module.exports = { minify, transform };
