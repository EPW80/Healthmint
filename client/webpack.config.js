// webpack.config.js
import { ProvidePlugin } from 'webpack';

export const resolve = {
  fallback: {},
};
export const module = {
  rules: [
    {
      test: /\.json$/,
      type: "json",
    },
  ],
};
export const plugins = [
  new ProvidePlugin({
    process: "process/browser",
  }),
];