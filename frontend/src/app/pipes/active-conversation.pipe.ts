import { Pipe, PipeTransform } from "@angular/core";
import { Conversation } from "../models/conversation";

@Pipe({ name: 'isActiveConversation' })
export class IsActiveConversationPipe implements PipeTransform {
  transform(activeConv: Conversation | null, conv: Conversation): boolean {
    return activeConv?.conversationId === conv.conversationId;
  }
}
