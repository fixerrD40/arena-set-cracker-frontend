import { Observable } from "rxjs";

export abstract class CrudService<T> {
  abstract create(entity: T): Observable<T>;
  abstract getAll(): Observable<T[]>;
  abstract getById(id: string): Observable<T | null>;
  abstract update(id: string, entity: T): Observable<T>;
  abstract delete(id: string): Observable<void>;
}
