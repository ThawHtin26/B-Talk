import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lineBreak'
})
export class LineBreakPipe implements PipeTransform {
  transform(value: string, lineLength: number = 30): string {
    if (!value) return '';
    return value.replace(new RegExp(`(.{1,${lineLength}})(\\s|$)`, 'g'), '$1\n');
  }
}
