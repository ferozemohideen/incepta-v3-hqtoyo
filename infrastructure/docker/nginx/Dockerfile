# Use official Alpine-based Nginx image for minimal attack surface
# nginx:1.25-alpine
FROM nginx:1.25-alpine

# Set build arguments with defaults
ARG NGINX_USER=nginx
ARG NGINX_GROUP=nginx

# Set environment variables
ENV NGINX_WORKER_PROCESSES=auto
ENV NGINX_WORKER_CONNECTIONS=1024
ENV NGINX_CLIENT_MAX_BODY_SIZE=10M
ENV NGINX_PROXY_READ_TIMEOUT=60s

# Install additional security packages
RUN apk add --no-cache \
    curl \
    wget \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/nginx.conf

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx \
    /var/log/nginx \
    /var/run \
    /etc/nginx/conf.d \
    /etc/nginx/certs \
    /usr/share/nginx/html \
    && chown -R ${NGINX_USER}:${NGINX_GROUP} \
        /var/cache/nginx \
        /var/log/nginx \
        /var/run \
        /etc/nginx/conf.d \
        /etc/nginx/certs \
        /usr/share/nginx/html \
    && chmod -R 755 /var/cache/nginx \
        /var/log/nginx \
        /var/run \
        /etc/nginx/conf.d \
        /etc/nginx/certs \
        /usr/share/nginx/html

# Copy custom nginx configuration files
COPY --chown=${NGINX_USER}:${NGINX_GROUP} nginx.conf /etc/nginx/nginx.conf
COPY --chown=${NGINX_USER}:${NGINX_GROUP} default.conf /etc/nginx/conf.d/default.conf

# Copy pre-built static web files
COPY --chown=${NGINX_USER}:${NGINX_GROUP} src/web/build /usr/share/nginx/html

# Create health check file
RUN echo "healthy" > /usr/share/nginx/html/health.txt

# Set proper file permissions
RUN chmod 644 /etc/nginx/nginx.conf \
    && chmod 644 /etc/nginx/conf.d/default.conf \
    && chmod -R 544 /usr/share/nginx/html \
    && chown -R ${NGINX_USER}:${NGINX_GROUP} /usr/share/nginx/html

# Create tmpfs directories for runtime
RUN mkdir -p /tmp/nginx/client_body \
    && chown -R ${NGINX_USER}:${NGINX_GROUP} /tmp/nginx

# Expose HTTP port
EXPOSE 80

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Switch to non-root user
USER ${NGINX_USER}

# Use tmpfs for temporary files
VOLUME ["/tmp", "/var/run", "/var/cache/nginx", "/var/log/nginx"]

# Set security options
LABEL security.capabilities.drop="all" \
      security.capabilities.add="NET_BIND_SERVICE" \
      security.no-new-privileges="true"

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]