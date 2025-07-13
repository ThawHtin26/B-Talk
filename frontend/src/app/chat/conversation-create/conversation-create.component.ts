// conversation-create.component.ts
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { UserResponse } from '../../models/user-response';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-conversation-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-create.component.html',
  styleUrls: ['./conversation-create.component.scss']
})
export class ConversationCreateComponent implements OnInit {
  @Input() showModal = false;  // Receive state from parent
  @Output() showModalChange = new EventEmitter<boolean>();
  private chatService = inject(ChatService);
  private userService = inject(UserService);

  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  selectedUsers: UserResponse[] = [];
  conversationName = '';
  isGroup = false;
  searchTerm = '';
  private searchTerms = new Subject<string>();

  ngOnInit(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
      this.filteredUsers = [...users];
    });

    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.filterUsers(term);
    });
  }

  search(term: string): void {
    this.searchTerms.next(term);
  }

  filterUsers(term: string): void {
    if (!term) {
      this.filteredUsers = [...this.users];
      return;
    }
    this.filteredUsers = this.users.filter(user =>
      user.name.toLowerCase().includes(term.toLowerCase()) ||
      user.phoneNumber.toLowerCase().includes(term.toLowerCase())
    );
  }

  toggleUserSelection(user: UserResponse): void {
    const index = this.selectedUsers.findIndex(u => u.userId === user.userId);
    if (index === -1) {
      this.selectedUsers.push(user);
    } else {
      this.selectedUsers.splice(index, 1);
    }
  }

  isSelected(userId: number): boolean {
    return this.selectedUsers.some(u => u.userId === userId);
  }

    closeModal(): void {
    this.showModal = false;
    this.showModalChange.emit(false);
    this.resetForm();
  }


  createConversation(): void {
    if (this.isGroup) {
      // ... existing validation ...
      this.chatService.createGroupConversation(
        this.conversationName,
        this.selectedUsers.map(u => u.userId)
      ).subscribe({
        next: () => {
          this.closeModal();  // Use the new method
        },
        // ... error handler ...
      });
    } else {
      // ... private conversation logic ...
      this.chatService.createPrivateConversation(
        this.selectedUsers[0].userId
      ).subscribe({
        next: () => {
          this.closeModal();  // Use the new method
        },
        // ... error handler ...
      });
    }
  }

  resetForm(): void {
    this.selectedUsers = [];
    this.conversationName = '';
    this.isGroup = false;
    this.searchTerm = '';
    this.filterUsers('');
  }
}
