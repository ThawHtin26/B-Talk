import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AuthService } from '../../services/auth.service';
import { Notification as NotificationModel, NotificationType } from '../../models/notification';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private authEventHandler: (() => void) | null = null;

  // UI state
  showDropdown = false;
  unreadCount = 0;
  notifications: NotificationModel[] = [];
  latestNotification: NotificationModel | null = null;

  // Browser notification support
  isSupported = 'Notification' in window;
  isPermissionGranted = this.isSupported && Notification.permission === 'granted';
  isPermissionDenied = this.isSupported && Notification.permission === 'denied';

  ngOnInit(): void {
    // Only initialize if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.loadUnreadCount();
      this.setupRealTimeNotifications();
      this.subscribeToNotifications();
      this.requestNotificationPermission();
    }
    
    // Listen for authentication events to reload notifications
    this.authEventHandler = () => {
      console.log('Authentication event received in notification bell');
      if (this.authService.isAuthenticated()) {
        this.loadNotifications();
        this.notificationService.reloadUnreadCount();
        this.setupRealTimeNotifications();
      }
    };
    window.addEventListener('userAuthenticated', this.authEventHandler);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Remove event listener
    if (this.authEventHandler) {
      window.removeEventListener('userAuthenticated', this.authEventHandler);
    }
  }

  private loadUnreadCount(): void {
    // Subscribe to unread count updates
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      console.log('Unread count updated:', count);
    });
    
    // Actively load the unread count if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.notificationService.reloadUnreadCount();
    }
  }

  private setupRealTimeNotifications(): void {
    console.log('Setting up real-time notifications...');
    
    // Subscribe to WebSocket notifications
    this.webSocketService.listenForNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notification) => {
          console.log('Received real-time notification:', notification);
          this.handleNewNotification(notification);
        },
        error: (error) => {
          console.error('Error receiving notification:', error);
        }
      });

    // Subscribe to WebSocket unread count updates
    this.webSocketService.listenForUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          console.log('Received real-time unread count:', count);
          this.unreadCount = count;
        },
        error: (error) => {
          console.error('Error receiving unread count update:', error);
        }
      });
  }

  private subscribeToNotifications(): void {
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });

    this.notificationService.newNotification$.subscribe(notification => {
      if (notification) {
        this.latestNotification = notification;
        // Auto-hide latest notification after 5 seconds
        setTimeout(() => {
          this.latestNotification = null;
        }, 5000);
      }
    });
  }

  private handleNewNotification(notification: NotificationModel): void {
    // Add notification to service
    this.notificationService.addNotification(notification);
    
    // Show browser notification if permission granted
    if (this.isPermissionGranted) {
      this.showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.notificationId
      });
    }
  }

  private showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (this.isPermissionGranted) {
      new Notification(title, {
        icon: '/assets/default-avatar.png',
        badge: '/assets/default-avatar.png',
        ...options
      });
    }
  }

  public requestNotificationPermission(): void {
    if (this.isSupported && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        this.isPermissionGranted = permission === 'granted';
        this.isPermissionDenied = permission === 'denied';
      });
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.loadNotifications();
    }
  }

  private loadNotifications(): void {
    this.notificationService.getUserNotifications(0, 20).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications = response.data.content || response.data;
        }
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  markAsRead(notification: NotificationModel): void {
    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: () => {
        this.notificationService.markNotificationAsRead(notification.notificationId);
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationService.markAllNotificationsAsRead();
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  deleteNotification(notification: NotificationModel): void {
    this.notificationService.deleteNotification(notification.notificationId).subscribe({
      next: () => {
        // Remove from local state
        this.notifications = this.notifications.filter(n => n.notificationId !== notification.notificationId);
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
      }
    });
  }

  clearAllNotifications(): void {
    this.notificationService.deleteAllNotifications().subscribe({
      next: () => {
        this.notificationService.clearNotifications();
      },
      error: (error) => {
        console.error('Error clearing all notifications:', error);
      }
    });
  }

  onNotificationClick(notification: NotificationModel): void {
    // Mark as read if not already read
    if (!notification.isRead) {
      this.markAsRead(notification);
    }

    // Handle navigation based on notification type
    if (notification.data) {
      try {
        const data = JSON.parse(notification.data);
        if (data.conversationId) {
          this.router.navigate(['/chat', data.conversationId]);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    this.showDropdown = false;
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return 'fas fa-comment';
      case NotificationType.NEW_CONVERSATION:
        return 'fas fa-users';
      case NotificationType.CALL_INCOMING:
        return 'fas fa-phone';
      case NotificationType.CALL_MISSED:
        return 'fas fa-phone-slash';
      case NotificationType.CALL_ENDED:
        return 'fas fa-phone';
      default:
        return 'fas fa-bell';
    }
  }

  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return 'notification-message';
      case NotificationType.NEW_CONVERSATION:
        return 'notification-conversation';
      case NotificationType.CALL_INCOMING:
        return 'notification-call-incoming';
      case NotificationType.CALL_MISSED:
        return 'notification-call-missed';
      case NotificationType.CALL_ENDED:
        return 'notification-call-ended';
      default:
        return 'notification-default';
    }
  }

  formatTimestamp(timestamp: string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
} 