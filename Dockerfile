# docker buildx build -t filesync:latest --compress --load .
# docker buildx build --platform linux/amd64 -t filesync --compress --output=type=docker,dest=./filesync.tar .

# ==============================
# Stage 1: Build Python dependencies
# ==============================
FROM python:3.12-alpine AS builder

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps build-base libffi-dev musl-dev python3-dev

WORKDIR /filesync

# Copy requirements
COPY api/requirements.txt .

# Install Python dependencies to a separate location
RUN pip install --no-cache-dir --prefer-binary --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# Optional: remove tests and unnecessary files from site-packages
RUN find /install/lib/python3.12/site-packages -name "tests" -type d -exec rm -rf {} + \
    && find /install/lib/python3.12/site-packages -name "*.pyc" -delete \
    && find /install/lib/python3.12/site-packages -name "*.pyo" -delete \
    && find /install/lib/python3.12/site-packages -name "*.so" -exec strip --strip-unneeded {} +

# ==============================
# Stage 2: Runtime image
# ==============================
FROM python:3.12-alpine

# Install Nginx runtime
RUN apk add --no-cache nginx

WORKDIR /filesync

# Copy Python dependencies from builder
COPY --from=builder /install /usr/local

# Copy app code
COPY api /filesync/api
COPY web /filesync/web

# Copy Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Expose ports
EXPOSE 80

# Start FastAPI + Nginx
CMD ["sh", "-c", "python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 & nginx -g 'daemon off;'"]
