/**
 * File.js
 * Handles file upload inputs
 */

export class FileInput {
    constructor(formChippy) {
        this.formChippy = formChippy;
        this.options = formChippy.options;
        this.files = new Map(); // Store files by input id
        
        // Initialize
        this._init();
    }
    
    /**
     * Initialize file input handling
     * @private
     */
    _init() {
        // Find all file inputs
        const fileInputs = this.formChippy.container.querySelectorAll(
            `${this.options.inputSelector}[type="file"], input[type="file"][data-fc-file]`
        );
        
        // Add event listeners to each file input
        fileInputs.forEach(fileInput => {
            // Initialize file storage for this input
            this.files.set(fileInput.id || fileInput.name, new Map());
            
            // Style the file input
            this._styleFileInput(fileInput);
            
            // Handle change event
            fileInput.addEventListener('change', (e) => {
                this._handleFileSelection(fileInput, e);
            });
            
            // Handle drag and drop events if the input has data-fc-dropzone
            if (fileInput.hasAttribute('data-fc-dropzone')) {
                this._setupDropZone(fileInput);
            }
        });
    }
    
    /**
     * Style a file input with custom UI
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _styleFileInput(fileInput) {
        // Skip if already styled
        if (fileInput.closest('.fc-file-upload')) return;
        
        // Get file input configuration
        const multiple = fileInput.hasAttribute('multiple');
        const accept = fileInput.getAttribute('accept') || '';
        const maxSize = fileInput.getAttribute('data-fc-max-size') || '10'; // Default 10MB
        const maxFiles = fileInput.getAttribute('data-fc-max-files') || '5'; // Default 5 files
        const dropzone = fileInput.hasAttribute('data-fc-dropzone');
        const preview = fileInput.hasAttribute('data-fc-preview');
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-file-upload';
        if (dropzone) wrapper.classList.add('fc-dropzone');
        
        // Insert wrapper before file input
        fileInput.parentNode.insertBefore(wrapper, fileInput);
        
        // Create label and move file input inside
        const label = document.createElement('label');
        label.className = 'fc-file-label';
        label.setAttribute('for', fileInput.id || '');
        wrapper.appendChild(label);
        label.appendChild(fileInput);
        
        // Create button
        const button = document.createElement('span');
        button.className = 'fc-file-button';
        button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
        button.innerHTML += '<span>Choose file' + (multiple ? 's' : '') + '</span>';
        label.appendChild(button);
        
        // Create file info area
        const infoArea = document.createElement('div');
        infoArea.className = 'fc-file-info';
        infoArea.textContent = multiple 
            ? 'No files chosen' 
            : 'No file chosen';
        wrapper.appendChild(infoArea);
        
        // Create help text with file type and size restrictions
        const helpText = document.createElement('div');
        helpText.className = 'fc-file-help';
        
        // Create file type text
        if (accept) {
            const acceptText = this._formatAcceptText(accept);
            const fileTypeText = document.createElement('div');
            fileTypeText.className = 'fc-file-type-text';
            fileTypeText.textContent = `Accepted file types: ${acceptText}`;
            helpText.appendChild(fileTypeText);
        }
        
        // Create max size text
        const maxSizeText = document.createElement('div');
        maxSizeText.className = 'fc-file-size-text';
        maxSizeText.textContent = `Maximum file size: ${maxSize}MB`;
        helpText.appendChild(maxSizeText);
        
        // Create max files text for multiple files
        if (multiple) {
            const maxFilesText = document.createElement('div');
            maxFilesText.className = 'fc-file-count-text';
            maxFilesText.textContent = `Maximum number of files: ${maxFiles}`;
            helpText.appendChild(maxFilesText);
        }
        
        wrapper.appendChild(helpText);
        
        // Create file preview container if preview is enabled
        if (preview) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'fc-file-preview-container';
            wrapper.appendChild(previewContainer);
        }
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fc-file-error';
        wrapper.appendChild(errorContainer);
    }
    
    /**
     * Format the accept attribute to human-readable text
     * @param {string} accept - The accept attribute value
     * @returns {string} - Formatted file types
     * @private
     */
    _formatAcceptText(accept) {
        if (!accept) return 'All files';
        
        const types = accept.split(',').map(type => {
            type = type.trim();
            
            // Handle image/*, video/*, etc.
            if (type.endsWith('/*')) {
                return type.replace('/*', ' files');
            }
            
            // Handle extensions like .jpg, .pdf
            if (type.startsWith('.')) {
                return type.toUpperCase();
            }
            
            // Handle specific mime types
            const mimeMap = {
                'image/jpeg': 'JPEG images',
                'image/png': 'PNG images',
                'image/gif': 'GIF images',
                'image/svg+xml': 'SVG images',
                'application/pdf': 'PDF documents',
                'application/msword': 'Word documents',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word documents',
                'application/vnd.ms-excel': 'Excel spreadsheets',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheets',
                'text/plain': 'Text files',
                'text/csv': 'CSV files'
            };
            
            return mimeMap[type] || type;
        });
        
        return types.join(', ');
    }
    
