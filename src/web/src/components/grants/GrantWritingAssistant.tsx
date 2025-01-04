import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Button, CircularProgress, Alert, Box, Paper, Typography, Grid, Divider } from '@mui/material';
import { Editor } from '@monaco-editor/react'; // v4.5.0
import { debounce } from 'lodash'; // v4.17.21
import { useForm } from '../../hooks/useForm';
import { useNotification } from '../../hooks/useNotification';

// Types and Interfaces
interface IGrant {
  id: string;
  title: string;
  agency: string;
  amount: number;
  deadline: string;
  requirements: {
    sections: Array<{
      id: string;
      title: string;
      description: string;
      wordLimit?: number;
      required: boolean;
    }>;
  };
}

interface IGrantApplication {
  grantId: string;
  sections: Record<string, {
    content: string;
    lastSaved?: string;
    wordCount: number;
  }>;
  status: 'draft' | 'submitted';
}

interface GrantWritingAssistantProps {
  grant: IGrant;
  onSave: (application: IGrantApplication) => Promise<void>;
  onSubmit: (application: IGrantApplication) => Promise<void>;
  initialData?: IGrantApplication;
}

/**
 * AI-powered grant writing assistant component
 * Provides real-time suggestions and section guidance for grant applications
 */
export const GrantWritingAssistant: React.FC<GrantWritingAssistantProps> = ({
  grant,
  onSave,
  onSubmit,
  initialData,
}) => {
  // State management
  const [currentSection, setCurrentSection] = useState<string>(grant.requirements.sections[0]?.id || '');
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Hooks
  const { showSuccess, showError, showInfo } = useNotification();
  const { values, errors, handleChange, handleSubmit, isDirty } = useForm({
    initialValues: initialData?.sections || {},
    validationSchema: {
      // Add validation rules for each section
      ...grant.requirements.sections.reduce((acc, section) => ({
        ...acc,
        [section.id]: {
          required: section.required,
          validate: (content: string) => {
            if (section.wordLimit && content.split(/\s+/).length > section.wordLimit) {
              return `Exceeds word limit of ${section.wordLimit}`;
            }
            return true;
          },
        },
      }), {}),
    },
    onSubmit: async (values) => {
      try {
        await onSubmit({
          grantId: grant.id,
          sections: values,
          status: 'submitted',
        });
        showSuccess('Grant application submitted successfully');
      } catch (error) {
        showError('Failed to submit grant application');
      }
    },
  });

  /**
   * Handles AI suggestion requests with debouncing
   */
  const handleAISuggestion = useCallback(
    debounce(async (sectionId: string, content: string) => {
      if (content.length < 50) return; // Minimum content length for suggestions

      try {
        setIsLoading(true);
        // TODO: Implement AI service call here
        const suggestedContent = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'];
        setSuggestions(prev => ({
          ...prev,
          [sectionId]: suggestedContent,
        }));
      } catch (error) {
        showError('Failed to generate suggestions');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  /**
   * Handles section content changes
   */
  const handleSectionChange = useCallback((sectionId: string, content: string) => {
    handleChange({
      target: {
        name: sectionId,
        value: content,
      },
    } as any);

    // Request AI suggestions
    handleAISuggestion(sectionId, content);

    // Update progress
    const totalSections = grant.requirements.sections.length;
    const completedSections = Object.values(values).filter(v => v?.content?.length > 0).length;
    setProgress((completedSections / totalSections) * 100);
  }, [handleChange, handleAISuggestion, grant.requirements.sections.length, values]);

  /**
   * Auto-save functionality
   */
  useEffect(() => {
    const autoSave = async () => {
      if (isDirty) {
        try {
          await onSave({
            grantId: grant.id,
            sections: values,
            status: 'draft',
          });
          showInfo('Draft saved automatically');
        } catch (error) {
          showError('Failed to save draft');
        }
      }
    };

    const timer = setInterval(autoSave, 60000); // Auto-save every minute
    return () => clearInterval(timer);
  }, [isDirty, values, onSave, grant.id]);

  // Memoized section list
  const sectionList = useMemo(() => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Sections
      </Typography>
      <Grid container spacing={1}>
        {grant.requirements.sections.map((section) => (
          <Grid item xs={12} key={section.id}>
            <Button
              fullWidth
              variant={currentSection === section.id ? 'contained' : 'outlined'}
              onClick={() => setCurrentSection(section.id)}
              sx={{ justifyContent: 'flex-start', mb: 1 }}
            >
              {section.title}
              {section.required && ' *'}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  ), [currentSection, grant.requirements.sections]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          {grant.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Agency: {grant.agency} | Amount: ${grant.amount.toLocaleString()} | Deadline: {new Date(grant.deadline).toLocaleDateString()}
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        <Grid item xs={12} md={3}>
          {sectionList}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Overall Progress
            </Typography>
            <CircularProgress
              variant="determinate"
              value={progress}
              size={80}
              thickness={4}
              sx={{ display: 'block', margin: '0 auto' }}
            />
            <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          {currentSection && (
            <Box sx={{ height: '100%' }}>
              <Editor
                height="60vh"
                language="markdown"
                value={values[currentSection]?.content || ''}
                onChange={(value) => handleSectionChange(currentSection, value || '')}
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'off',
                }}
              />
              {errors[currentSection] && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {errors[currentSection]}
                </Alert>
              )}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              AI Suggestions
            </Typography>
            {isLoading ? (
              <CircularProgress size={24} sx={{ display: 'block', margin: '20px auto' }} />
            ) : (
              suggestions[currentSection]?.map((suggestion, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body2">{suggestion}</Typography>
                  <Divider sx={{ my: 1 }} />
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => onSave({
            grantId: grant.id,
            sections: values,
            status: 'draft',
          })}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(e as any);
          }}
          disabled={Object.keys(errors).length > 0}
        >
          Submit Application
        </Button>
      </Box>
    </Box>
  );
};

export default GrantWritingAssistant;