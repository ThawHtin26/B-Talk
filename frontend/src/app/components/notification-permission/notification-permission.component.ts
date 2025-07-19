import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-permission',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-permission.component.html',
  styleUrls: ['./notification-permission.component.scss']
})
export class NotificationPermissionComponent implements OnInit {
  permission: NotificationPermission = 'default';
  isSupported = false;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.isSupported = this.notificationService.isNotificationSupported;
    this.notificationService.permission$.subscribe(permission => {
      this.permission = permission;
    });
  }

  async requestPermission(): Promise<void> {
    await this.notificationService.requestPermission();
  }

  get showPermissionRequest(): boolean {
    return this.isSupported && this.permission === 'default';
  }

  get showPermissionDenied(): boolean {
    return this.isSupported && this.permission === 'denied';
  }

  get showPermissionGranted(): boolean {
    return this.isSupported && this.permission === 'granted';
  }
} 