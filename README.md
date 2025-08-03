# Data Lake File Uploader

A web application for uploading documents and images to Microsoft Azure Data Lake Storage.

## Features

- 📤 Drag & drop file upload interface
- 📁 Support for documents (PDF, DOC, DOCX, XLS, XLSX, TXT) and images (JPG, PNG, GIF, WEBP)
- 🔄 Real-time upload progress tracking
- 📋 View uploaded files list
- 🎨 Modern, responsive UI
- ☁️ Direct integration with Azure Data Lake Storage

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Azure Data Lake

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your Azure credentials:
```env
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_DATA_LAKE_CONTAINER=uploads
PORT=3000
```

### 3. Azure Setup Requirements

You'll need:
- An Azure Storage Account with Data Lake Storage Gen2 enabled
- Storage Account Name and Access Key
- A container/filesystem in your Data Lake (will be created automatically if it doesn't exist)

### 4. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Visit `http://localhost:3000` to use the uploader.

## File Upload Limits

- Maximum file size: 50MB
- Supported formats:
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
  - Images: JPG, JPEG, PNG, GIF, WEBP

## API Endpoints

- `POST /upload` - Upload a single file
- `GET /files` - List all uploaded files
- `GET /` - Serve the main upload page

## Security Notes

- Files are stored with timestamps to prevent naming conflicts
- File type validation on both client and server
- CORS enabled for cross-origin requests
- Environment variables for sensitive credentials

## Troubleshooting

1. **Azure connection issues**: Verify your storage account name and key
2. **Container not found**: The app will create the container automatically
3. **File upload fails**: Check file size limits and supported formats
4. **Permission errors**: Ensure your Azure account has proper permissions

## Customization

- Modify `public/styles.css` for UI changes
- Update file type restrictions in `server.js`
- Adjust upload limits in the multer configuration
- Change the container name in the environment variables