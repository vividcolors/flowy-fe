FROM node:9.8

WORKDIR /opt
RUN rm -fr yarn && ln -sf yarn-v1.5.1 yarn && mkdir /app

WORKDIR /app
RUN npm install http-server -g

CMD [ "http-server", "-p", "8888", "-a", "0.0.0.0", "/app/dist" ]


## dockerイメージの作り方
# cd <your-setup-dir>
# docker build ./ -t flowy-fe

## dockerコンテナの起動方法
## jsファイルを配信するhttpサーバが起動します。
## http://localhost:8888/fe/common.js などで取得できるようになります。
# docker run --name flowy-fe --net flowy-net -itd -v <repository-dir>:/app -p 8888:8888 flowy-fe