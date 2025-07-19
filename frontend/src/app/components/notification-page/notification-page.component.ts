import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { Notification as NotificationModel, NotificationType } from '../../models/notification';

@Component({
  selector: 'app-notification-page',
  standalone: true,
  imports: [CommonModule],
  template:'./notification-page.component.html',
  styleUrls: ['./notification-page.component.scss']
})
export class NotificationPageComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  notifications: NotificationModel[] = [];
  loading = false;
  hasMore = false;
  currentPage = 0;
  activeFilter = 'all';

  filters = [
    { label: 'All', value: 'all', count: 0 },
    { label: 'Unread', value: 'unread', count: 0 },
    { label: 'Messages', value: 'messages', count: 0 },
    { label: 'Calls', value: 'calls', count: 0 },
    { label: 'System', value: 'system', count: 0 }
  ];

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    this.loading = true;
    this.notificationService.getUserNotifications(this.currentPage, 20).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (this.currentPage === 0) {
            this.notifications = response.data.content;
          } else {
            this.notifications = [...this.notifications, ...response.data.content];
          }
          this.hasMore = response.data.number < response.data.totalPages - 1;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        if (response.success && response.data !== undefined) {
          this.filters[1].count = response.data; // Unread count
        }
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
      }
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 0;
    this.loadNotifications();
  }

  loadMore(): void {
    this.currentPage++;
    this.loadNotifications();
  }

  markAsRead(notification: NotificationModel): void {
    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: (response) => {
        if (response.success) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.updateFilterCounts();
        }
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications.forEach(notification => {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
          });
          this.updateFilterCounts();
        }
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  deleteNotification(notification: NotificationModel): void {
    this.notificationService.deleteNotification(notification.notificationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications = this.notifications.filter(n => n.notificationId !== notification.notificationId);
          this.updateFilterCounts();
        }
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
      }
    });
  }

  clearAllNotifications(): void {
    this.notificationService.deleteAllNotifications().subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications = [];
          this.updateFilterCounts();
        }
      },
      error: (error) => {
        console.error('Error clearing all notifications:', error);
      }
    });
  }

  private updateFilterCounts(): void {
    const unreadCount = this.notifications.filter(n => !n.isRead).length;
    const messageCount = this.notifications.filter(n => 
      n.type === NotificationType.NEW_MESSAGE || 
      n.type === NotificationType.NEW_CONVERSATION
    ).length;
    const callCount = this.notifications.filter(n => 
      n.type === NotificationType.CALL_INCOMING || 
      n.type === NotificationType.CALL_MISSED ||
      n.type === NotificationType.CALL_ENDED
    ).length;
    const systemCount = this.notifications.filter(n => 
      n.type === NotificationType.SYSTEM_ANNOUNCEMENT
    ).length;

    this.filters[1].count = unreadCount;
    this.filters[2].count = messageCount;
    this.filters[3].count = callCount;
    this.filters[4].count = systemCount;
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
      case NotificationType.USER_ONLINE:
        return 'fas fa-circle text-success';
      case NotificationType.USER_OFFLINE:
        return 'fas fa-circle text-muted';
      case NotificationType.FILE_SHARED:
        return 'fas fa-file';
      case NotificationType.MENTION:
        return 'fas fa-at';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return 'fas fa-bullhorn';
      default:
        return 'fas fa-bell';
    }
  }

  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.CALL_INCOMING:
        return 'text-danger';
      case NotificationType.CALL_MISSED:
        return 'text-warning';
      case NotificationType.USER_ONLINE:
        return 'text-success';
      case NotificationType.USER_OFFLINE:
        return 'text-muted';
      default:
        return 'text-primary';
    }
  }

  formatTimestamp(timestamp: string): string {
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
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  onNotificationClick(notification: NotificationModel): void {
    this.markAsRead(notification);
    
    // Navigate based on notification type
    switch (notification.type) {
      case NotificationType.NEW_MESSAGE:
      case NotificationType.NEW_CONVERSATION:
        if (notification.data) {
          try {
            const data = JSON.parse(notification.data);
            if (data.conversationId) {
              this.router.navigate(['/chat', data.conversationId]);
            }
          } catch (e) {
            console.error('Error parsing notification data:', e);
          }
        }
        break;
      case NotificationType.CALL_INCOMING:
        // Handle incoming call
        break;
      default:
        // Default behavior
        break;
    }
  }
} 