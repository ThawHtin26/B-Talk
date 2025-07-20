import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NotificationBellComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isAuthenticated = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Check authentication status on app initialization
    this.checkAuthenticationStatus();
    
    // Listen for authentication events
    window.addEventListener('userAuthenticated', () => {
      console.log('Authentication event received, updating state...');
      this.checkAuthenticationStatus();
    });
  }

  private checkAuthenticationStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      console.log('User is authenticated');
      // Additional initialization for authenticated users can go here
    } else {
      console.log('User is not authenticated or token expired');
      // Handle unauthenticated state
    }
  }

  logout(): void {
    this.authService.logout();
    this.isAuthenticated = false;
  }
}
