"use strict";

const webpack = require("webpack");
const fs = require("fs");
const path = require("path");
const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const DtsGeneratorPlugin = require("../../webpack-plugins/webpack-dts-generator");
const mergeFiles = require("merge-files");
const packageJson = require("./package.json");

const today = new Date();
const year = today.getFullYear();

var banner = [
  "SurveyJS Creator v" + packageJson.version,
  "(c) 2015-" + year + " Devsoft Baltic OÜ - http://surveyjs.io/",
  "Github: https://github.com/surveyjs/survey-creator",
  "License: https://surveyjs.io/Licenses#SurveyCreator",
].join("\n");

var dts_banner = [
  "Type definitions for SurveyJS Creator JavaScript library v" +
  packageJson.version,
  "(c) 2015-" + year + " Devsoft Baltic OÜ - http://surveyjs.io/",
  "Github: https://github.com/surveyjs/survey-creator",
  "License: https://surveyjs.io/Licenses#SurveyCreator",
  "",
].join("\n");

var buildPlatformJson = {
  name: packageJson.name,
  version: packageJson.version,
  description:
    "Use SurveyJS Creator to create or edit JSON for SurveyJS Form Library.",
  keywords: [
    "Survey",
    "Survey Creator",
    "Form Builder",
    "Survey Maker",
    "SurveyJS",
    "JavaScript",
    "TypeScript",
  ],
  homepage: "https://surveyjs.io/Overview/Survey-Creator",
  license: "https://surveyjs.io/Licenses#SurveyCreator",
  files: [
    "**/*"
  ],
  main: packageJson.name + ".js",
  repository: {
    type: "git",
    url: "https://github.com/surveyjs/survey-creator.git",
  },
  engines: {
    node: ">=0.10.0",
  },
  typings: packageJson.name + ".d.ts",
  peerDependencies: {
    "ace-builds": "^1.4.12",
    "survey-core": packageJson.version
  },
  peerDependenciesMeta: {
    "ace-builds": {
      "optional": true
    },
  },
  devDependencies: {},
};

module.exports = function (options) {
  var buildPath = __dirname + "/build/";
  var isProductionBuild = options.buildType === "prod";

  function createStylesBundleWithFonts() {
    const getdir = (filename) => {
      return buildPath + filename;
    }

    if (isProductionBuild) {
      let outputPath = getdir("survey-creator-core.min.css");
      let inputPathList = [
        getdir("fonts.fontless.min.css"),
        getdir("survey-creator-core.fontless.min.css")
      ];
      return mergeFiles(inputPathList, outputPath);
    } else {
      let outputPath = getdir("survey-creator-core.css");
      let inputPathList = [
        getdir("fonts.fontless.css"),
        getdir("survey-creator-core.fontless.css")
      ];
      return mergeFiles(inputPathList, outputPath);
    }

  }

  var percentage_handler = function handler(percentage, msg) {
    if (0 == percentage) {
      console.log("Build started... good luck!");
    } else if (1 == percentage) {
      if (isProductionBuild) {
        fs.createReadStream("./README.md").pipe(
          fs.createWriteStream(buildPath + "README.md")
        );
      }

      if (isProductionBuild) {
        fs.writeFileSync(
          buildPath + "package.json",
          JSON.stringify(buildPlatformJson, null, 2),
          "utf8"
        );
      }

      return createStylesBundleWithFonts();
    }
  };

  var config = {
    mode: isProductionBuild ? "production" : "development",
    entry: {
      [packageJson.name]: path.resolve(__dirname, "./src/entries/index.ts"),
      "fonts": path.resolve(__dirname, "./src/entries/fonts.scss")
    },
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".scss"],
      //plugins: [new TsconfigPathsPlugin(/*{ configFile: "./tsconfig.json" }*/)],
      alias: {
        tslib: path.join(__dirname, "./src/entries/helpers.ts"),
      },
    },
    optimization: {
      minimize: isProductionBuild,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: "ts-loader",
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: options.buildType !== "prod",
              },
            },
          ],
        },
        {
          test: /\.s(c|a)ss$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: ""
              }
            },
            {
              loader: "css-loader",
              options: {
                sourceMap: options.buildType !== "prod",
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: options.buildType !== "prod",
              },
            },
          ],
        },
        {
          test: /\.html$/,
          loader: "html-loader",
        },
        {
          test: /\.svg$/,
          loader: "svg-inline-loader",
        },
      ],
    },
    output: {
      path: buildPath,
      filename: "[name]" + (isProductionBuild ? ".min" : "") + ".js",
      library: options.libraryName || "SurveyCreatorCore",
      libraryTarget: "umd",
      globalObject: 'this',
      umdNamedDefine: true
    },
    externals: {
      knockout: {
        root: "ko",
        commonjs2: "knockout",
        commonjs: "knockout",
        amd: "knockout",
      },
      "survey-core": {
        root: "Survey",
        commonjs2: "survey-core",
        commonjs: "survey-core",
        amd: "survey-core",
      },
    },
    plugins: [
      new webpack.ProgressPlugin(percentage_handler),
      new DtsGeneratorPlugin({
        webpack: webpack,
        filePath: "build/survey-creator-core.d.ts",
        moduleName: "survey-creator-core"
      }),
      new webpack.DefinePlugin({
        "process.env.ENVIRONMENT": JSON.stringify(options.buildType),
        "process.env.VERSION": JSON.stringify(packageJson.version),
      }),
      new RemoveEmptyScriptsPlugin(),
      new MiniCssExtractPlugin({
        filename: isProductionBuild ? "[name].fontless.min.css" : "[name].fontless.css",
      }),
      new webpack.WatchIgnorePlugin({ paths: [/svgbundle\.html/] }),
      new webpack.BannerPlugin({
        banner: banner,
      }),
    ],
  };

  if (isProductionBuild) {
    config.plugins.push = config.plugins.concat([]);
  } else {
    config.devtool = "source-map";
    config.plugins = config.plugins.concat([
      new webpack.LoaderOptionsPlugin({ debug: true }),
    ]);
  }

  return config;
};
