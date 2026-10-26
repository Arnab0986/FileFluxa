# FEATURE SUPPORT MATRIX

| Category | Tool / Feature | Supported Inputs | Supported Outputs | Processing Engine | Limits / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Image Studio** | Image Converter | JPG, PNG, WebP, BMP, GIF | JPG, PNG, WebP, BMP | HTML5 Canvas / Blob API | Browser RAM limit |
| | Image Compressor | JPG, PNG, WebP | JPG, PNG, WebP | Iterative Canvas Quality Adjustment | Best-effort target sizing |
| | Image Editor | JPG, PNG, WebP, BMP | JPG, PNG, WebP | HTML5 Canvas 2D Context | Resize, Rotate, Flip, Filters |
| **PDF Lab** | PDF Merger | PDF | PDF | pdf-lib | Browser RAM limit |
| | PDF Splitter / Extractor | PDF | PDF | pdf-lib | Select ranges / pages |
| | Images to PDF | JPG, PNG, WebP | PDF | pdf-lib | Custom page sizes |
| | PDF Page Rotator | PDF | PDF | pdf-lib | 90, 180, 270 degrees |
| | PDF Watermark | PDF | PDF | pdf-lib | Custom text watermark |
| **Document Converter** | CSV <-> JSON | CSV, JSON | JSON, CSV | Custom Parser / Formatter | Robust quotes & newline handling |
| | Markdown to HTML | MD, TXT | HTML, TXT | Safe Markdown Parser | Sanitized output |
| | JSON / XML Formatter | JSON, XML | JSON, XML | Native DOMParser & JSON stringify | Format & validate |
| **Audio Lab** | Audio Converter / Trimmer | WAV, MP3, OGG, WebM | WAV, WebM / Audio Buffer | Web Audio API / MediaRecorder | Local AudioContext processing |
| | Audio Volume & Speed | WAV, MP3, OGG | WAV | OfflineAudioContext | Real-time audio processing |
| **Archive Tools** | ZIP Creator | Any files | ZIP | JSZip | Client-side compression |
| | ZIP Extractor | ZIP | Individual files | JSZip | Path traversal protected |
