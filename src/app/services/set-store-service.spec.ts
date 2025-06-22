import { TestBed } from '@angular/core/testing';

import { SetStoreService } from './set-store-service';

describe('SetStoreService', () => {
  let service: SetStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SetStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
