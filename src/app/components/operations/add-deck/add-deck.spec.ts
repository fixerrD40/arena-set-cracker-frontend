import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDeck } from './add-deck';

describe('AddDeck', () => {
  let component: AddDeck;
  let fixture: ComponentFixture<AddDeck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDeck]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDeck);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
