# HTML to PDF Converter

A simple web application that converts HTML files to PDF using Puppeteer.

## Features

- 📁 Drag & drop file upload
- 📄 HTML to PDF conversion
- 📋 List of generated PDFs
- 🎨 Modern, responsive UI
- ⚡ Fast conversion

## Installation

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/

2. **Navigate to the project directory**
   ```
   cd e:\C#\Puppeter
   ```

3. **Install dependencies**
   ```
   npm install
   ```

## Running the Project

### Option 1: Standard Mode
```
npm start
```

### Option 2: Development Mode (with auto-reload)
```
npm run dev
```

The server will start on `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Click on the upload area or drag and drop an HTML file
3. Click "Convert to PDF" button
4. Download the generated PDF from the "Generated PDFs" section

## Project Structure

```
Puppeter/
├── server.js           # Express server and Puppeteer logic
├── package.json        # Dependencies
├── public/
│   └── index.html      # Web UI
├── uploads/            # Temporary HTML uploads (auto-created)
├── pdfs/               # Generated PDF files (auto-created)
└── README.md           # This file
```

## Requirements

- Node.js 14+
- Express.js
- Puppeteer
- Multer (for file uploads)

## Configuration

You can modify the PDF settings in `server.js`:

```javascript
await page.pdf({
  path: pdfPath,
  format: 'A4',           // Page format (A4, Letter, etc.)
  margin: {
    top: '20px',
    right: '20px',
    bottom: '20px',
    left: '20px'
  }
});
```

## API Endpoints

- `GET /` - Main web interface
- `POST /convert` - Convert HTML file to PDF
- `GET /download/:filename` - Download a generated PDF
- `GET /api/pdfs` - List all generated PDFs

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, modify the `PORT` variable in `server.js`:
```javascript
const PORT = 3001; // or any available port
```

### Puppeteer Issues
If Puppeteer fails to launch:
1. Ensure you have the required dependencies installed
2. The code includes `--no-sandbox` flag for Windows compatibility

### File Upload Issues
- Only HTML files (.html, .htm) are accepted
- Check that the `uploads` and `pdfs` directories are created
- Ensure adequate disk space for PDF generation

## Notes

- Generated PDFs are stored in the `pdfs` folder
- HTML files are automatically deleted after conversion
- PDFs can be downloaded from the web interface
- The list of PDFs refreshes automatically every 5 seconds

## License

ISC
