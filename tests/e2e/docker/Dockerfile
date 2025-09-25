FROM n8nio/n8n:latest

USER root

# Copy package files directly to n8n's node_modules
COPY package.json /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-notion-set-icon/
COPY dist /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-notion-set-icon/dist/

# Ensure the package is properly registered
RUN cd /usr/local/lib/node_modules/n8n && \
    npm ls n8n-nodes-notion-set-icon || true

USER node