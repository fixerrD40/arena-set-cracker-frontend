import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { CrudService } from './crud-service';
import { Deck } from '../models/deck';
import { catchError, map, Observable } from 'rxjs';
import { Color, ColorIdentity } from '../models/color';

@Injectable({
  providedIn: 'root',
})
export class DeckService extends CrudService<Deck> {
  constructor(http: HttpClient, @Inject('APP_CONFIG') config: any) {
    super(http, config, 'decks');
  }

  getDecksBySet(setId: number): Observable<Deck[]> {
    const url = `${this.apiUrl}/${setId}`;
    return this.http.get<any[]>(url, this.getHttpOptions())
      .pipe(
        map(rawDecks => rawDecks.map(rawDeck => this.parseDeck(rawDeck))),
        catchError(this.handleError)
      );
  }

  createWithSet(setId: number, deck: Deck): Observable<Deck> {
    const url = `${this.apiUrl}/${setId}`;
    const payload = this.serializeDeck(deck);
    return this.http.post<any>(url, payload, this.getHttpOptions())
      .pipe(
        map(rawDeck => this.parseDeck(rawDeck)),
        catchError(this.handleError)
      );
  }

  private parseDeck(raw: any): Deck {
    const identity: ColorIdentity = {
      primary: this.mapColorKeyToValue(raw.identity.primary),
      colors: raw.identity.colors.map((k: string) => this.mapColorKeyToValue(k)),
    };

    return new Deck({
      id: raw.id,
      name: raw.name,
      identity,
      raw: raw.raw,
      tags: raw.tags ? Array.from(raw.tags) : undefined,
      notes: raw.notes,
    });
  }

  private serializeDeck(deck: Deck): any {
    return {
      ...deck.toJSON(),
      identity: {
        primary: this.mapColorValueToKey(deck.identity.primary),
        colors: deck.identity.colors.map(color => this.mapColorValueToKey(color)),
      },
      cards: Object.fromEntries(deck.cards),
    };
  }

  private mapColorKeyToValue(key: string): Color {
    return Color[key as keyof typeof Color];
  }

  private mapColorValueToKey(value: Color): string {
    const entry = Object.entries(Color).find(([key, val]) => val === value);
    return entry ? entry[0] : '';
  }
}