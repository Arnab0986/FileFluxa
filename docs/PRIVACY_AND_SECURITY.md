# PRIVACY AND SECURITY

## 1. Browser-First Processing Architecture
FileFluxa is engineered around absolute user privacy. All file operations (Image Studio, PDF Lab, Document Converter, Audio Lab, and Archive Tools) execute entirely client-side inside the user's browser using standard Web APIs, HTML5 Canvas, Web Audio API, `pdf-lib`, and `JSZip`.

## 2. Zero Server Uploads
- Files never leave your local device.
- No backend upload endpoints exist.
- No file data or sensitive names are stored in `localStorage` or transmitted to external analytics providers.
- Object URLs (`blob:`) are generated strictly for local download and revoked immediately after use.

## 3. Security Protections
- **Path Traversal Protection**: Archive extraction and processing validate file paths to prevent malicious path traversal exploits (`../`).
- **Safe Parsing**: CSV, JSON, and document inputs are parsed with strict error boundaries and safe DOM handling.
- **Zero Secrets**: No API keys, database credentials, or secret tokens are required or embedded in the codebase.
