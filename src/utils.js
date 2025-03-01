/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").Input} Input */
/** @typedef {import("html-minifier-terser").Options} HtmlMinifierTerserOptions */

const notSettled = Symbol(`not-settled`);

/**
 * @template T
 * @typedef {() => Promise<T>} Task
 */

/**
 * Run tasks with limited concurency.
 * @template T
 * @param {number} limit - Limit of tasks that run at once.
 * @param {Task<T>[]} tasks - List of tasks to run.
 * @returns {Promise<T[]>} A promise that fulfills to an array of the results
 */
function throttleAll(limit, tasks) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError(
      `Expected \`limit\` to be a finite number > 0, got \`${limit}\` (${typeof limit})`
    );
  }

  if (
    !Array.isArray(tasks) ||
    !tasks.every((task) => typeof task === `function`)
  ) {
    throw new TypeError(
      `Expected \`tasks\` to be a list of functions returning a promise`
    );
  }

  return new Promise((resolve, reject) => {
    const result = Array(tasks.length).fill(notSettled);

    const entries = tasks.entries();

    const next = () => {
      const { done, value } = entries.next();

      if (done) {
        const isLast = !result.includes(notSettled);

        if (isLast) resolve(/** @type{T[]} **/ (result));

        return;
      }

      const [index, task] = value;

      /**
       * @param {T} x
       */
      const onFulfilled = (x) => {
        result[index] = x;
        next();
      };

      task().then(onFulfilled, reject);
    };

    Array(limit).fill(0).forEach(next);
  });
}

/**
 * @param {Input} input
 * @param {HtmlMinifierTerserOptions | undefined} [minimizerOptions]
 * @returns {Promise<MinimizedResult>}
 */
/* istanbul ignore next */
async function htmlMinifierTerser(input, minimizerOptions = {}) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const htmlMinifier = require("html-minifier-terser");
  const [[, code]] = Object.entries(input);
  /** @type {HtmlMinifierTerserOptions} */
  const defaultMinimizerOptions = {
    caseSensitive: true,
    // `collapseBooleanAttributes` is not always safe, since this can break CSS attribute selectors and not safe for XHTML
    collapseWhitespace: true,
    conservativeCollapse: true,
    keepClosingSlash: true,
    // We need ability to use cssnano, or setup own function without extra dependencies
    minifyCSS: true,
    minifyJS: true,
    // `minifyURLs` is unsafe, because we can't guarantee what the base URL is
    // `removeAttributeQuotes` is not safe in some rare cases, also HTML spec recommends against doing this
    removeComments: true,
    // `removeEmptyAttributes` is not safe, can affect certain style or script behavior, look at https://github.com/webpack-contrib/html-loader/issues/323
    // `removeRedundantAttributes` is not safe, can affect certain style or script behavior, look at https://github.com/webpack-contrib/html-loader/issues/323
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    // `useShortDoctype` is not safe for XHTML
  };
  const result = await htmlMinifier.minify(code, {
    ...defaultMinimizerOptions,
    ...minimizerOptions,
  });

  return { code: result };
}

module.exports = { throttleAll, htmlMinifierTerser };
