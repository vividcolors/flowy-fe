# flowy-fe

flowyのフロントエンドプログラム


## ファイルの説明

### setup/Dockerfile

このプログラムはdocker上で開発しています。このDockerfileでdockerイメージを作れます。

### src

プログラムのソースコードが入っています。

- common.tsx: common.jsのメインソース
- sender.tsx: sender.jsのメインソース
- receiver.tsx: receiver.jsのメインソース
- sw.js: sw.jsのソース。ブラウザ内で動くService Worker
- cfsw.js: Cloudflare Workersのソース

### dist/fe

ソースコードのコンパイル結果が出力されます。

### webpack.sample.js

開発用ビルドと本番用ビルドで、webpackの設定ファイルを切り替えています。
webpack.sample.jsをそのままwebpack.devel.jsにリネームすれば、開発用ビルドが通るはずです。
本番用ビルドを行うためには、webpack.prod.jsにリネームし、8行目のmodeをproductionに変更します。

