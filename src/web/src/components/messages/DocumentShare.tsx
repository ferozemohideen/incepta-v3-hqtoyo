import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  Typography, 
  IconButton, 
  LinearProgress, 
  CircularProgress, 
  Snackbar, 
  Alert 
} from '@mui/material';
import { Delete, Download, CloudUpload, Error } from '@mui/icons-material';
import FileUpload, { FileUploadProps } from '../common/FileUpload';
import { Message, MessageType, MessageMetadata } from '../../interfaces/message.interface';
import { StorageService } from '../../services/storage.service';

export interface DocumentShareProps {
  onDocumentShare: (message: Message) => Promise<void>;
  threadId: string;
  disabled?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  enableEncryption?: boolean;
}

interface DocumentPreviewProps {
  metadata: MessageMetadata;
  onDelete: () => Promise<void>;
  onDownload: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UploadProgressState {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  bytesUploaded: number;
  totalBytes: number;
  estimatedTimeRemaining: number;
}

export const DocumentShare: React.FC<DocumentShareProps> = ({
  onDocumentShare,
  threadId,
  disabled = false,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  allowedFileTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  enableEncryption = true,
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharedDocuments, setSharedDocuments] = useState<MessageMetadata[]>([]);
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);

  const storageService = useRef(new StorageService());
  const uploadQueue = useRef<File[]>([]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      for (const file of files) {
        const fileId = `${Date.now()}-${file.name}`;
        
        setUploadProgress({
          fileId,
          progress: 0,
          status: 'pending',
          bytesUploaded: 0,
          totalBytes: file.size,
          estimatedTimeRemaining: 0,
        });

        const response = await storageService.current.uploadDocument(file, 'documents', {
          encryption: enableEncryption,
          metadata: {
            threadId,
            originalName: file.name,
            size: file.size.toString(),
            type: file.type,
          },
          cacheControl: 'private, max-age=3600',
        });

        const message: Message = {
          id: response.documentId,
          threadId,
          senderId: 'current-user',
          recipientId: 'recipient',
          type: MessageType.DOCUMENT,
          content: '',
          status: 'SENT',
          metadata: {
            documentUrl: response.url,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            uploadedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await onDocumentShare(message);
        setSharedDocuments(prev => [...prev, message.metadata]);
        
        setUploadProgress(prev => 
          prev?.fileId === fileId ? { ...prev, status: 'completed', progress: 100 } : prev
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      setIsSnackbarOpen(true);
      setUploadProgress(prev => 
        prev ? { ...prev, status: 'error' } : null
      );
    }
  }, [threadId, enableEncryption, onDocumentShare]);

  const handleDocumentDelete = useCallback(async (metadata: MessageMetadata) => {
    try {
      await storageService.current.deleteDocument(metadata.documentUrl);
      setSharedDocuments(prev => 
        prev.filter(doc => doc.documentUrl !== metadata.documentUrl)
      );
    } catch (err) {
      setError('Failed to delete document');
      setIsSnackbarOpen(true);
    }
  }, []);

  const handleDocumentDownload = useCallback(async (metadata: MessageMetadata) => {
    try {
      const blob = await storageService.current.downloadDocument(metadata.documentUrl, {
        decryption: enableEncryption,
        useCache: true,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download document');
      setIsSnackbarOpen(true);
    }
  }, [enableEncryption]);

  const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    metadata,
    onDelete,
    onDownload,
    isLoading,
    error,
  }) => (
    <Card
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        mb: 1,
        backgroundColor: error ? 'error.light' : 'background.paper',
      }}
      role="listitem"
      aria-label={`Document: ${metadata.fileName}`}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" component="h3">
          {metadata.fileName}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {(metadata.fileSize / 1024 / 1024).toFixed(2)} MB
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton
          onClick={() => onDownload()}
          disabled={isLoading}
          aria-label={`Download ${metadata.fileName}`}
        >
          <Download />
        </IconButton>
        <IconButton
          onClick={() => onDelete()}
          disabled={isLoading}
          aria-label={`Delete ${metadata.fileName}`}
        >
          <Delete />
        </IconButton>
      </Box>
    </Card>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <FileUpload
        onFileUpload={handleFileUpload}
        multiple={false}
        accept={allowedFileTypes.join(',')}
        maxSize={maxFileSize}
        disabled={disabled}
        onError={(error) => {
          setError(error.message);
          setIsSnackbarOpen(true);
        }}
        onProgress={(progress) => {
          setUploadProgress(prev => 
            prev ? { ...prev, progress } : null
          );
        }}
      />

      {uploadProgress && uploadProgress.status === 'uploading' && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={uploadProgress.progress}
            aria-label="Upload progress"
          />
          <Typography variant="caption" color="textSecondary">
            {`Uploading... ${uploadProgress.progress}%`}
          </Typography>
        </Box>
      )}

      <Box
        sx={{ mt: 2 }}
        role="list"
        aria-label="Shared documents"
      >
        {sharedDocuments.map((doc) => (
          <DocumentPreview
            key={doc.documentUrl}
            metadata={doc}
            onDelete={() => handleDocumentDelete(doc)}
            onDownload={() => handleDocumentDownload(doc)}
            isLoading={uploadProgress?.status === 'uploading'}
            error={error}
          />
        ))}
      </Box>

      <Snackbar
        open={isSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setIsSnackbarOpen(false)}
      >
        <Alert
          severity="error"
          onClose={() => setIsSnackbarOpen(false)}
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentShare;