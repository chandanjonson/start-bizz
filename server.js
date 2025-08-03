const express = require('express');
const multer = require('multer');
const { DataLakeServiceClient } = require('@azure/storage-file-datalake');
const { StorageSharedKeyCredential } = require('@azure/storage-file-datalake');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Allow iframe embedding - must be FIRST middleware
app.use((req, res, next) => {
    // Remove any existing frame options
    res.removeHeader('X-Frame-Options');
    // Allow embedding from any origin
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    // Alternative CSP header for modern browsers  
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    next();
});

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

// Simple in-memory file tracking (for demo purposes)
let uploadedFiles = [];

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
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            return res.status(500).json({
                error: 'Azure Data Lake not configured',
                details: {
                    accountName: accountName ? 'Set' : 'Missing',
                    accountKey: accountKey ? 'Set' : 'Missing'
                }
            });
        }

        const containerName = process.env.AZURE_DATA_LAKE_CONTAINER || 'uploads';
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = `uploads/${fileName}`;

        // Get file system client
        const fileSystemClient = dataLakeServiceClient.getFileSystemClient(containerName);

        // Create container if it doesn't exist
        try {
            const exists = await fileSystemClient.exists();
            if (!exists) {
                console.log(`Creating filesystem: ${containerName}`);
                await fileSystemClient.create();
                console.log(`Filesystem created successfully: ${containerName}`);
            }
        } catch (createError) {
            console.log('Container creation error:', createError.message);
            // Try to continue anyway
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

        // Track uploaded file
        uploadedFiles.push({
            name: filePath,
            size: req.file.size,
            lastModified: new Date(),
            originalName: req.file.originalname,
            mimeType: req.file.mimetype
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

        try {
            // Check if filesystem exists first
            const exists = await fileSystemClient.exists();
            if (!exists) {
                console.log('Filesystem does not exist, using in-memory tracking');
                files.push(...uploadedFiles);
            } else {
                // Try to list files with simpler approach
                for await (const path of fileSystemClient.listPaths({
                    path: 'uploads',
                    recursive: false
                })) {
                    if (!path.isDirectory) {
                        files.push({
                            name: path.name,
                            size: path.contentLength || 0,
                            lastModified: path.lastModified || new Date()
                        });
                    }
                }
            }
        } catch (listError) {
            console.log('List paths failed, using in-memory tracking:', listError.message);
            // Fallback to in-memory tracking
            files.push(...uploadedFiles);
        }

        res.json({ files });
    } catch (error) {
        console.error('List files error:', error);
        // Return empty list instead of error to keep upload working
        res.json({ files: [] });
    }
});

// Serve static files explicitly with proper headers
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// Test endpoint to check Azure connection
app.get('/test', (req, res) => {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const container = process.env.AZURE_DATA_LAKE_CONTAINER;

    res.json({
        status: 'Server is running',
        azure: {
            accountName: accountName ? 'Set' : 'Missing',
            accountKey: accountKey ? 'Set' : 'Missing',
            container: container || 'uploads',
            dataLakeClient: dataLakeServiceClient ? 'Initialized' : 'Not initialized'
        },
        uploadedFiles: uploadedFiles.length
    });
});

// Handle any other static files
app.get('/public/*', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath);
});

// Simple test page
app.get('/simple', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Simple Upload Test</title></head>
        <body style="font-family: Arial; padding: 20px; background: #f0f8ff;">
            <h1>🔧 Upload Test</h1>
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" id="fileInput" accept="image/*" style="margin: 10px;">
                <button type="button" onclick="uploadFile()" style="padding: 10px; background: #007cba; color: white; border: none;">Upload</button>
            </form>
            <div id="result" style="margin-top: 20px;"></div>
            
            <script>
                async function uploadFile() {
                    const fileInput = document.getElementById('fileInput');
                    const result = document.getElementById('result');
                    
                    if (!fileInput.files[0]) {
                        result.innerHTML = '❌ Please select a file';
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    
                    try {
                        result.innerHTML = '⏳ Uploading...';
                        const response = await fetch('/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            result.innerHTML = '✅ Upload successful: ' + data.fileName;
                        } else {
                            result.innerHTML = '❌ Upload failed: ' + data.error;
                        }
                    } catch (error) {
                        result.innerHTML = '❌ Error: ' + error.message;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Serve the standalone version (with embedded CSS/JS)
app.get('/standalone', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'standalone.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'standalone.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export for Vercel
module.exports = app;