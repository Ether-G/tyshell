const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/client/terminal.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'terminal.js',
        path: path.resolve(__dirname, 'public'),
    },
}; 