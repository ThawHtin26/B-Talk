import { Component, EventEmitter, inject, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserResponse } from '../../models/user-response';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap, tap } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { Conversation } from '../../models/conversation';

@Component({
  selector: 'app-conversation-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-create.component.html',
  styleUrls: ['./conversation-create.component.scss']
})
export class ConversationCreateComponent implements OnInit {
  @Input() showModal = false;
  @Output() showModalChange = new EventEmitter<boolean>();
  // @Output() conversationCreated = new EventEmitter<Conversation>();

  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  filteredUsers: UserResponse[] = [];
  selectedUsers: UserResponse[] = [];
  conversationName = '';
  isGroup = false;
  searchTerm = '';
  isLoading = false;
  error: string | null = null;
  currentUserId: string | null = null;
  private searchTerms = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.userId || null;
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.filteredUsers = [];
        this.cd.markForCheck();
      }),
      switchMap(term => {
        if (!term || term.trim().length === 0) {
          return of({ success: true, data: [], message: '' } as ApiResponse<UserResponse[]>);
        }
        return this.userService.searchUsers(term).pipe(
          catchError(error => {
            console.error('Search error:', error);
            return of({
              success: false,
              message: 'Search failed',
              data: []
            } as ApiResponse<UserResponse[]>);
          })
        );
      }),
      finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: (response: ApiResponse<UserResponse[]>) => {
        if (response.success && response.data) {
          this.filteredUsers = response.data.filter(user =>
            user.userId !== this.currentUserId
          );
        } else {
          this.filteredUsers = [];
          if (!response.success) {
            this.error = response.message || 'Failed to search users';
          }
        }
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Search subscription error:', err);
        this.filteredUsers = [];
        this.error = 'Error searching users';
        this.cd.markForCheck();
      }
    });
  }

  search(term: string): void {
    this.error = null;
    this.searchTerms.next(term);
  }

  toggleUserSelection(user: UserResponse): void {
    if (user.userId === this.currentUserId) return;

    const index = this.selectedUsers.findIndex(u => u.userId === user.userId);
    if (index === -1) {
      this.selectedUsers.push(user);
    } else {
      this.selectedUsers.splice(index, 1);
    }
    this.cd.markForCheck();
  }

  isSelected(userId: string): boolean {
    return this.selectedUsers.some(u => u.userId === userId);
  }

  isCurrentUser(userId: string): boolean {
    return this.currentUserId !== null && userId === this.currentUserId;
  }

  closeModal(): void {
    this.showModal = false;
    this.showModalChange.emit(false);
    this.resetForm();
  }

  createConversation(): void {
    this.error = null;

    if (!this.validateForm()) {
      this.error = this.isGroup
        ? 'Please select at least 2 users and provide a group name'
        : 'Please select exactly 1 user for private conversation';
      return;
    }

    const participants = this.selectedUsers
      .filter(user => user.userId !== this.currentUserId)
      .map(u => u.userId);

    if (participants.length === 0) {
      this.error = 'Please select at least one participant';
      return;
    }

    if (this.isGroup && !this.conversationName?.trim()) {
      this.error = 'Group name is required';
      return;
    }

    this.isLoading = true;
    this.cd.markForCheck();

    const serviceCall = this.isGroup
      ? this.chatService.createGroupConversation(this.conversationName.trim(), participants)
      : this.chatService.createPrivateConversation(participants[0]);

    serviceCall.pipe(
      finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: (response: ApiResponse<Conversation>) => {
        if (response.success && response.data) {
          console.log('Conversation created successfully:', response.data);
          
          // The conversation will be automatically added to the list via WebSocket
          // But we can also manually trigger a refresh if needed
          this.chatService.getConversations().subscribe({
            next: (refreshResponse) => {
              if (refreshResponse.success) {
                console.log('Conversation list refreshed after creation');
              }
            },
            error: (err) => {
              console.error('Failed to refresh conversation list:', err);
            }
          });
          
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to create conversation';
          console.error('Conversation creation failed:', response);
        }
      },
      error: (err) => {
        console.error('Failed to create conversation', err);
        this.error = err.error?.message || 'An unexpected error occurred';
        this.cd.markForCheck();
      }
    });
  }

  private validateForm(): boolean {
    if (this.isGroup) {
      return this.selectedUsers.length >= 2 && !!this.conversationName?.trim();
    }
    return this.selectedUsers.length === 1;
  }

  resetForm(): void {
    this.selectedUsers = [];
    this.conversationName = '';
    this.isGroup = false;
    this.searchTerm = '';
    this.filteredUsers = [];
    this.error = null;
    this.cd.markForCheck();
  }
}
