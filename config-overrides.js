const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");

module.exports = function override(config, env) {
	// do stuff with the webpack config...
	config.plugins.push(new NodePolyfillPlugin());
	config.resolve.plugins = config.resolve.plugins.filter(
		(plugin) => !(plugin instanceof ModuleScopePlugin)
	);
	config.resolve.fallback = {
		fs: false,
	};
	config.module = {
		...config.module,
		rules: [
			// Necessary for @injectivelabs dependencies
			{
				test: /\.m?js/,
				resolve: {
					fullySpecified: false,
				},
			},
			// Necessary for @injectivelabs dependencies. They contain Typescript files and that's causing problems if we don't have this rule
			{
				test: /\.tsx?$/,
				include: /node_modules\/@injectivelabs/,
				use: [
					{
						loader: "ts-loader",
						options: {
							transpileOnly: true,
							configFile: "tsconfig.json",
						},
					},
				],
			},
			...config.module.rules,
		],
	};
	return config;
};
