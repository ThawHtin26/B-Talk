import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  `]
})
export class AppComponent implements OnInit {
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
    if (this.authService.isAuthenticated()) {
      console.log('User is authenticated');
      // Additional initialization for authenticated users can go here
    } else {
      console.log('User is not authenticated or token expired');
      // Handle unauthenticated state
    }
  }
}
