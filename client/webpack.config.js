const webpack = require("webpack");

module.exports = {
  resolve: {
    fallback: {},
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
};
