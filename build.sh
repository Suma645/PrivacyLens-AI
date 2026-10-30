#!/usr/bin/env bash
# Universal Build Script for Render / Linux deployments
set -e

echo "==> [1/3] Building Frontend Web Application..."
if command -v npm &> /dev/null; then
  cd frontend
  npm install
  npm run build
  cd ..
  echo "==> Frontend build succeeded!"
fi

echo "==> [2/3] Installing Python Backend Requirements..."
if command -v pip &> /dev/null; then
  pip install --upgrade pip
  pip install -r backend/requirements.txt
  echo "==> Python dependencies installed!"
fi

echo "==> [3/3] Build finished successfully!"
