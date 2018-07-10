const webpack = require("webpack")
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  // モード値を production に設定すると最適化された状態で、
  // development に設定するとソースマップ有効でJSファイルが出力される
  //mode: 'production',
  mode: 'development', 
  //devtool: 'cheap-module-eval-source-map', 
 
  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    'common': './src/common.tsx', 
    'sender': './src/sender.tsx', 
    'receiver': './src/receiver.tsx', 
    'sw': './src/sw.js', 
    'cfsw': './src/cfsw.js'
  }, 
  output: {
    'path': '/app/dist/fe', 
    'filename': "[name].js"
  }, 
 
  module: {
    rules: [
      {
        // 拡張子 .ts の場合
        test: /\.ts|\.tsx$/, 
        // TypeScript をコンパイルする
        use: 'ts-loader'
      }, 
      {
        test: /\.js$/, exclude: /(node_modules)/, use: 'babel-loader'
      }
    ]
  },
  // import 文で .ts ファイルを解決するため
  resolve: {
    extensions: [
      '.ts', '.js'
    ]
  }, 

  plugins: [
    new webpack.DefinePlugin({
      __API_BASE__: JSON.stringify('http://localhost:8080'), 
      __CHUNK_SIZE__: JSON.stringify(4096000), 
      __WEB_BASE__: JSON.stringify('http://localhost:8000'), 
      __FILESIZE_MAX__: JSON.stringify(2048000000), 
      __NUMFILE_MAX__: JSON.stringify(7)
    }), 
    new CopyWebpackPlugin([
      { from: 'src', ignore: [ '*.ts', '*.tsx', '*.js' ] }
    ], {}), 
  ]
};