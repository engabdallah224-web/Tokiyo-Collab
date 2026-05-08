import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Clock, AlertCircle, Plus, Filter, User, Calendar, Tag, Trash2, Edit2, MoreHorizontal, Users, Target, Zap, ChevronDown, ArrowLeft, Search, X, Video, Phone, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { auth } from '../config/firebase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  fetchProjectById,
  fetchProjectApplications,
  createTaskInFirestore,
  subscribeToProjectTasks,
  updateTaskInFirestore,
  deleteTaskFromFirestore,
  fetchUserProfile,
} from '../services/firestoreService';

// Task Card Component for Kanban Board
const TaskCard = ({ task, onStatusChange, onDelete }) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
            {task.priority}
          </span>
          {task.assigned_to && (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border-none bg-transparent text-gray-600 focus:ring-0 cursor-pointer"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </motion.div>
  );
};

// Task List Item Component for List View
const TaskListItem = ({ task, onStatusChange, onDelete }) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
              {task.priority}
            </span>
          </div>
          {task.description && (
            <p className="text-gray-600 text-sm truncate max-w-md">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {task.assigned_to && (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          )}

          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const { projectId } = useParams();

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    assigned_to: '',
  });
  const [creating, setCreating] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myUid, setMyUid] = useState(null);

  // Get current user uid
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) { setMyUid(uid); return; }
    const unsub = auth.onAuthStateChanged((u) => { if (u) setMyUid(u.uid); });
    return unsub;
  }, []);

  // Load project data + team members
  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId).then((p) => setProjectData(p)).catch(() => {});
    fetchProjectApplications(projectId).then((apps) => {
      const accepted = apps.filter((a) => a.status === 'accepted');
      setTeamMembers(accepted.map((a) => ({ id: a.user_id, name: a.user?.full_name || 'Member' })));
    }).catch(() => {});
  }, [projectId]);

  // Subscribe to tasks in real-time
  useEffect(() => {
    if (!projectId) return;
    setTasksLoading(true);
    const unsub = subscribeToProjectTasks(projectId, (t) => {
      setTasks(t);
      setTasksLoading(false);
    });
    return unsub;
  }, [projectId]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || creating) return;
    setCreating(true);
    try {
      await createTaskInFirestore(projectId, {
        ...newTask,
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null,
      });
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '', assigned_to: '' });
    } catch (err) {
      console.error('Create task error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTaskInFirestore(taskId, { status: newStatus }).catch(() => {});
  };

  const handleDelete = (taskId) => {
    deleteTaskFromFirestore(taskId).catch(() => {});
  };

  // Filter tasks based on view mode and user role (always called)
  const filteredTasks = useMemo(() => {
    let taskList = tasks;

    // Apply search filter
    if (searchQuery.trim()) {
      taskList = taskList.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const isOwner = projectData?.owner_id === myUid;

    // Owner sees all tasks
    if (isOwner) return taskList;

    // Collaborators see tasks assigned to them or created by them
    return taskList.filter(task =>
      task.assigned_to === myUid || task.created_by === myUid
    );
  }, [tasks, myUid, projectData, searchQuery]);

  // Calculate task counts
  const taskCounts = useMemo(() => {
    return {
      total: filteredTasks.length,
      todo: filteredTasks.filter(t => t.status === 'todo').length,
      in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
      done: filteredTasks.filter(t => t.status === 'done').length
    };
  }, [filteredTasks]);

  // Constants (after all hooks)
  const statusConfig = {
    todo: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'To Do' },
    in_progress: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
    in_review: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'In Review' },
    done: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Done' },
    blocked: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Blocked' }
  };

  const priorityColors = {
    low: 'text-gray-600',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
  };

  // Conditional render AFTER all hooks
  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Jira-style Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/projects/${projectId}/workspace`}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Workspace</span>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                {projectData?.title || 'Project'} Board
              </h1>
              <p className="text-sm text-gray-500">
                {projectData?.owner_id === myUid
                  ? `${taskCounts.total} tasks total`
                  : `${filteredTasks.length} tasks visible to you`}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" />
            Create Task
          </motion.button>
        </div>
      </div>

      {/* Jira-style Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Task Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span>To Do: {taskCounts.todo}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>In Progress: {taskCounts.in_progress}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Done: {taskCounts.done}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {viewMode === 'kanban' ? (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* To Do Column */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  TO DO
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {filteredTasks.filter(t => t.status === 'todo').length}
                  </span>
                </h3>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredTasks.filter(task => task.status === 'todo').map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  IN PROGRESS
                  <span className="bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {filteredTasks.filter(t => t.status === 'in_progress').length}
                  </span>
                </h3>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredTasks.filter(task => task.status === 'in_progress').map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  DONE
                  <span className="bg-green-200 text-green-700 text-xs px-2 py-1 rounded-full">
                    {filteredTasks.filter(t => t.status === 'done').length}
                  </span>
                </h3>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredTasks.filter(task => task.status === 'done').map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">All Tasks</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTasks.map(task => (
                <TaskListItem key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
      </div>





      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create Task</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter task description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {teamMembers && teamMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                    <select
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksPage;

