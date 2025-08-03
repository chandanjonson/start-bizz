const express = require('express');
const multer = require('multer');
const { DataLakeServiceClient } = require('@azure/storage-file-datalake');
const { StorageSharedKeyCredential } = require('@azure/storage-file-datalake');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://startbizzindia.com',
    'http://startbizzindia.com',
    'https://www.startbizzindia.com',
    'http://www.startbizzindia.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow documents and images
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  }
});

// Initialize Azure Data Lake client
let dataLakeServiceClient;

try {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  
  if (!accountName || !accountKey) {
    throw new Error('Azure storage credentials not configured');
  }
  
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  dataLakeServiceClient = new DataLakeServiceClient(
    `https://${accountName}.dfs.core.windows.net`,
    sharedKeyCredential
  );
  
  console.log('Azure Data Lake client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Azure Data Lake client:', error.message);
}

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!dataLakeServiceClient) {
      return res.status(500).json({ error: 'Azure Data Lake not configured' });
    }

    const containerName = process.env.AZURE_DATA_LAKE_CONTAINER || 'uploads';
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = `uploads/${fileName}`;

    // Get file system client
    const fileSystemClient = dataLakeServiceClient.getFileSystemClient(containerName);
    
    // Create container if it doesn't exist
    try {
      await fileSystemClient.create();
    } catch (error) {
      // Container might already exist, ignore error
    }

    // Get file client
    const fileClient = fileSystemClient.getFileClient(filePath);

    // Upload file
    await fileClient.upload(req.file.buffer, req.file.buffer.length, {
      overwrite: true,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadDate: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileName: fileName,
      filePath: filePath,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Get uploaded files list
app.get('/files', async (req, res) => {
  try {
    if (!dataLakeServiceClient) {
      return res.status(500).json({ error: 'Azure Data Lake not configured' });
    }

    const containerName = process.env.AZURE_DATA_LAKE_CONTAINER || 'uploads';
    const fileSystemClient = dataLakeServiceClient.getFileSystemClient(containerName);
    
    const files = [];
    
    for await (const path of fileSystemClient.listPaths({ path: 'uploads' })) {
      if (!path.isDirectory) {
        files.push({
          name: path.name,
          size: path.contentLength,
          lastModified: path.lastModified
        });
      }
    }

    res.json({ files });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
});

// Serve static files explicitly
app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});