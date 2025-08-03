class FileUploader {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadFilesList();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileList = document.getElementById('fileList');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.results = document.getElementById('results');
        this.filesList = document.getElementById('filesList');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        this.selectedFiles = [];
    }

    attachEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Upload button
        this.uploadBtn.addEventListener('click', () => {
            this.uploadFiles();
        });

        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            this.loadFilesList();
        });
    }

    handleFileSelection(files) {
        this.selectedFiles = Array.from(files);
        this.displaySelectedFiles();
    }

    displaySelectedFiles() {
        if (this.selectedFiles.length === 0) {
            this.fileInfo.style.display = 'none';
            return;
        }

        this.fileList.innerHTML = '';
        this.selectedFiles.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
            `;
            this.fileList.appendChild(li);
        });

        this.fileInfo.style.display = 'block';
    }

    async uploadFiles() {
        if (this.selectedFiles.length === 0) return;

        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'block';
        this.results.innerHTML = '';

        const totalFiles = this.selectedFiles.length;
        let completedFiles = 0;

        for (const file of this.selectedFiles) {
            try {
                const result = await this.uploadSingleFile(file);
                this.displayResult(file.name, result, false);
            } catch (error) {
                this.displayResult(file.name, { error: error.message }, true);
            }

            completedFiles++;
            const progress = (completedFiles / totalFiles) * 100;
            this.updateProgress(progress);
        }

        // Reset form
        setTimeout(() => {
            this.resetForm();
            this.loadFilesList();
        }, 2000);
    }

    async uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        return await response.json();
    }

    displayResult(fileName, result, isError) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-item ${isError ? 'error' : ''}`;
        
        if (isError) {
            resultDiv.innerHTML = `
                <h4>❌ ${fileName}</h4>
                <p>Error: ${result.error}</p>
            `;
        } else {
            resultDiv.innerHTML = `
                <h4>✅ ${fileName}</h4>
                <p>Uploaded successfully to: ${result.filePath}</p>
                <p>Size: ${this.formatFileSize(result.size)}</p>
            `;
        }

        this.results.appendChild(resultDiv);
    }

    updateProgress(percentage) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.round(percentage)}%`;
    }

    resetForm() {
        this.selectedFiles = [];
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.updateProgress(0);
    }

    async loadFilesList() {
        this.filesList.innerHTML = '<div class="loading">Loading files...</div>';

        try {
            const response = await fetch('/files');
            if (!response.ok) {
                throw new Error('Failed to load files');
            }

            const data = await response.json();
            this.displayFilesList(data.files);
        } catch (error) {
            this.filesList.innerHTML = `
                <div class="error-message">
                    Failed to load files: ${error.message}
                </div>
            `;
        }
    }

    displayFilesList(files) {
        if (files.length === 0) {
            this.filesList.innerHTML = '<p class="loading">No files uploaded yet.</p>';
            return;
        }

        this.filesList.innerHTML = '';
        files.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            
            const fileName = file.name.split('/').pop(); // Get filename from path
            const uploadDate = new Date(file.lastModified).toLocaleString();
            
            fileDiv.innerHTML = `
                <div class="file-item-info">
                    <h4>📄 ${fileName}</h4>
                    <p>Path: ${file.name}</p>
                </div>
                <div class="file-item-meta">
                    <p>Size: ${this.formatFileSize(file.size)}</p>
                    <p>Uploaded: ${uploadDate}</p>
                </div>
            `;
            
            this.filesList.appendChild(fileDiv);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the uploader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FileUploader();
});