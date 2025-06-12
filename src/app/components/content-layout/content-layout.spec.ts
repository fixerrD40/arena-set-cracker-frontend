import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentLayout } from './content-layout';

describe('LeftDrawer', () => {
  let component: ContentLayout;
  let fixture: ComponentFixture<ContentLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
