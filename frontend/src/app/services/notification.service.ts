import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Notification as NotificationModel, NotificationRequest, NotificationListResponse, NotificationType } from '../models/notification';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;
  private destroy$ = new Subject<void>();
  private authEventHandler: (() => void) | null = null;

  // Real-time NotificationModel stream
  private notificationsSubject = new BehaviorSubject<NotificationModel[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Unread count stream
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // New NotificationModel stream
  private newNotificationSubject = new BehaviorSubject<NotificationModel | null>(null);
  public newNotification$ = this.newNotificationSubject.asObservable();

  // NotificationModel permission stream
  private permissionSubject = new BehaviorSubject<NotificationPermission>('default');
  public permission$ = this.permissionSubject.asObservable();

  // Check if notifications are supported
  get isNotificationSupported(): boolean {
    return 'NotificationModel' in window;
  }

  // Get current permission status
  get currentPermission(): NotificationPermission {
    return this.isNotificationSupported ? Notification.permission : 'denied';
  }

  constructor() {
    this.loadUnreadCount();
    this.initializePermissionStatus();
    
    // Listen for authentication events to reload unread count
    this.authEventHandler = () => {
      console.log('User authenticated, reloading unread count');
      this.loadUnreadCount();
    };
    window.addEventListener('userAuthenticated', this.authEventHandler);
  }

  // Initialize permission status
  private initializePermissionStatus(): void {
    if (this.isNotificationSupported) {
      this.permissionSubject.next(Notification.permission);
    }
  }

  // Request NotificationModel permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported) {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionSubject.next(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting NotificationModel permission:', error);
      return 'denied';
    }
  }

  // Check if permission is granted
  get isPermissionGranted(): boolean {
    return this.isNotificationSupported && Notification.permission === 'granted';
  }

  // Check if permission is denied
  get isPermissionDenied(): boolean {
    return this.isNotificationSupported && Notification.permission === 'denied';
  }

  // Show browser NotificationModel
  showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (this.isPermissionGranted) {
      new Notification(title, {
        icon: '/assets/default-avatar.png',
        badge: '/assets/default-avatar.png',
        ...options
      });
    }
  }

  // Get user notifications with pagination
  getUserNotifications(page: number = 0, size: number = 20): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/notifications?page=${page}&size=${size}`);
  }

  // Get unread notifications
  getUnreadNotifications(): Observable<ApiResponse<NotificationModel[]>> {
    return this.http.get<ApiResponse<NotificationModel[]>>(`${this.apiUrl}/notifications/unread`);
  }

  // Get unread count
  getUnreadCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/notifications/unread-count`);
  }

  // Mark NotificationModel as read
  markAsRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/notifications/mark-all-read`, {});
  }

  // Delete NotificationModel
  deleteNotification(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/notifications/${notificationId}`);
  }

  // Delete all notifications
  deleteAllNotifications(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/notifications`);
  }

  // Send NotificationModel
  sendNotification(request: NotificationRequest): Observable<ApiResponse<NotificationModel>> {
    return this.http.post<ApiResponse<NotificationModel>>(`${this.apiUrl}/notifications/send`, request);
  }

  // Load unread count
  private loadUnreadCount(): void {
    // Check if user is authenticated before making API call
    if (!this.authService.isAuthenticated()) {
      this.unreadCountSubject.next(0);
      return;
    }

    this.getUnreadCount().subscribe({
      next: (response) => {
        if (response.success && response.data !== undefined) {
          this.unreadCountSubject.next(response.data);
        } else {
          this.unreadCountSubject.next(0);
        }
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
        this.unreadCountSubject.next(0);
      }
    });
  }

  // Update unread count
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  // Reload unread count (useful when user logs in)
  reloadUnreadCount(): void {
    this.loadUnreadCount();
  }

  // Add new notification and update count in real-time
  addNotification(notification: NotificationModel): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
    
    // Update unread count in real-time
    if (!notification.isRead) {
      const currentCount = this.unreadCountSubject.value;
      this.unreadCountSubject.next(currentCount + 1);
    }

    // Emit new notification
    this.newNotificationSubject.next(notification);

    // Show browser notification if permission granted
    if (this.isPermissionGranted) {
      this.showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.notificationId
      });
    }
  }

  // Update unread count from WebSocket
  updateUnreadCountFromWebSocket(count: number): void {
    this.unreadCountSubject.next(count);
  }

  // Mark NotificationModel as read locally
  markNotificationAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(NotificationModel => 
      NotificationModel.notificationId === notificationId 
        ? { ...NotificationModel, isRead: true, readAt: new Date().toISOString() }
        : NotificationModel
    );
    this.notificationsSubject.next(updatedNotifications);

    // Update unread count
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Mark all notifications as read locally
  markAllNotificationsAsRead(): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(NotificationModel => ({
      ...NotificationModel,
      isRead: true,
      readAt: new Date().toISOString()
    }));
    this.notificationsSubject.next(updatedNotifications);
    this.unreadCountSubject.next(0);
  }

  // Clear notifications
  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  // Helper method to create NotificationModel request
  createNotificationRequest(
    recipientId: string,
    title: string,
    message: string,
    type: NotificationType,
    senderId?: string,
    data?: string
  ): NotificationRequest {
    return {
      recipientId,
      senderId,
      title,
      message,
      type,
      data
    };
  }

  // Helper method to send NotificationModel to user
  sendNotificationToUser(
    recipientId: string,
    title: string,
    message: string,
    type: NotificationType,
    senderId?: string,
    data?: string
  ): Observable<ApiResponse<NotificationModel>> {
    const request = this.createNotificationRequest(recipientId, title, message, type, senderId, data);
    return this.sendNotification(request);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Remove event listener
    if (this.authEventHandler) {
      window.removeEventListener('userAuthenticated', this.authEventHandler);
    }
  }
} 