import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  return next(
    req.clone({
      url: `${environment.apiBaseUrl}${req.url.slice('/api'.length)}`,
      withCredentials: true,
    }),
  );
};
