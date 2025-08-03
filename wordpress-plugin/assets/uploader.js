jQuery(document).ready(function($) {
    class WordPressDataLakeUploader {
        constructor() {
            this.initializeElements();
            this.attachEventListeners();
            this.loadFilesList();
            this.selectedFiles = [];
        }

        initializeElements() {
            this.uploadArea = $('#uploadArea');
            this.fileInput = $('#fileInput');
            this.fileInfo = $('#fileInfo');
            this.fileList = $('#fileList');
            this.uploadBtn = $('#uploadBtn');
            this.progressSection = $('#progressSection');
            this.progressFill = $('#progressFill');
            this.progressText = $('#progressText');
            this.resultsSection = $('#resultsSection');
            this.results = $('#results');
            this.filesList = $('#filesList');
            this.refreshBtn = $('#refreshBtn');
        }

        attachEventListeners() {
            // File input change
            this.fileInput.on('change', (e) => {
                this.handleFileSelection(e.target.files);
            });

            // Drag and drop
            this.uploadArea.on('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.addClass('dragover');
            });

            this.uploadArea.on('dragleave', () => {
                this.uploadArea.removeClass('dragover');
            });

            this.uploadArea.on('drop', (e) => {
                e.preventDefault();
                this.uploadArea.removeClass('dragover');
                this.handleFileSelection(e.originalEvent.dataTransfer.files);
            });

            // Upload button
            this.uploadBtn.on('click', () => {
                this.uploadFiles();
            });

            // Refresh button
            this.refreshBtn.on('click', () => {
                this.loadFilesList();
            });
        }

        handleFileSelection(files) {
            this.selectedFiles = Array.from(files);
            this.displaySelectedFiles();
        }

        displaySelectedFiles() {
            if (this.selectedFiles.length === 0) {
                this.fileInfo.hide();
                return;
            }

            this.fileList.empty();
            this.selectedFiles.forEach(file => {
                const li = $(`
                    <li>
                        <span>${file.name}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                    </li>
                `);
                this.fileList.append(li);
            });

            this.fileInfo.show();
        }

        async uploadFiles() {
            if (this.selectedFiles.length === 0) return;

            this.progressSection.show();
            this.resultsSection.show();
            this.results.empty();

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
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('action', 'upload_to_datalake');
                formData.append('nonce', dataLakeAjax.nonce);
                formData.append('file', file);

                $.ajax({
                    url: dataLakeAjax.ajaxurl,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.data || 'Upload failed'));
                        }
                    },
                    error: function(xhr, status, error) {
                        reject(new Error(error || 'Upload failed'));
                    }
                });
            });
        }

        displayResult(fileName, result, isError) {
            const resultDiv = $(`<div class="result-item ${isError ? 'error' : ''}"></div>`);
            
            if (isError) {
                resultDiv.html(`
                    <h5>❌ ${fileName}</h5>
                    <p>Error: ${result.error}</p>
                `);
            } else {
                resultDiv.html(`
                    <h5>✅ ${fileName}</h5>
                    <p>Uploaded successfully to: ${result.filePath}</p>
                    <p>Size: ${this.formatFileSize(result.size)}</p>
                `);
            }

            this.results.append(resultDiv);
        }

        updateProgress(percentage) {
            this.progressFill.css('width', `${percentage}%`);
            this.progressText.text(`${Math.round(percentage)}%`);
        }

        resetForm() {
            this.selectedFiles = [];
            this.fileInput.val('');
            this.fileInfo.hide();
            this.progressSection.hide();
            this.updateProgress(0);
        }

        loadFilesList() {
            this.filesList.html('<div class="loading">Loading files...</div>');

            $.ajax({
                url: dataLakeAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'list_datalake_files',
                    nonce: dataLakeAjax.nonce
                },
                success: (response) => {
                    if (response.success) {
                        this.displayFilesList(response.data.files || []);
                    } else {
                        this.filesList.html(`
                            <div class="error-message">
                                Failed to load files: ${response.data || 'Unknown error'}
                            </div>
                        `);
                    }
                },
                error: (xhr, status, error) => {
                    this.filesList.html(`
                        <div class="error-message">
                            Failed to load files: ${error}
                        </div>
                    `);
                }
            });
        }

        displayFilesList(files) {
            if (files.length === 0) {
                this.filesList.html('<p class="loading">No files uploaded yet.</p>');
                return;
            }

            this.filesList.empty();
            files.forEach(file => {
                const fileName = file.name.split('/').pop();
                const uploadDate = new Date(file.lastModified).toLocaleString();
                
                const fileDiv = $(`
                    <div class="file-item">
                        <div class="file-item-info">
                            <h5>📄 ${fileName}</h5>
                            <p>Path: ${file.name}</p>
                        </div>
                        <div class="file-item-meta">
                            <p>Size: ${this.formatFileSize(file.size)}</p>
                            <p>Uploaded: ${uploadDate}</p>
                        </div>
                    </div>
                `);
                
                this.filesList.append(fileDiv);
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

    // Initialize the uploader
    if ($('#data-lake-uploader').length) {
        new WordPressDataLakeUploader();
    }
});