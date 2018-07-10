FROM node:9.8

WORKDIR /opt
RUN rm -fr yarn && ln -sf yarn-v1.5.1 yarn && mkdir /app

WORKDIR /app
RUN npm install http-server -g

CMD [ "http-server", "-p", "8888", "-a", "0.0.0.0", "/app/dist" ]

# cd <your-setup-dir>
# docker build ./ -t flowy-fe
# docker run --name flowy-fe --net flowy-net -itd -v <repository-dir>:/app -p 8888:8888 flowy-fe