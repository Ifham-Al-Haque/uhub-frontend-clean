import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, FileText, Clock, User, 
  AlertCircle, CheckCircle, XCircle, MoreHorizontal,
  Edit, Trash2, Eye, Calendar, Tag, Building,
  Wrench, Settings, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { itServicesApi } from '../services/itServicesApi';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Label from '../components/ui/label';
import Textarea from '../components/ui/textarea';
import { AnimatePresence } from 'framer-motion';

const ITRequests = () => {
  const { user, userProfile } = useAuth();
  const { success, error: showError } = useToast();
  
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category_id: '',
    priority_id: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority_id: '',
    request_type: 'it_service',
    estimated_completion_date: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, prioritiesData, requestsData] = await Promise.all([
        itServicesApi.categories.getAll(),
        itServicesApi.priorities.getAll(),
        itServicesApi.requests.getAll(filters, user?.id, userProfile?.role)
      ]);

      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setRequests(requestsData.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      showError('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const requestData = {
        ...formData,
        requester_id: user.id,
        estimated_completion_date: formData.estimated_completion_date || null
      };

      if (editingRequest) {
        await itServicesApi.requests.update(editingRequest.id, requestData);
        success('Success', 'Request updated successfully!');
      } else {
        await itServicesApi.requests.create(requestData);
        success('Success', 'Request submitted successfully!');
      }

      setShowForm(false);
      setEditingRequest(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error submitting request:', err);
      showError('Error', 'Failed to submit request. Please try again.');
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      category_id: request.category_id,
      priority_id: request.priority_id,
      request_type: request.request_type,
      estimated_completion_date: request.estimated_completion_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (requestId) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await itServicesApi.requests.delete(requestId);
        success('Success', 'Request deleted successfully!');
        fetchData();
      } catch (err) {
        console.error('Error deleting request:', err);
        showError('Error', 'Failed to delete request. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      priority_id: '',
      request_type: 'it_service',
      estimated_completion_date: ''
    });
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const level = priority.level;
    if (level === 1) return 'bg-red-100 text-red-800 border-red-200';
    if (level === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (level === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (level === 4) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'open': 'bg-blue-100 text-blue-800 border-blue-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'pending_user': 'bg-orange-100 text-orange-800 border-orange-200',
      'resolved': 'bg-green-100 text-green-800 border-green-200',
      'closed': 'bg-gray-100 text-gray-800 border-gray-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSLAStatus = (request) => {
    if (!request.priority || !request.created_at) return null;
    try {
      const created = new Date(request.created_at);
      const now = new Date();
      const hoursElapsed = (now - created) / (1000 * 60 * 60);
      const slaHours = request.priority.sla_hours || 72; // Default to 72 hours if sla_hours is missing
      
      if (hoursElapsed > slaHours) {
        return { status: 'overdue', hours: Math.floor(hoursElapsed - slaHours) };
      } else if (hoursElapsed > slaHours * 0.8) {
        return { status: 'warning', hours: Math.floor(slaHours - hoursElapsed) };
      }
      return { status: 'ok', hours: Math.floor(slaHours - hoursElapsed) };
    } catch (error) {
      console.warn('Error calculating SLA status:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IT requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IT Service Requests</h1>
              <p className="text-gray-600">Submit and manage your IT service requests</p>
            </div>
            <Button
              onClick={() => {
                setEditingRequest(null);
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Request</span>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {requests.filter(r => r.status === 'open').length}
                    </p>
                    <p className="text-sm text-gray-600">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {requests.filter(r => r.status === 'in_progress').length}
                    </p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {requests.filter(r => r.status === 'resolved').length}
                    </p>
                    <p className="text-sm text-gray-600">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {requests.length}
                    </p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_user">Pending User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <select
                  id="category-filter"
                  value={filters.category_id}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="priority-filter">Priority</Label>
                <select
                  id="priority-filter"
                  value={filters.priority_id}
                  onChange={(e) => setFilters({ ...filters, priority_id: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Priorities</option>
                  {priorities.map(priority => (
                    <option key={priority.id} value={priority.id}>{priority.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="search-filter">Search</Label>
                <Input
                  id="search-filter"
                  type="text"
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600">You haven't submitted any IT service requests yet.</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => {
              const sla = getSLAStatus(request);
              return (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(request.priority)}`}>
                            {request.priority?.name || 'Unknown'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          {sla && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                              sla.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                              sla.status === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-green-100 text-green-800 border-green-200'
                            }`}>
                              {sla.status === 'overdue' ? `Overdue ${sla.hours}h` :
                               sla.status === 'warning' ? `${sla.hours}h left` :
                               `${sla.hours}h left`}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-3">{request.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center space-x-1">
                            <Tag className="w-4 h-4" />
                            {request.category?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(request.created_at)}
                          </span>
                          {request.assigned_to && (
                            <span className="flex items-center space-x-1">
                              <Wrench className="w-4 h-4" />
                              Assigned to {request.assignee?.full_name || 'Unknown'}
                            </span>
                          )}
                        </div>

                        {request.resolution_notes && (
                          <div className="bg-blue-50 p-3 rounded-md mb-3">
                            <p className="text-sm text-blue-800">
                              <strong>Response:</strong> {request.resolution_notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {request.status === 'open' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(request)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(request.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Request Form Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingRequest ? 'Edit Request' : 'New IT Service Request'}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowForm(false);
                        setEditingRequest(null);
                        resetForm();
                      }}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Brief description of your request"
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detailed description of your IT service request"
                        rows={4}
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          required
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="priority">Priority *</Label>
                        <select
                          id="priority"
                          value={formData.priority_id}
                          onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                          required
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Priority</option>
                          {priorities.map(priority => (
                            <option key={priority.id} value={priority.id}>
                              {priority.name} ({(priority.sla_hours || 72)}h SLA)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="estimated_date">Estimated Completion Date (Optional)</Label>
                      <Input
                        id="estimated_date"
                        type="date"
                        value={formData.estimated_completion_date}
                        onChange={(e) => setFormData({ ...formData, estimated_completion_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingRequest(null);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingRequest ? 'Update Request' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ITRequests;
