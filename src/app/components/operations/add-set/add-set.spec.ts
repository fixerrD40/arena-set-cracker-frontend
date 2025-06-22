import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSet } from './add-set';

describe('AddSet', () => {
  let component: AddSet;
  let fixture: ComponentFixture<AddSet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
