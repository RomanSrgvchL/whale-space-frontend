FROM nginx:1.28.0-perl

COPY /nginx.conf /etc/nginx/nginx.conf
COPY /mime.types /etc/nginx/mime.types

COPY /project /usr/share/nginx/html/project

EXPOSE 80

# docker build -t whale-space-frontend .
# docker run -d -p 80:80 --name whale-space-frontend whale-space-frontend
# ----------------------------------------------------
# docker rm -f whale-space-frontend
# docker rmi whale-space-frontend