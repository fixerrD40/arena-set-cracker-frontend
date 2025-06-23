import { TestBed } from '@angular/core/testing';

import { DeckStoreService } from './deck-store-service';

describe('DeckStoreService', () => {
  let service: DeckStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