    /**
     * Handle file selection from the input
     * @param {HTMLInputElement} fileInput - The file input element
     * @param {Event} event - The change event
     * @private
     */
    _handleFileSelection(fileInput, event) {
        const files = event.target.files;
        const multiple = fileInput.hasAttribute('multiple');
        const maxSize = parseInt(fileInput.getAttribute('data-fc-max-size') || '10', 10) * 1024 * 1024; // Convert to bytes
        const maxFiles = parseInt(fileInput.getAttribute('data-fc-max-files') || '5', 10);
        const accept = fileInput.getAttribute('accept') || '';
        
        // Get UI elements
        const wrapper = fileInput.closest('.fc-file-upload');
        const infoArea = wrapper.querySelector('.fc-file-info');
        const errorContainer = wrapper.querySelector('.fc-file-error');
        const previewContainer = wrapper.querySelector('.fc-file-preview-container');
        
        // Clear previous errors
        this.formChippy.validation.clearInputError(fileInput);
        errorContainer.textContent = '';
        
        // Validate files
        let errorMessage = '';
        let validFiles = [];
        
        // Check max files
        if (multiple && files.length > maxFiles) {
            errorMessage = `Too many files. Maximum ${maxFiles} files allowed.`;
        }
        
        // Check each file
        if (!errorMessage) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Check file size
                if (file.size > maxSize) {
                    errorMessage = `File "${file.name}" exceeds the maximum size of ${maxSize / (1024 * 1024)}MB.`;
                    break;
                }
                
                // Check file type if accept is specified
                if (accept && !this._isFileTypeAccepted(file, accept)) {
                    errorMessage = `File "${file.name}" is not an accepted file type.`;
                    break;
                }
                
                validFiles.push(file);
            }
        }
        
        // Display error if any
        if (errorMessage) {
            this.formChippy.validation.showInputError(fileInput, errorMessage);
            errorContainer.textContent = errorMessage;
            return;
        }
        
        // Store valid files
        const fileMap = this.files.get(fileInput.id || fileInput.name);
        fileMap.clear(); // Clear previous files if not multiple
        
        validFiles.forEach(file => {
            fileMap.set(file.name, file);
        });
        
        // Update info area
        if (validFiles.length === 0) {
            infoArea.textContent = multiple ? 'No files chosen' : 'No file chosen';
        } else if (validFiles.length === 1) {
            infoArea.textContent = validFiles[0].name;
        } else {
            infoArea.textContent = `${validFiles.length} files selected`;
        }
        
        // Update preview if enabled
        if (previewContainer) {
            this._updateFilePreviews(previewContainer, validFiles, fileInput);
        }
    }
    
    /**
     * Check if a file type is accepted
     * @param {File} file - The file to check
     * @param {string} accept - The accept attribute value
     * @returns {boolean} - Whether the file type is accepted
     * @private
     */
    _isFileTypeAccepted(file, accept) {
        if (!accept) return true;
        
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileName = file.name;
        const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
        
        return acceptedTypes.some(type => {
            // Check exact mime type match
            if (type === fileType) return true;
            
            // Check file extension
            if (type.startsWith('.') && fileExtension === type.toLowerCase()) return true;
            
            // Check wildcard mime type (e.g., image/*)
            if (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/'))) return true;
            
            return false;
        });
    }
    
    /**
     * Update file previews in the preview container
     * @param {HTMLElement} previewContainer - The preview container element
     * @param {File[]} files - Array of files to preview
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _updateFilePreviews(previewContainer, files, fileInput) {
        // Clear previous previews
        previewContainer.innerHTML = '';
        
        // Create previews for each file
        files.forEach(file => {
            const preview = document.createElement('div');
            preview.className = 'fc-file-preview';
            
            // Create preview content based on file type
            if (file.type.startsWith('image/')) {
                // Image preview
                const img = document.createElement('img');
                img.className = 'fc-file-image-preview';
                img.file = file;
                preview.appendChild(img);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Generic file icon preview
                const icon = document.createElement('div');
                icon.className = 'fc-file-icon-preview';
                
                // Set icon based on file type
                if (file.type.startsWith('application/pdf')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5v3zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75zM9 9.5h1v-1H9v1zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1zm11 5.5h1v-3h-1v3z" fill="currentColor"></path></svg>';
                } else if (file.type.startsWith('video/')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" fill="currentColor"></path></svg>';
                } else if (file.type.startsWith('audio/')) {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" fill="currentColor"></path></svg>';
                } else {
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"></path></svg>';
                }
                
                preview.appendChild(icon);
            }
            
            // Create file name
            const name = document.createElement('div');
            name.className = 'fc-file-preview-name';
            name.textContent = file.name;
            preview.appendChild(name);
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'fc-file-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.type = 'button';
            removeBtn.setAttribute('aria-label', 'Remove file');
            
            // Handle remove button click
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove file from storage
                const fileMap = this.files.get(fileInput.id || fileInput.name);
                fileMap.delete(file.name);
                
                // Remove preview
                preview.remove();
                
                // Update info area
                const infoArea = fileInput.closest('.fc-file-upload').querySelector('.fc-file-info');
                const remainingFiles = fileMap.size;
                
                if (remainingFiles === 0) {
                    infoArea.textContent = fileInput.hasAttribute('multiple') ? 'No files chosen' : 'No file chosen';
                } else if (remainingFiles === 1) {
                    infoArea.textContent = Array.from(fileMap.values())[0].name;
                } else {
                    infoArea.textContent = `${remainingFiles} files selected`;
                }
                
                // Clear the file input
                fileInput.value = '';
            });
            
            preview.appendChild(removeBtn);
            previewContainer.appendChild(preview);
        });
    }
    
    /**
     * Set up drag and drop functionality for a file input
     * @param {HTMLInputElement} fileInput - The file input element
     * @private
     */
    _setupDropZone(fileInput) {
        const dropZone = fileInput.closest('.fc-dropzone');
        if (!dropZone) return;
        
        // Add instructional text
        const dropText = document.createElement('div');
        dropText.className = 'fc-drop-text';
        dropText.innerHTML = 'Drop files here or <span>browse</span>';
        
        // Add to the button area
        const button = dropZone.querySelector('.fc-file-button');
        if (button) {
            button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
            button.appendChild(dropText);
        }
        
        // Handle drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('fc-dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('fc-dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('fc-dragover');
            
            // Handle the dropped files
            if (e.dataTransfer.files.length) {
                // Set the files to the input and trigger change event
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }
    
    /**
     * Get all files for a specific file input
     * @param {string} inputId - The id or name of the file input
     * @returns {File[]} Array of files
     */
    getFiles(inputId) {
        const fileMap = this.files.get(inputId);
        return fileMap ? Array.from(fileMap.values()) : [];
    }
    
    /**
     * Create a new file upload input
     * @param {HTMLElement} container - The container to append the file input to
     * @param {object} config - Configuration options
     * @returns {HTMLInputElement} The created file input
     */
    createFileInput(container, config) {
        const {
            name,
            id = name,
            multiple = false,
            accept = '',
            maxSize = 10, // MB
            maxFiles = 5,
            required = false,
            dropzone = true,
            preview = true,
            label = 'Upload Files',
        } = config;
        
        // Create wrapper element
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-form-group';
        
        // Create label element if provided
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = id;
        fileInput.name = name;
        fileInput.setAttribute('data-fc-input', '');
        fileInput.setAttribute('data-fc-file', '');
        
        // Set attributes based on config
        if (multiple) fileInput.setAttribute('multiple', '');
        if (accept) fileInput.setAttribute('accept', accept);
        if (maxSize) fileInput.setAttribute('data-fc-max-size', maxSize.toString());
        if (maxFiles) fileInput.setAttribute('data-fc-max-files', maxFiles.toString());
        if (required) {
            fileInput.setAttribute('required', '');
            fileInput.setAttribute('data-fc-required', '');
        }
        if (dropzone) fileInput.setAttribute('data-fc-dropzone', '');
        if (preview) fileInput.setAttribute('data-fc-preview', '');
        
        // Add to wrapper
        wrapper.appendChild(fileInput);
        
        // Add to container
        container.appendChild(wrapper);
        
        // Style the file input
        this._styleFileInput(fileInput);
        
        // Initialize file storage for this input
        this.files.set(id || name, new Map());
        
        // Set up event listeners
        fileInput.addEventListener('change', (e) => {
            this._handleFileSelection(fileInput, e);
        });
        
        // Set up dropzone if enabled
        if (dropzone) {
            this._setupDropZone(fileInput);
        }
        
        return fileInput;
    }
}
