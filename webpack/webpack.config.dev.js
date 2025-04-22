/* eslint-disable */
const fs = require('fs');
const Path = require('path');
const Webpack = require('webpack');
const { merge } = require('webpack-merge');
const StylelintPlugin = require('stylelint-webpack-plugin');

const commonWebpackConfigPromise = require('./webpack.common.js');

class WatchFilePlugin {
    constructor(filePath) {
        this.filePath = filePath;
        this.watcher = null;
    }

    apply(compiler) {
        compiler.hooks.afterEnvironment.tap('WatchFilePlugin', () => {
            if (this.watcher) return;

            this.watcher = fs.watch(this.filePath, (eventType) => {
                if (eventType === 'change' && compiler.watching) {
                    compiler.watching.invalidate();
                }
            });
        });

        compiler.hooks.watchClose.tap('WatchFilePlugin', () => {
            if (this.watcher) {
                this.watcher.close();
                this.watcher = null;
            }
        });
    }
}


module.exports = () => {
    return new Promise((resolve, _reject) => {
        commonWebpackConfigPromise().then(commonWebpackConfig => {
            resolve(merge(commonWebpackConfig, {
                mode: 'development',
                cache: {
                    type: 'filesystem',
                    buildDependencies: {
                        config: [__filename],
                    },
                },
                devtool: 'inline-source-map',
                devServer: {
                    historyApiFallback: true,
                    client: {
                        overlay: false,
                    },
                    hot: true,
                    host: '0.0.0.0',
                    devMiddleware: {
                        index: true,
                        writeToDisk: true,
                    },
                    port: commonWebpackConfig.WEBPACK_DEVELOPMENT_SERVER_PORT,
                },
                watchOptions: {
                    ignored: '**/node_modules',
                },
                stats: {
                    modules: false
                },
                target: 'web',
                plugins: [
                    new Webpack.DefinePlugin({
                        'process.env.NODE_ENV': JSON.stringify('development'),
                    }),
                    new StylelintPlugin({
                        files: Path.join('src', '**/*.s?(a|c)ss'),
                    }),
                    new WatchFilePlugin(
                        Path.join(__dirname, "..", "frontend_configuration", 'urls.json')
                    ),
                ],
            }));
        });
    });
};