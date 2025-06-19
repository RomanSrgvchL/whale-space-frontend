FROM nginx:1.28.0-perl

COPY /nginx.conf /etc/nginx/nginx.conf
COPY /src /usr/share/nginx/html/project

EXPOSE 80