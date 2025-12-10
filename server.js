const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.html' || ext === '.htm') {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

// Create uploads and pdfs directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const pdfsDir = path.join(__dirname, 'pdfs');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// HTML to PDF conversion endpoint
app.post('/convert', upload.single('htmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const htmlContent = fs.readFileSync(filePath, 'utf-8');

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content from the HTML file
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfFileName = `${Date.now()}-${path.basename(req.file.originalname, path.extname(req.file.originalname))}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Clean up uploaded HTML file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfFile: pdfFileName,
      downloadLink: `/download/${pdfFileName}`
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download PDF endpoint
app.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(pdfsDir, filename);

    // Security check: prevent directory traversal
    if (!path.resolve(filepath).startsWith(path.resolve(pdfsDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filepath, filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all generated PDFs
app.get('/api/pdfs', (req, res) => {
  try {
    const files = fs.readdirSync(pdfsDir);
    const pdfFiles = files.map(file => ({
      name: file,
      downloadLink: `/download/${file}`,
      createdAt: fs.statSync(path.join(pdfsDir, file)).mtime
    }));
    res.json({ files: pdfFiles });
  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Ready to convert HTML files to PDF');
});
