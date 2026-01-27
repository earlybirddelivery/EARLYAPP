import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  MessageCircle, Send, Plus, Clock, CheckCircle, AlertCircle, 
  Search, Filter, LogOut, Paperclip, X, Lock, Unlock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAccessControl, useSharedAccess } from '../utils/modules';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SupportPortal = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  
  // Module hooks for shared access control
  const { permissions } = useAccessControl();
  const { sharedAccounts, grantAccess, revokeAccess } = useSharedAccess();
  
  // New ticket modal
  const [newTicketModal, setNewTicketModal] = useState({
    open: false,
    title: '',
    description: '',
    category: 'order',
    priority: 'medium'
  });
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/api/support/tickets?status=${filterStatus}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!res.ok) throw new Error('Failed to load tickets');
      
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/api/support/tickets/${ticketId}/messages`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!res.ok) throw new Error('Failed to load messages');
      
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTicketModal.title,
          description: newTicketModal.description,
          category: newTicketModal.category,
          priority: newTicketModal.priority
        })
      });
      
      if (!res.ok) throw new Error('Failed to create ticket');
      
      toast.success('Support ticket created');
      setNewTicketModal({ open: false, title: '', description: '', category: 'order', priority: 'medium' });
      loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedTicket) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/api/support/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: chatMessage })
        }
      );
      
      if (!res.ok) throw new Error('Failed to send message');
      
      setChatMessage('');
      loadTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    loadTicketMessages(ticket.id);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'text-orange-600 bg-orange-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'open': return <AlertCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">Customer Support</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setNewTicketModal({ ...newTicketModal, open: true })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
              <Button onClick={() => navigate('/login')} variant="outline">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <div className="space-y-3">
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 transition ${
                    selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm truncate flex-1">
                      {ticket.title}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span>{ticket.status}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {ticket.id.substring(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
              
              {filteredTickets.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tickets found</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Details & Chat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="font-bold text-lg">{selectedTicket.title}</h2>
                      <p className="text-xs text-gray-500 mt-1">Ticket #{selectedTicket.id}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <p className="font-medium">{selectedTicket.category || 'General'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Priority:</span>
                      <p className="font-medium capitalize">{selectedTicket.priority || 'Normal'}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender === 'customer'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                    className="text-sm resize-none h-12"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a ticket to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <Dialog open={newTicketModal.open} onOpenChange={(open) => 
        setNewTicketModal({ ...newTicketModal, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input
                placeholder="Issue title"
                value={newTicketModal.title}
                onChange={(e) => setNewTicketModal({ ...newTicketModal, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                placeholder="Describe your issue..."
                value={newTicketModal.description}
                onChange={(e) => setNewTicketModal({ ...newTicketModal, description: e.target.value })}
                className="mt-1 h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select 
                  value={newTicketModal.category} 
                  onValueChange={(value) => setNewTicketModal({ ...newTicketModal, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Order Issue</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <Select 
                  value={newTicketModal.priority} 
                  onValueChange={(value) => setNewTicketModal({ ...newTicketModal, priority: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setNewTicketModal({ ...newTicketModal, open: false })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!newTicketModal.title || !newTicketModal.description}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
