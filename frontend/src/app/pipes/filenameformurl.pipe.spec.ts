import { FilenameFromUrlPipe } from './filenameformurl.pipe';

describe('FilenameformurlPipe', () => {
  it('create an instance', () => {
    const pipe = new FilenameFromUrlPipe();
    expect(pipe).toBeTruthy();
  });
});
