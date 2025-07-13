import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filenameFromUrl'
})
export class FilenameFromUrlPipe implements PipeTransform {
  transform(url: string): string {
    if (!url) return '';
    return url.split('/').pop() || '';
  }
}
