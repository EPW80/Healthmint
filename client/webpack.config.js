import webpack from "webpack";

export default {
  resolve: {
    fallback: {},
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        type: "json", 
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
};
