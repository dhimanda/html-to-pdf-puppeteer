const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

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
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
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

// URL to PDF conversion endpoint
app.post('/convert-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to ensure proper rendering
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      // Navigate to the URL with multiple wait conditions
      await page.goto(url, { 
        waitUntil: ['domcontentloaded', 'networkidle0'], 
        timeout: 45000 
      });

      // Wait for images and stylesheets to load
      await page.waitForTimeout(2000);

      // Inject CSS to ensure proper rendering and remove elements that shouldn't be printed
      await page.evaluate(() => {
        // Hide elements that shouldn't be in PDF
        const style = document.createElement('style');
        style.innerHTML = `
          nav, header nav, .navbar, .menu, .advertisement, .ads, 
          .cookie-banner, .cookie-consent, .popup, .modal-backdrop,
          footer { page-break-inside: avoid; }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 0px; }
        `;
        document.head.appendChild(style);
      });

    } catch (error) {
      await browser.close();
      return res.status(400).json({ error: `Failed to access URL: ${error.message}` });
    }

    // Generate PDF with better settings
    const pdfFileName = `${Date.now()}-${Buffer.from(url).toString('base64').substring(0, 20)}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,  // Important: Include background colors and images
      preferCSSPageSize: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    res.json({
      success: true,
      message: 'PDF generated from URL successfully',
      pdfFile: pdfFileName,
      downloadLink: `/download/${pdfFileName}`,
      sourceUrl: url
    });

  } catch (error) {
    console.error('URL conversion error:', error);
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
    
    // Sort by creation time - newest first
    pdfFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ files: pdfFiles });
  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete PDF endpoint
app.delete('/delete/:filename', (req, res) => {
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

    // Delete the file
    fs.unlinkSync(filepath);

    res.json({
      success: true,
      message: 'PDF deleted successfully',
      deletedFile: filename
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n========================================');
  console.log('  HTML to PDF Converter Server');
  console.log('========================================');
  console.log(`\n✅ Server is running!\n`);
  console.log(`📱 Local Access:     http://localhost:${PORT}`);
  console.log(`🌐 Network Access:   http://${localIP}:${PORT}`);
  console.log(`\n📡 Share this URL with other devices on your WiFi:`);
  console.log(`   http://${localIP}:${PORT}\n`);
  console.log('Ready to convert HTML files to PDF');
  console.log('========================================\n');
});
