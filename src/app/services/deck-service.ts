import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CrudService } from './crud-service';
import { Deck } from '../models/deck';

@Injectable({
  providedIn: 'root',
})
export class DeckService extends CrudService<Deck> {
  constructor(http: HttpClient, @Inject('APP_CONFIG') config: any) {
    super(http, config, 'decks');
  }
}