import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { PredictionService } from '../../services/prediction.service';

@Component({
  selector: 'app-group-standings',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './group-standings.component.html',
  styleUrls: ['./group-standings.component.css']
})
export class GroupStandingsComponent implements OnInit {
  groupStandings: any[] = [];
  loading = false;
  error = '';

  groupEmojis: any = {
    A: '🇲🇽',
    B: '🇨🇦',
    C: '🇧🇷',
    D: '🇺🇸',
    E: '🇩🇪',
    F: '🇳🇱',
    G: '🇧🇪',
    H: '🇪🇸',
    I: '🇫🇷',
    J: '🇦🇷',
    K: '🇵🇹',
    L: '🏴'
  };

  groupNames: any = {
    A: 'Groupe A',
    B: 'Groupe B',
    C: 'Groupe C',
    D: 'Groupe D',
    E: 'Groupe E',
    F: 'Groupe F',
    G: 'Groupe G',
    H: 'Groupe H',
    I: 'Groupe I',
    J: 'Groupe J',
    K: 'Groupe K',
    L: 'Groupe L'
  };

  constructor(private predictionService: PredictionService) {}

  ngOnInit() {
    this.loadGroupStandings();
  }

  loadGroupStandings() {
    this.loading = true;
    this.error = '';
    this.groupStandings = [];

    this.predictionService.getGroupStandings().subscribe({
      next: (data) => {
        if (data.all_groups) {
          this.groupStandings = data.all_groups;
        } else if (data.groups) {
          this.groupStandings = Object.values(data.groups) as any[];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading group standings:', err);
        this.error = 'Failed to load group standings. Check backend on localhost:3000.';
        this.loading = false;
      }
    });
  }

  getGroupEmoji(group: string): string {
    return this.groupEmojis[group] || '⚽';
  }

  getGroupName(group: string): string {
    return this.groupNames[group] || `Group ${group}`;
  }

  getQualifiedTeams(teams: any[]): any[] {
    return teams.slice(0, 2);
  }

  getThirdPlace(teams: any[]): any {
    return teams[2];
  }
}
