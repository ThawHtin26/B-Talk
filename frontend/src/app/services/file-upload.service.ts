import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  constructor(private http: HttpClient) {}

  uploadFileWithMessage(message: any, file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('message', JSON.stringify(message));
    formData.append('attachments', file);

    return this.http.post('/api/messages', formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
