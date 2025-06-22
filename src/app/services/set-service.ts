import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CrudService } from './crud-service';
import { Set } from '../models/set';

@Injectable({
  providedIn: 'root',
})
export class SetService extends CrudService<Set> {
  constructor(http: HttpClient, @Inject('APP_CONFIG') config: any) {
    super(http, config, 'sets');
  }
}