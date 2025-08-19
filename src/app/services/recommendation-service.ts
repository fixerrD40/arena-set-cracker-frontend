import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RecommendationService {

  private apiUrl: string;

  constructor(private http: HttpClient, @Inject('APP_CONFIG') appConfig: any) {
    this.apiUrl = `${appConfig.baseUrl}/api/recommend`;
  }

  getRecommendations(deckId: number): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/deck/${deckId}`, null);
  }

  cancelRecommendations(): Observable<string> {
    return this.http.post(`${this.apiUrl}/cancel`, null, {
      responseType: 'text',
    });
  }
}