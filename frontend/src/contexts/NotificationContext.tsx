import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWSEvent } from './WebSocketContext';

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  timestamp: Date;
  category?: 'appointment' | 'lab' | 'vitals' | 'emergency' | 'billing' | 'general';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

// Maximum number of notifications to keep
const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: new Date(),
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the latest MAX_NOTIFICATIONS
      return updated.slice(0, MAX_NOTIFICATIONS);
    });

    // Play notification sound for important notifications
    if (notification.type === 'error' || notification.type === 'warning') {
      playNotificationSound();
    }

    // Show browser notification if permitted
    showBrowserNotification(notification.title, notification.message);
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle incoming WebSocket notifications
  const handleWSNotification = useCallback((payload: any) => {
    addNotification({
      title: payload.title || 'Notification',
      message: payload.message || '',
      type: payload.type || 'info',
      link: payload.link,
      category: payload.category,
    });
  }, [addNotification]);

  // Handle various WebSocket event types
  const handleVitalsAlert = useCallback((payload: any) => {
    addNotification({
      title: `Vitals Alert: ${payload.patientName}`,
      message: `${payload.vitalType}: ${payload.value} ${payload.unit} - ${payload.message}`,
      type: payload.severity === 'critical' ? 'error' : 'warning',
      category: 'vitals',
    });
  }, [addNotification]);

  const handleCriticalValue = useCallback((payload: any) => {
    addNotification({
      title: `Critical Lab Value: ${payload.patientName}`,
      message: `${payload.testName}: ${payload.value} ${payload.unit} (Normal: ${payload.normalRange})`,
      type: 'error',
      category: 'lab',
    });
  }, [addNotification]);

  const handleEmergencyAlert = useCallback((payload: any) => {
    addNotification({
      title: `Emergency: ${payload.patientName}`,
      message: `Triage: ${payload.triageLevel} - ${payload.chiefComplaint}`,
      type: 'error',
      category: 'emergency',
    });
  }, [addNotification]);

  const handleLabResult = useCallback((payload: any) => {
    addNotification({
      title: `Lab Results Ready: ${payload.patientName}`,
      message: `Tests: ${payload.testNames?.join(', ') || 'Results available'}`,
      type: 'info',
      category: 'lab',
    });
  }, [addNotification]);

  const handleAppointmentUpdate = useCallback((payload: any) => {
    const messages: Record<string, string> = {
      new: 'New appointment scheduled',
      update: 'Appointment updated',
      reminder: 'Appointment reminder',
    };
    addNotification({
      title: 'Appointment',
      message: messages[payload.type] || 'Appointment update',
      type: 'info',
      category: 'appointment',
    });
  }, [addNotification]);

  // Subscribe to WebSocket events
  useWSEvent('notification', handleWSNotification);
  useWSEvent('vitals-alert', handleVitalsAlert);
  useWSEvent('critical-value', handleCriticalValue);
  useWSEvent('emergency-alert', handleEmergencyAlert);
  useWSEvent('lab-result', handleLabResult);
  useWSEvent('appointment-update', handleAppointmentUpdate);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Helper function to play notification sound
function playNotificationSound() {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 200);
  } catch (error) {
    // Audio not supported, silently fail
  }
}

// Helper function to show browser notification
function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
}
