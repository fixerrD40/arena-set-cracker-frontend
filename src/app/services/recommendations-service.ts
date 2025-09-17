import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recommendations } from '../models/recommendations';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {

  private apiUrl: string;

  constructor(private http: HttpClient, @Inject('APP_CONFIG') appConfig: any) {
    this.apiUrl = `${appConfig.baseUrl}/api/recommend`;
  }

  getRecommendations(deckId: number): Observable<Recommendations> {
    return this.http.post<Recommendations>(`${this.apiUrl}/deck/${deckId}`, null);
  }

  cancelRecommendations(): Observable<string> {
    return this.http.post(`${this.apiUrl}/cancel`, null, {
      responseType: 'text',
    });
  }
}