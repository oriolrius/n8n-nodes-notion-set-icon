# Dockerfile for n8n with custom node
FROM n8nio/n8n:latest

USER root

# Install build tools
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    linux-headers

# Create custom nodes directory
RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon && \
    chown -R node:node /home/node/.n8n

USER node

# Set workdir
WORKDIR /home/node

# Copy the built node files (will be mounted as volume in docker-compose)
# This is just to ensure the structure exists
RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/dist

# Create directory for workflows
RUN mkdir -p /home/node/workflows /home/node/test-data

# Expose n8n port
EXPOSE 5678

# Start n8n
CMD ["n8n", "start"]