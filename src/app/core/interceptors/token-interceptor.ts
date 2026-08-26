import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfileService } from '../services/user-profile.service';

/** Attaches Bearer token from SQLite-backed profile when present. */
export const tokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const userProfileService = inject(UserProfileService);
  const sessionToken = userProfileService.getSnapshot()?.sessionToken;

  if (sessionToken) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
