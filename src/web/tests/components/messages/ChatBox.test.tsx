/**
 * @fileoverview Comprehensive test suite for ChatBox component
 * Testing secure messaging, real-time communication, accessibility compliance,
 * and document sharing capabilities
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { axe, toHaveNoViolations } from '@testing-library/jest-dom';
import ChatBox from '../../src/components/messages/ChatBox';
import { Message, MessageType, MessageStatus } from '../../src/interfaces/message.interface';

// Add jest-dom matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket hook
vi.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    connectionState: 'CONNECTED',
    sendMessage: vi.fn().mockResolvedValue(true),
    connect: vi.fn(),
    disconnect: vi.fn()
  })
}));

// Test data
const mockMessages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'thread-1',
    senderId: 'user-1',
    recipientId: 'user-2',
    type: MessageType.TEXT,
    content: 'Test message 1',
    status: MessageStatus.DELIVERED,
    metadata: {},
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z')
  },
  {
    id: 'msg-2',
    threadId: 'thread-1',
    senderId: 'user-2',
    recipientId: 'user-1',
    type: MessageType.DOCUMENT,
    content: 'test-document.pdf',
    status: MessageStatus.SENT,
    metadata: {
      documentUrl: 'https://test.com/document.pdf',
      fileName: 'test-document.pdf',
      fileSize: 1024,
      contentType: 'application/pdf',
      uploadedAt: new Date('2023-01-01T00:00:00Z')
    },
    createdAt: new Date('2023-01-01T00:01:00Z'),
    updatedAt: new Date('2023-01-01T00:01:00Z')
  }
];

describe('ChatBox', () => {
  const defaultProps = {
    threadId: 'thread-1',
    currentUserId: 'user-1',
    recipientId: 'user-2'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders without accessibility violations', async () => {
    const { container } = render(<ChatBox {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles real-time messaging correctly', async () => {
    render(<ChatBox {...defaultProps} />);

    // Verify message input is present
    const messageInput = screen.getByRole('textbox', { name: /message input/i });
    expect(messageInput).toBeInTheDocument();

    // Type and send a message
    fireEvent.change(messageInput, { target: { value: 'Hello, world!' } });
    const sendButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendButton);

    // Verify message is displayed
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
  });

  it('handles document sharing functionality', async () => {
    render(<ChatBox {...defaultProps} />);

    // Mock file upload
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/attach file/i);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Verify upload progress indicator
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    // Verify document message
    await waitFor(() => {
      expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
    });
  });

  it('handles connection state changes appropriately', async () => {
    // Mock disconnected state
    vi.mocked(useWebSocket).mockImplementation(() => ({
      isConnected: false,
      connectionState: 'DISCONNECTED',
      sendMessage: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn()
    }));

    render(<ChatBox {...defaultProps} />);

    // Verify disconnection warning
    expect(screen.getByText(/connection lost/i)).toBeInTheDocument();

    // Mock reconnection
    await act(async () => {
      vi.mocked(useWebSocket).mockImplementation(() => ({
        isConnected: true,
        connectionState: 'CONNECTED',
        sendMessage: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
      }));
    });

    // Verify warning is removed
    await waitFor(() => {
      expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument();
    });
  });

  it('handles message delivery status updates', async () => {
    render(<ChatBox {...defaultProps} />);

    // Send a message
    const messageInput = screen.getByRole('textbox', { name: /message input/i });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // Verify sent status
    await waitFor(() => {
      expect(screen.getByText(/sent/i)).toBeInTheDocument();
    });

    // Verify delivered status
    await waitFor(() => {
      expect(screen.getByText(/delivered/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation and accessibility', () => {
    render(<ChatBox {...defaultProps} />);

    // Verify chat region is accessible
    const chatRegion = screen.getByRole('region', { name: /chat interface/i });
    expect(chatRegion).toBeInTheDocument();

    // Test keyboard navigation
    const messageInput = screen.getByRole('textbox', { name: /message input/i });
    fireEvent.keyDown(messageInput, { key: 'Enter', shiftKey: true });
    expect(messageInput).toHaveFocus();

    // Test error dismissal with Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles error states appropriately', async () => {
    // Mock error state
    vi.mocked(useWebSocket).mockImplementation(() => ({
      isConnected: true,
      connectionState: 'ERROR',
      sendMessage: vi.fn().mockRejectedValue(new Error('Failed to send message')),
      connect: vi.fn(),
      disconnect: vi.fn()
    }));

    render(<ChatBox {...defaultProps} />);

    // Attempt to send a message
    const messageInput = screen.getByRole('textbox', { name: /message input/i });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // Verify error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to send message/i);
    });
  });
});