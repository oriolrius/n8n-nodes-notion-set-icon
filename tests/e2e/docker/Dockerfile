FROM node:20-alpine AS builder

WORKDIR /workspace

# Install build dependencies and enable the requested pnpm version
RUN apk add --no-cache python3 make g++ git \
	&& corepack enable \
	&& corepack prepare pnpm@10.12.3 --activate

# Copy the project files required for packaging
COPY package.json pnpm-lock.yaml tsconfig.json gulpfile.js README.md LICENSE.md ./
COPY nodes ./nodes
COPY credentials ./credentials
COPY index.js ./index.js

# Install dependencies, build the distributable, and create an npm tarball
RUN pnpm install --no-frozen-lockfile \
	&& pnpm build \
	&& pnpm pack --pack-destination /tmp


FROM n8nio/n8n:latest

USER root

# Copy the packaged tarball from the builder stage
COPY --from=builder /tmp/n8n-nodes-notion-set-icon-*.tgz /tmp/n8n-nodes-notion-set-icon.tgz

# Install the packaged node into the community packages directory that n8n scans
RUN set -eux; \
	NODES_ROOT="/home/node/.n8n/.n8n/nodes"; \
	mkdir -p "$NODES_ROOT"; \
	if [ ! -f "$NODES_ROOT/package.json" ]; then \
		printf '{\n  "name": "installed-nodes",\n  "private": true,\n  "dependencies": {}\n}\n' > "$NODES_ROOT/package.json"; \
	fi; \
	cd "$NODES_ROOT"; \
	npm install --omit=dev --no-audit --no-fund --ignore-scripts /tmp/n8n-nodes-notion-set-icon.tgz; \
	rm /tmp/n8n-nodes-notion-set-icon.tgz; \
	chown -R node:node /home/node/.n8n

USER node
WORKDIR /home/node
