import React, { useState } from 'react';
import { Send, Loader, AlertCircle, ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * MessageThread.jsx - Display and manage dispute messages
 * Shows message thread between customer and admin
 */
const MessageThread = ({ disputeId, messages = [], onMessageAdded, isCustomer = true, disabled = false }) => {
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingImage(true);

    try {
      const uploadedUrls = await Promise.all(
        files.map(file => uploadImage(file))
      );
      setAttachments(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && attachments.length === 0) {
      setError('Please type a message or add an image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${disputeId}/add-message`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage,
          attachments: attachments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      setAttachments([]);
      onMessageAdded?.();
    } catch (err) {
      setError(err.message || 'Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No messages yet. Be the first to write one!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender_type === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.sender_type === 'CUSTOMER'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.message_type === 'SYSTEM' && (
                  <p className="text-xs font-semibold text-gray-600 mb-1">SYSTEM NOTIFICATION</p>
                )}

                <p className="text-sm break-words">{msg.message}</p>

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {msg.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          className="w-full h-24 object-cover rounded border border-gray-300"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <p className="text-xs mt-2 opacity-75">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Message Input */}
      {!disabled && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {attachments.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="h-16 w-16 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={1}
              disabled={loading || uploadingImage}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />

            <label className="flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading || uploadingImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.querySelector('input[type="file"]').click()}
                disabled={loading || uploadingImage}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </label>

            <button
              type="submit"
              disabled={loading || uploadingImage || (!newMessage.trim() && attachments.length === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading || uploadingImage ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
