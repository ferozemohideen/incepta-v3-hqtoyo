import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CloudUpload, Error } from '@mui/icons-material';
import CustomButton from './Button';
import { StorageService } from '../../services/storage.service';

// Styled component for the upload box with visual feedback
const UploadBox = styled(Box, {
  shouldForwardProp: (prop) => !['isDragging', 'isError', 'disabled'].includes(prop as string),
})<{
  isDragging?: boolean;
  isError?: boolean;
  disabled?: boolean;
}>(({ theme, isDragging, isError, disabled }) => ({
  border: `2px dashed ${
    isError
      ? theme.palette.error.main
      : isDragging
      ? theme.palette.primary.main
      : theme.palette.grey[300]
  }`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: isDragging
    ? theme.palette.action.hover
    : disabled
    ? theme.palette.action.disabledBackground
    : theme.palette.background.paper,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: theme.transitions.create(['border-color', 'background-color']),
  minHeight: 200,
  position: 'relative',
  '&:hover': {
    backgroundColor: !disabled && theme.palette.action.hover,
  },
  '&:focus': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
  },
}));

// Interface for file upload errors
interface UploadError {
  code: string;
  message: string;
  file?: File;
}

// Props interface for the FileUpload component
export interface FileUploadProps {
  onFileUpload: (files: File[], uploadIds: string[]) => Promise<void>;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  maxConcurrent?: number;
  retryAttempts?: number;
  onError?: (error: UploadError) => void;
  onProgress?: (progress: number) => void;
}

// Main FileUpload component
export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  multiple = false,
  accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  maxSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
  maxConcurrent = 3,
  retryAttempts = 3,
  onError,
  onProgress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueue = useRef<File[]>([]);
  const storageService = useRef(new StorageService());

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave' || e.type === 'drop') {
      setIsDragging(false);
    }
  }, [disabled]);

  // Handle dropped files
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  }, [disabled]);

  // Handle file input change
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    await handleFiles(selectedFiles);
    e.target.value = ''; // Reset input
  }, [disabled]);

  // Process and validate files
  const handleFiles = async (files: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    const errors: UploadError[] = [];

    // Validate files
    for (const file of files) {
      if (!accept.split(',').some(type => file.type === type)) {
        errors.push({
          code: 'INVALID_TYPE',
          message: `Invalid file type: ${file.type}`,
          file,
        });
        continue;
      }

      if (file.size > maxSize) {
        errors.push({
          code: 'FILE_TOO_LARGE',
          message: `File exceeds size limit: ${file.name}`,
          file,
        });
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      const firstError = errors[0];
      setError(firstError);
      onError?.(firstError);
      return;
    }

    if (validFiles.length > 0) {
      await uploadFiles(validFiles);
    }
  };

  // Upload files with retry logic
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const uploadIds: string[] = [];
    let totalProgress = 0;

    try {
      // Process files in concurrent batches
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        const uploadPromises = batch.map(async (file) => {
          let attempts = 0;
          while (attempts < retryAttempts) {
            try {
              const response = await storageService.current.uploadDocument(file, 'documents', {
                encryption: true,
                metadata: {
                  originalName: file.name,
                  size: file.size.toString(),
                  type: file.type,
                },
                cacheControl: 'private, max-age=3600',
              });
              uploadIds.push(response.documentId);
              totalProgress += (1 / files.length) * 100;
              setUploadProgress(Math.round(totalProgress));
              onProgress?.(Math.round(totalProgress));
              break;
            } catch (error) {
              attempts++;
              if (attempts === retryAttempts) {
                throw error instanceof Error ? error : new Error('Upload failed');
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        });

        await Promise.all(uploadPromises);
      }

      await onFileUpload(files, uploadIds);
    } catch (error) {
      const uploadError: UploadError = {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Upload failed',
      };
      setError(uploadError);
      onError?.(uploadError);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Trigger file input click
  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadQueue.current = [];
    };
  }, []);

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="File upload input"
      />
      
      <UploadBox
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        isDragging={isDragging}
        isError={!!error}
        disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={handleButtonClick}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleButtonClick();
          }
        }}
      >
        {isUploading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2" color="textSecondary">
              Uploading... {uploadProgress}%
            </Typography>
          </Box>
        ) : (
          <>
            <CloudUpload
              sx={{
                fontSize: 48,
                color: error ? 'error.main' : 'primary.main',
                mb: 2,
              }}
            />
            <Typography variant="h6" gutterBottom>
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              or
            </Typography>
            <CustomButton
              variant="contained"
              color="primary"
              disabled={disabled}
              startIcon={<CloudUpload />}
              onClick={handleButtonClick}
              aria-label="Choose files to upload"
            >
              Choose Files
            </CustomButton>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
              Supported formats: PDF, DOC, DOCX
            </Typography>
          </>
        )}
      </UploadBox>

      {error && (
        <Alert
          severity="error"
          icon={<Error />}
          sx={{ mt: 2 }}
          onClose={() => setError(null)}
        >
          {error.message}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;