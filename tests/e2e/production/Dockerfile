FROM n8nio/n8n:latest

USER node

# Install the published npm package directly into n8n's community nodes directory
RUN set -eux; \
	NODES_ROOT="/home/node/.n8n/nodes"; \
	mkdir -p "$NODES_ROOT"; \
	if [ ! -f "$NODES_ROOT/package.json" ]; then \
		printf '{\n  "name": "installed-nodes",\n  "private": true,\n  "dependencies": {}\n}\n' > "$NODES_ROOT/package.json"; \
	fi; \
	cd "$NODES_ROOT"; \
	npm install --omit=dev --no-audit --no-fund --ignore-scripts n8n-nodes-notion-set-icon@latest

WORKDIR /home/node