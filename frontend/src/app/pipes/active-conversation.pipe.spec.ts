import { IsActiveConversationPipe } from './active-conversation.pipe';

describe('ActiveConversationPipe', () => {
  it('create an instance', () => {
    const pipe = new IsActiveConversationPipe();
    expect(pipe).toBeTruthy();
  });
});
