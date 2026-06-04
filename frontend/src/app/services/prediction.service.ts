import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getMatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/matches`);
  }

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/teams`);
  }

  getUpcomingMatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/worldcup-matches`);
  }

  getTeamStats(team: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/${encodeURIComponent(team)}`);
  }

  predictMatch(team1: string, team2: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/predict`, { team1, team2 });
  }

  getRanking(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ranking`);
  }

  generatePredictions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/generate-predictions`);
  }

  getGroupStandings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/group-standings`);
  }
}