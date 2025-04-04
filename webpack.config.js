const path = require('path');

module.exports = {
	entry: {
		content: './src/index.js',
		background: './background.js',
		popup: './popup.js'
	},
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env']
					}
				}
			}
		]
	},
	resolve: {
		extensions: ['.js']
	},
	devtool: 'source-map',
	optimization: {
		minimize: false
	}
}; 