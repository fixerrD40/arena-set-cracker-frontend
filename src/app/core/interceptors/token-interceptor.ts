import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfileService } from '../services/user-profile.service';

/**
 * FUNCTIONAL OPAQUE TOKEN ATTACHER
 * Intercepts outbound cloud network transactions and appends your secure
 * database-driven server access passphrase cleanly without touching localStorage.
 */
export const tokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const userProfileService = inject(UserProfileService);

  // 🚀 REFACTORED: Extract the opaque token straight out of your unified SQLite memory heap snapshot!
  const sessionToken = userProfileService.getSnapshot()?.sessionToken;

  if (sessionToken) {
    // Clone the active request, stamping your secure bearer key into the authorization header line
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    return next(authReq);
  }

  // Pass through anonymous public requests (like hitting Scryfall CDN links) completely unhindered
  return next(req);
};
