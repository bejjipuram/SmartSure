import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';



@Injectable({ providedIn: 'root' })
export class LocaleService {
  // Only timezone/locale for date formatting is kept
  timezone = 'Asia/Kolkata';
  locale = 'en-IN';
}
